/**
 * DreamTech Kashmir Solutions (DTKS)
 * Configurable Data Adapter & API Client Abstraction
 *
 * Supports two modes via VITE_DATA_ADAPTER:
 * - 'local' (default): Uses browser LocalStorage with safe migration and clean initial state.
 * - 'api' (future backend): Sends HTTP requests to VITE_API_BASE_URL (e.g., Cloudflare Workers + D1).
 */

export function getDataAdapterMode() {
  try {
    const mode = import.meta?.env?.VITE_DATA_ADAPTER;
    if (mode && String(mode).trim().toLowerCase() === 'api') {
      return 'api';
    }
  } catch {
    // Fallback for Node.js test/SSR environments
  }
  if (typeof process !== 'undefined' && process.env?.VITE_DATA_ADAPTER === 'api') {
    return 'api';
  }
  return 'local';
}

export function getApiBaseUrl() {
  try {
    const base = import.meta?.env?.VITE_API_BASE_URL;
    if (base && String(base).trim()) {
      return String(base).trim().replace(/\/+$/, '');
    }
  } catch {
    // Fallback for Node.js test/SSR environments
  }
  if (typeof process !== 'undefined' && process.env?.VITE_API_BASE_URL) {
    return String(process.env.VITE_API_BASE_URL).trim().replace(/\/+$/, '');
  }
  return '/api';
}

/**
 * Standardized Service Response Envelope
 * Matches Phase 9 specification:
 * {
 *   success: true | false,
 *   data: ...,
 *   message: "..."
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

export function createServiceError(message = 'An unexpected error occurred.', data = null) {
  return {
    success: false,
    data,
    message,
    adapter: getDataAdapterMode(),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Standardized REST API Request Helper for future backend integration.
 * Returns { success, data, message }.
 */
export async function apiRequest(endpoint, options = {}) {
  const baseUrl = getApiBaseUrl();
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${normalizedEndpoint}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
      body:
        options.body && typeof options.body === 'object'
          ? JSON.stringify(options.body)
          : options.body,
    });

    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json') ? await response.json() : null;

    if (!response.ok) {
      return createServiceError(
        payload?.message || `API request failed with status ${response.status}.`,
        payload?.data ?? null
      );
    }

    if (payload && typeof payload === 'object' && 'success' in payload) {
      return payload;
    }

    return createServiceResponse(payload, 'Success', true);
  } catch (err) {
    return createServiceError(
      err?.message || 'Network error while communicating with the backend API.',
      null
    );
  }
}
