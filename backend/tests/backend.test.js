import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import workerApp from '../src/index.js';
import { createNodeWorkerEnv, LocalD1Database } from '../src/database/d1Adapter.js';
import {
  hashPassword,
  verifyPassword,
  verifyPasswordWithMigration,
  signJwt,
} from '../src/utils/crypto.js';
import { resetRateLimiter } from '../src/middleware/rateLimiter.js';
import { ensureDatabaseSeeded } from '../src/database/seed.js';

// Minimal valid 1x1 PNG buffer (magic bytes: 89 50 4E 47 0D 0A 1A 0A)
const VALID_PNG_BYTES = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082',
  'hex'
);

const TEST_ADMIN_EMAIL = 'admin@dreamtechkashmirsolutions.studio';
const TEST_ADMIN_PASSWORD = 'TestStrongPassword#2026!';
const TEST_JWT_SECRET = 'dtks-test-suite-256-bit-random-hmac-secret-key-2026-verified';

describe('DTKS Production Backend Audit & Security Test Suite (/api/v1)', () => {
  let tmpDir;
  let dbPath;
  let r2Dir;
  let env;
  let accessToken = '';
  let refreshToken = '';
  let createdOrderId = '';
  let createdOrderRef = '';

  before(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dtks-backend-audit-'));
    dbPath = path.join(tmpDir, 'dtks-test.sqlite');
    r2Dir = path.join(tmpDir, 'r2-storage');
    env = createNodeWorkerEnv({
      dbPath,
      r2Dir,
      overrides: {
        ENVIRONMENT: 'development',
        JWT_SECRET: TEST_JWT_SECRET,
        INITIAL_ADMIN_NAME: 'DTKS Test Super Admin',
        INITIAL_ADMIN_EMAIL: TEST_ADMIN_EMAIL,
        INITIAL_ADMIN_PASSWORD: TEST_ADMIN_PASSWORD,
      },
    });
    await resetRateLimiter(env);
  });

  after(() => {
    try {
      env?.DB?.close?.();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  async function apiRequest(pathname, options = {}) {
    const {
      method = 'GET',
      body = null,
      token = null,
      headers = {},
      ip = '127.0.0.1',
      origin = 'https://dreamtechkashmirsolutions.studio',
      customEnv = env,
    } = options;

    const reqHeaders = new Headers(headers);
    if (origin) reqHeaders.set('Origin', origin);
    if (ip) reqHeaders.set('CF-Connecting-IP', ip);
    if (token) reqHeaders.set('Authorization', `Bearer ${token}`);

    let requestBody = body;
    if (body && !(body instanceof FormData) && typeof body === 'object' && !Buffer.isBuffer(body)) {
      reqHeaders.set('Content-Type', 'application/json');
      requestBody = JSON.stringify(body);
    }

    const request = new Request(`https://dreamtechkashmirsolutions.studio${pathname}`, {
      method,
      headers: reqHeaders,
      body: requestBody,
    });

    const response = await workerApp.fetch(request, customEnv, {});
    const contentType = response.headers.get('content-type') || '';
    const json = contentType.includes('application/json') ? await response.json() : null;
    return { status: response.status, headers: response.headers, json, response };
  }

  it('1. Security Audit: Never creates a default admin when INITIAL_ADMIN_PASSWORD is missing or placeholder', async () => {
    const emptyDbPath = path.join(tmpDir, 'no-fallback-admin.sqlite');
    const unseededEnv = createNodeWorkerEnv({
      dbPath: emptyDbPath,
      r2Dir,
      overrides: {
        ENVIRONMENT: 'production',
        JWT_SECRET: TEST_JWT_SECRET,
        INITIAL_ADMIN_EMAIL: 'admin@dreamtechkashmirsolutions.studio',
        INITIAL_ADMIN_PASSWORD: '', // No password provided
      },
    });

    await ensureDatabaseSeeded(unseededEnv);
    const adminCount = await unseededEnv.DB.prepare('SELECT COUNT(*) AS cnt FROM admins').first();
    assert.equal(Number(adminCount.cnt), 0, 'Must never create an admin without explicit password');
    unseededEnv.DB.close();
  });

  it('2. Password Hashing & Legacy Hash Migration: Uses canonical $pbkdf2-sha512$ format and seamlessly migrates legacy hashes', async () => {
    const hash = await hashPassword('SecurePass!2026');
    assert.ok(
      hash.startsWith('$pbkdf2-sha512$v=1$i=100000$'),
      `Expected canonical $pbkdf2-sha512$ prefix, got: ${hash}`
    );
    assert.equal(await verifyPassword('SecurePass!2026', hash), true);
    assert.equal(await verifyPassword('WrongPass!2026', hash), false);

    // Construct a legacy mislabeled $argon2id$v=19$m=65536,t=100000,p=4$<salt>$<hash> string using the same PBKDF2-SHA512 bytes
    const parts = hash.split('$').filter(Boolean);
    const saltHex = parts[3];
    const derivedHex = parts[4];
    const legacyHash = `$argon2id$v=19$m=65536,t=100000,p=4$${saltHex}$${derivedHex}`;

    const migrationCheck = await verifyPasswordWithMigration('SecurePass!2026', legacyHash);
    assert.equal(migrationCheck.valid, true);
    assert.equal(migrationCheck.needsRehash, true);

    // Seed an admin with the legacy hash and verify login transparently upgrades the stored hash in D1
    await ensureDatabaseSeeded(env);
    const legacyAdminPass = await hashPassword(TEST_ADMIN_PASSWORD);
    const [, , , admSalt, admDerived] = legacyAdminPass.split('$').filter(Boolean);
    const legacyAdminStored = `$argon2id$v=19$m=65536,t=100000,p=4$${admSalt}$${admDerived}`;
    await env.DB.prepare("UPDATE admins SET password_hash = ? WHERE id = 'adm-root-1'")
      .bind(legacyAdminStored)
      .run();

    const loginRes = await apiRequest('/api/v1/auth/login', {
      method: 'POST',
      body: { email: TEST_ADMIN_EMAIL, password: TEST_ADMIN_PASSWORD },
    });
    assert.equal(loginRes.status, 200);

    const rowAfterLogin = await env.DB.prepare(
      "SELECT password_hash FROM admins WHERE id = 'adm-root-1'"
    ).first();
    assert.ok(
      rowAfterLogin.password_hash.startsWith('$pbkdf2-sha512$v=1$i=100000$'),
      'Login must transparently migrate legacy password hash to $pbkdf2-sha512$'
    );

    accessToken = loginRes.json.data.accessToken;
    refreshToken = loginRes.json.data.refreshToken;
  });

  it('3. Authentication & Invalid Credentials: Valid token accesses /auth/me; invalid credentials return 401', async () => {
    const meRes = await apiRequest('/api/v1/auth/me', { token: accessToken });
    assert.equal(meRes.status, 200);
    assert.equal(meRes.json.data.admin.email, TEST_ADMIN_EMAIL);
    assert.equal(meRes.json.data.admin.role, 'super_admin');

    const badLogin = await apiRequest('/api/v1/auth/login', {
      method: 'POST',
      ip: '10.0.0.2',
      body: { email: TEST_ADMIN_EMAIL, password: 'WrongPassword123!' },
    });
    assert.equal(badLogin.status, 401);
    assert.equal(badLogin.json.error.code, 'INVALID_CREDENTIALS');
  });

  it('4. Unauthorized API Access & Expired JWT Rejection: Rejects missing, tampered, or expired tokens', async () => {
    const noTokenRes = await apiRequest('/api/v1/admin/dashboard/stats');
    assert.equal(noTokenRes.status, 401);

    const expiredJwt = await signJwt(
      {
        sub: 'adm-root-1',
        email: TEST_ADMIN_EMAIL,
        role: 'super_admin',
        type: 'access',
      },
      TEST_JWT_SECRET,
      -60
    );
    const expiredRes = await apiRequest('/api/v1/auth/me', { token: expiredJwt });
    assert.equal(expiredRes.status, 401);
    assert.equal(expiredRes.json.error.code, 'TOKEN_EXPIRED');
  });

  it('5. Refresh-Token Rotation & Revocation: Rotates token pair and rejects reuse of revoked refresh token', async () => {
    const refreshRes = await apiRequest('/api/v1/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
    });
    assert.equal(refreshRes.status, 200);
    assert.ok(refreshRes.json.data.accessToken);
    assert.ok(refreshRes.json.data.refreshToken);
    assert.notEqual(refreshRes.json.data.refreshToken, refreshToken);

    // Reusing the old refresh token is rejected with 401
    const reuseRes = await apiRequest('/api/v1/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
    });
    assert.equal(reuseRes.status, 401);

    accessToken = refreshRes.json.data.accessToken;
    refreshToken = refreshRes.json.data.refreshToken;
  });

  it('6. Role-Based Authorization (RBAC) & Destructive Reset Removal: Enforces editor vs super_admin permissions', async () => {
    // Verify destructive /api/v1/admin/reset-seed endpoint has been removed (returns 404)
    const resetSeedRes = await apiRequest('/api/v1/admin/reset-seed', {
      method: 'POST',
      token: accessToken,
    });
    assert.equal(resetSeedRes.status, 404);

    // Insert an `editor` admin and sign a token for them
    const editorHash = await hashPassword('EditorPass#2026!');
    await env.DB.prepare(
      `INSERT INTO admins (id, name, email, password_hash, role, is_active, created_at, updated_at)
       VALUES ('adm-editor-1', 'DTKS Content Editor', 'editor@dreamtechkashmirsolutions.studio', ?, 'editor', 1, datetime('now'), datetime('now'))`
    )
      .bind(editorHash)
      .run();

    const editorToken = await signJwt(
      {
        sub: 'adm-editor-1',
        email: 'editor@dreamtechkashmirsolutions.studio',
        role: 'editor',
        type: 'access',
      },
      TEST_JWT_SECRET,
      900
    );

    // Editor CAN read dashboard stats
    const editorStatsRes = await apiRequest('/api/v1/admin/dashboard/stats', {
      token: editorToken,
    });
    assert.equal(editorStatsRes.status, 200);

    // Editor CANNOT modify global site_settings (403 FORBIDDEN)
    const editorSettingsRes = await apiRequest('/api/v1/settings', {
      method: 'PUT',
      token: editorToken,
      body: { companyName: 'Unauthorized Override' },
    });
    assert.equal(editorSettingsRes.status, 403);
    assert.equal(editorSettingsRes.json.error.code, 'FORBIDDEN');

    // Editor CANNOT delete services (403 FORBIDDEN)
    const editorDeleteSvc = await apiRequest('/api/v1/services/svc-landing-pages', {
      method: 'DELETE',
      token: editorToken,
    });
    assert.equal(editorDeleteSvc.status, 403);
  });

  it('7. Services CRUD & Non-Destructive Seeding: Creates, updates, filters, and preserves modified services across re-seeding', async () => {
    const createRes = await apiRequest('/api/v1/services', {
      method: 'POST',
      token: accessToken,
      body: {
        title: 'Custom Web Portals & Dashboards',
        slug: 'custom-web-portals-dashboards',
        order_category: 'Custom Web Portals & Dashboards',
        short_description: 'Tailored web portals and internal business dashboards.',
        description: 'End-to-end architecture and responsive development for custom web portals.',
        features: ['Role-based access', 'Fast search & reporting', 'Responsive layout'],
        price: 38000,
        is_active: true,
        display_order: 20,
      },
    });
    assert.equal(createRes.status, 201);
    const createdId = createRes.json.data.service.id;

    // Modify an existing seeded service and verify ensureDatabaseSeeded NEVER overwrites it
    const updateSeededRes = await apiRequest('/api/v1/services/svc-business-websites', {
      method: 'PUT',
      token: accessToken,
      body: { price: 19500 },
    });
    assert.equal(updateSeededRes.status, 200);
    assert.equal(updateSeededRes.json.data.service.price, 19500);

    // Re-run ensureDatabaseSeeded on a fresh DB wrapper pointing to the same file
    const secondEnv = createNodeWorkerEnv({ dbPath, r2Dir });
    await ensureDatabaseSeeded(secondEnv);
    const preservedSvc = await secondEnv.DB.prepare(
      "SELECT price FROM services WHERE id = 'svc-business-websites'"
    ).first();
    secondEnv.DB.close();
    assert.equal(Number(preservedSvc.price), 19500, 'Startup seeding must never overwrite existing records');

    const deleteRes = await apiRequest(`/api/v1/services/${createdId}`, {
      method: 'DELETE',
      token: accessToken,
    });
    assert.equal(deleteRes.status, 200);
  });

  it('8. Packages CRUD & Service-Based Filtering (?service_id=): Works end-to-end', async () => {
    const createRes = await apiRequest('/api/v1/packages', {
      method: 'POST',
      token: accessToken,
      body: {
        name: 'Enterprise Corporate Website Package',
        category: 'Business & Corporate Websites',
        service_id: 'svc-business-websites',
        description: 'Comprehensive multi-department corporate website package.',
        price: 45000,
        currency: 'INR',
        pages_count: 'Up to 20 Pages',
        features: ['Custom design system', 'Technical SEO', 'Speed optimization'],
        is_active: true,
        is_featured: true,
        display_order: 15,
      },
    });
    assert.equal(createRes.status, 201);
    const pkgId = createRes.json.data.package.id;

    const filteredList = await apiRequest('/api/v1/packages?service_id=svc-business-websites');
    assert.equal(filteredList.status, 200);
    assert.ok(filteredList.json.data.packages.some((p) => p.id === pkgId));

    const updateRes = await apiRequest(`/api/v1/packages/${pkgId}`, {
      method: 'PUT',
      token: accessToken,
      body: { price: 48000 },
    });
    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.json.data.package.price, 48000);

    const delRes = await apiRequest(`/api/v1/packages/${pkgId}`, {
      method: 'DELETE',
      token: accessToken,
    });
    assert.equal(delRes.status, 200);
  });

  it('9. Portfolio CRUD, Pagination, Category Filtering & Publishing Toggle: Works end-to-end', async () => {
    const createProjRes = await apiRequest('/api/v1/portfolio', {
      method: 'POST',
      token: accessToken,
      body: {
        project_title: 'Pahalgam Eco Lodge Booking Website',
        slug: 'pahalgam-eco-lodge-website',
        category: 'Restaurant & Hotel Websites',
        short_overview: 'Eco lodge website with seasonal tariff tables.',
        description: 'Designed and developed a fast hospitality website for a Pahalgam lodge.',
        thumbnail: '/assets/images/dtks-corporate-website-showcase.jpg',
        images: ['/assets/images/dtks-corporate-website-showcase.jpg'],
        project_url: 'https://dreamtechkashmirsolutions.studio',
        is_published: true,
        display_order: 1,
      },
    });
    assert.equal(createProjRes.status, 201);
    const projId = createProjRes.json.data.project.id;

    const paginatedRes = await apiRequest('/api/v1/portfolio?page=1&limit=2');
    assert.equal(paginatedRes.status, 200);
    assert.equal(paginatedRes.json.data.projects.length, 2);
    assert.ok(paginatedRes.json.data.pagination.total >= 4);

    // Unpublish and verify public 404
    const unpubRes = await apiRequest(`/api/v1/portfolio/${projId}`, {
      method: 'PUT',
      token: accessToken,
      body: { is_published: false },
    });
    assert.equal(unpubRes.status, 200);
    assert.equal(unpubRes.json.data.project.is_published, false);

    const hiddenSlugRes = await apiRequest('/api/v1/portfolio/pahalgam-eco-lodge-website');
    assert.equal(hiddenSlugRes.status, 404);

    const delRes = await apiRequest(`/api/v1/portfolio/${projId}`, {
      method: 'DELETE',
      token: accessToken,
    });
    assert.equal(delRes.status, 200);
  });

  it('10. R2 Image Upload & File Upload Validation: Enforces MIME type, size limit, and magic-byte binary headers', async () => {
    // Valid PNG upload
    const formData = new FormData();
    formData.append('file', new Blob([VALID_PNG_BYTES], { type: 'image/png' }), 'preview.png');
    formData.append('folder', 'portfolio');

    const uploadRes = await apiRequest('/api/v1/portfolio/upload', {
      method: 'POST',
      token: accessToken,
      body: formData,
    });
    assert.equal(uploadRes.status, 201);
    const uploadedAsset = uploadRes.json.data.asset;

    const assetGetRes = await apiRequest(uploadedAsset.url);
    assert.equal(assetGetRes.status, 200);
    assert.equal(assetGetRes.headers.get('content-type'), 'image/png');

    const deleteAssetRes = await apiRequest('/api/v1/portfolio/upload', {
      method: 'DELETE',
      token: accessToken,
      body: { key: uploadedAsset.key },
    });
    assert.equal(deleteAssetRes.status, 200);

    // Reject HTML file upload
    const badForm = new FormData();
    badForm.append('file', new Blob(['<script>alert(1)</script>'], { type: 'text/html' }), 'bad.html');
    const badRes = await apiRequest('/api/v1/portfolio/upload', {
      method: 'POST',
      token: accessToken,
      body: badForm,
    });
    assert.equal(badRes.status, 400);
    assert.equal(badRes.json.error.code, 'INVALID_IMAGE_UPLOAD');

    // Reject spoofed MIME with non-image magic bytes
    const spoofForm = new FormData();
    spoofForm.append('file', new Blob([Buffer.from('not-a-real-png')], { type: 'image/png' }), 'spoof.png');
    const spoofRes = await apiRequest('/api/v1/portfolio/upload', {
      method: 'POST',
      token: accessToken,
      body: spoofForm,
    });
    assert.equal(spoofRes.status, 400);
    assert.equal(spoofRes.json.error.code, 'INVALID_IMAGE_UPLOAD');
  });

  it('11. Orders & Order Status History: Creates customer + order, tracks publicly, and records status history transitions', async () => {
    const orderRes = await apiRequest('/api/v1/orders', {
      method: 'POST',
      body: {
        service_id: 'svc-ecommerce-websites',
        package_id: 'pkg-ecommerce-store',
        project_name: 'Kashmir Pashmina Online Storefront',
        business_name: 'Zoon Artisans Collective',
        project_description:
          'Direct-to-consumer storefront for authentic Kashmiri Pashmina shawls with catalog filters.',
        budget: '₹30,000 – ₹60,000',
        customer_name: 'Tariq Ahmad',
        customer_email: 'tariq.ahmad@example.com',
        customer_phone: '+91 97971 23456',
        customer_city: 'Srinagar',
      },
    });
    assert.equal(orderRes.status, 201);
    createdOrderId = orderRes.json.data.order.id;
    createdOrderRef = orderRes.json.data.order.order_number;
    assert.equal(orderRes.json.data.order.status, 'Pending');

    // Invalid order submission fails with 400
    const badOrderRes = await apiRequest('/api/v1/orders', {
      method: 'POST',
      body: {
        customer_name: 'A',
        customer_email: 'invalid-email',
        customer_phone: '12',
        project_description: 'Short',
      },
    });
    assert.equal(badOrderRes.status, 400);

    // Admin updates status to Reviewed then InProgress
    const reviewRes = await apiRequest(`/api/v1/orders/${createdOrderRef}/status`, {
      method: 'PATCH',
      token: accessToken,
      body: {
        status: 'Reviewed',
        customer_update: 'Initial scope reviewed by engineering.',
      },
    });
    assert.equal(reviewRes.status, 200);

    const progressRes = await apiRequest(`/api/v1/orders/${createdOrderId}/status`, {
      method: 'PATCH',
      token: accessToken,
      body: {
        status: 'InProgress',
        customer_update: 'Storefront development started.',
        admin_notes: 'Assigned to lead developer.',
      },
    });
    assert.equal(progressRes.status, 200);
    assert.equal(progressRes.json.data.order.status, 'InProgress');
    assert.ok(progressRes.json.data.order.statusHistory.length >= 3);

    // Public tracking reflects updated status and history without leaking internal admin_notes
    const trackRes = await apiRequest(
      `/api/v1/orders/track?ref=${encodeURIComponent(createdOrderRef)}&email=tariq.ahmad@example.com`
    );
    assert.equal(trackRes.status, 200);
    assert.equal(trackRes.json.data.order.status, 'InProgress');
    assert.equal(trackRes.json.data.order.admin_notes, undefined);
  });

  it('12. Contact Messages, XSS Sanitization & Spam Protection: Works end-to-end', async () => {
    // Spam honeypot rejected
    const spamRes = await apiRequest('/api/v1/contact', {
      method: 'POST',
      body: {
        name: 'Spam Bot',
        email: 'bot@example.com',
        subject: 'Spam',
        message: 'Automated spam submission',
        website_url_honeypot: 'http://spam.example.com',
      },
    });
    assert.equal(spamRes.status, 400);

    // XSS script tags sanitized
    const createMsg = await apiRequest('/api/v1/contact', {
      method: 'POST',
      body: {
        name: 'Nadia <script>alert(1)</script> Shah',
        email: 'nadia.shah@example.com',
        phone: '+91 99061 11223',
        subject: 'Corporate Website Redesign Inquiry',
        message: 'We want to redesign our existing 10-page website without <script>evil()</script> tags.',
      },
    });
    assert.equal(createMsg.status, 201);
    const inquiryId = createMsg.json.data.message.id;
    assert.ok(!createMsg.json.data.message.name.includes('<script>'));
    assert.ok(!createMsg.json.data.message.message.includes('<script>'));

    const searchRes = await apiRequest('/api/v1/contact?search=Nadia', { token: accessToken });
    assert.equal(searchRes.status, 200);
    assert.ok(searchRes.json.data.messages.some((m) => m.id === inquiryId));

    const patchRes = await apiRequest(`/api/v1/contact/${inquiryId}`, {
      method: 'PATCH',
      token: accessToken,
      body: { status: 'Replied', admin_notes: 'Shared consultation proposal.' },
    });
    assert.equal(patchRes.status, 200);
    assert.equal(patchRes.json.data.message.status, 'Replied');
  });

  it('13. Distributed Rate Limiting & Database Persistence Across Restarts: Enforces limits across separate Worker isolates', async () => {
    const bruteIp = '203.0.113.99';
    let lastStatus = 200;

    // Simulate 6 requests on Isolate 1 (`env`) and 5 requests on Isolate 2 (`secondIsolateEnv`) sharing the same D1 DB
    const secondIsolateEnv = createNodeWorkerEnv({
      dbPath,
      r2Dir,
      overrides: { JWT_SECRET: TEST_JWT_SECRET },
    });

    for (let i = 0; i < 6; i++) {
      const res = await apiRequest('/api/v1/auth/login', {
        method: 'POST',
        ip: bruteIp,
        customEnv: env,
        body: { email: TEST_ADMIN_EMAIL, password: 'WrongPassword!' },
      });
      lastStatus = res.status;
    }
    assert.equal(lastStatus, 401);

    for (let i = 0; i < 5; i++) {
      const res = await apiRequest('/api/v1/auth/login', {
        method: 'POST',
        ip: bruteIp,
        customEnv: secondIsolateEnv,
        body: { email: TEST_ADMIN_EMAIL, password: 'WrongPassword!' },
      });
      lastStatus = res.status;
    }

    // 11th attempt across two separate Worker isolates must be blocked with 429 via shared D1 rate_limits table
    assert.equal(lastStatus, 429, 'Distributed D1 rate limiter must block brute-force across isolates');

    // Verify dashboard stats persist across restarts on the second isolate
    const statsRes = await apiRequest('/api/v1/admin/dashboard/stats', {
      token: accessToken,
      customEnv: secondIsolateEnv,
    });
    secondIsolateEnv.DB.close();
    assert.equal(statsRes.status, 200);
    assert.ok(statsRes.json.data.stats.totalOrders >= 1);
    assert.ok(statsRes.json.data.stats.totalCustomers >= 1);
    assert.ok(statsRes.json.data.stats.totalContactMessages >= 1);
  });

  it('14. Production Configuration, CORS Enforcement & Secret Stripping: Enforces strict production security', async () => {
    // CORS allowlist check
    const allowedCors = await apiRequest('/api/v1/services', {
      method: 'OPTIONS',
      origin: 'https://dreamtechkashmirsolutions.studio',
    });
    assert.equal(allowedCors.status, 204);

    const blockedCors = await apiRequest('/api/v1/services', {
      method: 'OPTIONS',
      origin: 'https://malicious.example.com',
    });
    assert.equal(blockedCors.status, 403);

    // Production environment with weak/placeholder JWT_SECRET must refuse token verification
    const misconfiguredProdEnv = createNodeWorkerEnv({
      dbPath,
      r2Dir,
      overrides: {
        ENVIRONMENT: 'production',
        JWT_SECRET: 'short-secret',
      },
    });
    const prodAuthRes = await apiRequest('/api/v1/auth/me', {
      token: accessToken,
      customEnv: misconfiguredProdEnv,
    });
    misconfiguredProdEnv.DB.close();
    assert.equal(prodAuthRes.status, 500);

    // Public settings never expose secret keys
    const updateSettings = await apiRequest('/api/v1/settings', {
      method: 'PUT',
      token: accessToken,
      body: {
        companyName: 'DreamTech Kashmir Solutions',
        jwtSecret: 'should-be-stripped',
        resendApiKey: 'should-be-stripped',
      },
    });
    assert.equal(updateSettings.status, 200);
    assert.equal(updateSettings.json.data.settings.jwtSecret, undefined);
    assert.equal(updateSettings.json.data.settings.resendApiKey, undefined);
  });

  // --------------------------------------------------------------------------
  // 15. Liveness Health Endpoint (/api/v1/health) Without D1, Unmigrated D1, & With D1
  // --------------------------------------------------------------------------
  it('15. Liveness Health Endpoint: Returns HTTP 200 without D1, with unmigrated D1, and with migrated D1', async () => {
    // Case A: Completely missing D1 and R2 bindings
    const noBindingsEnv = {
      ENVIRONMENT: 'production',
      DB: null,
      ASSETS_BUCKET: null,
    };
    const healthNoDb = await apiRequest('/api/v1/health', { customEnv: noBindingsEnv });
    assert.equal(healthNoDb.status, 200);
    assert.equal(healthNoDb.json.success, true);
    assert.equal(healthNoDb.json.message, 'DTKS API is operational.');
    assert.equal(healthNoDb.json.data.service, 'DTKS Backend API');
    assert.equal(healthNoDb.json.data.status, 'healthy');
    assert.equal(healthNoDb.json.data.version, '1.0.0');

    // Case B: D1 bound to an empty database with zero migrations applied (reproducing the production 500 scenario)
    const emptyDb = new LocalD1Database(':memory:', []);
    const unmigratedEnv = {
      ...env,
      DB: emptyDb,
    };
    const healthUnmigrated = await apiRequest('/api/v1/health', { customEnv: unmigratedEnv });
    emptyDb.close();
    assert.equal(healthUnmigrated.status, 200);
    assert.equal(healthUnmigrated.json.success, true);
    assert.equal(healthUnmigrated.json.data.status, 'healthy');

    // Case C: D1 bound and fully migrated
    const healthWithDb = await apiRequest('/api/v1/health');
    assert.equal(healthWithDb.status, 200);
    assert.equal(healthWithDb.json.success, true);
    assert.equal(healthWithDb.json.data.status, 'healthy');
  });

  // --------------------------------------------------------------------------
  // 16. Readiness Endpoint (/api/v1/ready) With Valid Bindings, Missing Bindings, & Missing Tables
  // --------------------------------------------------------------------------
  it('16. Readiness Endpoint (/api/v1/ready): Verifies D1, schema tables, and R2 storage accurately', async () => {
    // Case A: All dependencies ready -> HTTP 200
    const readyRes = await apiRequest('/api/v1/ready');
    assert.equal(readyRes.status, 200);
    assert.equal(readyRes.json.success, true);
    assert.equal(readyRes.json.data.status, 'ready');
    assert.equal(readyRes.json.data.database, 'connected');
    assert.equal(readyRes.json.data.schema, 'valid');
    assert.equal(readyRes.json.data.storage, 'available');

    // Case B: Missing D1 binding -> HTTP 503
    const missingDbRes = await apiRequest('/api/v1/ready', {
      customEnv: { ...env, DB: null },
    });
    assert.equal(missingDbRes.status, 503);
    assert.equal(missingDbRes.json.success, false);
    assert.equal(missingDbRes.json.data.status, 'not_ready');
    assert.equal(missingDbRes.json.data.database, 'unavailable');
    assert.equal(missingDbRes.json.data.storage, 'available');

    // Case C: Missing R2 binding -> HTTP 503
    const missingR2Res = await apiRequest('/api/v1/ready', {
      customEnv: { ...env, ASSETS_BUCKET: null },
    });
    assert.equal(missingR2Res.status, 503);
    assert.equal(missingR2Res.json.success, false);
    assert.equal(missingR2Res.json.data.status, 'not_ready');
    assert.equal(missingR2Res.json.data.database, 'connected');
    assert.equal(missingR2Res.json.data.schema, 'valid');
    assert.equal(missingR2Res.json.data.storage, 'unavailable');

    // Case D: Unmigrated database (missing tables) -> HTTP 503 with schema: 'missing_tables'
    const emptyDb = new LocalD1Database(':memory:', []);
    const missingTablesRes = await apiRequest('/api/v1/ready', {
      customEnv: { ...env, DB: emptyDb },
    });
    emptyDb.close();
    assert.equal(missingTablesRes.status, 503);
    assert.equal(missingTablesRes.json.success, false);
    assert.equal(missingTablesRes.json.data.status, 'not_ready');
    assert.equal(missingTablesRes.json.data.database, 'connected');
    assert.equal(missingTablesRes.json.data.schema, 'missing_tables');
    assert.equal(missingTablesRes.json.data.storage, 'available');
  });

  // --------------------------------------------------------------------------
  // 17. Missing Tables, Database Query Failures, Seeding Errors & Rate Limiter Fault Tolerance
  // --------------------------------------------------------------------------
  it('17. Fault Handling: Handles missing tables, D1 query failures, seed errors, and rate limiter DB failures safely', async () => {
    // A. Missing database tables on a DB-dependent route -> 503 DATABASE_SCHEMA_MISSING
    const unmigratedDb = new LocalD1Database(':memory:', []);
    const missingSchemaRes = await apiRequest('/api/v1/services', {
      customEnv: { ...env, DB: unmigratedDb },
    });
    unmigratedDb.close();
    assert.equal(missingSchemaRes.status, 503);
    assert.equal(missingSchemaRes.json.success, false);
    assert.equal(missingSchemaRes.json.error.code, 'DATABASE_SCHEMA_MISSING');
    assert.ok(missingSchemaRes.headers.get('X-Request-Id'));
    assert.equal(missingSchemaRes.json.error.stack, undefined);

    // B. Database seeding error (non-schema failure inside ensureDatabaseSeeded)
    const failingSeedDb = {
      prepare() {
        return {
          bind() {
            return this;
          },
          async first() {
            throw new Error('Simulated D1 connection reset during seed');
          },
          async run() {
            throw new Error('Simulated D1 connection reset during seed');
          },
          async all() {
            throw new Error('Simulated D1 connection reset during seed');
          },
        };
      },
    };
    const seedFailRes = await apiRequest('/api/v1/services', {
      customEnv: { ...env, DB: failingSeedDb },
    });
    assert.equal(seedFailRes.status, 500);
    assert.equal(seedFailRes.json.success, false);
    assert.equal(seedFailRes.json.error.code, 'DATABASE_SEED_ERROR');
    assert.ok(seedFailRes.headers.get('X-Request-Id'));
    assert.equal(seedFailRes.json.error.stack, undefined);

    // C. Database query failure after seed ( coupled with Rate Limiter D1 fallback )
    const queryFailDb = {
      prepare(sql) {
        return {
          bind() {
            return this;
          },
          async first() {
            if (/rate_limits/i.test(sql)) {
              throw new Error('D1_ERROR: rate_limits table busy');
            }
            return { cnt: 1 };
          },
          async run() {
            if (/rate_limits/i.test(sql)) {
              throw new Error('D1_ERROR: rate_limits table busy');
            }
            return { success: true };
          },
          async all() {
            if (/FROM services/i.test(sql)) {
              throw new Error('D1_ERROR: simulated query failure on services table');
            }
            return { results: [] };
          },
        };
      },
    };
    await ensureDatabaseSeeded({ ...env, DB: queryFailDb });
    const queryFailRes = await apiRequest('/api/v1/services', {
      customEnv: { ...env, DB: queryFailDb },
    });
    assert.equal(queryFailRes.status, 500);
    assert.equal(queryFailRes.json.success, false);
    assert.equal(queryFailRes.json.error.code, 'DATABASE_ERROR');
    assert.ok(queryFailRes.headers.get('X-Request-Id'));
    assert.equal(queryFailRes.json.error.stack, undefined);
  });

  // --------------------------------------------------------------------------
  // 18. Full Website Bootstrap, Admin Analytics, Customer Management & Password Change
  // --------------------------------------------------------------------------
  it('18. End-to-End Website Bootstrap, Admin Dashboard Stats, Customers & Password Change: Works with real D1 data', async () => {
    await resetRateLimiter(env);

    // 1. Public bootstrap endpoint
    const bootstrapRes = await apiRequest('/api/v1/bootstrap');
    assert.equal(bootstrapRes.status, 200);
    assert.equal(bootstrapRes.json.success, true);
    assert.ok(Array.isArray(bootstrapRes.json.data.services));
    assert.ok(Array.isArray(bootstrapRes.json.data.packages));
    assert.ok(Array.isArray(bootstrapRes.json.data.portfolio));
    assert.ok(bootstrapRes.json.data.settings.companyName);

    // 2. Admin Dashboard Statistics, Recent Orders, Recent Messages & Order Analytics
    const statsRes = await apiRequest('/api/v1/admin/dashboard/stats', { token: accessToken });
    assert.equal(statsRes.status, 200);
    assert.ok(statsRes.json.data.stats.totalOrders >= 1);
    assert.ok(statsRes.json.data.stats.totalCustomers >= 1);
    assert.ok(statsRes.json.data.stats.totalInquiries >= 1);

    const recentOrdersRes = await apiRequest('/api/v1/admin/dashboard/recent-orders?limit=5', {
      token: accessToken,
    });
    assert.equal(recentOrdersRes.status, 200);
    assert.ok(recentOrdersRes.json.data.recentOrders.length >= 1);

    const recentMessagesRes = await apiRequest('/api/v1/admin/dashboard/recent-messages?limit=5', {
      token: accessToken,
    });
    assert.equal(recentMessagesRes.status, 200);
    assert.ok(recentMessagesRes.json.data.recentMessages.length >= 1);

    const analyticsRes = await apiRequest('/api/v1/admin/dashboard/order-analytics', {
      token: accessToken,
    });
    assert.equal(analyticsRes.status, 200);
    assert.ok(Array.isArray(analyticsRes.json.data.analytics.byStatus));

    // 3. Admin Customers list
    const customersRes = await apiRequest('/api/v1/customers', { token: accessToken });
    assert.equal(customersRes.status, 200);
    assert.ok(customersRes.json.data.customers.length >= 1);

    // 4. Admin Password Change & Verification
    const newPassword = 'UpdatedStrongPass#2026!';
    const changePwRes = await apiRequest('/api/v1/auth/change-password', {
      method: 'POST',
      token: accessToken,
      body: {
        currentPassword: TEST_ADMIN_PASSWORD,
        newPassword,
      },
    });
    assert.equal(changePwRes.status, 200);
    assert.equal(changePwRes.json.data.updated, true);

    // Verify login with new password works
    const reloginRes = await apiRequest('/api/v1/auth/login', {
      method: 'POST',
      body: {
        email: TEST_ADMIN_EMAIL,
        password: newPassword,
      },
    });
    assert.equal(reloginRes.status, 200);
    assert.ok(reloginRes.json.data.accessToken);
  });
});

