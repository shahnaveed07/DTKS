/**
 * DreamTech Kashmir Solutions (DTKS)
 * Configurable Data Adapter, Auth Session Manager & REST API Client
 *
 * Supports two modes via VITE_DATA_ADAPTER:
 * - 'local' (local development default when VITE_API_BASE_URL is not set): Uses browser LocalStorage.
 * - 'api' (DTKS_BE backend): Sends HTTP requests to VITE_API_BASE_URL (/api/v1) with JWT Bearer / cookie auth.
 *
 * CRITICAL RULE: When VITE_DATA_ADAPTER='api' or in production, failed API requests NEVER silently fall back to LocalStorage.
 */

import { API_ENDPOINTS, API_PREFIX } from '../models/backendModels.js';
import { isValidEmailAddress } from '../../utils/authValidation.js';

export const DEFAULT_API_TIMEOUT_MS = 15000;
const SESSION_STORAGE_AUTH_KEY = 'dtks_admin_auth_session_v1';

let runtimeEnvOverrides = null;
let memoryAuthSession = null;
let bootstrappedAdminCsrfToken = '';
let activeAdminCsrfPromise = null;
const authListeners = new Set();

export function setRuntimeEnvOverrides(overrides = null) {
  runtimeEnvOverrides = overrides;
}

function readEnvVar(name) {
  if (runtimeEnvOverrides) {
    if (name in runtimeEnvOverrides) {
      return runtimeEnvOverrides[name];
    }
    if (name === 'VITE_DATA_ADAPTER' && 'dataAdapter' in runtimeEnvOverrides) {
      return runtimeEnvOverrides.dataAdapter;
    }
    if (name === 'VITE_API_BASE_URL' && 'apiBaseUrl' in runtimeEnvOverrides) {
      return runtimeEnvOverrides.apiBaseUrl;
    }
  }
  try {
    if (import.meta?.env && name in import.meta.env) {
      return import.meta.env[name];
    }
  } catch {
    // Fallback for Node.js test/SSR environments
  }
  if (typeof process !== 'undefined' && process.env && name in process.env) {
    return process.env[name];
  }
  return undefined;
}

export function getDataAdapterMode() {
  const mode = readEnvVar('VITE_DATA_ADAPTER');
  if (mode) {
    const normalized = String(mode).trim().toLowerCase();
    if (normalized === 'api') return 'api';
    if (normalized === 'local') return 'local';
  }
  const configuredBaseUrl = readEnvVar('VITE_API_BASE_URL');
  if (configuredBaseUrl && String(configuredBaseUrl).trim()) {
    return 'api';
  }
  return 'local';
}

export function getApiOrigin() {
  const rawBase = readEnvVar('VITE_API_BASE_URL');
  if (!rawBase || !String(rawBase).trim()) {
    return '';
  }
  const trimmed = String(rawBase).trim().replace(/\/+$/, '');
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      return parsed.origin;
    } catch {
      return '';
    }
  }
  return '';
}

export function getApiBaseUrl() {
  const rawBase = readEnvVar('VITE_API_BASE_URL');
  if (!rawBase || !String(rawBase).trim()) {
    return API_PREFIX;
  }
  const trimmed = String(rawBase).trim().replace(/\/+$/, '');
  if (trimmed.endsWith('/api/v1')) {
    return trimmed;
  }
  if (trimmed.endsWith('/api')) {
    return `${trimmed}/v1`;
  }
  return `${trimmed}${API_PREFIX}`;
}

export function buildApiUrl(endpoint = '') {
  const rawEndpoint = String(endpoint || '').trim();
  if (/^https?:\/\//i.test(rawEndpoint)) {
    return rawEndpoint;
  }
  const baseUrl = getApiBaseUrl();
  const normalizedEndpoint = rawEndpoint.startsWith('/') ? rawEndpoint : `/${rawEndpoint}`;

  if (normalizedEndpoint === API_PREFIX || normalizedEndpoint.startsWith(`${API_PREFIX}/`) || normalizedEndpoint.startsWith(`${API_PREFIX}?`)) {
    const suffix = normalizedEndpoint.slice(API_PREFIX.length);
    return `${baseUrl}${suffix}`;
  }
  if (normalizedEndpoint.startsWith('/api/')) {
    const suffix = normalizedEndpoint.slice('/api'.length);
    return `${baseUrl}${suffix}`;
  }
  return `${baseUrl}${normalizedEndpoint}`;
}

export function isLocalhostApiUrl(url = '') {
  try {
    const parsed = new URL(String(url || ''));
    const host = parsed.hostname.toLowerCase();
    return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]';
  } catch {
    return false;
  }
}

