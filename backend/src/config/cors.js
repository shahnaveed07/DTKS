/**
 * Strict CORS Configuration & Origin Allowlist
 *
 * Security Guarantees:
 *   - Never reflects arbitrary origins when credentials are enabled.
 *   - Does not permit wildcard preview subdomains in production.
 *   - Supports `X-CSRF-Token` and `X-Request-Id` for same-origin and explicitly allowed origins.
 *   - Always emits `Vary: Origin`.
 */

const PRODUCTION_ALLOWED_ORIGINS = [
  'https://dreamtechkashmirsolutions.studio',
  'https://www.dreamtechkashmirsolutions.studio',
];

const DEV_LOCAL_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
];

export function getAllowedOrigins(env = {}) {
  const isProd = env.ENVIRONMENT === 'production';
  const custom = env.CORS_ALLOWED_ORIGINS
    ? String(env.CORS_ALLOWED_ORIGINS)
        .split(',')
        .map((s) => s.trim().replace(/\/+$/, ''))
        .filter(Boolean)
    : [];
  const appUrl = env.APP_URL ? [String(env.APP_URL).trim().replace(/\/+$/, '')] : [];
  const defaults = isProd
    ? PRODUCTION_ALLOWED_ORIGINS
    : [...PRODUCTION_ALLOWED_ORIGINS, ...DEV_LOCAL_ORIGINS];
  return Array.from(new Set([...defaults, ...custom, ...appUrl]));
}

export function isOriginAllowed(origin, env = {}) {
  if (!origin) return true; // Same-origin or non-browser request without Origin header
  const normalized = String(origin).trim().replace(/\/+$/, '');
  const allowlist = getAllowedOrigins(env);
  return allowlist.includes(normalized);
}

export function buildCorsHeaders(request, env = {}) {
  const origin = request.headers.get('Origin');
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, X-CSRF-Token, X-Requested-With, X-Request-Id, Accept',
    'Access-Control-Expose-Headers':
      'X-Request-Id, X-RateLimit-Limit, X-RateLimit-Remaining, Retry-After',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };

  if (origin && isOriginAllowed(origin, env)) {
    headers['Access-Control-Allow-Origin'] = String(origin).trim().replace(/\/+$/, '');
    headers['Access-Control-Allow-Credentials'] = 'true';
  } else if (!origin) {
    headers['Access-Control-Allow-Origin'] = 'https://dreamtechkashmirsolutions.studio';
  }

  return headers;
}
