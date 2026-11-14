# DTKS Backend REST API Documentation

**Project:** DreamTech Kashmir Solutions (DTKS)  
**Production Website:** `https://dreamtechkashmirsolutions.studio/`  
**API Base Path:** `/api/v1`  
**Architecture:** Cloudflare Workers (ES Modules) + Cloudflare D1 (SQLite) + Cloudflare R2 Object Storage

---

## 1. Base URLs

| Environment | Base URL |
| :--- | :--- |
| **Production Custom API Domain** | `https://api.dreamtechkashmirsolutions.studio/api/v1` |
| **Production Worker Direct URL** | `https://dtks-be.snave9401.workers.dev/api/v1` |
| **Same-Origin Production Route** | `https://dreamtechkashmirsolutions.studio/api/v1` |
| **Local Cloudflare Worker (`wrangler dev`)** | `http://localhost:8787/api/v1` |
| **Local Integrated Dev Server** | `http://localhost:3000/api/v1` |

---

## 1.1 Health & Readiness Probes

| Method | Endpoint | Purpose | Success Status | Failure Status |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/health` | **Liveness Check** — Verifies the Worker is running without touching D1, R2, seeding, or DB rate limiting | `200 OK` (`status: "healthy"`) | N/A |
| `GET` | `/api/v1/ready` | **Readiness Check** — Verifies D1 binding, D1 connection, all 13 schema tables, and R2 `ASSETS_BUCKET` binding | `200 OK` (`status: "ready"`, `database: "connected"`, `schema: "valid"`, `storage: "available"`) | `503 Service Unavailable` (`status: "not_ready"`) |


---

## 2. Standard Response Envelope & Error Format

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully.",
  "data": {}
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Order validation failed.",
    "details": {
      "customerEmail": "A valid customer email address is required."
    }
  }
}
```

### HTTP Status Codes
- `200 OK` – Request succeeded.
- `201 Created` – Resource created (`POST /services`, `POST /packages`, `POST /portfolio`, `POST /orders`, `POST /contact`, `POST /portfolio/upload`).
- `204 No Content` – CORS `OPTIONS` preflight succeeded.
- `400 Bad Request` – Input validation failed (`VALIDATION_ERROR`, `INVALID_STATUS`, `INVALID_IMAGE_UPLOAD`).
- `401 Unauthorized` – Missing, invalid, or expired JWT access/refresh token (`UNAUTHORIZED`, `INVALID_CREDENTIALS`, `INVALID_REFRESH_TOKEN`).
- `403 Forbidden` – Origin blocked by CORS policy (`CORS_ORIGIN_FORBIDDEN`), missing CSRF header on cookie-authenticated mutation (`CSRF_VALIDATION_FAILED`), or insufficient role permissions (`FORBIDDEN`).
- `404 Not Found` – Resource or endpoint not found (`NOT_FOUND`, `ORDER_NOT_FOUND`, `ASSET_NOT_FOUND`).
- `429 Too Many Requests` – Rate limit exceeded (`RATE_LIMIT_EXCEEDED`, includes `Retry-After` header).
- `500 Internal Server Error` – Unexpected server error (`INTERNAL_SERVER_ERROR`, internal stack traces are never leaked).

---

## 3. CORS Configuration & Security Headers

### Allowed Origins
- `https://dreamtechkashmirsolutions.studio`
- `https://www.dreamtechkashmirsolutions.studio`
- `http://localhost:3000` (development)
- `http://localhost:5173` (development)
- `http://localhost:8787` (development)

Requests with an unauthorized `Origin` header receive `403 Forbidden` (`CORS_ORIGIN_FORBIDDEN`).

### Authentication Headers
Admin endpoints accept either:
1. **Bearer Token Header (Recommended for SPA):**
   ```http
   Authorization: Bearer <accessToken>
   ```
2. **HttpOnly Cookie + CSRF Token Header:**
   ```http
   Cookie: dtks_access_token=<accessToken>; dtks_csrf_token=<csrfToken>
   X-CSRF-Token: <csrfToken>
   ```

---

## 4. Endpoints Reference

### 4.1 Authentication (`/api/v1/auth`)

#### `POST /api/v1/auth/login`
Authenticates an active administrator, verifies the WebCrypto PBKDF2-HMAC-SHA512 (`$pbkdf2-sha512$v=1$i=100000$...`) password hash in constant time (transparently migrating legacy `$argon2id$` hashes on login), updates `last_login_at`, creates a hashed session in `refresh_sessions`, and returns a short-lived access token (`15m`) + refresh token (`7d`).

- **Rate Limit:** 10 requests / 15 minutes per IP (distributed across isolates via D1 `rate_limits`).
- **Request Body:**
  ```json
  {
    "email": "admin@dreamtechkashmirsolutions.studio",
    "password": "<YOUR_ADMIN_PASSWORD>"
  }
  ```
