/**
 * DreamTech Kashmir Solutions (DTKS)
 * Configurable Data Adapter & API Client Abstraction
 *
 * Supports two modes via VITE_DATA_ADAPTER:
 * - 'local' (default): Uses browser LocalStorage with safe migration and clean initial state.
 * - 'api' (future backend): Sends HTTP requests to VITE_API_BASE_URL (e.g., Cloudflare Workers + D1).
 *
 * CRITICAL RULE: When VITE_DATA_ADAPTER='api', failed API requests NEVER silently fall back to LocalStorage.
 */

export const DEFAULT_API_TIMEOUT_MS = 15000;

let runtimeEnvOverrides = null;

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
  if (mode && String(mode).trim().toLowerCase() === 'api') {
    return 'api';
  }
  return 'local';
}

export function getApiBaseUrl() {
  const base = readEnvVar('VITE_API_BASE_URL');
  if (base && String(base).trim()) {
    return String(base).trim().replace(/\/+$/, '');
  }
  return '/api';
}

/**
 * Determines whether the application is running in the public production environment.
 * Treatsdreamtechkashmirsolutions.studio or explicit PROD build (when not on localhost/preview test runner)
 * as production.
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
 * Determines customer order & inquiry submission mode (Phase 5):
 * - 'api': Backend API is active (`VITE_DATA_ADAPTER=api`)
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
 * Determines Admin route access policy (Phase 4):
 * - 'session_required': When `VITE_DATA_ADAPTER=api`, requires server-verified session
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

/**
 * Standardized Service Response Envelope
 * {
 *   success: true | false,
 *   data: ...,
 *   message: "...",
 *   adapter: "local" | "api",
 *   timestamp: "..."
 * }
 */
export function createServiceResponse(data, message = 'Operation completed successfully.', success = true) {
  return {
    success: Boolean(success),
    data,
    message,
    adapter: getDataAdapterMode(),
    timestamp: new Date().toISOString(),
  };
}

export function createServiceError(message = 'An unexpected error occurred.', data = null, meta = {}) {
  return {
    success: false,
    data,
    message,
    errorType: meta.errorType || (data && typeof data === 'object' ? data.errorType : null) || 'ServiceError',
    statusCode: meta.statusCode ?? null,
    adapter: getDataAdapterMode(),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Standardized REST API Request Helper for backend integration.
 * Supports HTTP methods, JSON serialization, AbortController timeout, credentials: 'include',
 * and structured error reporting without falling back to LocalStorage.
 */
export async function apiRequest(endpoint, options = {}) {
  const baseUrl = getApiBaseUrl();
  const normalizedEndpoint = String(endpoint || '').startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${normalizedEndpoint}`;
  const timeoutMs = options.timeoutMs ?? DEFAULT_API_TIMEOUT_MS;

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  let timeoutId = null;

  if (controller && timeoutMs > 0) {
    timeoutId = setTimeout(() => {
      controller.abort(new Error(`Request timed out after ${timeoutMs}ms.`));
    }, timeoutMs);
  }

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json', Accept: 'application/json' }),
    ...(options.headers || {}),
  };

  const fetchOptions = {
    method: options.method || 'GET',
    credentials: options.credentials || 'include',
    ...options,
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

    if (!response.ok) {
      return createServiceError(
        payload?.message || `API request failed with HTTP status ${response.status}.`,
        payload?.data ?? null,
        {
          errorType: 'HttpError',
          statusCode: response.status,
        }
      );
    }

    if (payload && typeof payload === 'object' && 'success' in payload) {
      return {
        ...payload,
        adapter: 'api',
        timestamp: payload.timestamp || new Date().toISOString(),
      };
    }

    return createServiceResponse(payload, 'Success', true);
  } catch (err) {
    if (timeoutId) clearTimeout(timeoutId);
    const isAbort = err?.name === 'AbortError' || String(err?.message || '').toLowerCase().includes('timed out');
    return createServiceError(
      isAbort
        ? `API request to ${normalizedEndpoint} timed out.`
        : err?.message || 'Network error while communicating with the backend API.',
      null,
      {
        errorType: isAbort ? 'TimeoutError' : 'NetworkError',
      }
    );
  }
}

/**
 * Verifies whether the current environment/session permits Admin access.
 */
export async function verifyAdminSession() {
  const policy = getAdminAccessPolicy();
  if (policy === 'allowed_dev') {
    return {
      authenticated: true,
      policy,
      message: 'Local development Admin access enabled.',
    };
  }
  if (policy === 'blocked_production_local') {
    return {
      authenticated: false,
      policy,
      message: 'Secure Admin access will be enabled after backend authentication is configured.',
    };
  }
  // policy === 'session_required'
  const res = await apiRequest('/admin/session', { method: 'GET' });
  const authenticated = Boolean(res.success && res.data?.authenticated);
  return {
    authenticated,
    policy,
    message: authenticated
      ? 'Authenticated admin session.'
      : res.message || 'Secure Admin access will be enabled after backend authentication is configured.',
  };
}


