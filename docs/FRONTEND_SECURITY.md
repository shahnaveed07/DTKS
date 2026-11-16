# DTKS Frontend Security Architecture & Remediation Reference

## 1. Threat Model & Trust Boundaries

- **Frontend origin**: `https://dreamtechkashmirsolutions.studio` (Cloudflare static hosting)
- **Backend API origin**: `https://api.dreamtechkashmirsolutions.studio/api/v1` (`DTKS_BE`, maintained separately)
- **Untrusted inputs**:
  - Public order submission & contact inquiry forms
  - URL path/query/hash parameters (`#token=`, `?token=`, `?ref=`, `?email=`, React Router `location.state`)
  - Uploaded media files (`File` / `Blob`) and admin-edited image/external URLs rendered across public pages and Schema.org JSON-LD

## 2. Session, CSRF & Token Handling

- **Volatile in-memory sessions and CSRF tokens only**:
  - `src/services/api/apiClient.js` and `src/services/api/clientApiClient.js` hold short-lived user session objects and volatile CSRF tokens (`bootstrappedAdminCsrfToken` / `bootstrappedClientCsrfToken`) strictly in JavaScript module memory (`memoryAuthSession` / `memoryClientSession`).
  - Because `DTKS_BE` sets CSRF cookies with `HttpOnly`, the frontend never attempts to read CSRF cookies from `document.cookie`. Instead, it bootstraps volatile in-memory CSRF tokens via dedicated endpoints (`GET /api/v1/auth/csrf` for Admin; `GET /api/v1/client/auth/csrf` for Client), deduplicates concurrent bootstrap calls, and automatically retries once on `403 CSRF_VALIDATION_FAILED`.
  - No bearer token, refresh token, or CSRF token is ever written to `localStorage` or `sessionStorage`.
  - Any legacy keys (`dtks_admin_auth_session_v1`, `dtks_client_auth_session_v1`) are purged automatically from `sessionStorage` and `localStorage` on initialization and session mutation.
- **Strict Admin vs. Client Isolation**:
  - Public order submission (`POST /api/v1/orders`) and public order tracking (`POST /api/v1/orders/track`) route strictly through `clientApiRequest(..., { skipAuthRefresh: true })` (plus pre-flight Client CSRF bootstrap when a client session is active) so they never read Admin auth/CSRF state or trigger Admin token refresh.
  - Public contact inquiries (`POST /api/v1/inquiries`) route through `clientApiRequest(..., { token: '', skipAuthRefresh: true })`.
  - `clientAuthService.verifySession()` hydrates `memoryClientSession` directly from `/api/v1/client/auth/me` (even on `HttpOnly` cookie-only reloads where no in-memory token existed prior to `/refresh`), and `AppContext` triggers admin verification strictly when an active admin session exists (never from an unauthenticated CSRF token).
- **Origin pinning & HTTPS transport enforcement**:
  - `validateApiRequestUrl()` enforces exact origin matching against `getApiOrigin()`, blocks `localhost`/`127.0.0.1` in production (`INVALID_API_BASE_URL`), blocks plain `http://` in production (`INSECURE_API_TRANSPORT`), and blocks cross-origin calls (`UNTRUSTED_API_ORIGIN`) across standard requests, CSRF bootstraps, and `/auth/refresh` / `/client/auth/refresh`.
- **Fail-closed production behavior**:
  - When `VITE_DATA_ADAPTER !== 'api'` or `VITE_API_BASE_URL` is absent in production (`production_unconfigured` / `blocked_production_local`), Admin UI, Admin recovery, Client auth, order tracking, and media uploads fail closed cleanly without serving demo data or leaking client-side fallback mechanisms.

## 3. URL Secret Scrubbing, Password Policy, Redirects & Browser Privacy