- **Response (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "Authentication successful.",
    "data": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
      "csrfToken": "c9f1...",
      "expiresIn": 900,
      "admin": {
        "id": "adm-dtks-initial",
        "name": "DreamTech Kashmir Admin",
        "email": "admin@dreamtechkashmirsolutions.studio",
        "role": "super_admin",
        "is_active": true,
        "last_login_at": "2026-11-14T08:00:00.000Z"
      }
    }
  }
  ```

#### `POST /api/v1/auth/refresh`
Validates a refresh token against `refresh_sessions`, revokes the old session (`revoked_at`), and issues a new access token + rotated refresh token.
- **Request Body:** `{ "refreshToken": "<refreshToken>" }`

#### `POST /api/v1/auth/logout`
Revokes the active refresh session in `refresh_sessions` and clears auth cookies.

#### `GET /api/v1/auth/me`
- **Auth Required:** Yes (`BearerAuth`)
- **Response (`200 OK`):** Current administrator profile.

#### `POST /api/v1/auth/change-password`
- **Auth Required:** Yes (`BearerAuth`)
- **Request Body:**
  ```json
  {
    "currentPassword": "OldPassword123!",
    "newPassword": "NewSecurePassword2026!"
  }
  ```
- **Behavior:** Re-hashes password, revokes all prior refresh sessions in `refresh_sessions`, and issues a fresh token pair.

---

### 4.2 Services Management (`/api/v1/services`)

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/services` | Public (Admin sees inactive with `?includeInactive=true`) | List website services ordered by `display_order ASC` |
| `GET` | `/api/v1/services/:slug` | Public | Get single service by `slug` or `id` |
| `POST` | `/api/v1/services` | Admin | Create a new website service |
| `PUT` | `/api/v1/services/:id` | Admin | Update an existing service |
| `DELETE` | `/api/v1/services/:id` | Admin | Delete a service |

- **Create/Update Request Body Example:**
  ```json
  {
    "title": "Custom Web Portals & Dashboards",
    "slug": "custom-web-portals-dashboards",
    "description": "End-to-end architecture and responsive development for custom web portals.",
    "features": ["Role-based access", "Fast search & reporting", "Responsive layout"],
    "image": "/assets/images/dtks-corporate-website-showcase.jpg",
    "price": 38000,
    "is_active": true,
    "display_order": 11
  }
  ```

---

### 4.3 Packages Management (`/api/v1/packages`)

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/packages` | Public | List packages (supports `?service_id=`, `?category=`, `?includeInactive=true`) |
| `GET` | `/api/v1/packages/:id` | Public | Get package details by ID |
| `POST` | `/api/v1/packages` | Admin | Create a website package |
| `PUT` | `/api/v1/packages/:id` | Admin | Update a website package |
| `DELETE` | `/api/v1/packages/:id` | Admin | Delete a website package |

- **Create/Update Request Body Example:**
  ```json
  {
    "name": "Business Website Package",
    "service_id": "svc-business-websites",
    "category": "Business & Corporate Websites",
    "description": "Complete multi-page website for established companies.",
    "price": 16500,
    "features": ["Up to 10 Custom Pages", "Technical SEO Setup", "Lead Capture Forms"],
    "is_active": true,
    "display_order": 2
  }
  ```

---

### 4.4 Portfolio & Cloudflare R2 Uploads (`/api/v1/portfolio`)

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/portfolio` | Public | List published portfolio items (supports `?category=`, `?page=1&limit=10`, `?includeUnpublished=true`) |
| `GET` | `/api/v1/portfolio/:slug` | Public | Get portfolio project by `slug` or `id` |
| `POST` | `/api/v1/portfolio` | Admin | Create portfolio project |
| `PUT` | `/api/v1/portfolio/:id` | Admin | Update portfolio project (replaces old R2 thumbnail if changed) |
| `DELETE` | `/api/v1/portfolio/:id` | Admin | Delete portfolio project and clean up R2 images |
| `POST` | `/api/v1/portfolio/upload` | Admin | Upload JPEG/PNG/WebP image (max 5MB, magic-byte verified) to R2 |
| `DELETE` | `/api/v1/portfolio/upload` | Admin | Delete image from R2 by `{ "key": "portfolio/..." }` or `/portfolio/upload/:key` |

---

