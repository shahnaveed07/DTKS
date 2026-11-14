import { verifyJwt, timingSafeEqualBytes } from '../utils/crypto.js';
import { errorResponse } from '../utils/response.js';

const encoder = new TextEncoder();

/**
 * Retrieves the configured JWT signing secret.
 * In production (`ENVIRONMENT === "production"`), a strong secret (>= 32 characters)
 * MUST be explicitly configured via Cloudflare secrets (`JWT_SECRET`).
 */
export function getJwtSecret(env = {}) {
  const configured =
    env.JWT_SECRET || (typeof process !== 'undefined' && process.env?.JWT_SECRET) || '';
  const isProd =
    env.ENVIRONMENT === 'production' ||
    (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production');

  if (isProd) {
    if (
      !configured ||
      configured.length < 32 ||
      configured.includes('replace-with') ||
      configured.includes('fallback')
    ) {
      const err = new Error(
        'CRITICAL SECURITY ERROR: Production JWT_SECRET must be explicitly configured and at least 32 characters.'
      );
      err.status = 500;
      err.code = 'SERVER_MISCONFIGURED';
      throw err;
    }
    return configured;
  }

  return configured || 'dtks-local-dev-only-ephemeral-hmac-secret-key-2026';
}

export function isProductionJwtSecretValid(env = {}) {
  try {
    getJwtSecret({ ...env, ENVIRONMENT: 'production' });
    return true;
  } catch {
    return false;
  }
}

export function parseCookies(cookieHeader = '') {
  const out = {};
  for (const pair of String(cookieHeader || '').split(';')) {
    const idx = pair.indexOf('=');
    if (idx > 0) {
      const k = pair.slice(0, idx).trim();
      const v = pair.slice(idx + 1).trim();
      try {
        out[k] = decodeURIComponent(v);
      } catch {
        out[k] = v;
      }
    }
  }
  return out;
}

export function verifyCsrfTokenMatch(headerToken = '', cookieToken = '') {
  if (!headerToken || !cookieToken) return false;
  const a = encoder.encode(String(headerToken).trim());
  const b = encoder.encode(String(cookieToken).trim());
  return timingSafeEqualBytes(a, b);
}

/**
 * Builds the 3 Set-Cookie header strings for same-origin browser session authentication:
 *   1. `dtks_access_token`: HttpOnly, Secure, SameSite=Lax, Path=/api/v1
 *   2. `dtks_refresh_token`: HttpOnly, Secure, SameSite=Lax, Path=/api/v1/auth
 *   3. `dtks_csrf_token`: Secure, SameSite=Lax, Path=/ (readable by frontend JS)
 */
export function buildAuthCookies({
  accessToken,
  refreshToken,
  csrfToken,
  accessMaxAge = 900,
  refreshMaxAge = 604800,
}) {
  const accessExpires = new Date(Date.now() + accessMaxAge * 1000).toUTCString();
  const refreshExpires = new Date(Date.now() + refreshMaxAge * 1000).toUTCString();

  return [
    `dtks_access_token=${encodeURIComponent(accessToken)}; Path=/api/v1; Max-Age=${accessMaxAge}; Expires=${accessExpires}; HttpOnly; Secure; SameSite=Lax`,
    `dtks_refresh_token=${encodeURIComponent(refreshToken)}; Path=/api/v1/auth; Max-Age=${refreshMaxAge}; Expires=${refreshExpires}; HttpOnly; Secure; SameSite=Lax`,
    `dtks_csrf_token=${encodeURIComponent(csrfToken)}; Path=/; Max-Age=${refreshMaxAge}; Expires=${refreshExpires}; Secure; SameSite=Lax`,
  ];
}

/**
 * Builds the 3 Set-Cookie header strings that immediately expire and clear all auth cookies.
 */
export function buildClearAuthCookies() {
  const past = 'Thu, 01 Jan 1970 00:00:00 GMT';
  return [
    `dtks_access_token=; Path=/api/v1; Max-Age=0; Expires=${past}; HttpOnly; Secure; SameSite=Lax`,
    `dtks_refresh_token=; Path=/api/v1/auth; Max-Age=0; Expires=${past}; HttpOnly; Secure; SameSite=Lax`,
    `dtks_csrf_token=; Path=/; Max-Age=0; Expires=${past}; Secure; SameSite=Lax`,
  ];
}

/**
 * Extracts and verifies the JWT token (via Authorization Bearer header or HttpOnly cookie
 * with CSRF token verification for state-changing requests), then verifies the Admin
 * account is active in D1 (`admins` table) and satisfies role-based access control.
 */
export async function authenticateAdmin(
  request,
  env,
  allowedRoles = ['super_admin', 'admin', 'editor']
) {
  const authHeader = request.headers.get('Authorization') || '';
  const cookies = parseCookies(request.headers.get('Cookie') || '');
  let token = '';
  let usedCookieAuth = false;

  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.slice('Bearer '.length).trim();
  } else if (cookies.dtks_access_token) {
    token = cookies.dtks_access_token;
    usedCookieAuth = true;
  }

  if (!token) {
    return {
      authenticated: false,
      usedCookieAuth,
      response: errorResponse(
        'Authentication required. Please sign in as an administrator.',
        401,
        'UNAUTHORIZED'
      ),
    };
  }

  // CSRF protection when cookie-based authentication is used on state-changing requests
  const method = (request.method || 'GET').toUpperCase();
  if (usedCookieAuth && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrfHeader = request.headers.get('X-CSRF-Token') || '';
    if (!verifyCsrfTokenMatch(csrfHeader, cookies.dtks_csrf_token)) {
      return {
        authenticated: false,
        usedCookieAuth: true,
        csrfFailed: true,
        response: errorResponse(
          'CSRF token validation failed for cookie-authenticated request.',
          403,
          'CSRF_VALIDATION_FAILED'
        ),
      };
    }
  }

  let decoded;
  try {
    decoded = await verifyJwt(token, getJwtSecret(env));
  } catch (err) {
    if (err.code === 'SERVER_MISCONFIGURED') {
      throw err;
    }
    const code = err.code === 'TOKEN_EXPIRED' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
    return {
      authenticated: false,
      usedCookieAuth,
      response: errorResponse(
        err.code === 'TOKEN_EXPIRED'
          ? 'Your session has expired. Please refresh or sign in again.'
          : 'Invalid authentication token.',
        401,
        code
      ),
    };
  }

  if (decoded.type && decoded.type !== 'access') {
    return {
      authenticated: false,
      usedCookieAuth,
      response: errorResponse('Invalid token type for API access.', 401, 'INVALID_TOKEN_TYPE'),
    };
  }

  // If the access token is bound to a specific refresh_sessions ID (`sid`), verify the session was not revoked
  if (decoded.sid) {
    const sessionRow = await env.DB.prepare(
      'SELECT id, expires_at, revoked_at FROM refresh_sessions WHERE id = ? LIMIT 1'
    )
      .bind(decoded.sid)
      .first();

    if (
      !sessionRow ||
      sessionRow.revoked_at ||
      new Date(sessionRow.expires_at).getTime() <= Date.now()
    ) {
      return {
        authenticated: false,
        usedCookieAuth,
        response: errorResponse(
          'Your session has been revoked or expired. Please sign in again.',
          401,
          'SESSION_REVOKED'
        ),
      };
    }
  }

  const adminRow = await env.DB.prepare(
    'SELECT id, name, email, role, is_active, created_at, updated_at, last_login_at FROM admins WHERE id = ?'
  )
    .bind(decoded.sub)
    .first();

  if (!adminRow) {
    return {
      authenticated: false,
      usedCookieAuth,
      response: errorResponse('Administrator account not found.', 401, 'ADMIN_NOT_FOUND'),
    };
  }

  if (!adminRow.is_active) {
    return {
      authenticated: false,
      usedCookieAuth,
      response: errorResponse(
        'This administrator account has been deactivated.',
        403,
        'ACCOUNT_DEACTIVATED'
      ),
    };
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(adminRow.role)) {
    return {
      authenticated: false,
      usedCookieAuth,
      response: errorResponse(
        'Insufficient role permissions for this operation.',
        403,
        'FORBIDDEN'
      ),
    };
  }

  return {
    authenticated: true,
    usedCookieAuth,
    sessionId: decoded.sid || null,
    admin: {
      id: adminRow.id,
      name: adminRow.name,
      email: adminRow.email,
      role: adminRow.role,
      is_active: Boolean(adminRow.is_active),
      isActive: Boolean(adminRow.is_active),
      created_at: adminRow.created_at,
      createdAt: adminRow.created_at,
      updated_at: adminRow.updated_at,
      updatedAt: adminRow.updated_at,
      last_login_at: adminRow.last_login_at,
      lastLoginAt: adminRow.last_login_at,
    },
  };
}
