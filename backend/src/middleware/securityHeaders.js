import { buildCorsHeaders } from '../config/cors.js';
import { resolveRequestId } from './errorHandler.js';

/**
 * Applies production security headers, correlation X-Request-Id, and CORS allowlist headers to every API response.
 */
export function applySecurityAndCorsHeaders(response, request, env = {}) {
  const headers = new Headers(response.headers);
  const corsHeaders = buildCorsHeaders(request, env);

  for (const [key, value] of Object.entries(corsHeaders)) {
    headers.set(key, value);
  }

  if (!headers.get('X-Request-Id')) {
    headers.set('X-Request-Id', resolveRequestId(request));
  }

  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'SAMEORIGIN');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  headers.set(
    'Content-Security-Policy',
    "default-src 'self'; frame-ancestors 'self';"
  );

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
