# DTKS_BE – DreamTech Kashmir Solutions Backend

**Production Website:** `https://dreamtechkashmirsolutions.studio/`  
**Backend Repository:** `https://github.com/shahnaveed07/DTKS_BE.git`  
**Frontend Repository:** `https://github.com/shahnaveed07/DTKS.git`  
**Architecture:** Cloudflare Workers (JavaScript ES Modules) + Cloudflare D1 (SQLite) + Cloudflare R2 Object Storage

This repository contains **only** the production REST API backend for **DreamTech Kashmir Solutions (DTKS)**. It is independently deployable to Cloudflare Workers and serves the separate DTKS frontend application via `/api/v1/*`.

---

## 1. Directory Structure

```text
backend/
├── src/
│   ├── index.js                  # Cloudflare Worker fetch entry point
│   ├── routes/
│   │   └── router.js             # REST API router (/api/v1/*) with granular RBAC
│   ├── controllers/
│   │   ├── authController.js     # Login, logout, token refresh, profile, password change & hash migration
│   │   ├── servicesController.js # Services CRUD & public catalog
│   │   ├── packagesController.js # Packages CRUD, service filtering, add-ons & maintenance
│   │   ├── portfolioController.js# Portfolio CRUD, pagination, ordering, R2 image uploads
│   │   ├── ordersController.js   # Customer order creation, tracking, admin status & history
│   │   ├── contactController.js  # Contact form submission, spam filtering, admin search & notes
│   │   ├── dashboardController.js# Real-time D1 dashboard stats, recent items & analytics
│   │   └── settingsController.js # Public & admin site settings (with secret stripping)
│   ├── services/
│   │   ├── auditService.js       # Admin activity logging (activity_logs table)
│   │   ├── emailService.js       # Transactional email notifications (RESEND_API_KEY + audit log)
│   │   └── storageService.js     # Cloudflare R2 object upload, serving & deletion
│   ├── middleware/
│   │   ├── authMiddleware.js     # Strict JWT verification, RBAC (super_admin/admin/editor), CSRF check
│   │   ├── rateLimiter.js        # Distributed D1 sliding-window rate limiter (+ native binding support)
│   │   ├── securityHeaders.js    # CORS origin enforcement & HTTP security headers
│   │   └── errorHandler.js       # Standardized error handling without internal stack leaks
│   ├── database/
│   │   ├── d1Adapter.js          # Node.js SQLite + filesystem R2 adapter for local dev/testing
│   │   └── seed.js               # Non-destructive, idempotent catalog & explicit initial admin seeder
│   ├── validators/
│   │   └── schemas.js            # Request payload validation, XSS sanitization & magic-byte checks
│   ├── utils/
│   │   ├── crypto.js             # WebCrypto PBKDF2-HMAC-SHA512 ($pbkdf2-sha512$), legacy migration, JWT
│   │   └── response.js           # Standardized JSON response, XSS sanitizer & body size enforcement
│   └── config/
│       ├── constants.js          # Allowed statuses, roles, MIME types & size limits
│       └── cors.js               # Allowed origin validation
├── migrations/
│   ├── 0001_initial_schema.sql   # 13 relational D1 tables, foreign keys, CHECK constraints & indexes
│   └── 0002_seed_data.sql        # Non-destructive initial site settings migration (INSERT OR IGNORE)
├── tests/
│   └── backend.test.js           # 14 comprehensive security, RBAC, CRUD & persistence test suites
├── docs/
│   ├── API_DOCUMENTATION.md      # Complete REST API reference & frontend integration guide
│   ├── openapi.yaml              # OpenAPI 3.0.3 specification
│   └── dtks-postman-collection.json # Postman Collection v2.1
├── wrangler.toml                 # Cloudflare Workers, D1, and R2 configuration
├── .dev.vars.example             # Example environment variables & secrets
└── package.json                  # Backend scripts & metadata
```

---

## 2. Security Architecture

1. **No Default or Fallback Administrator Credentials**:
   - An initial administrator is created **only** when the `admins` table is empty **and** both `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD` (minimum 10 characters, non-placeholder) are explicitly provided via environment secrets.
2. **WebCrypto PBKDF2-HMAC-SHA512 Password Hashing & Transparent Migration**:
   - New and updated passwords use canonical PHC format: `$pbkdf2-sha512$v=1$i=100000$<saltHex>$<hashHex>` with constant-time comparison.
   - Existing legacy `$argon2id$v=19$...` hashes are transparently verified on login and automatically re-hashed to `$pbkdf2-sha512$v=1$i=100000$...` without disrupting existing administrator accounts.
3. **JWT Authentication & Refresh Session Rotation**:
   - Short-lived access tokens (`15m`) and rotated refresh tokens (`7d`) signed with HMAC-SHA256 (`JWT_SECRET` must be at least 32 characters in production).
   - Refresh tokens are stored as SHA-256 hashes in `refresh_sessions`, rotated on every `/api/v1/auth/refresh` call, and immediately revoked on logout or password change.
