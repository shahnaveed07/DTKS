# DTKS Frontend Deployment Guide (Cloudflare Pages)

## Production Targets

- **Frontend Origin**: `https://dreamtechkashmirsolutions.studio`
- **Backend API Base URL**: `https://api.dreamtechkashmirsolutions.studio/api/v1`

## Environment Variables

Configure these public variables in Cloudflare Pages (`Settings -> Environment variables`):

```env
VITE_DATA_ADAPTER=api
VITE_API_BASE_URL=https://api.dreamtechkashmirsolutions.studio/api/v1
VITE_SITE_URL=https://dreamtechkashmirsolutions.studio
VITE_GOOGLE_SITE_VERIFICATION=
VITE_BING_SITE_VERIFICATION=
```

`apiClient.js` and `clientApiClient.js` explicitly reject `localhost` / `127.0.0.1` API base URLs in production builds (`INVALID_API_BASE_URL`).

## Build Command & Output

- **Install dependencies**: `npm ci` (uses synchronized `package.json` and `package-lock.json`)
- **Build command**: `npm run build`
  1. Compiles the production bundle into `dist/` (`vite build`).
  2. Prerenders static HTML routes, `sitemap.xml`, and `robots.txt` (`node scripts/prerender-seo.mjs`).
  3. Validates canonical tags, OpenGraph metadata, JSON-LD, sitemap exclusions, and security rules (`node scripts/validate-sitemap.mjs`).
- **Publish directory**: `dist`

## Admin Authentication Prerequisites

- Ensure `VITE_DATA_ADAPTER=api` and `VITE_API_BASE_URL=https://api.dreamtechkashmirsolutions.studio/api/v1` are configured in Cloudflare Pages before building.
- Never set `VITE_ENABLE_LOCAL_ADMIN=true` in production; `RequireAdmin` and `AdminLoginPage` enforce `session_required` (`POST /api/v1/auth/login` followed by `GET /api/v1/auth/me`).
- Administrators access sign-in at `/admin/login` (linked discreetly in the Footer as **Admin Login**). New administrators activate via `/admin/accept-invite?token=...`.

## HTTP Security & Indexing Headers (`public/_headers`)

Cloudflare Pages automatically serves `public/_headers`:

- Global security headers (`/*`): `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
- Static asset caching: immutable long-term caching for hashed JS/CSS under `/assets/*` and 30-day cache for `/assets/images/*`.
- `X-Robots-Tag: noindex, nofollow` applied to `/admin`, `/admin/*`, `/account`, `/account/*`, `/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password`, `/track-order`, and `/order-success`.
