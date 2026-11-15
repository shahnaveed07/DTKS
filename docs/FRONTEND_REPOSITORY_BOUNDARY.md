# DTKS Frontend Repository Boundary

## Purpose

The **DreamTech Kashmir Solutions (DTKS)** web platform is cleanly split across two independent repositories:

1. **Frontend (`DTKS`)** — React 19 + Vite + React Router 7 + Tailwind CSS 4 single-page application deployed to Cloudflare Pages (`https://dreamtechkashmirsolutions.studio`).
2. **Backend (`DTKS_BE`)** — Cloudflare Workers API, D1 SQLite database, R2 media storage, authentication/session cookies, and transactional email delivery (`https://api.dreamtechkashmirsolutions.studio/api/v1`).

## Strict Rules Enforced in This Repository

- **Frontend-only codebase**: All UI, routing, client-side validation, API integration wrappers, SEO prerendering, and static hosting headers live here (`src/`, `public/`, `scripts/`).
- **Zero backend runtime files**: No Express/Worker servers, D1 migrations, SQL schemas, database seeds, or backend controllers exist in `DTKS`.
- **Technology stack**: React 19, Vite 8, JavaScript & JSX (`.js`, `.jsx`), React Router DOM 7, and Tailwind CSS 4. TypeScript conversion (`.ts`/`.tsx`) is prohibited for application source files.
- **Zero silent fallback in API mode**: When `VITE_DATA_ADAPTER=api` (or `VITE_API_BASE_URL` is configured), failed backend requests surface structured error states and never substitute mock data or LocalStorage records.
- **No secrets in frontend environment**: `VITE_*` environment variables only declare public origins (`VITE_API_BASE_URL`, `VITE_SITE_URL`) and search verification meta tokens. Database credentials, JWT signing keys, and third-party API secrets belong exclusively to `DTKS_BE`.
