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

export const DEFAULT_API_TIMEOUT_MS = 15000;
const SESSION_STORAGE_AUTH_KEY = 'dtks_admin_auth_session_v1';

let runtimeEnvOverrides = null;
let memoryAuthSession = null;
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

export function resolveBackendAssetUrl(urlOrPath = '') {
  const str = String(urlOrPath || '').trim();
  if (!str) return '';
  if (/^(https?:\/\/|blob:|data:|idb:\/\/)/i.test(str)) {
    return str;
  }
  if (str.startsWith('/api/v1/uploads/')) {
    const origin = getApiOrigin();
    return origin ? `${origin}${str}` : str;
  }
  return str;
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
  const allowLocalAdminOverride = readEnvVar('VITE_ENABLE_LOCAL_ADMIN') === 'true';
  if (isProductionEnvironment() && !allowLocalAdminOverride) {
    return 'blocked_production_local';
  }
  return 'allowed_dev';
}

// ============================================================================
// ADMIN AUTHENTICATION SESSION STORAGE (Memory + sessionStorage, NEVER localStorage)
// ============================================================================

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
  if (memoryAuthSession) {
    return memoryAuthSession;
  }
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const raw = window.sessionStorage.getItem(SESSION_STORAGE_AUTH_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          memoryAuthSession = parsed;
          return memoryAuthSession;
        }
      }
    }
  } catch {
    // Ignore sessionStorage errors in restricted/SSR contexts
  }
  return null;
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

  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(SESSION_STORAGE_AUTH_KEY, JSON.stringify(memoryAuthSession));
    }
  } catch {
    // Ignore sessionStorage write errors
  }

  notifyAuthListeners();
  return memoryAuthSession;
}

export function clearAdminAuthSession() {
  memoryAuthSession = null;
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem(SESSION_STORAGE_AUTH_KEY);
    }
  } catch {
    // Ignore
  }
  notifyAuthListeners();
}

export function getAccessToken() {
  return getAdminAuthSession()?.accessToken || '';
}

export function getRefreshToken() {
  return getAdminAuthSession()?.refreshToken || '';
}

function readCookieValue(name) {
  try {
    if (typeof document === 'undefined' || typeof document.cookie !== 'string') return '';
    const prefix = `${name}=`;
    for (const part of document.cookie.split(';')) {
      const trimmed = part.trim();
      if (trimmed.startsWith(prefix)) {
        const raw = trimmed.slice(prefix.length);
        try {
          return decodeURIComponent(raw);
        } catch {
          return raw;
        }
      }
    }
  } catch {
    // Ignore cookie access errors
  }
  return '';
}

export function getCsrfToken() {
  return getAdminAuthSession()?.csrfToken || readCookieValue('dtks_csrf_token') || '';
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
      const payload = contentType.includes('application/json') ? await response.json() : null;

      if (!response.ok || !payload?.success) {
        clearAdminAuthSession();
        return null;
      }

      const tokenData = payload.data || payload;
      const newAccess = tokenData.accessToken || tokenData.access_token;
      const newRefresh = tokenData.refreshToken || tokenData.refresh_token || refreshToken;
      const newCsrf = tokenData.csrfToken || tokenData.csrf_token || csrfToken;
      if (!newAccess) {
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
  const normalizedEndpoint = String(endpoint || '').startsWith('/')
    ? String(endpoint)
    : `/${endpoint}`;
  const url = buildApiUrl(normalizedEndpoint);
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
  const accessToken = options.token ?? getAccessToken();
  const csrfToken = getCsrfToken();
  const isMutatingMethod = !['GET', 'HEAD', 'OPTIONS'].includes(method);
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

    // Attempt automatic token refresh once on 401 when refreshToken is present
    const isAuthEndpoint =
      normalizedEndpoint.includes('/auth/login') ||
      normalizedEndpoint.includes('/auth/refresh') ||
      normalizedEndpoint.includes('/auth/logout');

    if (
      response.status === 401 &&
      !_isRetry &&
      !skipAuthRefresh &&
      !isAuthEndpoint &&
      hasRefreshableSession()
    ) {
      const refreshed = await attemptTokenRefresh();
      if (refreshed?.accessToken) {
        return apiRequest(endpoint, {
          ...options,
          token: refreshed.accessToken,
          _isRetry: true,
        });
      }
    }

    if (!response.ok || (payload && typeof payload === 'object' && payload.success === false)) {
      const parsedErr = parseApiErrorPayload(payload, response.status);
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

  // policy === 'session_required' -> GET /api/v1/auth/me
  const res = await apiRequest(API_ENDPOINTS.authMe, { method: 'GET' });
  const rawAdmin =
    res.data?.admin ||
    (res.data && typeof res.data === 'object' && res.data.email ? res.data : null);
  const authenticated = Boolean(
    res.success && (rawAdmin || res.data?.authenticated === true)
  );

  if (authenticated && rawAdmin) {
    const existing = getAdminAuthSession();
    if (existing) {
      setAdminAuthSession({ ...existing, admin: rawAdmin });
    }
  }

  return {
    authenticated,
    admin: rawAdmin || null,
    policy,
    statusCode: res.statusCode ?? null,
    errorCode: res.errorCode ?? null,
    message: authenticated
      ? 'Authenticated administrator profile.'
      : res.message || 'Authentication required. Please sign in as an administrator.',
  };
}

/**
 * Authenticates an administrator against POST /api/v1/auth/login.
 */
export async function loginAdmin({ email, password } = {}) {
  const cleanEmail = String(email || '').trim();
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

  const payloadData = res.data || {};
  const accessToken = payloadData.accessToken || payloadData.access_token || '';
  const refreshToken = payloadData.refreshToken || payloadData.refresh_token || '';
  const csrfToken = payloadData.csrfToken || payloadData.csrf_token || '';
  const expiresIn = Number(payloadData.expiresIn ?? payloadData.expires_in ?? 900);
  const admin = payloadData.admin || null;

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
 */
export async function logoutAdmin() {
  const refreshToken = getRefreshToken();
  const accessToken = getAccessToken();

  try {
    if (getDataAdapterMode() === 'api' && (accessToken || hasRefreshableSession())) {
      await apiRequest(API_ENDPOINTS.authLogout, {
        method: 'POST',
        body: refreshToken ? { refreshToken } : {},
        skipAuthRefresh: true,
      });
    }
  } finally {
    clearAdminAuthSession();
  }

  return createServiceResponse({ loggedOut: true }, 'Logged out successfully.');
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