- **Fragment-only (`#token=`) one-time tokens**:
  - Admin Reset Password (`AdminResetPasswordPage.jsx`), Admin Accept Invite (`AdminAcceptInvitePage.jsx`), Client Reset Password (`ResetPasswordPage.jsx`), Client Verify Email (`VerifyEmailPage.jsx`), and Order Tracking (`TrackOrderPage.jsx` in `api` mode) read sensitive one-time tokens strictly from `location.hash` (`#token=...`, `allowQueryFallback: false`) and immediately scrub both `#token=` and legacy query tokens from browser history via `window.history.replaceState(...)` prior to any network call.
  - Double-submit prevention uses synchronous `inFlightRef` guards alongside `submitting` state.
- **12-character password policy alignment**:
  - `src/utils/authValidation.js`, `PasswordStrengthMeter.jsx`, and all Admin/Client password forms enforce the 12-character minimum password policy matching `DTKS_BE`.
- **Open-redirect hardening**:
  - `sanitizeInternalRedirect()` blocks backslashes (`\`), percent-encoded slashes (`%2f`, `%5c`), control characters, userinfo/port markers (`@`, `:`), protocol-relative (`//`), cross-origin URLs, and auth/recovery self-loops.
- **Public order tracking privacy**:
  - `RequestQuotePage.jsx` strips any returned `trackingToken` (`_discardedTrackingToken`) immediately after `POST /api/v1/orders` instead of retaining or embedding it in the DOM, and directs clients to their emailed confidential link or the Client Portal (with `local_demo` state isolated strictly to local preview mode).
  - `TrackOrderPage.jsx` enforces `<meta name="referrer" content="no-referrer" />`, sends `{ token }` via `POST /api/v1/orders/track` (never `?token=` or `?ref=&email=` in `api` mode), maps HTTP `410` expired tokens distinctly, and applies `sanitizeTrackedOrder()` so PII (`customerEmail`, `customerPhone`, `customerCity`, `customerName`), `trackingToken`, and staff identities are stripped while safe `urgency` and sanitized `statusHistory` notes remain visible.

## 4. XSS, Media & Header Hardening

- **Inline script removal & CSP**:
  - `index.html` contains zero inline `<script>` or `onload=` event handlers.
  - `public/_headers` enforces global `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security: max-age=31536000; includeSubDomains`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, and a strict `Content-Security-Policy` (`default-src 'self'; script-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests`).
  - All admin, auth, client account, tracking, and confirmation routes carry `Referrer-Policy: no-referrer`, `Cache-Control: no-store`, and `X-Robots-Tag: noindex, nofollow`.
- **Safe URL & media validation**:
  - `buildMailtoUrl()` rejects header-injection characters (`?`, `#`, `/`, `\`, whitespace, control chars).
  - `sanitizeSafeMediaUrl()` allows only `idb://`, `blob:` (where enabled), relative `/` paths, and `http:`/`https:`, and blocks `javascript:`, `vbscript:`, `data:image/svg+xml`, `data:text/html`, and protocol-relative bypasses in `ImageWithFallback.jsx` and `structuredData.js`.
  - `mediaService.uploadImage()` strictly accepts JPEG, PNG, and WebP with magic-byte binary signature verification (`validateImageMagicBytes()`) and blocks local IndexedDB uploads in production.

## 5. `DTKS_BE` Security Contract Alignment Status

The frontend aligns with `DTKS_BE` security baseline commit `029c5974b94576f1bf665f99c5cf0ea10e8951db`:

1. **HttpOnly CSRF Bootstrapping**: Uses `GET /api/v1/auth/csrf` (Admin) and `GET /api/v1/client/auth/csrf` (Client) with volatile in-memory storage and single automatic retry on `403 CSRF_VALIDATION_FAILED`, with zero `document.cookie` parsing.
2. **Fragment-Only (`#token=`) URL Tokens**: Enforces `#token=` extraction only (`allowQueryFallback: false`) across Admin reset, Admin invite, Client verification, Client reset, and confidential order tracking (`POST /api/v1/orders/track`).
3. **12-Character Password Policy & Cookie-Only Hydration**: Aligns all password validators/UI meters to the 12-character floor and hydrates cookie-only reloads via `/api/v1/auth/me` and `/api/v1/client/auth/me`.
