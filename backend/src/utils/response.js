import { generateRandomId } from './crypto.js';

/**
 * Standardized API Response & Request Parsing Utilities
 */

export function jsonResponse(body, status = 200, extraHeaders = {}) {
  const headers = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });

  if (extraHeaders && typeof extraHeaders === 'object') {
    for (const [key, val] of Object.entries(extraHeaders)) {
      if (val === undefined || val === null) continue;
      if (key.toLowerCase() === 'set-cookie' && Array.isArray(val)) {
        for (const cookieStr of val) {
          if (cookieStr) headers.append('Set-Cookie', cookieStr);
        }
      } else {
        headers.set(key, String(val));
      }
    }
  }

  return new Response(JSON.stringify(body), {
    status,
    headers,
  });
}

export function successResponse(data, message = 'OK', status = 200, extraHeaders = {}) {
  return jsonResponse(
    {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    },
    status,
    extraHeaders
  );
}

export function errorResponse(
  message,
  status = 400,
  code = 'BAD_REQUEST',
  details = null,
  extraHeaders = {},
  requestId = null
) {
  const resolvedRequestId =
    requestId ||
    extraHeaders?.['X-Request-Id'] ||
    extraHeaders?.['x-request-id'] ||
    (details && typeof details === 'object' && details.requestId ? details.requestId : null) ||
    generateRandomId('req');

  const safeDetails =
    details && typeof details === 'object' && !Array.isArray(details)
      ? { ...details }
      : details !== null && details !== undefined
      ? { info: details }
      : {};

  const payload = {
    success: false,
    error: {
      code,
      message,
      details: safeDetails,
    },
    requestId: resolvedRequestId,
    timestamp: new Date().toISOString(),
  };

  return jsonResponse(payload, status, {
    'X-Request-Id': resolvedRequestId,
    ...extraHeaders,
  });
}

export async function parseJsonBody(request, maxBytes = 1024 * 1024) {
  const contentLength = request.headers.get('content-length');
  if (contentLength && Number.parseInt(contentLength, 10) > maxBytes) {
    const err = new Error(
      `Request payload exceeds maximum size of ${Math.round(maxBytes / 1024)}KB.`
    );
    err.status = 413;
    err.code = 'PAYLOAD_TOO_LARGE';
    throw err;
  }

  const rawText = await request.text();
  if (rawText.length > maxBytes) {
    const err = new Error(
      `Request payload exceeds maximum size of ${Math.round(maxBytes / 1024)}KB.`
    );
    err.status = 413;
    err.code = 'PAYLOAD_TOO_LARGE';
    throw err;
  }

  if (!rawText.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(rawText);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      const err = new Error('JSON body must be an object.');
      err.status = 400;
      err.code = 'INVALID_JSON_OBJECT';
      throw err;
    }
    return parsed;
  } catch (e) {
    if (e.code === 'INVALID_JSON_OBJECT') throw e;
    const err = new Error('Invalid JSON payload.');
    err.status = 400;
    err.code = 'MALFORMED_JSON';
    throw err;
  }
}

export function safeJsonParse(value, fallback = []) {
  if (value === null || value === undefined) return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function sanitizeText(input, maxLength = 5000) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/\u0000/g, '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<\/?script[^>]*>/gi, '')
    .replace(/<\/?(?:iframe|object|embed)[^>]*>/gi, '')
    .replace(/\bon\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, maxLength);
}
