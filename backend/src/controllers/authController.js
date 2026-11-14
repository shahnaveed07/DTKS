import {
  verifyPassword,
  verifyPasswordWithMigration,
  hashPassword,
  signJwt,
  generateRandomId,
  generateRandomToken,
  sha256Hex,
} from '../utils/crypto.js';
import { successResponse, errorResponse, parseJsonBody, sanitizeText } from '../utils/response.js';
import {
  validateLoginInput,
  validateChangePasswordInput,
  isValidEmail,
} from '../validators/schemas.js';
import { VALID_ADMIN_ROLES } from '../config/constants.js';
import {
  getJwtSecret,
  parseCookies,
  verifyCsrfTokenMatch,
  buildAuthCookies,
  buildClearAuthCookies,
} from '../middleware/authMiddleware.js';
import { getClientIp } from '../middleware/rateLimiter.js';
import { logAdminActivity } from '../services/auditService.js';

function getAccessExpiresSeconds(env) {
  return Number.parseInt(env.JWT_ACCESS_EXPIRES_IN || '900', 10) || 900;
}

function getRefreshExpiresSeconds(env) {
  return Number.parseInt(env.JWT_REFRESH_EXPIRES_IN || '604800', 10) || 604800;
}

export function mapAdminResponse(row, lastLoginOverride = null) {
  if (!row) return null;
  const lastLogin = lastLoginOverride || row.last_login_at || null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    is_active: Boolean(row.is_active),
    isActive: Boolean(row.is_active),
    created_at: row.created_at,
    createdAt: row.created_at,
    updated_at: row.updated_at,
    updatedAt: row.updated_at,
    last_login_at: lastLogin,
    lastLoginAt: lastLogin,
  };
}

