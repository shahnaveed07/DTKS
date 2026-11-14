import { generateRandomId } from '../utils/crypto.js';
import { errorResponse } from '../utils/response.js';

const SENSITIVE_LOG_PATTERN =
  /(password|password_hash|jwt_secret|resend_api_key|authorization|cookie|refresh_token)/i;

function redactSensitiveText(text = '') {
  return String(text)
    .replace(/(\$pbkdf2-sha512\$[^\s"',]+|\$argon2id\$[^\s"',]+)/gi, '[REDACTED_HASH]')
    .replace(/(Bearer\s+)[A-Za-z0-9._-]+/gi, '$1[REDACTED_TOKEN]')
    .replace(/(dtks_(?:access|refresh)_token=)[^;\s]+/gi, '$1[REDACTED_COOKIE]');
}

function redactContextObject(obj = {}) {
  if (!obj || typeof obj !== 'object') return {};
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (SENSITIVE_LOG_PATTERN.test(k)) {
      out[k] = '[REDACTED]';
    } else if (typeof v === 'string') {
      out[k] = redactSensitiveText(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

/**
 * Resolves or generates a correlation request ID (prefers Cloudflare CF-Ray or X-Request-Id).
 */
export function resolveRequestId(request = null) {
  if (request && typeof request.headers?.get === 'function') {
    const cfRay = request.headers.get('cf-ray') || request.headers.get('CF-Ray');
    if (cfRay) return cfRay;
    const headerId = request.headers.get('x-request-id') || request.headers.get('X-Request-Id');
    if (headerId) return headerId;
  }
  if (request && request._dtksRequestId) {
    return request._dtksRequestId;
  }
  const generated = generateRandomId('req');
  if (request && typeof request === 'object') {
    try {
      request._dtksRequestId = generated;
    } catch {
      // Ignore if Request instance is frozen
    }
  }
  return generated;
}

/**
 * Emits a structured JSON diagnostic log entry to server-side logs only.
 * Never exposes stack traces or sensitive SQL/secret details to HTTP clients.
 */
export function logServerError(err, request = null, extraContext = {}) {
  const requestId = resolveRequestId(request);
  let pathname = '/';
  let method = 'UNKNOWN';

  if (request) {
    method = (request.method || 'GET').toUpperCase();
    try {
      pathname = new URL(request.url).pathname;
    } catch {
      pathname = String(request.url || '/');
    }
  }

  const logEntry = {
    level: 'error',
    service: 'dtks-backend-api',
    timestamp: new Date().toISOString(),
    requestId,
    method,
    pathname,
    errorName: err?.name || 'Error',
    errorCode: err?.code || 'INTERNAL_SERVER_ERROR',
    errorMessage: redactSensitiveText(err?.message || String(err)),
    ...redactContextObject(extraContext),
  };

  console.error('[DTKS Backend Error]:', JSON.stringify(logEntry));
  return requestId;
}

/**
 * Centralized exception handler that logs full diagnostics server-side while
 * returning a sanitized, consistent JSON error response to the client.
 */
export function handleException(err, request = null) {
  const requestId = logServerError(err, request);
  const rawMessage = String(err?.message || '');

  // 1. Classify uninitialized database schema or missing D1 binding as 503 Service Unavailable
  if (
    err?.code === 'DATABASE_SCHEMA_MISSING' ||
    err?.code === 'DATABASE_UNAVAILABLE' ||
    /no such table/i.test(rawMessage)
  ) {
    return errorResponse(
      'Database service or schema is not ready. Ensure D1 migrations have been applied.',
      503,
      err?.code === 'DATABASE_UNAVAILABLE' ? 'DATABASE_UNAVAILABLE' : 'DATABASE_SCHEMA_MISSING',
      { requestId },
      { 'X-Request-Id': requestId },
      requestId
    );
  }

  // 2. Classify missing R2 binding as 503 Service Unavailable
  if (err?.code === 'STORAGE_UNAVAILABLE') {
    return errorResponse(
      'Object storage service (R2) is currently unavailable.',
      503,
      'STORAGE_UNAVAILABLE',
      { requestId },
      { 'X-Request-Id': requestId },
      requestId
    );
  }

  // 3. Classify R2 storage operation failures safely without leaking internal details
  if (err?.code === 'STORAGE_ERROR' || /R2_ERROR|ASSETS_BUCKET/i.test(rawMessage)) {
    return errorResponse(
      'An object storage error occurred while processing the media file.',
      500,
      'STORAGE_ERROR',
      { requestId },
      { 'X-Request-Id': requestId },
      requestId
    );
  }

  // 4. Classify unique constraint / duplicate record violations as 409 Conflict
  if (
    err?.code === 'DUPLICATE_RECORD' ||
    /UNIQUE constraint failed|SQLITE_CONSTRAINT_UNIQUE|SQLITE_CONSTRAINT_PRIMARYKEY/i.test(
      rawMessage
    )
  ) {
    return errorResponse(
      err?.code === 'DUPLICATE_RECORD' && err?.message
        ? err.message
        : 'A record with the same unique identifier already exists.',
      409,
      'DUPLICATE_RECORD',
      err?.details || { requestId },
      { 'X-Request-Id': requestId },
      requestId
    );
  }

  // 5. Classify general SQLite / D1 query execution failures safely without leaking SQL
  if (
    err?.code === 'DATABASE_QUERY_ERROR' ||
    /D1_ERROR|SQLITE_ERROR|SQLITE_CONSTRAINT|database is locked/i.test(rawMessage)
  ) {
    return errorResponse(
      'A database error occurred while processing your request.',
      500,
      'DATABASE_ERROR',
      { requestId },
      { 'X-Request-Id': requestId },
      requestId
    );
  }

  // 6. Classify network-related external integration errors
  if (err?.code === 'EXTERNAL_SERVICE_ERROR') {
    return errorResponse(
      'An upstream external integration is temporarily unavailable.',
      503,
      'EXTERNAL_SERVICE_ERROR',
      { requestId },
      { 'X-Request-Id': requestId },
      requestId
    );
  }

  const status = typeof err?.status === 'number' ? err.status : 500;
  const code = err?.code || (status === 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_ERROR');

  if (status >= 500) {
    return errorResponse(
      'An unexpected server error occurred while processing your request.',
      status,
      code,
      { requestId },
      { 'X-Request-Id': requestId },
      requestId
    );
  }

  return errorResponse(
    err?.message || 'Invalid request.',
    status,
    code,
    err?.details || { requestId },
    { 'X-Request-Id': requestId },
    requestId
  );
}
