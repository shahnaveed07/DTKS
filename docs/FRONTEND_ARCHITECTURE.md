# DTKS Frontend Architecture

## Technology Stack

- **UI Framework**: React 19 (`src/App.jsx`, `src/main.jsx`)
- **Build & Bundler**: Vite 8 (`vite.config.js`)
- **Routing**: React Router DOM 7 (`BrowserRouter`, lazy-loaded Admin and Client Portal modules wrapped in `Suspense` and root `ErrorBoundary`)
- **Styling**: Tailwind CSS 4 (`src/index.css`) with DTKS green/white design tokens (`#16834A`, `#116438`, `#F7FAF7`, `#E3EBE5`)
- **Icons**: `lucide-react`

## Directory Structure

- `src/components/`: Shared layout shells (`PublicLayout`, `AdminLayout`, `ClientLayout`, `Navbar`, `Footer`), auth route guards (`RequireAdmin`, `RequireClient`), `ErrorBoundary`, `ConfirmDialog`, `ToastContainer`, `SEO`, and `ImageWithFallback`.
- `src/context/`:
  - `AppContext.jsx`: Catalog, portfolio, team, settings, orders, inquiries, confirmation dialogs, and toast notifications (with timer cleanup on dismiss/unmount).
  - `ClientAuthContext.jsx`: Isolated client authentication state.
- `src/pages/`:
  - **Public**: Home, Services, Packages, Portfolio, Project Detail, Team, About, Contact, Request Quote (7-step wizard), Track Order (7-stage canonical stepper with backend alias mapping), Privacy Policy, Terms.
  - **Client Auth & Portal**: Register, Verify Email, Login, Forgot/Reset Password, Dashboard, Profile, My Orders, Quotations, Projects, Security.
  - **Admin Console**: Login (`/admin/login`, discreet **Admin Login** entry in Footer), Forgot/Reset Password (`/admin/forgot-password`, `/admin/reset-password`), Accept Invite (`/admin/accept-invite`), Overview Dashboard (KPI cards + `byStatus`, `byService`, `byHosting`, and `monthlyTrend` analytics), Orders, Packages & Maintenance, Portfolio, Team, Inquiries, Admin Accounts (RBAC-gated to `super_admin`/`admin`), Settings.
- `src/services/`:
  - `api/apiClient.js`: Volatile in-memory-only Admin session and CSRF store (never `localStorage`, `sessionStorage`, or `document.cookie`), `apiRequest` wrapper with `validateApiRequestUrl` origin pinning and production HTTPS enforcement, volatile CSRF bootstrap (`GET /api/v1/auth/csrf`) + `X-CSRF-Token` injection + single `403 CSRF_VALIDATION_FAILED` retry, single-flight 401 refresh rotation (`POST /api/v1/auth/refresh`), mandatory `GET /api/v1/auth/me` session verification, and sanitized backend asset URL resolution.
  - `api/clientApiClient.js`: Strictly isolated volatile in-memory-only Client session and CSRF store (`GET /api/v1/client/auth/csrf`), `clientApiRequest` with `validateApiRequestUrl`, `403 CSRF_VALIDATION_FAILED` retry, single-flight `/client/auth/refresh`, and cookie-only `/client/auth/me` session hydration.
  - Domain services (`dashboardService.js`, `orderService.js`, `inquiryService.js`, `packageService.js`, `portfolioService.js`, `teamService.js`, `settingsService.js`, `authService.js`, `clientAuthService.js`, `clientAccountService.js`) unwrapping `DTKS_BE` response envelopes, routing public quote submissions and `POST /api/v1/orders/track` token lookups exclusively through isolated Client transport, and stripping PII/tracking tokens from public tracking responses (`sanitizeTrackedOrder`).
  - `media/mediaService.js`: Authenticated `apiRequest` upload/delete against `/api/v1/portfolio/upload` (path-based DELETE, JPG/PNG/WebP magic-byte verification, R2 in API mode) and IndexedDB blob storage restricted to non-production local dev preview mode.
- `src/utils/`: Order validation, currency formatting, dashboard stats aggregation (`computeDashboardStats`), safe external/media/mailto URL sanitization (`sanitizeSafeExternalUrl`, `sanitizeSafeMediaUrl`, `buildMailtoUrl`), and auth/password/token-URL/open-redirect helpers (`authValidation.js`).
- `src/seo/` & `scripts/`: Metadata config (`seoConfig.js`), Schema.org JSON-LD builders (`structuredData.js`), static HTML prerenderer (`scripts/prerender-seo.mjs` with `no-referrer` injection on noindex routes), sitemap/robots validator (`scripts/validate-sitemap.mjs`), and custom JSX lint verifier (`scripts/lint-check.mjs`).
- Security model and backend contract alignment notes are documented in `docs/FRONTEND_SECURITY.md`.
