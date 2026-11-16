# DTKS Frontend Security Architecture & Remediation Reference

## 1. Threat Model & Trust Boundaries

- **Frontend origin**: `https://dreamtechkashmirsolutions.studio` (Cloudflare static hosting)
- **Backend API origin**: `https://api.dreamtechkashmirsolutions.studio/api/v1` (`DTKS_BE`, maintained separately)
- **Untrusted inputs**:
  - Public order submission & contact inquiry forms
  - URL path/query/hash parameters (`#token=`, `?token=`, `?ref=`, `?email=`, React Router `location.state`)
  - Uploaded media files (`File` / `Blob`) and admin-edited image/external URLs rendered across public pages and Schema.org JSON-LD

## 2. Session & Token Handling

- **Volatile in-memory sessions only**:
  - `src/services/api/apiClient.js` and `src/services/api/clientApiClient.js` hold short-lived access/CSRF/user session objects strictly in JavaScript module memory (`memoryAuthSession` / `memoryClientSession`).
  - No bearer token, refresh token, or CSRF token is ever written to `localStorage` or `sessionStorage`.
  - Any legacy keys (`dtks_admin_auth_session_v1`, `dtks_client_auth_session_v1`) are purged automatically from `sessionStorage` and `localStorage` on initialization and session mutation.
- **Origin pinning & HTTPS transport enforcement**:
  - `validateApiRequestUrl()` enforces exact origin matching against `getApiOrigin()`, blocks `localhost`/`127.0.0.1` in production (`INVALID_API_BASE_URL`), blocks plain `http://` in production (`INSECURE_API_TRANSPORT`), and blocks cross-origin calls (`UNTRUSTED_API_ORIGIN`) across both standard requests and `/auth/refresh` / `/client/auth/refresh`.
- **Fail-closed production behavior**:
  - When `VITE_DATA_ADAPTER !== 'api'` or `VITE_API_BASE_URL` is absent in production (`production_unconfigured` / `blocked_production_local`), Admin UI, Admin recovery, Client auth, order tracking, and media uploads fail closed cleanly without serving demo data or leaking client-side fallback mechanisms.

## 3. URL Secret Scrubbing, Redirects & Browser Privacy

- **Fragment-first one-time tokens**:
  - Admin Reset Password (`AdminResetPasswordPage.jsx`) strictly reads `#token=...` (`extractAdminResetTokenFromUrl`).
  - Admin Accept Invite (`AdminAcceptInvitePage.jsx`), Client Reset Password (`ResetPasswordPage.jsx`), and Client Verify Email (`VerifyEmailPage.jsx`) prefer `#token=...` with temporary `?token=...` fallback for legacy email templates and immediately scrub sensitive tokens from browser history via `window.history.replaceState(...)`.
  - Double-submit prevention uses synchronous `inFlightRef` guards alongside `submitting` state.
- **Open-redirect hardening**:
  - `sanitizeInternalRedirect()` blocks backslashes (`\`), percent-encoded slashes (`%2f`, `%5c`), control characters, userinfo/port markers (`@`, `:`), protocol-relative (`//`), cross-origin URLs, and auth/recovery self-loops.
- **Public order tracking privacy**:
  - `RequestQuotePage.jsx` passes `prefillReferenceId` via router `state` instead of `?ref=&email=` query parameters.
  - `TrackOrderPage.jsx` scrubs any `ref`/`email` URL params immediately, enforces `<meta name="referrer" content="no-referrer" />`, and `orderService.trackOrder()` / `TrackOrderPage` apply `sanitizeTrackedOrder()` so PII (`customerEmail`, `customerPhone`, `customerCity`, `customerName`) and internal staff notes are stripped from tracking state.

## 4. XSS, Media & Header Hardening

- **Inline script removal & CSP**:
  - `index.html` contains zero inline `<script>` or `onload=` event handlers.
  - `public/_headers` enforces global `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security: max-age=31536000; includeSubDomains`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, and a strict `Content-Security-Policy` (`default-src 'self'; script-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests`).
  - All admin, auth, client account, tracking, and confirmation routes carry `Referrer-Policy: no-referrer`, `Cache-Control: no-store`, and `X-Robots-Tag: noindex, nofollow`.
- **Safe URL & media validation**:
  - `buildMailtoUrl()` rejects header-injection characters (`?`, `#`, `/`, `\`, whitespace, control chars).
  - `sanitizeSafeMediaUrl()` allows only `idb://`, `blob:` (where enabled), relative `/` paths, and `http:`/`https:`, and blocks `javascript:`, `vbscript:`, `data:image/svg+xml`, `data:text/html`, and protocol-relative bypasses in `ImageWithFallback.jsx` and `structuredData.js`.
  - `mediaService.uploadImage()` strictly accepts JPEG, PNG, and WebP with magic-byte binary signature verification (`validateImageMagicBytes()`) and blocks local IndexedDB uploads in production.

## 5. `DTKS_BE` Backend Contract Mismatches (Recommended Backend Follow-ups)

These items live in the separate `DTKS_BE` repository and cannot be fixed solely inside the frontend without breaking compatibility with existing production endpoints:

1. **HttpOnly Cookie Session Persistence (`Set-Cookie`)**:
   - `DTKS_BE` middleware reads `dtks_access_token`/`dtks_csrf_token` cookies, while current login/refresh controllers still expect/return JSON tokens and lack `GET /api/v1/auth/csrf`. Because the frontend refuses `sessionStorage`/`localStorage` token storage, full page reloads require `DTKS_BE` login/refresh endpoints to issue `HttpOnly; Secure; SameSite=Lax/Strict` cookies so `GET /auth/me` restores sessions transparently.
2. **Fragment (`#token=`) Links in Remaining Email Templates**:
   - `DTKS_BE` sends `#token=` for admin password reset, whereas admin invitations (`/admin/accept-invite`), client verification (`/verify-email`), and client password reset (`/reset-password`) still emit `?token=`. Update `DTKS_BE` `emailService.js` to emit `#token=` for all four flows so `?token=` fallback can be retired.
3. **`POST /api/v1/orders/track` Endpoint**:
   - `DTKS_BE` currently exposes only `GET /api/v1/orders/track?ref=...&email=...`. Add `POST /api/v1/orders/track` (reading `{ referenceId, email }` from the JSON request body) and deprecate query-string email transmission in HTTP access logs.
