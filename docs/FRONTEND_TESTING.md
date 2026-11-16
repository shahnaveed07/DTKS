# DTKS Frontend Testing & Verification Guide

## Automated Test Suite (`npm test`)

Tests use Node's built-in test runner (`node:test` and `node:assert/strict`) without external browser dependencies:

- `src/seo/seo.test.js` — Canonical URLs, robots directives, JSON-LD Schema.org generation, and R2 asset URL resolution.
- `src/utils/orderUtils.test.js` — Multi-step order wizard validation, currency formatting, tracking lookup, PII & `trackingToken` stripping + sanitized `statusHistory`/`urgency` (`sanitizeTrackedOrder`), `buildMailtoUrl` header-injection defense, `sanitizeSafeMediaUrl` XSS defense, order filtering, and dashboard metrics.
- `src/utils/authValidation.test.js` — 12-character password strength scoring, registration/login/reset/invite/change-password validation, RBAC role guards, admin auth/recovery error-message mapping, open-redirect bypass sanitization, and fragment-only (`#token=`) URL token extraction/scrubbing.
- `src/services/regression.test.js` — LocalStorage migration/backup safety, `DTKS_BE` response envelope unwrapping, volatile in-memory session & CSRF bootstrap (`/api/v1/auth/csrf`, `/api/v1/client/auth/csrf`) isolation (verifying zero token writes to `sessionStorage`/`localStorage` and zero `document.cookie` CSRF reads), cookie-only reload hydration, production HTTPS & origin-pinning enforcement, admin login & `/auth/me` verification workflows, concurrent 401 single-flight token refresh & rotation, `POST /api/v1/orders/track` & `POST /api/v1/orders` client-isolated routing, `dashboardService` analytics normalization, `mediaService` magic-byte validation & path-based R2 uploads/deletes, and static CSP/`_headers`/page security checks.

Run all tests:

```bash
npm install
npm test
```

## Linting & Production Build Verification

```bash
npm run lint
npm run build
```

- `npm run lint` verifies all `.js`/`.jsx`/`.mjs` modules for syntax and import integrity (`scripts/lint-check.mjs`) alongside `tsc --noEmit`.
- `npm run build` compiles the Vite production bundle, prerenders static HTML routes (`scripts/prerender-seo.mjs`), and runs `scripts/validate-sitemap.mjs` to guarantee zero disallowed domains, valid sitemaps, synced `robots.txt`, and valid structured data.

## Manual Staging Verification Checklist (Real Backend)

1. Navigate to `/` and click **Admin Login** in the Footer to reach `/admin/login`.
2. Confirm unauthenticated navigation to `/admin` and `/admin/orders` redirects to `/admin/login` while preserving destination state.
3. Submit an invalid password and verify a clear `"Invalid email or password."` error alert without navigation.
4. Sign in with an active Super Admin account, confirm `GET /api/v1/auth/csrf` -> `POST /api/v1/auth/login` -> `GET /api/v1/auth/me` populate the Dashboard KPIs and analytics, reload the page to verify `HttpOnly` cookie session restoration, and confirm `sessionStorage` / `localStorage` hold zero bearer, refresh, or CSRF tokens.
5. Verify Client registration/password strength rejects passwords under 12 characters, `#token=` flows (`/verify-email#token=...`, `/reset-password#token=...`, `/admin/accept-invite#token=...`, `/track-order#token=...`) immediately scrub URL fragments, and public quote/tracking requests route without Admin auth headers.
6. Click **Sign Out**, confirm `POST /api/v1/auth/logout`, redirect to `/admin/login`, and protection on subsequent `/admin` visits.