4. **Role-Based Access Control (RBAC)**:
   - `super_admin` & `admin`: Full access to all administrative endpoints, including `DELETE` operations, site settings updates (`PUT /api/v1/settings`), package add-on/maintenance config updates, and audit logs (`GET /api/v1/admin/activity-logs`).
   - `editor`: Permitted to create and update services, packages, portfolio items, orders, and contact inquiries, but restricted (`403 Forbidden`) from deleting records, modifying global site settings, or viewing system audit logs.
5. **Distributed Rate Limiting**:
   - Backed by the Cloudflare D1 `rate_limits` table across Worker isolates (and optional Cloudflare native `RATE_LIMITER` binding), with automatic fallback for local testing.

---

## 3. Relational Database Schema (Cloudflare D1)

Defined in `migrations/0001_initial_schema.sql` with 13 tables, foreign keys, `CHECK` constraints, and indexes:

1. `admins` – Administrator accounts (`id`, `name`, `email`, `password_hash`, `role`, `is_active`, `created_at`, `updated_at`, `last_login_at`)
2. `refresh_sessions` – Hashed refresh token sessions (`id`, `admin_id`, `refresh_token_hash`, `user_agent`, `ip_address`, `expires_at`, `revoked_at`, `created_at`)
3. `customers` – Customer records (`id`, `full_name`, `email`, `phone`, `city`, `business_name`, `created_at`, `updated_at`)
4. `services` – Website services (`id`, `title`, `slug`, `description`, `features`, `image`, `price`, `is_active`, `display_order`, `created_at`, `updated_at`, plus metadata columns)
5. `packages` – Service pricing packages (`id`, `name`, `description`, `price`, `features`, `service_id`, `is_active`, `display_order`, `created_at`, `updated_at`, plus scope columns)
6. `portfolio` – Website showcase items (`id`, `project_title`, `slug`, `description`, `category`, `thumbnail`, `images`, `project_url`, `is_published`, `display_order`, `created_at`, `updated_at`)
7. `orders` – Customer website orders (`id`, `order_number`, `customer_id`, `service_id`, `package_id`, `customer_name`, `customer_email`, `customer_phone`, `project_description`, `budget`, `status`, `admin_notes`, `created_at`, `updated_at`, plus scope & quotation columns)
8. `order_items` – Order line items (`id`, `order_id`, `item_type`, `title`, `description`, `quantity`, `unit_price`, `currency`, `created_at`)
9. `order_status_history` – Audit trail of order status transitions (`id`, `order_id`, `previous_status`, `new_status`, `changed_by_admin_id`, `notes`, `created_at`)
10. `contact_messages` – Customer inquiries (`id`, `name`, `email`, `phone`, `subject`, `message`, `status`, `admin_notes`, `created_at`, `updated_at`)
11. `site_settings` – Key-value JSON site configuration (`setting_key`, `setting_value`, `updated_at`, `updated_by_admin_id`)
12. `activity_logs` – Admin audit & email delivery logs (`id`, `admin_id`, `action`, `entity_type`, `entity_id`, `details`, `ip_address`, `timestamp`)
13. `rate_limits` – Distributed sliding-window rate limit counters (`rate_key`, `window_start`, `request_count`, `expires_at`)

---

## 4. Local Development & Testing

### 4.1 Environment Variables
Copy `backend/.dev.vars.example` to `backend/.dev.vars` (for Wrangler) or `.env.example` to `.env` (for the local Node.js adapter):
```bash
cp backend/.dev.vars.example backend/.dev.vars
```

### 4.2 Run Automated Backend Test Suite
From the repository root:
```bash
npm test
```

### 4.3 Run with Cloudflare Wrangler
```bash
cd backend
npx wrangler d1 migrations apply dtks-production-db --local
npx wrangler dev
```

---

## 5. Production Cloudflare Deployment

### Step 1: Create D1 Database & R2 Bucket
```bash
cd backend
npx wrangler d1 create dtks-production-db
npx wrangler r2 bucket create dtks-portfolio-assets
```
Replace `"REPLACE_WITH_CLOUDFLARE_D1_DATABASE_ID"` in `backend/wrangler.toml` with the ID returned by Wrangler.

### Step 2: Apply D1 Database Migrations
```bash
npx wrangler d1 migrations apply dtks-production-db --remote
```

### Step 3: Configure Standardized Production Secrets
```bash
npx wrangler secret put JWT_SECRET --env production
npx wrangler secret put INITIAL_ADMIN_EMAIL --env production
npx wrangler secret put INITIAL_ADMIN_PASSWORD --env production
npx wrangler secret put INITIAL_ADMIN_NAME --env production
npx wrangler secret put RESEND_API_KEY --env production
```

### Step 4: Deploy Worker
```bash
npx wrangler deploy --env production
```