export function validateApiRequestUrl(url = '') {
  const raw = String(url || '').trim();
  if (!raw) {
    return {
      ok: false,
      errorType: 'BackendNotConfiguredError',
      errorCode: 'INVALID_API_BASE_URL',
      statusCode: 503,
      message: 'API request URL is missing.',
    };
  }

  const isAbsolute = /^https?:\/\//i.test(raw);
  if (!isAbsolute) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(raw) || raw.startsWith('//')) {
      return {
        ok: false,
        errorType: 'UntrustedOriginError',
        errorCode: 'UNTRUSTED_API_ORIGIN',
        statusCode: 400,
        message: 'Blocked API request to an invalid URL scheme.',
      };
    }
    return { ok: true };
  }

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return {
      ok: false,
      errorType: 'BackendNotConfiguredError',
      errorCode: 'INVALID_API_BASE_URL',
      statusCode: 503,
      message: 'API URL is malformed.',
    };
  }

  const expectedOrigin = getApiOrigin();
  if (expectedOrigin && parsed.origin !== expectedOrigin) {
    return {
      ok: false,
      errorType: 'UntrustedOriginError',
      errorCode: 'UNTRUSTED_API_ORIGIN',
      statusCode: 400,
      message: 'Blocked API request to an untrusted origin.',
    };
  }
  if (!expectedOrigin) {
    return {
      ok: false,
      errorType: 'UntrustedOriginError',
      errorCode: 'UNTRUSTED_API_ORIGIN',
      statusCode: 400,
      message: 'Blocked external API request because VITE_API_BASE_URL is not configured.',
    };
  }

  if (isProductionEnvironment() && isLocalhostApiUrl(raw)) {
    return {
      ok: false,
      errorType: 'BackendNotConfiguredError',
      errorCode: 'INVALID_API_BASE_URL',
      statusCode: 503,
      message: 'Production API base URL is misconfigured to localhost.',
    };
  }

  if (isProductionEnvironment() && parsed.protocol === 'http:') {
    return {
      ok: false,
      errorType: 'InsecureTransportError',
      errorCode: 'INSECURE_API_TRANSPORT',
      statusCode: 503,
      message: 'Production API requests require a secure HTTPS endpoint.',
    };
  }

  return { ok: true };
}

export function resolveBackendAssetUrl(urlOrPath = '') {
  const str = String(urlOrPath || '').trim();
  if (!str) return '';
  if (/[\u0000-\u001f\u007f\\]/.test(str)) return '';

  if (/^idb:\/\/[a-z0-9._-]+$/i.test(str)) {
    return str;
  }
  if (/^blob:/i.test(str)) {
    try {
      return new URL(str).protocol === 'blob:' ? str : '';
    } catch {
      return '';
    }
  }
  if (/^data:/i.test(str)) {
    return /^data:image\/(?:png|jpe?g|webp|gif);base64,[a-z0-9+/=]+$/i.test(str) ? str : '';
  }
  if (str.startsWith('/api/v1/uploads/')) {
    if (str.startsWith('//') || /%2f|%5c/i.test(str)) return '';
    const origin = getApiOrigin();
    return origin ? `${origin}${str}` : str;
  }
  if (str.startsWith('/')) {
    if (str.startsWith('//') || /%2f|%5c/i.test(str)) return '';
    return str;
  }
  try {
    const parsed = new URL(str);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.href;
    }
  } catch {
    return '';
  }
  return '';
}

/**
 * Determines whether the application is running in the public production environment.
 */
export function isProductionEnvironment() {
  if (runtimeEnvOverrides && typeof runtimeEnvOverrides.isProd === 'boolean') {
    return runtimeEnvOverrides.isProd;
  }

  const explicitEnv = readEnvVar('VITE_APP_ENV') || readEnvVar('NODE_ENV');
  if (explicitEnv === 'development' || explicitEnv === 'test') {
    return false;
  }
  if (explicitEnv === 'production') {
    if (typeof window !== 'undefined' && window.location?.hostname) {
      const host = window.location.hostname.toLowerCase();
      if (host === 'localhost' || host === '127.0.0.1') {
        return Boolean(readEnvVar('VITE_FORCE_PRODUCTION_MODE') === 'true');
      }
    }
    return true;
  }

  if (typeof window !== 'undefined' && window.location?.hostname) {
    const host = window.location.hostname.toLowerCase();
    if (host === 'dreamtechkashmirsolutions.studio' || host.endsWith('.dreamtechkashmirsolutions.studio')) {
      return true;
    }
    if (host === 'localhost' || host === '127.0.0.1') {
      return Boolean(readEnvVar('VITE_FORCE_PRODUCTION_MODE') === 'true');
    }
  }

  try {
    if (import.meta?.env?.PROD) {
      if (typeof window !== 'undefined' && window.location?.hostname) {
        const host = window.location.hostname.toLowerCase();
        if (host === 'localhost' || host === '127.0.0.1') {
          return Boolean(readEnvVar('VITE_FORCE_PRODUCTION_MODE') === 'true');
        }
      }
      return true;
    }
  } catch {
    // Ignore
  }

  return false;
}

/**
 * Determines customer order & inquiry submission mode:
 * - 'api': Backend API is active (`VITE_DATA_ADAPTER=api` or `VITE_API_BASE_URL` configured)
 * - 'production_unconfigured': Production build without backend (`local` adapter in production) — online submission disabled
 * - 'local_demo': Development/test browser mode — local demo submission allowed with explicit notice
 */
export function getSubmissionMode() {
  const adapter = getDataAdapterMode();
  if (adapter === 'api') {
    return 'api';
  }
  if (isProductionEnvironment()) {
    return 'production_unconfigured';
  }
  return 'local_demo';
}

/**
 * Determines Admin route access policy:
 * - 'session_required': When `VITE_DATA_ADAPTER=api`, requires server-verified session (`GET /api/v1/auth/me`)
 * - 'blocked_production_local': When running in production with `local` adapter, blocks public access to demo Admin
 * - 'allowed_dev': In local development (`localhost` / `DEV`), allows access to Admin for development & testing
 */
