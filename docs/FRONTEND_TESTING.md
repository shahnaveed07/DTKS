# DTKS Frontend Testing & Verification Guide

## Automated Test Suite (`npm test`)

Tests use Node's built-in test runner (`node:test` and `node:assert/strict`) without external browser dependencies:

- `src/seo/seo.test.js` — Canonical URLs, robots directives, JSON-LD Schema.org generation, and R2 asset URL resolution.
- `src/utils/orderUtils.test.js` — Multi-step order wizard validation, currency formatting, tracking lookup, order filtering, and dashboard metrics.
- `src/utils/authValidation.test.js` — Password strength scoring, registration/login/reset/invite validation, RBAC role guards, and open-redirect sanitization.
- `src/services/regression.test.js` — LocalStorage migration/backup safety, `DTKS_BE` response envelope unwrapping, admin/client session isolation, HttpOnly cookie-only 401 refresh retries, production localhost API blocking, `mediaService` authenticated R2 uploads/deletes, and `sanitizeSafeExternalUrl` XSS checks.

Run all tests:

```bash
npm test
```

## Linting & Production Build Verification

```bash
npm run lint
npm run build
```

- `npm run lint` verifies all `.js`/`.jsx`/`.mjs` modules for syntax and import integrity (`scripts/lint-check.mjs`) alongside `tsc --noEmit`.
- `npm run build` compiles the Vite production bundle, prerenders static HTML routes (`scripts/prerender-seo.mjs`), and runs `scripts/validate-sitemap.mjs` to guarantee zero disallowed domains, valid sitemaps, synced `robots.txt`, and valid structured data.