### 4.5 Website Order Management (`/api/v1/orders`)

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/orders` | Public (Rate-limited) | Submit website order request; creates/updates customer, generates `DKS-YYYY-XXXX`, sets status `Pending` |
| `GET` | `/api/v1/orders/track` | Public | Track order by `?ref=DKS-2026-0001&email=customer@example.com` |
| `GET` | `/api/v1/orders` | Admin | List orders (supports `?status=`, `?service=`, `?search=`) |
| `GET` | `/api/v1/orders/:id` | Admin | Get full order details, line items, and status history |
| `PATCH` | `/api/v1/orders/:id/status` | Admin | Update order status (`Pending`, `Reviewed`, `Approved`, `InProgress`, `Completed`, `Rejected`, `Cancelled`) |
| `PATCH` | `/api/v1/orders/:id` | Admin | Update order status, quotation amount, timeline, and admin notes |
| `DELETE` | `/api/v1/orders/:id` | Admin | Delete an order |

- **Public Order Submission (`POST /api/v1/orders`) Example:**
  ```json
  {
    "service_id": "svc-ecommerce-websites",
    "package_id": "pkg-ecommerce-store",
    "customer_name": "Tariq Ahmad",
    "customer_email": "tariq.ahmad@example.com",
    "customer_phone": "+91 97971 23456",
    "project_name": "Kashmir Pashmina Online Storefront",
    "project_description": "Direct-to-consumer storefront for authentic Kashmiri Pashmina shawls with catalog filters.",
    "budget": "₹30,000 – ₹60,000"
  }
  ```

---

### 4.6 Contact & Inquiry Management (`/api/v1/contact`)

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/contact` | Public (Rate-limited) | Submit contact message (validates fields, sanitizes XSS, checks honeypot) |
| `GET` | `/api/v1/contact` | Admin | List & search contact messages (`?status=`, `?search=`) |
| `GET` | `/api/v1/contact/:id` | Admin | View single contact message |
| `PATCH` | `/api/v1/contact/:id` | Admin | Update message status (`New`, `In Review`, `Replied`, `Archived`) and `admin_notes` |
| `DELETE` | `/api/v1/contact/:id` | Admin | Delete contact message |

---

### 4.7 Admin Dashboard & Analytics (`/api/v1/admin/dashboard/*`)

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/admin/dashboard/stats` | Admin | Real-time counts from D1 (`totalOrders`, `pendingOrders`, `completedOrders`, `totalCustomers`, `totalContactMessages`, `activeServices`, `activePackages`, `totalPortfolioItems`) |
| `GET` | `/api/v1/admin/dashboard/recent-orders` | Admin | Latest orders (`?limit=5`) |
| `GET` | `/api/v1/admin/dashboard/recent-messages` | Admin | Latest contact inquiries (`?limit=5`) |
| `GET` | `/api/v1/admin/dashboard/order-analytics` | Admin | Aggregated order counts & quoted values grouped by status, service, hosting preference, and month |

---

### 4.8 Site Settings (`/api/v1/settings`)

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/settings` | Public | Returns public site settings (company name, email, phone, social links, business hours, hero content, SEO metadata) with sensitive keys stripped |
| `PUT` | `/api/v1/settings` | Admin (`super_admin`, `admin`) | Updates site settings in `site_settings` and logs admin activity |

---

### 4.9 Admin Activity Logs (`/api/v1/admin/activity-logs`)

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/admin/activity-logs` | Admin (`super_admin`, `admin`) | Returns audit trail of admin actions, logins, password hash migrations, and transactional email delivery logs (`?limit=50`) |

---

## 5. Role-Based Access Control (RBAC)

| Role | Permitted Actions | Restricted Actions (`403 Forbidden`) |
| :--- | :--- | :--- |
| `super_admin` / `admin` | Full access to all endpoints (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`), site settings, package configurations, and activity logs | None |
| `editor` | Create and update services, packages, portfolio items, R2 uploads, order status/quotations, and contact inquiry statuses | Cannot `DELETE` services, packages, portfolio items, R2 objects, orders, or inquiries; cannot `PUT /api/v1/settings` or `PUT /api/v1/packages/config/*`; cannot view `/api/v1/admin/activity-logs` |

---

## 6. How the Separate Frontend (`DTKS`) Consumes the API

The standalone frontend repository (`https://github.com/shahnaveed07/DTKS.git`) connects to this backend by setting:

```env
VITE_API_BASE_URL=https://api.dreamtechkashmirsolutions.studio/api/v1
```
(or `https://dreamtechkashmirsolutions.studio/api/v1` when using the same-origin Cloudflare Worker route).

- **Public Pages** (`Home`, `Services`, `Packages`, `Portfolio`, `Order Form`, `Track Order`, `Contact`) call `GET /api/v1/bootstrap` (or individual `GET /services`, `GET /packages`, `GET /portfolio`, `GET /settings`), `POST /api/v1/orders`, `GET /api/v1/orders/track`, and `POST /api/v1/contact`.
- **Admin Dashboard & Management Screens** authenticate via `POST /api/v1/auth/login`, attach `Authorization: Bearer <accessToken>` on protected requests, automatically refresh short-lived access tokens via `POST /api/v1/auth/refresh`, and manage services, packages, portfolio items (with `multipart/form-data` R2 image uploads to `POST /api/v1/portfolio/upload`), customer orders, inquiries, and site settings.