export function getAdminAccessPolicy() {
  const adapter = getDataAdapterMode();
  if (adapter === 'api') {
    return 'session_required';
  }
  if (isProductionEnvironment()) {
    return 'blocked_production_local';
  }
  return 'allowed_dev';
}

// ============================================================================
// ADMIN AUTHENTICATION SESSION STATE (Strictly Volatile In-Memory ONLY)
// Never persists access tokens, refresh tokens, or CSRF tokens in Web Storage.
// ============================================================================

function purgeLegacyAdminStorageTokens() {
  try {
    if (typeof window !== 'undefined') {
      window.sessionStorage?.removeItem?.(SESSION_STORAGE_AUTH_KEY);
      window.localStorage?.removeItem?.(SESSION_STORAGE_AUTH_KEY);
    }
  } catch {
    // Ignore Web Storage access errors in restricted/SSR contexts
  }
}

function notifyAuthListeners() {
  const snapshot = getAdminAuthSession();
  for (const listener of authListeners) {
    try {
      listener(snapshot);
    } catch {
      // Ignore listener errors
    }
  }
}

export function subscribeAdminAuth(listener) {
  if (typeof listener !== 'function') return () => {};
  authListeners.add(listener);
  return () => {
    authListeners.delete(listener);
  };
}

export function getAdminAuthSession() {
  return memoryAuthSession || null;
}

export function setAdminAuthSession(sessionData) {
  if (!sessionData || typeof sessionData !== 'object') {
    clearAdminAuthSession();
    return null;
  }
  const current = getAdminAuthSession() || {};
  const accessToken =
    sessionData.accessToken ?? sessionData.access_token ?? current.accessToken ?? '';
  const refreshToken =
    sessionData.refreshToken ?? sessionData.refresh_token ?? current.refreshToken ?? '';
  const csrfToken =
    sessionData.csrfToken ?? sessionData.csrf_token ?? current.csrfToken ?? '';
  const expiresIn = Number(
    sessionData.expiresIn ?? sessionData.expires_in ?? current.expiresIn ?? 900
  );
  const admin = sessionData.admin ?? current.admin ?? null;

  memoryAuthSession = {
    accessToken: String(accessToken || ''),
    refreshToken: String(refreshToken || ''),
    csrfToken: String(csrfToken || ''),
    expiresIn,
    expiresAt: sessionData.expiresAt || new Date(Date.now() + expiresIn * 1000).toISOString(),
    admin,
  };

  purgeLegacyAdminStorageTokens();
  notifyAuthListeners();
  return memoryAuthSession;
}

export function clearAdminAuthSession() {
  memoryAuthSession = null;
  bootstrappedAdminCsrfToken = '';
  purgeLegacyAdminStorageTokens();
  notifyAuthListeners();
}

export function getAccessToken() {
  return getAdminAuthSession()?.accessToken || '';
}

export function getRefreshToken() {
  return getAdminAuthSession()?.refreshToken || '';
}

export function getCsrfToken() {
  return getAdminAuthSession()?.csrfToken || bootstrappedAdminCsrfToken || '';
}

export async function bootstrapAdminCsrf() {
  if (getDataAdapterMode() !== 'api') return '';
  if (activeAdminCsrfPromise) return activeAdminCsrfPromise;

  activeAdminCsrfPromise = (async () => {
    try {
      const url = buildApiUrl(API_ENDPOINTS.authCsrf);
      const urlCheck = validateApiRequestUrl(url);
      if (!urlCheck.ok) return '';

      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
        },
      });

      const contentType = response.headers?.get?.('content-type') || '';
      let payload = null;
      if (contentType.includes('application/json')) {
        try {
          payload = await response.json();
        } catch {
          payload = null;
        }
      } else {
        try {
          const text = await response.text();
          if (text && text.trim().startsWith('{')) {
            payload = JSON.parse(text);
          }
        } catch {
          payload = null;
        }
      }

      const token = String(
        payload?.data?.csrfToken ||
          payload?.data?.csrf_token ||
          payload?.csrfToken ||
          payload?.csrf_token ||
          ''
      ).trim();

      if (!response.ok || !token) {
        return '';
      }

      bootstrappedAdminCsrfToken = token;
      const current = getAdminAuthSession();
      if (current && !current.csrfToken) {
        setAdminAuthSession({
          ...current,
          csrfToken: token,
        });
      }
      return token;
    } catch {
      return '';
    } finally {
      activeAdminCsrfPromise = null;
    }
  })();

  return activeAdminCsrfPromise;
}

function hasRefreshableSession() {
  return Boolean(getRefreshToken() || getCsrfToken() || getAdminAuthSession());
}

/**
 * Standardized Service Response Envelope
 */
export function createServiceResponse(
  data,
  message = 'Operation completed successfully.',
  success = true,
  extra = {}
) {
  return {
    success: Boolean(success),
    data,
    message,
    adapter: getDataAdapterMode(),
    timestamp: new Date().toISOString(),
    ...extra,
  };
}

