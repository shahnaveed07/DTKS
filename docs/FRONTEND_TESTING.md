# DTKS Frontend Testing & Verification Guide

## Automated Test Suite (`npm test`)

Tests use Node's built-in test runner (`node:test` and `node:assert/strict`) without external browser dependencies:

- `src/seo/seo.test.js` — Canonical URLs, robots directives, JSON-LD Schema.org generation, and R2 asset URL resolution.
- `src/utils/orderUtils.test.js` — Multi-step order wizard validation, currency formatting, tracking lookup, order filtering, and dashboard metrics.
- `src/utils/authValidation.test.js` — Password strength scoring, registration/login/reset/invite validation, RBAC role guards, admin auth error-message mapping, and open-redirect sanitization.
- `src/services/regression.test.js` — LocalStorage migration/backup safety, `DTKS_BE` response envelope unwrapping, admin login & `/auth/me` verification workflows, malformed response rejection, deactivated account blocking, concurrent 401 single-flight token refresh & rotation, admin/client session isolation, `dashboardService` analytics normalization (`byStatus`, `byService`, `byHosting`, `monthlyTrend`), `mediaService` authenticated R2 uploads/deletes, and `sanitizeSafeExternalUrl` XSS checks.

Run all tests:

```bash
npm ci
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
4. Sign in with an active Super Admin account and confirm `POST /api/v1/auth/login` + `GET /api/v1/auth/me` populate the Dashboard KPIs, Orders by Stage, Website Categories, Hosting Preferences, and Monthly Order Volume.
5. Reload `/admin/orders`, verify session persistence, click **Sign Out**, and confirm redirect to `/admin/login` and protection on subsequent `/admin` visits.
