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
  - **Admin Console**: Login (`/admin/login`, discreet **Admin Login** entry in Footer), Accept Invite (`/admin/accept-invite`), Overview Dashboard (KPI cards + `byStatus`, `byService`, `byHosting`, and `monthlyTrend` analytics), Orders, Packages & Maintenance, Portfolio, Team, Inquiries, Admin Accounts (RBAC-gated to `super_admin`/`admin`), Settings.
- `src/services/`:
  - `api/apiClient.js`: Admin session storage (`sessionStorage` + in-memory cache; never `localStorage`), `apiRequest` wrapper, Bearer + `X-CSRF-Token` header injection, single-flight 401 refresh rotation (`POST /api/v1/auth/refresh`), mandatory `GET /api/v1/auth/me` session verification, localhost URL production guard, and backend asset URL resolver.
  - `api/clientApiClient.js`: Strictly isolated client session storage (`dtks_client_auth_session_v1`), `clientApiRequest`, and isolated refresh/CSRF handling.
  - Domain services (`dashboardService.js`, `orderService.js`, `inquiryService.js`, `packageService.js`, `portfolioService.js`, `teamService.js`, `settingsService.js`, `authService.js`, `clientAuthService.js`, `clientAccountService.js`) unwrapping `DTKS_BE` response envelopes.
  - `media/mediaService.js`: Authenticated `apiRequest` upload/delete against `/api/v1/portfolio/upload` (R2 in API mode) and IndexedDB blob storage in local development preview mode.
- `src/utils/`: Order validation, currency formatting, dashboard stats aggregation (`computeDashboardStats`), safe external URL sanitization (`sanitizeSafeExternalUrl`), and auth/password/error-mapping helpers (`authValidation.js`).
- `src/seo/` & `scripts/`: Metadata config (`seoConfig.js`), Schema.org JSON-LD builders (`structuredData.js`), static HTML prerenderer (`scripts/prerender-seo.mjs`), sitemap/robots validator (`scripts/validate-sitemap.mjs`), and custom JSX lint verifier (`scripts/lint-check.mjs`).
