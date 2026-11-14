/**
 * DreamTech Kashmir Solutions (DTKS)
 * Isolated Client Authentication Session & REST API Client
 *
 * Strictly separate from Admin authentication (`apiClient.js`):
 * - Uses separate sessionStorage key: `dtks_client_auth_session_v1`
 * - Uses separate CSRF cookie lookup (`dtks_client_csrf_token`)
 * - Never reads, writes, or clears Admin tokens or Admin session storage
 * - Never stores plaintext passwords or secrets in localStorage
 */

import { API_ENDPOINTS } from '../models/backendModels.js';
import {
  DEFAULT_API_TIMEOUT_MS,
  buildApiUrl,
  createServiceError,
  createServiceResponse,
  getDataAdapterMode,
  isProductionEnvironment,
  parseApiErrorPayload,
} from './apiClient.js';

export const CLIENT_SESSION_STORAGE_KEY = 'dtks_client_auth_session_v1';

let memoryClientSession = null;
const clientAuthListeners = new Set();
let activeClientRefreshPromise = null;

export function getClientAccessPolicy() {
  if (getDataAdapterMode() === 'api') {
    return 'api';
  }
  if (isProductionEnvironment()) {
    return 'blocked_production_local';
  }
  return 'local_demo';
}

function notifyClientAuthListeners() {
  const snapshot = getClientAuthSession();
  for (const listener of clientAuthListeners) {
    try {
      listener(snapshot);
    } catch {
      // Ignore listener errors
    }
  }
}

export function subscribeClientAuth(listener) {
  if (typeof listener !== 'function') return () => {};
  clientAuthListeners.add(listener);
  return () => {
    clientAuthListeners.delete(listener);
  };
}

export function getClientAuthSession() {
  if (memoryClientSession) {
    return memoryClientSession;
  }
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const raw = window.sessionStorage.getItem(CLIENT_SESSION_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          memoryClientSession = parsed;
          return memoryClientSession;
        }
      }
    }
  } catch {
    // Ignore sessionStorage errors
  }
  return null;
}

export function setClientAuthSession(sessionData) {
  if (!sessionData || typeof sessionData !== 'object') {
    clearClientAuthSession();
    return null;
  }
  const current = getClientAuthSession() || {};
  const accessToken =
    sessionData.accessToken ?? sessionData.access_token ?? current.accessToken ?? '';
  const refreshToken =
    sessionData.refreshToken ?? sessionData.refresh_token ?? current.refreshToken ?? '';
  const csrfToken =
    sessionData.csrfToken ?? sessionData.csrf_token ?? current.csrfToken ?? '';
  const expiresIn = Number(
    sessionData.expiresIn ?? sessionData.expires_in ?? current.expiresIn ?? 900
  );
  const client = sessionData.client ?? sessionData.customer ?? sessionData.user ?? current.client ?? null;

  memoryClientSession = {
    accessToken: String(accessToken || ''),
    refreshToken: String(refreshToken || ''),
    csrfToken: String(csrfToken || ''),
    expiresIn,
    expiresAt: sessionData.expiresAt || new Date(Date.now() + expiresIn * 1000).toISOString(),
    client,
  };

  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(CLIENT_SESSION_STORAGE_KEY, JSON.stringify(memoryClientSession));
    }
  } catch {
    // Ignore sessionStorage write errors
  }

  notifyClientAuthListeners();
  return memoryClientSession;
}

export function clearClientAuthSession() {
  memoryClientSession = null;
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem(CLIENT_SESSION_STORAGE_KEY);
    }
  } catch {
    // Ignore
  }
  notifyClientAuthListeners();
}

export function getClientAccessToken() {
  return getClientAuthSession()?.accessToken || '';
}

export function getClientRefreshToken() {
  return getClientAuthSession()?.refreshToken || '';
}

function readClientCookieValue(name) {
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
    // Ignore
  }
  return '';
}

export function getClientCsrfToken() {
  return (
    getClientAuthSession()?.csrfToken ||
    readClientCookieValue('dtks_client_csrf_token') ||
    ''
  );
}

function hasRefreshableClientSession() {
  return Boolean(getClientRefreshToken() || getClientCsrfToken() || getClientAuthSession());
}

export async function attemptClientTokenRefresh() {
  const refreshToken = getClientRefreshToken();
  const csrfToken = getClientCsrfToken();
  if (!refreshToken && !csrfToken && !getClientAuthSession()) return null;

  if (activeClientRefreshPromise) {
    return activeClientRefreshPromise;
  }

  activeClientRefreshPromise = (async () => {
    try {
      const url = buildApiUrl(API_ENDPOINTS.clientAuthRefresh);
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
        clearClientAuthSession();
        return null;
      }

      const tokenData = payload.data || payload;
      const newAccess = tokenData.accessToken || tokenData.access_token;
      const newRefresh = tokenData.refreshToken || tokenData.refresh_token || refreshToken;
      const newCsrf = tokenData.csrfToken || tokenData.csrf_token || csrfToken;
      if (!newAccess) {
        clearClientAuthSession();
        return null;
      }

      return setClientAuthSession({
        accessToken: newAccess,
        refreshToken: newRefresh,
        csrfToken: newCsrf,
        expiresIn: tokenData.expiresIn ?? tokenData.expires_in ?? 900,
        client:
          tokenData.client ||
          tokenData.customer ||
          tokenData.user ||
          getClientAuthSession()?.client ||
          null,
      });
    } catch {
      return null;
    } finally {
      activeClientRefreshPromise = null;
    }
  })();

  return activeClientRefreshPromise;
}

export async function clientApiRequest(endpoint, options = {}) {
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
  const method = String(options.method || 'GET').toUpperCase();
  const accessToken = options.token ?? getClientAccessToken();
  const csrfToken = getClientCsrfToken();
  const isMutatingMethod = !['GET', 'HEAD', 'OPTIONS'].includes(method);

  const headers = {
    ...(isFormData
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
    method,
    credentials: options.credentials || 'include',
    ...restFetchOptions,
    headers,
    signal: options.signal || controller?.signal,
    body:
      options.body && typeof options.body === 'object' && !isFormData
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
    }

    const isClientAuthPublicEndpoint =
      normalizedEndpoint.includes('/client/auth/login') ||
      normalizedEndpoint.includes('/client/auth/register') ||
      normalizedEndpoint.includes('/client/auth/refresh') ||
      normalizedEndpoint.includes('/client/auth/logout') ||
      normalizedEndpoint.includes('/client/auth/forgot-password') ||
      normalizedEndpoint.includes('/client/auth/reset-password');

    if (
      response.status === 401 &&
      !_isRetry &&
      !skipAuthRefresh &&
      !isClientAuthPublicEndpoint &&
      hasRefreshableClientSession()
    ) {
      const refreshed = await attemptClientTokenRefresh();
      if (refreshed?.accessToken) {
        return clientApiRequest(endpoint, {
          ...options,
          token: refreshed.accessToken,
          _isRetry: true,
        });
      }
    }

    if (!response.ok || (payload && typeof payload === 'object' && payload.success === false)) {
      const parsedErr = parseApiErrorPayload(payload, response.status);
      return createServiceError(parsedErr.message, payload?.data ?? null, {
        errorType: response.status === 404 ? 'NotFoundError' : parsedErr.code || 'HttpError',
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

    return createServiceResponse(payload, 'Success', true, { statusCode: response.status });
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
