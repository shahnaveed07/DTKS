# DTKS Frontend Deployment Guide (Cloudflare Pages / Workers)

## Production Targets

- **Frontend Origin**: `https://dreamtechkashmirsolutions.studio`
- **Backend API Base URL**: `https://api.dreamtechkashmirsolutions.studio/api/v1`

## Environment Variables (Build-Time Required)

Configure these public variables in your Cloudflare dashboard (**Pages: Settings -> Environment variables** or **Workers & Pages -> Settings -> Build -> Variables and secrets**) for both **Production** and **Preview** environments before running the build:

```env
VITE_DATA_ADAPTER=api
VITE_API_BASE_URL=https://api.dreamtechkashmirsolutions.studio/api/v1
VITE_SITE_URL=https://dreamtechkashmirsolutions.studio
VITE_GOOGLE_SITE_VERIFICATION=
VITE_BING_SITE_VERIFICATION=
```

### Important Notes

- **Vite inlines `VITE_*` variables at build time**: Updating `.env.example` does not configure Cloudflare. If `VITE_DATA_ADAPTER=api` and `VITE_API_BASE_URL` are missing during `npm run build`, Vite compiles the bundle in `local` adapter mode, which causes production security guards (`getAdminAccessPolicy() === 'blocked_production_local'`) to display **"Admin Panel Unavailable in Public Mode"** / **"Admin Sign In Unavailable in Public Mode"**.
- After adding or updating these variables in Cloudflare, trigger a fresh deployment (`Retry deployment` / `npm run build`) so the new bundle embeds them.
- `apiClient.js` and `clientApiClient.js` explicitly reject `localhost` / `127.0.0.1` API base URLs in production builds (`INVALID_API_BASE_URL`).

## Build Command & Output

- **Install dependencies**: `npm ci` (uses synchronized `package.json` and `package-lock.json`)
- **Build command**: `npm run build`
  1. Compiles the production bundle into `dist/` (`vite build`).
  2. Prerenders static HTML routes, `sitemap.xml`, and `robots.txt` (`node scripts/prerender-seo.mjs`).
  3. Validates canonical tags, OpenGraph metadata, JSON-LD, sitemap exclusions, and security rules (`node scripts/validate-sitemap.mjs`).
- **Publish directory**: `dist`

## Admin Authentication Prerequisites

- Ensure `VITE_DATA_ADAPTER=api` and `VITE_API_BASE_URL=https://api.dreamtechkashmirsolutions.studio/api/v1` are configured in Cloudflare before building.
- `VITE_ENABLE_LOCAL_ADMIN` cannot override production security restrictions (`getAdminAccessPolicy()` always enforces `'blocked_production_local'` in production builds unless `VITE_DATA_ADAPTER=api`).
- In API mode, `RequireAdmin` and `AdminLoginPage` enforce `session_required` (`POST /api/v1/auth/login` followed by `GET /api/v1/auth/me`).
- Administrators access sign-in at `/admin/login` (linked discreetly in the Footer as **Admin Login**). New administrators activate via `/admin/accept-invite?token=...`.

## HTTP Security & Indexing Headers (`public/_headers`)

Cloudflare automatically serves `public/_headers`:

- Global security headers (`/*`): `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
- Static asset caching: immutable long-term caching for hashed JS/CSS under `/assets/*` and 30-day cache for `/assets/images/*`.
- `X-Robots-Tag: noindex, nofollow` applied to `/admin`, `/admin/*`, `/account`, `/account/*`, `/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password`, `/track-order`, and `/order-success`.