export function createServiceError(
  message = 'An unexpected error occurred.',
  data = null,
  meta = {}
) {
  const errorCode =
    meta.errorCode ||
    meta.code ||
    (data && typeof data === 'object' ? data.errorCode || data.code : null) ||
    null;
  const errorType =
    meta.errorType ||
    errorCode ||
    (data && typeof data === 'object' ? data.errorType : null) ||
    'ServiceError';
  const details =
    meta.details ??
    (data && typeof data === 'object' && 'details' in data ? data.details : null);

  return {
    success: false,
    data,
    message,
    errorType,
    errorCode: errorCode || errorType,
    details,
    statusCode: meta.statusCode ?? null,
    adapter: getDataAdapterMode(),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Extracts structured error details from DTKS_BE or generic HTTP error payloads.
 * DTKS_BE format: { success: false, error: { code, message, details }, timestamp }
 */
export function parseApiErrorPayload(payload, status = 500) {
  const errorObj =
    payload && typeof payload === 'object' && payload.error && typeof payload.error === 'object'
      ? payload.error
      : null;

  const code =
    errorObj?.code ||
    (payload && typeof payload === 'object' ? payload.errorCode || payload.code : null) ||
    (status === 401
      ? 'UNAUTHORIZED'
      : status === 403
      ? 'FORBIDDEN'
      : status === 404
      ? 'NOT_FOUND'
      : status === 429
      ? 'RATE_LIMITED'
      : 'HTTP_ERROR');

  const details =
    errorObj?.details ??
    (payload && typeof payload === 'object' ? payload.details || payload.errors || null : null);

  let baseMessage =
    errorObj?.message ||
    (payload && typeof payload?.error === 'string' ? payload.error : null) ||
    (payload && typeof payload?.message === 'string' ? payload.message : null) ||
    `API request failed with HTTP status ${status}.`;

  if (details && typeof details === 'object' && !Array.isArray(details)) {
    const fieldMessages = Object.entries(details)
      .filter(([key, val]) => key !== 'requestId' && typeof val === 'string' && val.trim())
      .map(([, val]) => val.trim());
    if (fieldMessages.length > 0 && !baseMessage.includes(fieldMessages[0])) {
      baseMessage = `${baseMessage} ${fieldMessages.join(' ')}`.trim();
    }
  }

  return {
    code,
    message: baseMessage,
    details,
    statusCode: status,
  };
}

let activeRefreshPromise = null;

async function attemptTokenRefresh() {
  const refreshToken = getRefreshToken();
  const csrfToken = getCsrfToken();
  if (!refreshToken && !csrfToken && !getAdminAuthSession()) return null;

  if (activeRefreshPromise) {
    return activeRefreshPromise;
  }

  activeRefreshPromise = (async () => {
    try {
      const url = buildApiUrl(API_ENDPOINTS.authRefresh);
      const urlCheck = validateApiRequestUrl(url);
      if (!urlCheck.ok) {
        return null;
      }
      const response = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        },
        body: JSON.stringify(refreshToken ? { refreshToken } : {}),
      });

      const contentType = response.headers?.get?.('content-type') || '';
      let payload = null;
      if (contentType.includes('application/json')) {
        try {
          payload = await response.json();
        } catch {
          payload = null;
        }
      } else {
        try {
          const text = await response.text();
          if (text && text.trim().startsWith('{')) {
            payload = JSON.parse(text);
          }
        } catch {
          payload = null;
        }
      }

      if (!response.ok || !payload?.success) {
        clearAdminAuthSession();
        return null;
      }

      const tokenData = payload.data || payload;
      const newAccess = tokenData.accessToken || tokenData.access_token || '';
      const newRefresh = tokenData.refreshToken || tokenData.refresh_token || refreshToken;
      const newCsrf = tokenData.csrfToken || tokenData.csrf_token || csrfToken;
      const cookieOnlyAuthenticated = Boolean(
        !newAccess && (newCsrf || tokenData.authenticated !== false)
      );
      if (!newAccess && !cookieOnlyAuthenticated) {
        clearAdminAuthSession();
        return null;
      }

      return setAdminAuthSession({
        accessToken: newAccess,
        refreshToken: newRefresh,
        csrfToken: newCsrf,
        expiresIn: tokenData.expiresIn ?? tokenData.expires_in ?? 900,
        admin: tokenData.admin || getAdminAuthSession()?.admin || null,
      });
    } catch {
      return null;
    } finally {
      activeRefreshPromise = null;
    }
  })();

  return activeRefreshPromise;
}

/**
 * Standardized REST API Request Helper for DTKS_BE integration.
 * Supports HTTP methods, JSON & FormData serialization, AbortController timeout,
 * Bearer token injection, automatic refresh-token rotation on 401, and structured error parsing.
 */