export async function loginAdmin(request, env) {
  const body = await parseJsonBody(request);
  const validation = validateLoginInput(body);
  if (!validation.isValid) {
    return errorResponse('Invalid login credentials.', 400, 'VALIDATION_ERROR', validation.errors);
  }

  const { email, password } = validation.data;
  const admin = await env.DB.prepare(
    'SELECT id, name, email, password_hash, role, is_active, created_at, updated_at, last_login_at FROM admins WHERE lower(email) = lower(?)'
  )
    .bind(email)
    .first();

  if (!admin) {
    await logAdminActivity(env, {
      adminId: null,
      action: 'LOGIN_FAILED',
      entityType: 'Admin',
      entityId: null,
      details: 'Login attempt for non-existent administrator account',
      request,
    });
    return errorResponse('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
  }

  if (!admin.is_active) {
    await logAdminActivity(env, {
      adminId: admin.id,
      action: 'LOGIN_REJECTED_INACTIVE',
      entityType: 'Admin',
      entityId: admin.id,
      details: 'Login attempt for deactivated administrator account',
      request,
    });
    return errorResponse(
      'This administrator account has been deactivated.',
      403,
      'ACCOUNT_DEACTIVATED'
    );
  }

  const verification = await verifyPasswordWithMigration(password, admin.password_hash);
  if (!verification.valid) {
    await logAdminActivity(env, {
      adminId: admin.id,
      action: 'LOGIN_FAILED',
      entityType: 'Admin',
      entityId: admin.id,
      details: 'Invalid password attempt',
      request,
    });
    return errorResponse('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
  }

  const now = new Date().toISOString();

  // Transparently migrate legacy password hashes to canonical $pbkdf2-sha512$v=1$i=100000$...
  if (verification.needsRehash) {
    const upgradedHash = await hashPassword(password);
    await env.DB.prepare(
      'UPDATE admins SET password_hash = ?, last_login_at = ?, updated_at = ? WHERE id = ?'
    )
      .bind(upgradedHash, now, now, admin.id)
      .run();
    await logAdminActivity(env, {
      adminId: admin.id,
      action: 'PASSWORD_HASH_MIGRATED',
      entityType: 'Admin',
      entityId: admin.id,
      details: 'Migrated password hash to canonical PBKDF2-SHA512 format',
      request,
    });
  } else {
    await env.DB.prepare('UPDATE admins SET last_login_at = ?, updated_at = ? WHERE id = ?')
      .bind(now, now, admin.id)
      .run();
  }

  const accessExp = getAccessExpiresSeconds(env);
  const refreshExp = getRefreshExpiresSeconds(env);
  const sessionId = generateRandomId('sess');

  const accessToken = await signJwt(
    {
      sub: admin.id,
      email: admin.email,
      role: admin.role,
      sid: sessionId,
      type: 'access',
    },
    getJwtSecret(env),
    accessExp
  );

  const rawRefreshToken = generateRandomToken(32);
  const refreshTokenHash = await sha256Hex(rawRefreshToken);
  const csrfToken = generateRandomToken(32);
  const expiresAt = new Date(Date.now() + refreshExp * 1000).toISOString();

  await env.DB.prepare(
    `INSERT INTO refresh_sessions (id, admin_id, refresh_token_hash, user_agent, ip_address, expires_at, revoked_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, NULL, ?)`
  )
    .bind(
      sessionId,
      admin.id,
      refreshTokenHash,
      (request.headers.get('User-Agent') || '').slice(0, 255),
      getClientIp(request),
      expiresAt,
      now
    )
    .run();

  await logAdminActivity(env, {
    adminId: admin.id,
    action: 'LOGIN_SUCCESS',
    entityType: 'Admin',
    entityId: admin.id,
    details: 'Administrator signed in',
    request,
  });

  const authCookies = buildAuthCookies({
    accessToken,
    refreshToken: rawRefreshToken,
    csrfToken,
    accessMaxAge: accessExp,
    refreshMaxAge: refreshExp,
  });

  // Never expose raw refreshToken in the JSON body; it is stored exclusively in the HttpOnly cookie.
  return successResponse(
    {
      accessToken,
      access_token: accessToken,
      csrfToken,
      csrf_token: csrfToken,
      expiresIn: accessExp,
      expires_in: accessExp,
      admin: mapAdminResponse(admin, now),
    },
    'Authenticated successfully.',
    200,
    { 'Set-Cookie': authCookies }
  );
}

export async function logoutAdmin(request, env, authResult = null) {
  // If cookie-based auth failed CSRF validation, reject immediately
  if (authResult?.csrfFailed) {
    return authResult.response;
  }

  const cookies = parseCookies(request.headers.get('Cookie') || '');
  const body = await parseJsonBody(request).catch(() => ({}));
  const rawRefreshToken =
    cookies.dtks_refresh_token || body.refreshToken || body.refresh_token || '';
  const clearCookies = buildClearAuthCookies();

  // If authenticated via cookie (either access cookie or refresh cookie), enforce CSRF validation
  const usingRefreshCookieOnly = !authResult?.authenticated && Boolean(cookies.dtks_refresh_token);
  if (usingRefreshCookieOnly) {
    const csrfHeader = request.headers.get('X-CSRF-Token') || '';
    if (!verifyCsrfTokenMatch(csrfHeader, cookies.dtks_csrf_token)) {
      return errorResponse(
        'CSRF token validation failed for cookie-authenticated request.',
        403,
        'CSRF_VALIDATION_FAILED'
      );
    }
  }

  let currentAdmin = authResult?.authenticated ? authResult.admin : null;
  let targetSessionId = authResult?.sessionId || null;

  // If access token expired or wasn't sent, validate the refresh session from the HttpOnly cookie
  if (!currentAdmin && rawRefreshToken) {
    const hash = await sha256Hex(rawRefreshToken);
    const sessionRow = await env.DB.prepare(
      'SELECT id, admin_id, expires_at, revoked_at FROM refresh_sessions WHERE refresh_token_hash = ? LIMIT 1'
    )
      .bind(hash)
      .first();

    if (
      sessionRow &&
      !sessionRow.revoked_at &&
      new Date(sessionRow.expires_at).getTime() > Date.now()
    ) {
      targetSessionId = sessionRow.id;
      const adminRow = await env.DB.prepare(
        'SELECT id, name, email, role, is_active FROM admins WHERE id = ?'
      )
        .bind(sessionRow.admin_id)
        .first();
      if (adminRow) {
        currentAdmin = mapAdminResponse(adminRow);
      }
    }
  }

  if (!currentAdmin) {
    return errorResponse(
      'Authentication required to sign out.',
      401,
      'UNAUTHORIZED',
      {},
      { 'Set-Cookie': clearCookies }
    );
  }

  const now = new Date().toISOString();
  const revokeAllDevices = Boolean(body.allDevices ?? body.all_devices);

  if (revokeAllDevices && currentAdmin.id) {
    await env.DB.prepare('UPDATE refresh_sessions SET revoked_at = ? WHERE admin_id = ?')
      .bind(now, currentAdmin.id)
      .run();
  } else {
    if (rawRefreshToken) {
      const hash = await sha256Hex(rawRefreshToken);
      await env.DB.prepare(
        'UPDATE refresh_sessions SET revoked_at = ? WHERE refresh_token_hash = ?'
      )
        .bind(now, hash)
        .run();
    }
    if (targetSessionId) {
      await env.DB.prepare('UPDATE refresh_sessions SET revoked_at = ? WHERE id = ?')
        .bind(now, targetSessionId)
        .run();
    }
  }

  await logAdminActivity(env, {
    adminId: currentAdmin.id,
    action: 'LOGOUT',
    entityType: 'Admin',
    entityId: currentAdmin.id,
    details: revokeAllDevices
      ? 'Administrator signed out from all devices'
      : 'Administrator signed out from current session',
    request,
  });

  return successResponse({ loggedOut: true }, 'Logged out successfully.', 200, {
    'Set-Cookie': clearCookies,
  });
}

export async function refreshAdminToken(request, env) {
  const cookies = parseCookies(request.headers.get('Cookie') || '');
  const body = await parseJsonBody(request).catch(() => ({}));
  const clearCookies = buildClearAuthCookies();

  const cookieRefreshToken =
    typeof cookies.dtks_refresh_token === 'string' ? cookies.dtks_refresh_token.trim() : '';
  const bodyRefreshToken =
    typeof (body.refreshToken || body.refresh_token) === 'string'
      ? (body.refreshToken || body.refresh_token).trim()
      : '';

  // Enforce CSRF check when cookie-based refresh is used and CSRF cookie is present
  if (cookieRefreshToken && cookies.dtks_csrf_token) {
    const csrfHeader = request.headers.get('X-CSRF-Token') || '';
    if (!verifyCsrfTokenMatch(csrfHeader, cookies.dtks_csrf_token)) {
      return errorResponse(
        'CSRF token validation failed for cookie-authenticated refresh request.',
        403,
        'CSRF_VALIDATION_FAILED'
      );
    }
  }

  const rawToken = cookieRefreshToken || bodyRefreshToken;
  if (!rawToken) {
    return errorResponse(
      'Refresh token is required.',
      401,
      'MISSING_REFRESH_TOKEN',
      {},
      { 'Set-Cookie': clearCookies }
    );
  }

  const tokenHash = await sha256Hex(rawToken);
  const session = await env.DB.prepare(
    'SELECT id, admin_id, expires_at, revoked_at FROM refresh_sessions WHERE refresh_token_hash = ?'
  )
    .bind(tokenHash)
    .first();

  if (!session) {
    return errorResponse(
      'Invalid or unrecognized refresh token.',
      401,
      'INVALID_REFRESH_TOKEN',
      {},
      { 'Set-Cookie': clearCookies }
    );
  }

  // Replay protection: if an already-revoked refresh token is presented again, revoke all active sessions for that admin
  if (session.revoked_at) {
    const now = new Date().toISOString();
    await env.DB.prepare(
      'UPDATE refresh_sessions SET revoked_at = ? WHERE admin_id = ? AND revoked_at IS NULL'
    )
      .bind(now, session.admin_id)
      .run();

    await logAdminActivity(env, {
      adminId: session.admin_id,
      action: 'REFRESH_TOKEN_REPLAY_DETECTED',
      entityType: 'Admin',
      entityId: session.admin_id,
      details: 'Revoked refresh token replay detected; invalidated active sessions for safety',
      request,
    });

    return errorResponse(
      'Invalid or revoked refresh token.',
      401,
      'INVALID_REFRESH_TOKEN',
      {},
      { 'Set-Cookie': clearCookies }
    );
  }

  if (new Date(session.expires_at).getTime() <= Date.now()) {
    const now = new Date().toISOString();
    await env.DB.prepare('UPDATE refresh_sessions SET revoked_at = ? WHERE id = ?')
      .bind(now, session.id)
      .run();
    return errorResponse(
      'Refresh token has expired. Please sign in again.',
      401,
      'REFRESH_TOKEN_EXPIRED',
      {},
      { 'Set-Cookie': clearCookies }
    );
  }

  const admin = await env.DB.prepare(
    'SELECT id, name, email, role, is_active, created_at, updated_at, last_login_at FROM admins WHERE id = ?'
  )
    .bind(session.admin_id)
    .first();

  if (!admin || !admin.is_active) {
    const now = new Date().toISOString();
    await env.DB.prepare('UPDATE refresh_sessions SET revoked_at = ? WHERE id = ?')
      .bind(now, session.id)
      .run();
    return errorResponse(
      'Administrator account is not active.',
      403,
      'ACCOUNT_DEACTIVATED',
      {},
      { 'Set-Cookie': clearCookies }
    );
  }

  // Rotate refresh token: revoke old session and issue a new one
  const now = new Date().toISOString();
  await env.DB.prepare('UPDATE refresh_sessions SET revoked_at = ? WHERE id = ?')
    .bind(now, session.id)
    .run();

  const accessExp = getAccessExpiresSeconds(env);
  const refreshExp = getRefreshExpiresSeconds(env);
  const newSessionId = generateRandomId('sess');

  const newAccessToken = await signJwt(
    {
      sub: admin.id,
      email: admin.email,
      role: admin.role,
      sid: newSessionId,
      type: 'access',
    },
    getJwtSecret(env),
    accessExp
  );

  const newRawRefreshToken = generateRandomToken(32);
  const newRefreshTokenHash = await sha256Hex(newRawRefreshToken);
  const newCsrfToken = generateRandomToken(32);
  const newExpiresAt = new Date(Date.now() + refreshExp * 1000).toISOString();

  await env.DB.prepare(
    `INSERT INTO refresh_sessions (id, admin_id, refresh_token_hash, user_agent, ip_address, expires_at, revoked_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, NULL, ?)`
  )
    .bind(
      newSessionId,
      admin.id,
      newRefreshTokenHash,
      (request.headers.get('User-Agent') || '').slice(0, 255),
      getClientIp(request),
      newExpiresAt,
      now
    )
    .run();

  const authCookies = buildAuthCookies({
    accessToken: newAccessToken,
    refreshToken: newRawRefreshToken,
    csrfToken: newCsrfToken,
    accessMaxAge: accessExp,
    refreshMaxAge: refreshExp,
  });

  // Never expose raw refreshToken in the JSON body; it is rotated via the HttpOnly cookie.
  return successResponse(
    {
      accessToken: newAccessToken,
      access_token: newAccessToken,
      csrfToken: newCsrfToken,
      csrf_token: newCsrfToken,
      expiresIn: accessExp,
      expires_in: accessExp,
      admin: mapAdminResponse(admin),
    },
    'Session token refreshed.',
    200,
    { 'Set-Cookie': authCookies }
  );
}

export async function getAuthenticatedAdmin(request, env, admin) {
  return successResponse({ admin }, 'Authenticated administrator profile.');
}

export async function changeAdminPassword(request, env, admin) {
  const body = await parseJsonBody(request);
  const validation = validateChangePasswordInput({
    currentPassword: body.currentPassword ?? body.current_password,
    newPassword: body.newPassword ?? body.new_password,
  });
  if (!validation.isValid) {
    return errorResponse('Password validation failed.', 400, 'VALIDATION_ERROR', validation.errors);
  }

  const { currentPassword, newPassword } = validation.data;
  const row = await env.DB.prepare('SELECT id, password_hash FROM admins WHERE id = ?')
    .bind(admin.id)
    .first();

  if (!row) {
    return errorResponse('Administrator account not found.', 404, 'NOT_FOUND');
  }

  const matches = await verifyPassword(currentPassword, row.password_hash);
  if (!matches) {
    return errorResponse('Current password is incorrect.', 401, 'INVALID_CURRENT_PASSWORD');
  }

  const newHash = await hashPassword(newPassword);
  const now = new Date().toISOString();

  await env.DB.prepare('UPDATE admins SET password_hash = ?, updated_at = ? WHERE id = ?')
    .bind(newHash, now, admin.id)
    .run();

  // Revoke existing refresh sessions on password change
  await env.DB.prepare('UPDATE refresh_sessions SET revoked_at = ? WHERE admin_id = ?')
    .bind(now, admin.id)
    .run();

  await logAdminActivity(env, {
    adminId: admin.id,
    action: 'PASSWORD_CHANGED',
    entityType: 'Admin',
    entityId: admin.id,
    details: 'Administrator updated account password',
    request,
  });

  return successResponse({ updated: true }, 'Password changed successfully.');
}

export async function updateAdminProfile(request, env, admin) {
  const body = await parseJsonBody(request);
  const name = typeof body.name === 'string' ? sanitizeText(body.name, 160) : admin.name;
  if (!name || name.length < 2) {
    return errorResponse(
      'Administrator name must be at least 2 characters.',
      400,
      'VALIDATION_ERROR'
    );
  }
  const now = new Date().toISOString();
  await env.DB.prepare('UPDATE admins SET name = ?, updated_at = ? WHERE id = ?')
    .bind(name, now, admin.id)
    .run();

  await logAdminActivity(env, {
    adminId: admin.id,
    action: 'UPDATE_PROFILE',
    entityType: 'Admin',
    entityId: admin.id,
    details: `Updated profile name to ${name}`,
    request,
  });

  return successResponse(
    {
      admin: {
        ...admin,
        name,
        updated_at: now,
        updatedAt: now,
      },
    },
    'Admin profile updated.'
  );
}

/**
 * Super Admin Only: Manage Administrator Accounts (`GET/POST /api/v1/admin/users`, `PATCH/DELETE /api/v1/admin/users/:id`)
 */
export async function listAdminUsers(request, env) {
  const result = await env.DB.prepare(
    'SELECT id, name, email, role, is_active, created_at, updated_at, last_login_at FROM admins ORDER BY created_at ASC'
  ).all();
  const admins = (result.results || []).map((r) => mapAdminResponse(r));
  return successResponse({ admins }, 'Administrator accounts fetched.');
}

export async function createAdminUser(request, env, currentAdmin) {
  const body = await parseJsonBody(request);
  const name = sanitizeText(body.name, 160);
  const email = sanitizeText(body.email, 254).toLowerCase();
  const password = typeof body.password === 'string' ? body.password : '';
  const role = VALID_ADMIN_ROLES.includes(body.role) ? body.role : 'editor';
  const isActive = body.isActive !== undefined ? Boolean(body.isActive) : true;

  const errors = {};
  if (!name || name.length < 2) {
    errors.name = 'Administrator name is required (at least 2 characters).';
  }
  if (!isValidEmail(email)) {
    errors.email = 'A valid email address is required.';
  }
  if (!password || password.length < 8) {
    errors.password = 'Password must be at least 8 characters long.';
  }
  if (body.role !== undefined && !VALID_ADMIN_ROLES.includes(body.role)) {
    errors.role = `Invalid role. Allowed values: ${VALID_ADMIN_ROLES.join(', ')}`;
  }

  if (Object.keys(errors).length > 0) {
    return errorResponse('Administrator validation failed.', 400, 'VALIDATION_ERROR', errors);
  }

  const existing = await env.DB.prepare('SELECT id FROM admins WHERE lower(email) = lower(?)')
    .bind(email)
    .first();
  if (existing) {
    return errorResponse(
      'An administrator account with this email already exists.',
      409,
      'DUPLICATE_RECORD',
      { field: 'email' }
    );
  }

  const id = generateRandomId('adm');
  const passwordHash = await hashPassword(password);
  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO admins (id, name, email, password_hash, role, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(id, name, email, passwordHash, role, isActive ? 1 : 0, now, now)
    .run();

  const created = await env.DB.prepare(
    'SELECT id, name, email, role, is_active, created_at, updated_at, last_login_at FROM admins WHERE id = ?'
  )
    .bind(id)
    .first();

  await logAdminActivity(env, {
    adminId: currentAdmin.id,
    action: 'CREATE_ADMIN_USER',
    entityType: 'Admin',
    entityId: id,
    details: `Created administrator ${email} with role ${role}`,
    request,
  });

  return successResponse(
    { admin: mapAdminResponse(created) },
    'Administrator account created.',
    201
  );
}

export async function updateAdminUser(request, env, currentAdmin, id) {
  const existing = await env.DB.prepare(
    'SELECT id, name, email, role, is_active, created_at, updated_at, last_login_at FROM admins WHERE id = ?'
  )
    .bind(id)
    .first();

  if (!existing) {
    return errorResponse('Administrator account not found.', 404, 'NOT_FOUND');
  }

  const body = await parseJsonBody(request);
  const name = body.name !== undefined ? sanitizeText(body.name, 160) : existing.name;
  if (!name || name.length < 2) {
    return errorResponse('Administrator name must be at least 2 characters.', 400, 'VALIDATION_ERROR');
  }

  let role = existing.role;
  if (body.role !== undefined) {
    if (!VALID_ADMIN_ROLES.includes(body.role)) {
      return errorResponse(
        `Invalid role. Allowed values: ${VALID_ADMIN_ROLES.join(', ')}`,
        400,
        'VALIDATION_ERROR'
      );
    }
    role = body.role;
  }

  const isActiveRaw =
    body.isActive !== undefined
      ? body.isActive
      : body.is_active !== undefined
      ? body.is_active
      : Boolean(existing.is_active);
  const isActive = Boolean(isActiveRaw);

  if (existing.id === currentAdmin.id && (!isActive || role !== 'super_admin')) {
    return errorResponse(
      'You cannot deactivate or demote your own super_admin account.',
      400,
      'SELF_MODIFICATION_FORBIDDEN'
    );
  }

  const now = new Date().toISOString();
  await env.DB.prepare(
    'UPDATE admins SET name = ?, role = ?, is_active = ?, updated_at = ? WHERE id = ?'
  )
    .bind(name, role, isActive ? 1 : 0, now, id)
    .run();

  if (!isActive) {
    await env.DB.prepare('UPDATE refresh_sessions SET revoked_at = ? WHERE admin_id = ?')
      .bind(now, id)
      .run();
  }

  const updated = await env.DB.prepare(
    'SELECT id, name, email, role, is_active, created_at, updated_at, last_login_at FROM admins WHERE id = ?'
  )
    .bind(id)
    .first();

  await logAdminActivity(env, {
    adminId: currentAdmin.id,
    action: 'UPDATE_ADMIN_USER',
    entityType: 'Admin',
    entityId: id,
    details: `Updated administrator ${existing.email} (role: ${role}, active: ${isActive})`,
    request,
  });

  return successResponse({ admin: mapAdminResponse(updated) }, 'Administrator account updated.');
}

export async function deleteAdminUser(request, env, currentAdmin, id) {
  if (id === currentAdmin.id) {
    return errorResponse('You cannot delete your own administrator account.', 400, 'SELF_DELETE_FORBIDDEN');
  }

  const existing = await env.DB.prepare('SELECT id, email FROM admins WHERE id = ?')
    .bind(id)
    .first();
  if (!existing) {
    return errorResponse('Administrator account not found.', 404, 'NOT_FOUND');
  }

  await env.DB.prepare('DELETE FROM admins WHERE id = ?').bind(id).run();

  await logAdminActivity(env, {
    adminId: currentAdmin.id,
    action: 'DELETE_ADMIN_USER',
    entityType: 'Admin',
    entityId: id,
    details: `Deleted administrator ${existing.email}`,
    request,
  });

  return successResponse({ deletedId: id }, 'Administrator account deleted.');
}