export async function apiRequest(endpoint, options = {}) {
  const normalizedEndpoint = String(endpoint || '').trim().startsWith('/')
    ? String(endpoint).trim()
    : /^https?:\/\//i.test(String(endpoint || '').trim())
    ? String(endpoint).trim()
    : `/${String(endpoint || '').trim()}`;
  const url = buildApiUrl(normalizedEndpoint);
  const urlCheck = validateApiRequestUrl(url);
  if (!urlCheck.ok) {
    return createServiceError(urlCheck.message, null, {
      errorType: urlCheck.errorType,
      errorCode: urlCheck.errorCode,
      statusCode: urlCheck.statusCode,
    });
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_API_TIMEOUT_MS;

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  let timeoutId = null;

  if (controller && timeoutMs > 0) {
    timeoutId = setTimeout(() => {
      controller.abort(new Error(`Request timed out after ${timeoutMs}ms.`));
    }, timeoutMs);
  }

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const isBinaryBody =
    isFormData ||
    (typeof Blob !== 'undefined' && options.body instanceof Blob) ||
    (typeof ArrayBuffer !== 'undefined' && options.body instanceof ArrayBuffer) ||
    ArrayBuffer.isView(options.body);

  const method = String(options.method || 'GET').toUpperCase();
  const isMutatingMethod = !['GET', 'HEAD', 'OPTIONS'].includes(method);
  const isAuthPublicEndpoint =
    normalizedEndpoint.includes('/auth/login') ||
    normalizedEndpoint.includes('/auth/refresh') ||
    normalizedEndpoint.includes('/auth/csrf') ||
    normalizedEndpoint.includes('/auth/accept-invite') ||
    normalizedEndpoint.includes('/auth/forgot-password') ||
    normalizedEndpoint.includes('/auth/reset-password');
  const isAuthEndpoint =
    isAuthPublicEndpoint || normalizedEndpoint.includes('/auth/logout');

  if (
    isMutatingMethod &&
    !isAuthPublicEndpoint &&
    !getCsrfToken() &&
    getAdminAuthSession() &&
    getDataAdapterMode() === 'api'
  ) {
    await bootstrapAdminCsrf();
  }

  const accessToken = options.token ?? getAccessToken();
  const csrfToken = getCsrfToken();
  const headers = {
    ...(isBinaryBody
      ? { Accept: 'application/json' }
      : { 'Content-Type': 'application/json', Accept: 'application/json' }),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...(isMutatingMethod && csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    ...(options.headers || {}),
  };

  const {
    timeoutMs: _ignoredTimeout,
    token: _ignoredToken,
    _isRetry,
    _isCsrfRetry,
    skipAuthRefresh,
    ...restFetchOptions
  } = options;

  const fetchOptions = {
    method: options.method || 'GET',
    credentials: options.credentials || 'include',
    ...restFetchOptions,
    headers,
    signal: options.signal || controller?.signal,
    body:
      options.body && typeof options.body === 'object' && !isBinaryBody
        ? JSON.stringify(options.body)
        : options.body,
  };

  try {
    const response = await fetch(url, fetchOptions);
    if (timeoutId) clearTimeout(timeoutId);

    const contentType = response.headers?.get?.('content-type') || '';
    let payload = null;
    if (contentType.includes('application/json')) {
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
    } else {
      try {
        const text = await response.text();
        if (text && text.trim().startsWith('{')) {
          payload = JSON.parse(text);
        }
      } catch {
        payload = null;
      }
    }

    if (
      response.status === 401 &&
      !_isRetry &&
      !skipAuthRefresh &&
      !isAuthEndpoint &&
      hasRefreshableSession()
    ) {
      const refreshed = await attemptTokenRefresh();
      if (refreshed) {
        return apiRequest(endpoint, {
          ...options,
          token: refreshed.accessToken || '',
          _isRetry: true,
        });
      }
    }

    if (!response.ok || (payload && typeof payload === 'object' && payload.success === false)) {
      const parsedErr = parseApiErrorPayload(payload, response.status);
      if (
        response.status === 403 &&
        parsedErr.code === 'CSRF_VALIDATION_FAILED' &&
        !_isCsrfRetry &&
        !isAuthPublicEndpoint &&
        isMutatingMethod &&
        getAdminAuthSession() &&
        getDataAdapterMode() === 'api'
      ) {
        const refreshedCsrf = await bootstrapAdminCsrf();
        if (refreshedCsrf) {
          return apiRequest(endpoint, {
            ...options,
            _isCsrfRetry: true,
          });
        }
      }
      const isNotFound =
        response.status === 404 ||
        parsedErr.code === 'NOT_FOUND' ||
        parsedErr.code === 'ORDER_NOT_FOUND' ||
        parsedErr.code === 'ENDPOINT_NOT_FOUND';

      return createServiceError(parsedErr.message, payload?.data ?? null, {
        errorType: isNotFound ? 'NotFoundError' : parsedErr.code || 'HttpError',
        errorCode: parsedErr.code,
        details: parsedErr.details,
        statusCode: response.status,
      });
    }

    if (payload && typeof payload === 'object' && 'success' in payload) {
      return {
        ...payload,
        adapter: 'api',
        statusCode: response.status,
        timestamp: payload.timestamp || new Date().toISOString(),
      };
    }

    return createServiceResponse(payload, 'Success', true, {
      statusCode: response.status,
    });
  } catch (err) {
    if (timeoutId) clearTimeout(timeoutId);
    const isAbort =
      err?.name === 'AbortError' ||
      String(err?.message || '').toLowerCase().includes('timed out');
    return createServiceError(
      isAbort
        ? `API request to ${normalizedEndpoint} timed out.`
        : err?.message || 'Network error while communicating with the backend API.',
      null,
      {
        errorType: isAbort ? 'TimeoutError' : 'NetworkError',
        errorCode: isAbort ? 'TIMEOUT_ERROR' : 'NETWORK_ERROR',
      }
    );
  }
}

/**
 * Verifies whether the current environment/session permits Admin access.
 * In API mode, verifies the session against GET /api/v1/auth/me.
 */
export async function verifyAdminSession() {
  const policy = getAdminAccessPolicy();
  if (policy === 'allowed_dev') {
    return {
      authenticated: true,
      admin: {
        id: 'dev-local-admin',
        name: 'Local Development Admin',
        email: 'support@dreamtechkashmirsolutions.studio',
        role: 'super_admin',
      },
      policy,
      message: 'Local development Admin access enabled.',
    };
  }
  if (policy === 'blocked_production_local') {
    return {
      authenticated: false,
      admin: null,
      policy,
      message: 'Secure Admin access will be enabled after backend authentication is configured.',
    };
  }

  // policy === 'session_required' -> bootstrap CSRF if missing, then GET /api/v1/auth/me
  if (!getCsrfToken()) {
    await bootstrapAdminCsrf();
  }
  const res = await apiRequest(API_ENDPOINTS.authMe, { method: 'GET' });
  const rawAdmin =
    res.data?.admin ||
    (res.data && typeof res.data === 'object' && res.data.email ? res.data : null);

  if (!res.success) {
    const isNetworkIssue = res.errorCode === 'NETWORK_ERROR' || res.errorCode === 'TIMEOUT_ERROR';
    if (!isNetworkIssue && (res.statusCode === 401 || res.statusCode === 403 || res.errorCode === 'SESSION_REVOKED' || res.errorCode === 'TOKEN_EXPIRED' || res.errorCode === 'REFRESH_TOKEN_EXPIRED')) {
      clearAdminAuthSession();
    }
    return {
      authenticated: false,
      admin: null,
      policy,
      networkError: isNetworkIssue,
      statusCode: res.statusCode ?? null,
      errorCode: res.errorCode ?? null,
      message: res.message || 'Authentication required. Please sign in as an administrator.',
    };
  }

  const hasValidAdminProfile = Boolean(rawAdmin && typeof rawAdmin === 'object' && rawAdmin.email);
  const isDeactivated = Boolean(
    hasValidAdminProfile && (rawAdmin.isActive === false || rawAdmin.is_active === false)
  );
  if (isDeactivated) {
    clearAdminAuthSession();
    return {
      authenticated: false,
      admin: null,
      policy,
      statusCode: 403,
      errorCode: 'ACCOUNT_DISABLED',
      message: 'Administrator access for this account has been disabled. Contact a Super Admin for assistance.',
    };
  }

  const hasValidRole = Boolean(
    hasValidAdminProfile && ['super_admin', 'admin', 'editor'].includes(rawAdmin.role)
  );

  if (!hasValidAdminProfile || !hasValidRole) {
    clearAdminAuthSession();
    return {
      authenticated: false,
      admin: null,
      policy,
      statusCode: rawAdmin ? 403 : 502,
      errorCode: rawAdmin ? 'INSUFFICIENT_PERMISSIONS' : 'INVALID_SESSION_RESPONSE',
      message: rawAdmin
        ? 'Your account does not have administrator permissions.'
        : 'Server session verification did not return a valid administrator profile.',
    };
  }

  const existing = getAdminAuthSession();
  setAdminAuthSession({
    accessToken: existing?.accessToken || '',
    refreshToken: existing?.refreshToken || '',
    csrfToken: res.data?.csrfToken || res.data?.csrf_token || getCsrfToken() || '',
    expiresIn: existing?.expiresIn || 900,
    expiresAt: existing?.expiresAt,
    admin: rawAdmin,
  });

  return {
    authenticated: true,
    admin: rawAdmin,
    policy,
    statusCode: res.statusCode ?? 200,
    errorCode: null,
    message: 'Authenticated administrator profile.',
  };
}

/**
 * Authenticates an administrator against POST /api/v1/auth/login.
 */
export async function loginAdmin({ email, password } = {}) {
  const policy = getAdminAccessPolicy();
  if (policy === 'blocked_production_local') {
    return createServiceError(
      'Secure Admin access will be enabled after backend authentication is configured.',
      null,
      {
        errorType: 'BackendNotConfiguredError',
        errorCode: 'ADMIN_AUTH_UNCONFIGURED',
        statusCode: 503,
      }
    );
  }

  if (policy !== 'session_required') {
    return createServiceError(
      'Server authentication is unavailable in local preview mode. Use "Open Admin Console" for local development or configure VITE_DATA_ADAPTER=api and VITE_API_BASE_URL.',
      null,
      {
        errorType: 'LocalAdapterAuthUnavailableError',
        errorCode: 'LOCAL_ADAPTER_AUTH_UNAVAILABLE',
        statusCode: 400,
      }
    );
  }

  const cleanEmail = String(email || '').trim().toLowerCase();
  const rawPassword = String(password || '');

  if (!cleanEmail || !rawPassword) {
    return createServiceError('Please enter both your administrator email and password.', null, {
      errorType: 'VALIDATION_ERROR',
      errorCode: 'VALIDATION_ERROR',
      statusCode: 400,
    });
  }

  const res = await apiRequest(API_ENDPOINTS.authLogin, {
    method: 'POST',
    body: { email: cleanEmail, password: rawPassword },
    skipAuthRefresh: true,
  });

  if (!res.success) {
    return res;
  }

  const payloadData = res.data && typeof res.data === 'object' ? res.data : {};
  const accessToken = String(payloadData.accessToken || payloadData.access_token || '').trim();
  const refreshToken = String(payloadData.refreshToken || payloadData.refresh_token || '').trim();
  const csrfToken = String(
    payloadData.csrfToken || payloadData.csrf_token || getCsrfToken() || ''
  ).trim();
  const rawExpiresIn = payloadData.expiresIn ?? payloadData.expires_in;
  const expiresIn =
    rawExpiresIn === undefined || rawExpiresIn === null || rawExpiresIn === ''
      ? 900
      : Number(rawExpiresIn);
  const admin =
    payloadData.admin && typeof payloadData.admin === 'object'
      ? payloadData.admin
      : payloadData.email && payloadData.role
      ? payloadData
      : null;

  if (
    !admin ||
    !admin.email ||
    !admin.role ||
    (!accessToken && !csrfToken && !refreshToken && payloadData.authMode !== 'cookie') ||
    !Number.isFinite(expiresIn) ||
    expiresIn <= 0
  ) {
    clearAdminAuthSession();
    return createServiceError(
      'Received an incomplete or invalid authentication response from the server.',
      null,
      {
        errorType: 'InvalidResponseError',
        errorCode: 'INVALID_LOGIN_RESPONSE',
        statusCode: 502,
      }
    );
  }

  if (admin.isActive === false || admin.is_active === false) {
    clearAdminAuthSession();
    return createServiceError(
      'Administrator access for this account has been disabled. Contact a Super Admin for assistance.',
      null,
      {
        errorType: 'ForbiddenError',
        errorCode: 'ACCOUNT_DISABLED',
        statusCode: 403,
      }
    );
  }

  if (!['super_admin', 'admin', 'editor'].includes(admin.role)) {
    clearAdminAuthSession();
    return createServiceError(
      'You do not have sufficient administrator permissions to sign in.',
      null,
      {
        errorType: 'ForbiddenError',
        errorCode: 'INSUFFICIENT_PERMISSIONS',
        statusCode: 403,
      }
    );
  }

  const session = setAdminAuthSession({
    accessToken,
    refreshToken,
    csrfToken,
    expiresIn,
    admin,
  });

  return createServiceResponse(
    {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      csrfToken: session.csrfToken,
      expiresIn: session.expiresIn,
      admin: session.admin,
    },
    res.message || 'Authenticated successfully.'
  );
}

/**
 * Logs out the current administrator via POST /api/v1/auth/logout and clears session storage.
 * Always clears local session state in finally, while truthfully reporting whether backend
 * session revocation succeeded.
 */
export async function logoutAdmin() {
  const refreshToken = getRefreshToken();
  const accessToken = getAccessToken();
  const isApi = getDataAdapterMode() === 'api';
  const hadSession = Boolean(accessToken || hasRefreshableSession());
  let serverRes = null;
  let serverRevoked = !isApi || !hadSession;

  try {
    if (isApi && hadSession) {
      if (!getCsrfToken()) {
        await bootstrapAdminCsrf();
      }
      serverRes = await apiRequest(API_ENDPOINTS.authLogout, {
        method: 'POST',
        body: refreshToken ? { refreshToken } : {},
        skipAuthRefresh: true,
      });
      serverRevoked = Boolean(serverRes?.success);
    }
  } catch (err) {
    serverRevoked = false;
    serverRes = createServiceError(
      err?.message || 'Network error while revoking administrator session.',
      null,
      { errorType: 'NetworkError', errorCode: 'NETWORK_ERROR' }
    );
  } finally {
    clearAdminAuthSession();
  }

  if (isApi && hadSession && !serverRevoked) {
    const warningMessage = serverRes?.message
      ? `Local session cleared, but server logout could not be confirmed: ${serverRes.message}`
      : 'Local session cleared, but server session revocation could not be confirmed.';
    return {
      ...createServiceError(
        warningMessage,
        { loggedOut: true, serverRevoked: false },
        {
          errorType: serverRes?.errorType || 'LogoutRevocationError',
          errorCode: serverRes?.errorCode || 'SERVER_LOGOUT_UNCONFIRMED',
          statusCode: serverRes?.statusCode ?? null,
        }
      ),
      loggedOut: true,
      serverRevoked: false,
    };
  }

  return createServiceResponse(
    { loggedOut: true, serverRevoked: true },
    serverRes?.message || 'Logged out and server session revoked.',
    true,
    { loggedOut: true, serverRevoked: true }
  );
}

/**
 * Explicitly refreshes the administrator session via POST /api/v1/auth/refresh.
 */
export async function refreshAdminSession() {
  const refreshed = await attemptTokenRefresh();
  if (!refreshed) {
    return createServiceError('Session expired. Please sign in again.', null, {
      errorType: 'UNAUTHORIZED',
      errorCode: 'REFRESH_TOKEN_EXPIRED',
      statusCode: 401,
    });
  }
  return createServiceResponse(refreshed, 'Session token refreshed.');
}

export const ADMIN_FORGOT_PASSWORD_NEUTRAL_MESSAGE =
  'If an eligible administrator account exists for this email address, a secure password recovery link has been sent.';

/**
 * Requests an administrator password reset email via POST /api/v1/auth/forgot-password.
 * Strictly isolated from client auth endpoints, enforces HTTPS in production, and prevents
 * account enumeration by normalizing delivery-failure signals into uniform responses.
 */
export async function requestAdminPasswordReset({ email } = {}) {
  const policy = getAdminAccessPolicy();
  if (policy === 'blocked_production_local') {
    return createServiceError(
      'Secure Admin password recovery will be enabled after backend authentication is configured.',
      null,
      {
        errorType: 'BackendNotConfiguredError',
        errorCode: 'ADMIN_AUTH_UNCONFIGURED',
        statusCode: 503,
      }
    );
  }

  if (policy !== 'session_required') {
    return createServiceError(
      'Password recovery requires an active backend API connection. Configure VITE_DATA_ADAPTER=api and VITE_API_BASE_URL.',
      null,
      {
        errorType: 'LocalAdapterAuthUnavailableError',
        errorCode: 'LOCAL_ADAPTER_AUTH_UNAVAILABLE',
        statusCode: 400,
      }
    );
  }

  const endpointUrl = buildApiUrl(API_ENDPOINTS.authForgotPassword);
  if (isProductionEnvironment() && /^http:\/\//i.test(endpointUrl)) {
    return createServiceError(
      'Administrator password recovery requires a secure HTTPS API endpoint.',
      null,
      {
        errorType: 'InsecureTransportError',
        errorCode: 'INSECURE_API_TRANSPORT',
        statusCode: 503,
      }
    );
  }

  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!isValidEmailAddress(cleanEmail)) {
    return createServiceError(
      'Please enter a valid administrator email address.',
      null,
      {
        errorType: 'VALIDATION_ERROR',
        errorCode: 'VALIDATION_ERROR',
        statusCode: 400,
        details: { email: 'Please enter a valid administrator email address.' },
      }
    );
  }

  const res = await apiRequest(API_ENDPOINTS.authForgotPassword, {
    method: 'POST',
    body: { email: cleanEmail },
    skipAuthRefresh: true,
  });

  if (!res.success) {
    const code = String(res.errorCode || '').toUpperCase();
    // Defense-in-depth anti-enumeration: never surface delivery-failure clues to the public caller.
    if (
      code === 'EMAIL_DELIVERY_FAILED' ||
      code === 'EMAIL_PROVIDER_UNAVAILABLE' ||
      code === 'MAILER_UNAVAILABLE' ||
      code === 'SMTP_ERROR'
    ) {
      return createServiceResponse({ requested: true }, ADMIN_FORGOT_PASSWORD_NEUTRAL_MESSAGE);
    }
    return res;
  }

  return createServiceResponse({ requested: true }, ADMIN_FORGOT_PASSWORD_NEUTRAL_MESSAGE);
}

/**
 * Completes an administrator password reset via POST /api/v1/auth/reset-password.
 * Sends the token exclusively in the HTTPS POST body and clears any stale admin session on success.
 */
export async function resetAdminPassword({ token, newPassword, confirmPassword } = {}) {
  const policy = getAdminAccessPolicy();
  if (policy === 'blocked_production_local') {
    return createServiceError(
      'Secure Admin password reset will be enabled after backend authentication is configured.',
      null,
      {
        errorType: 'BackendNotConfiguredError',
        errorCode: 'ADMIN_AUTH_UNCONFIGURED',
        statusCode: 503,
      }
    );
  }

  if (policy !== 'session_required') {
    return createServiceError(
      'Password reset requires an active backend API connection. Configure VITE_DATA_ADAPTER=api and VITE_API_BASE_URL.',
      null,
      {
        errorType: 'LocalAdapterAuthUnavailableError',
        errorCode: 'LOCAL_ADAPTER_AUTH_UNAVAILABLE',
        statusCode: 400,
      }
    );
  }

  const endpointUrl = buildApiUrl(API_ENDPOINTS.authResetPassword);
  if (isProductionEnvironment() && /^http:\/\//i.test(endpointUrl)) {
    return createServiceError(
      'Administrator password reset requires a secure HTTPS API endpoint.',
      null,
      {
        errorType: 'InsecureTransportError',
        errorCode: 'INSECURE_API_TRANSPORT',
        statusCode: 503,
      }
    );
  }

  const cleanToken = String(token || '').trim();
  const rawPassword = String(newPassword || '');
  const rawConfirmPassword = String(confirmPassword ?? '');

  if (!cleanToken) {
    return createServiceError(
      'A valid password reset token is required.',
      null,
      {
        errorType: 'VALIDATION_ERROR',
        errorCode: 'MISSING_RESET_TOKEN',
        statusCode: 400,
      }
    );
  }

  if (!rawPassword) {
    return createServiceError(
      'New password is required.',
      null,
      {
        errorType: 'VALIDATION_ERROR',
        errorCode: 'VALIDATION_ERROR',
        statusCode: 400,
        details: { newPassword: 'New password is required.' },
      }
    );
  }

  if (rawPassword !== rawConfirmPassword) {
    return createServiceError(
      'Passwords do not match.',
      null,
      {
        errorType: 'VALIDATION_ERROR',
        errorCode: 'PASSWORD_MISMATCH',
        statusCode: 400,
        details: { confirmPassword: 'Passwords do not match.' },
      }
    );
  }

  const res = await apiRequest(API_ENDPOINTS.authResetPassword, {
    method: 'POST',
    body: {
      token: cleanToken,
      newPassword: rawPassword,
      confirmPassword: rawConfirmPassword,
    },
    skipAuthRefresh: true,
  });

  if (!res.success) {
    return res;
  }

  clearAdminAuthSession();

  return createServiceResponse(
    { reset: true },
    res.message || 'Your administrator password has been reset. Please sign in with your new password.'
  );
}
