import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LEGACY_SEED_PRICE_BY_ID,
} from '../data/seedData.js';
import {
  STORAGE_KEYS,
  CURRENT_MIGRATION_VERSION,
  ensureSeededStorage,
  sanitizeLegacyDataset,
  readStorageDetailed,
  writeStorageDetailed,
  inspectStorageState,
  getStorageDiagnostics,
  clearStorageDiagnostics,
  restoreFromBackupSnapshot,
} from './storage/localStorageAdapter.js';
import {
  setRuntimeEnvOverrides,
  getDataAdapterMode,
  getSubmissionMode,
  getAdminAccessPolicy,
  verifyAdminSession,
  apiRequest,
  loginAdmin,
  logoutAdmin,
  clearAdminAuthSession,
  getCsrfToken,
} from './api/apiClient.js';
import { orderService } from './api/orderService.js';
import { inquiryService } from './api/inquiryService.js';
import { packageService } from './api/packageService.js';
import { portfolioService } from './api/portfolioService.js';
import { teamService } from './api/teamService.js';
import { settingsService } from './api/settingsService.js';
import { mediaService } from './media/mediaService.js';
import {
  formatCurrency,
  generateOrderReference,
  validateOrderStep,
} from '../utils/orderUtils.js';

/**
 * Helper to create a controllable mock localStorage in Node.js tests.
 */
function createMockLocalStorage(initialEntries = {}, options = {}) {
  const store = new Map(Object.entries(initialEntries));
  let throwOnSetKey = options.throwOnSetKey || null;
  let throwErrorType = options.throwErrorType || 'QuotaExceededError';
  let throwOnAllReads = Boolean(options.throwOnAllReads);

  const storage = {
    get length() {
      return store.size;
    },
    key(index) {
      return Array.from(store.keys())[index] ?? null;
    },
    getItem(key) {
      if (throwOnAllReads) {
        const err = new Error('Storage access denied');
        err.name = 'SecurityError';
        throw err;
      }
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      if (throwOnSetKey === '*' || throwOnSetKey === key) {
        const err = new Error(`${throwErrorType} simulated for ${key}`);
        err.name = throwErrorType;
        throw err;
      }
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
    _dump() {
      return Object.fromEntries(store.entries());
    },
    _setFailure(keyPattern, errorType = 'QuotaExceededError') {
      throwOnSetKey = keyPattern;
      throwErrorType = errorType;
    },
    _setReadFailure(flag) {
      throwOnAllReads = Boolean(flag);
    },
  };

  globalThis.window = {
    localStorage: storage,
    location: { hostname: 'localhost' },
  };
  globalThis.localStorage = storage;

  return storage;
}

// ============================================================================
// SUITE 1: LOCALSTORAGE MIGRATION & DATA SAFETY (13 SCENARIOS)
// ============================================================================

test('Migration Scenario 1: Fresh empty browser initializes clean seed records', () => {
  const storage = createMockLocalStorage();
  clearStorageDiagnostics();

  const report = ensureSeededStorage();
  assert.equal(report.status, 'seeded_fresh');
  assert.equal(storage.getItem(STORAGE_KEYS.SEEDED), 'true');
  assert.equal(storage.getItem(STORAGE_KEYS.MIGRATION_VERSION), CURRENT_MIGRATION_VERSION);

  const orders = JSON.parse(storage.getItem(STORAGE_KEYS.ORDERS));
  const packages = JSON.parse(storage.getItem(STORAGE_KEYS.PACKAGES));
  assert.deepEqual(orders, []);
  assert.equal(packages.length, 3);
  assert.equal(packages[0].startingPrice, null);
});

test('Migration Scenario 2: Legacy browser with existing dks_v2_* data and NO seeded flag backs up and preserves real data', () => {
  const realOrder = {
    id: 'ord-9901',
    referenceId: 'DKS-2026-9901',
    customerName: 'Nuzhat Parveen',
    customerEmail: 'nuzhat@realbusiness.in',
    customerPhone: '+91 97970 11223',
    projectName: 'Kashmir Saffron Export Portal',
  };
  const storage = createMockLocalStorage({
    [STORAGE_KEYS.ORDERS]: JSON.stringify([realOrder]),
  });

  const report = ensureSeededStorage();
  assert.equal(report.status, 'migrated');
  assert.equal(report.backedUp, true);

  // Verify backup exists before any cleanup
  const backupRaw = storage.getItem(STORAGE_KEYS.BACKUP_SNAPSHOT);
  assert.ok(backupRaw, 'Pre-cleanup backup must be created');
  const backup = JSON.parse(backupRaw);
  assert.ok(backup.backedUpAt);
  assert.equal(backup.migrationVersion, CURRENT_MIGRATION_VERSION);
  assert.equal(backup.data.orders.length, 1);

  // Verify real order was NOT overwritten with INITIAL_ORDERS ([])
  const savedOrders = JSON.parse(storage.getItem(STORAGE_KEYS.ORDERS));
  assert.equal(savedOrders.length, 1);
  assert.equal(savedOrders[0].referenceId, 'DKS-2026-9901');
  assert.equal(savedOrders[0].customerName, 'Nuzhat Parveen');
});

test('Migration Scenario 3: Legacy browser with seeded flag but no migration version backs up and migrates safely', () => {
  const realInquiry = {
    id: 'inq-8801',
    name: 'Bilal Rather',
    email: 'bilal@orchardcraft.in',
    phone: '+91 99061 22334',
    subject: 'Corporate Website Quote',
    message: 'Looking for a 6-page corporate website.',
  };
  const storage = createMockLocalStorage({
    [STORAGE_KEYS.SEEDED]: 'true',
    [STORAGE_KEYS.INQUIRIES]: JSON.stringify([realInquiry]),
  });

  const report = ensureSeededStorage();
  assert.equal(report.status, 'migrated');
  assert.equal(report.backedUp, true);
  assert.equal(storage.getItem(STORAGE_KEYS.MIGRATION_VERSION), CURRENT_MIGRATION_VERSION);

  const inquiries = JSON.parse(storage.getItem(STORAGE_KEYS.INQUIRIES));
  assert.equal(inquiries.length, 1);
  assert.equal(inquiries[0].name, 'Bilal Rather');
});

test('Migration Scenario 4: Mixed demo and real orders removes only demo orders and keeps real orders', () => {
  const demoOrder = {
    id: 'ord-demo-1',
    referenceId: 'DKS-2026-0001',
    customerName: 'Demo Customer',
    customerEmail: 'demo.customer@example.com',
    projectName: 'Sample Prototype Order',
  };
  const realOrder = {
    id: 'ord-5501',
    referenceId: 'DKS-2026-5501',
    customerName: 'Adnan Qureshi',
    customerEmail: 'adnan@kashmirbuilders.com',
    customerPhone: '+91 94191 88776',
    projectName: 'Kashmir Builders Corporate Site',
  };

  const storage = createMockLocalStorage({
    [STORAGE_KEYS.ORDERS]: JSON.stringify([demoOrder, realOrder]),
  });

  ensureSeededStorage();
  const orders = JSON.parse(storage.getItem(STORAGE_KEYS.ORDERS));
  assert.equal(orders.length, 1);
  assert.equal(orders[0].id, 'ord-5501');
  assert.equal(orders[0].customerName, 'Adnan Qureshi');
});

test('Migration Scenario 5: Mixed demo and real inquiries removes only demo inquiries and keeps real inquiries', () => {
  const demoInquiry = {
    id: 'inq-demo-1',
    name: 'Demo Inquiry',
    email: 'inquiry.demo@example.com',
    subject: 'Website Redesign Inquiry',
  };
  const realInquiry = {
    id: 'inq-9902',
    name: 'Farhana Shah',
    email: 'farhana@shahclinics.org',
    phone: '+91 97978 33221',
    subject: 'Clinic Appointment Portal',
  };

  const storage = createMockLocalStorage({
    [STORAGE_KEYS.INQUIRIES]: JSON.stringify([demoInquiry, realInquiry]),
  });

  ensureSeededStorage();
  const inquiries = JSON.parse(storage.getItem(STORAGE_KEYS.INQUIRIES));
  assert.equal(inquiries.length, 1);
  assert.equal(inquiries[0].id, 'inq-9902');
  assert.equal(inquiries[0].name, 'Farhana Shah');
});

test('Migration Scenario 6: Mixed demo and real portfolio items removes only demo items and keeps admin projects', () => {
  const demoProject = {
    id: 'proj-sample-1',
    slug: 'kashmir-enterprise-corporate-website-sample',
    title: 'Sample Corporate Website',
    isSample: true,
  };
  const realProject = {
    id: 'proj-901',
    slug: 'himalayan-agro-foods',
    title: 'Himalayan Agro Foods Official Website',
    category: 'Business & Corporate Websites',
    liveUrl: 'https://himalayanagro.in',
    featured: true,
    published: true,
  };

  const storage = createMockLocalStorage({
    [STORAGE_KEYS.PORTFOLIO]: JSON.stringify([demoProject, realProject]),
  });

  ensureSeededStorage();
  const portfolio = JSON.parse(storage.getItem(STORAGE_KEYS.PORTFOLIO));
  assert.equal(portfolio.length, 1);
  assert.equal(portfolio[0].slug, 'himalayan-agro-foods');
});

test('Migration Scenario 7: Mixed demo and real team members removes only demo profiles and keeps real team profiles', () => {
  const demoMember = {
    id: 'team-1',
    fullName: 'Lead Developer (Profile Pending)',
    role: 'Founder / Project Lead',
    isPlaceholder: true,
  };
  const realMember = {
    id: 'team-801',
    fullName: 'Shah Naveed',
    role: 'Founder / Project Lead',
    visible: true,
  };

  const storage = createMockLocalStorage({
    [STORAGE_KEYS.TEAM]: JSON.stringify([demoMember, realMember]),
  });

  ensureSeededStorage();
  const team = JSON.parse(storage.getItem(STORAGE_KEYS.TEAM));
  assert.equal(team.length, 1);
  assert.equal(team[0].fullName, 'Shah Naveed');
});

test('Migration Scenario 8: Settings migration populates verified default Email/WhatsApp when demo values are scrubbed and preserves custom admin contact values', () => {
  // Case A: Demo settings are scrubbed and default to verified email & WhatsApp while phone/location stay blank
  const demoSettings = {
    companyName: 'DreamTech Kashmir Solutions',
    contactEmail: 'contact@dreamtechkashmir.example',
    contactPhone: '+91 (000) 000-0000 (Placeholder)',
    whatsappNumber: '+91 (000) 000-0000 (Placeholder)',
    businessLocation: 'Srinagar, Jammu & Kashmir (Office Address Configurable)',
    workingHours: 'Monday – Saturday · 10:00 AM – 6:30 PM IST',
  };
  const storageA = createMockLocalStorage({
    [STORAGE_KEYS.SETTINGS]: JSON.stringify(demoSettings),
  });
  ensureSeededStorage();
  const cleanedA = JSON.parse(storageA.getItem(STORAGE_KEYS.SETTINGS));
  assert.equal(cleanedA.contactEmail, 'support@dreamtechkashmirsolutions.studio');
  assert.equal(cleanedA.whatsappNumber, '+91 9796854163');
  assert.equal(cleanedA.contactPhone, '');
  assert.equal(cleanedA.businessLocation, '');
  assert.equal(cleanedA.workingHours, '');

  // Case B: Verified admin settings are preserved
  const realSettings = {
    companyName: 'DreamTech Kashmir Solutions',
    contactEmail: 'info@dreamtechkashmirsolutions.studio',
    contactPhone: '+91 99065 43210',
    whatsappNumber: '+91 99065 43210',
    businessLocation: 'Karan Nagar, Srinagar, J&K',
    workingHours: 'Mon-Sat 10:00 AM - 6:00 PM',
    workingHoursConfirmed: true,
    contactDetailsCustomized: true,
  };
  const storageB = createMockLocalStorage({
    [STORAGE_KEYS.SETTINGS]: JSON.stringify(realSettings),
  });
  ensureSeededStorage();
  const cleanedB = JSON.parse(storageB.getItem(STORAGE_KEYS.SETTINGS));
  assert.equal(cleanedB.contactEmail, 'info@dreamtechkashmirsolutions.studio');
  assert.equal(cleanedB.contactPhone, '+91 99065 43210');
  assert.equal(cleanedB.whatsappNumber, '+91 99065 43210');
  assert.equal(cleanedB.businessLocation, 'Karan Nagar, Srinagar, J&K');
  assert.equal(cleanedB.workingHours, 'Mon-Sat 10:00 AM - 6:00 PM');
});

test('Migration Scenario 9: Unknown dks_v2_* custom keys are backed up and never deleted', () => {
  const storage = createMockLocalStorage({
    [STORAGE_KEYS.ORDERS]: JSON.stringify([]),
    dks_v2_custom_admin_draft: JSON.stringify({ note: 'Keep this safe' }),
  });

  const inspection = inspectStorageState();
  assert.equal(inspection.hasAnyDataKey, true);
  assert.equal(
    inspection.unknownKeys.dks_v2_custom_admin_draft,
    JSON.stringify({ note: 'Keep this safe' })
  );

  ensureSeededStorage();
  assert.equal(
    storage.getItem('dks_v2_custom_admin_draft'),
    JSON.stringify({ note: 'Keep this safe' })
  );
  const backup = JSON.parse(storage.getItem(STORAGE_KEYS.BACKUP_SNAPSHOT));
  assert.equal(
    backup.unknownKeys.dks_v2_custom_admin_draft,
    JSON.stringify({ note: 'Keep this safe' })
  );
});

test('Migration Scenario 10: Backup write failure aborts migration immediately without modifying existing keys', () => {
  const rawOrders = JSON.stringify([
    { id: 'ord-demo-1', customerName: 'Demo Customer' },
    { id: 'ord-2002', customerName: 'Real Client' },
  ]);
  const storage = createMockLocalStorage(
    { [STORAGE_KEYS.ORDERS]: rawOrders },
    { throwOnSetKey: STORAGE_KEYS.BACKUP_SNAPSHOT, throwErrorType: 'QuotaExceededError' }
  );

  const report = ensureSeededStorage();
  assert.equal(report.status, 'aborted_backup_failed');
  assert.equal(report.migrated, false);
  // Existing orders key must remain 100% untouched
  assert.equal(storage.getItem(STORAGE_KEYS.ORDERS), rawOrders);
  assert.equal(storage.getItem(STORAGE_KEYS.MIGRATION_VERSION), null);
});

test('Migration Scenario 11: Corrupted JSON in existing key is preserved untouched and never overwritten with empty array', () => {
  const corruptedOrdersJson = '{"id":"ord-corrupted-json-that-was-truncated';
  const storage = createMockLocalStorage({
    [STORAGE_KEYS.ORDERS]: corruptedOrdersJson,
  });
  clearStorageDiagnostics();

  const report = ensureSeededStorage();
  assert.equal(report.status, 'migrated_with_corrupted_keys_preserved');
  assert.ok(report.corruptedKeys.includes(STORAGE_KEYS.ORDERS));

  // Must NOT overwrite corrupted key with []
  assert.equal(storage.getItem(STORAGE_KEYS.ORDERS), corruptedOrdersJson);

  // Backup must also contain the raw corrupted string for manual recovery
  const backup = JSON.parse(storage.getItem(STORAGE_KEYS.BACKUP_SNAPSHOT));
  assert.equal(backup.corruptedRawKeys[STORAGE_KEYS.ORDERS], corruptedOrdersJson);

  // Diagnostics must record CorruptedJsonError
  const diagnostics = getStorageDiagnostics();
  assert.ok(diagnostics.corruptedKeys.includes(STORAGE_KEYS.ORDERS));
  assert.equal(diagnostics.lastReadError?.errorType, 'CorruptedJsonError');
});

test('Migration Scenario 12: QuotaExceededError and SecurityError are accurately classified and reported', () => {
  const storage = createMockLocalStorage();
  clearStorageDiagnostics();

  storage._setFailure(STORAGE_KEYS.ORDERS, 'QuotaExceededError');
  const writeQuotaRes = writeStorageDetailed(STORAGE_KEYS.ORDERS, [{ id: '1' }]);
  assert.equal(writeQuotaRes.ok, false);
  assert.equal(writeQuotaRes.errorType, 'QuotaExceededError');

  storage._setFailure(STORAGE_KEYS.ORDERS, 'SecurityError');
  const writeSecRes = writeStorageDetailed(STORAGE_KEYS.ORDERS, [{ id: '1' }]);
  assert.equal(writeSecRes.ok, false);
  assert.equal(writeSecRes.errorType, 'SecurityError');

  storage._setReadFailure(true);
  const readSecRes = readStorageDetailed(STORAGE_KEYS.ORDERS, []);
  assert.equal(readSecRes.ok, false);
  assert.equal(readSecRes.errorType, 'SecurityError');
});

test('Migration Scenario 13: Restore from pre-cleanup backup snapshot recovers original records', () => {
  const originalOrder = {
    id: 'ord-7711',
    referenceId: 'DKS-2026-7711',
    customerName: 'Restore Test Customer',
  };
  const storage = createMockLocalStorage({
    [STORAGE_KEYS.ORDERS]: JSON.stringify([originalOrder]),
  });

  ensureSeededStorage();
  // Simulate accidental deletion after migration
  storage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify([]));
  assert.equal(JSON.parse(storage.getItem(STORAGE_KEYS.ORDERS)).length, 0);

  const restoreRes = restoreFromBackupSnapshot();
  assert.equal(restoreRes.ok, true);
  const restoredOrders = JSON.parse(storage.getItem(STORAGE_KEYS.ORDERS));
  assert.equal(restoredOrders.length, 1);
  assert.equal(restoredOrders[0].customerName, 'Restore Test Customer');
});

// ============================================================================
// SUITE 2: PACKAGE & SERVICE PRICE MIGRATION (6 SCENARIOS)
// ============================================================================

test('Price Scenario 1: Legacy unconfirmed seed prices on seed IDs are cleared to null', () => {
  assert.equal(LEGACY_SEED_PRICE_BY_ID['pkg-starter'], 15000);
  assert.equal(LEGACY_SEED_PRICE_BY_ID['pkg-business'], 28000);
  assert.equal(LEGACY_SEED_PRICE_BY_ID['pkg-custom'], 45000);

  const sanitized = sanitizeLegacyDataset({
    packages: [
      { id: 'pkg-starter', title: 'Starter Website Package', startingPrice: 15000 },
      { id: 'pkg-business', title: 'Business Website Package', startingPrice: 28000 },
      { id: 'pkg-custom', title: 'Custom Web Solution Package', startingPrice: 45000 },
    ],
    services: [
      { id: 'svc-business', title: 'Business & Corporate Websites', startingPrice: 28000 },
    ],
  });

  assert.equal(sanitized.packages[0].startingPrice, null);
  assert.equal(sanitized.packages[0].priceConfirmed, false);
  assert.equal(sanitized.packages[1].startingPrice, null);
  assert.equal(sanitized.packages[2].startingPrice, null);
  assert.equal(sanitized.services[0].startingPrice, null);
  assert.equal(sanitized.services[0].priceConfirmed, false);
});

test('Price Scenario 2: Admin-confirmed ₹15,000 price on pkg-starter is preserved', () => {
  const sanitized = sanitizeLegacyDataset({
    packages: [
      {
        id: 'pkg-starter',
        title: 'Starter Website Package',
        startingPrice: 15000,
        priceConfirmed: true,
      },
    ],
  });

  assert.equal(sanitized.packages[0].startingPrice, 15000);
  assert.equal(sanitized.packages[0].priceConfirmed, true);
});

test('Price Scenario 3: Admin-modified ₹18,000 price on pkg-starter is preserved even without explicit priceConfirmed flag', () => {
  const sanitized = sanitizeLegacyDataset({
    packages: [
      {
        id: 'pkg-starter',
        title: 'Starter Website Package',
        startingPrice: 18000,
      },
    ],
  });

  assert.equal(sanitized.packages[0].startingPrice, 18000);
});

test('Price Scenario 4: Admin-created custom package priced at ₹15,000 or ₹28,000 is NEVER wiped', () => {
  const sanitized = sanitizeLegacyDataset({
    packages: [
      {
        id: 'pkg-custom-admin-1',
        title: 'Special Event Landing Page',
        startingPrice: 15000,
      },
      {
        id: 'pkg-custom-admin-2',
        title: 'Regional Tourism Portal',
        startingPrice: 28000,
      },
    ],
  });

  assert.equal(sanitized.packages[0].startingPrice, 15000);
  assert.equal(sanitized.packages[1].startingPrice, 28000);
});

test('Price Scenario 5: Null package/service price renders "Request a Quote"', () => {
  assert.equal(formatCurrency(null), 'Request a Quote');
  assert.equal(formatCurrency(undefined), 'Request a Quote');
  assert.equal(formatCurrency(''), 'Request a Quote');
  assert.equal(formatCurrency(15000), '₹15,000');
});

test('Price Scenario 6: Maintenance plan prices set by admin are preserved', () => {
  const storage = createMockLocalStorage({
    [STORAGE_KEYS.MAINTENANCE]: JSON.stringify([
      { id: 'maint-monthly', title: 'Monthly Website Care Plan', price: 2500, priceConfirmed: true },
      { id: 'maint-yearly', title: 'Annual Website Maintenance Plan', price: 24000, priceConfirmed: true },
    ]),
  });

  ensureSeededStorage();
  const plans = JSON.parse(storage.getItem(STORAGE_KEYS.MAINTENANCE));
  assert.equal(plans[0].price, 2500);
  assert.equal(plans[1].price, 24000);
});

// ============================================================================
// SUITE 3: ASYNC DATA ADAPTERS & NO SILENT FALLBACK
// ============================================================================

test('Adapter Test 1: Local adapter performs full async CRUD across all 9 domains', async () => {
  createMockLocalStorage();
  setRuntimeEnvOverrides({ dataAdapter: 'local', isProd: false });
  ensureSeededStorage();

  // 1. Orders
  const createdOrder = await orderService.submitOrder({
    projectName: 'Srinagar Dental Clinic Website',
    customerName: 'Dr. Imran Khan',
    customerEmail: 'imran@srinagardental.in',
    customerPhone: '+91 94190 99887',
    service: 'Business & Corporate Websites',
  });
  assert.equal(createdOrder.success, true);
  assert.ok(createdOrder.data.referenceId.startsWith('DKS-'));

  const trackedOrder = await orderService.trackOrder(
    createdOrder.data.referenceId,
    'imran@srinagardental.in'
  );
  assert.equal(trackedOrder.success, true);
  assert.equal(trackedOrder.data.customerName, 'Dr. Imran Khan');

  const updatedOrder = await orderService.updateOrder(createdOrder.data.id, { status: 'In Review' });
  assert.equal(updatedOrder.success, true);
  assert.equal(updatedOrder.data.status, 'In Review');

  // 2. Inquiries
  const createdInq = await inquiryService.submitInquiry({
    name: 'Suhail Ahmad',
    email: 'suhail@kashmirhotels.in',
    subject: 'Hotel Booking Engine',
    message: 'Need room availability inquiry website.',
  });
  assert.equal(createdInq.success, true);

  const updatedInq = await inquiryService.updateInquiry(createdInq.data.id, { status: 'Contacted' });
  assert.equal(updatedInq.success, true);
  assert.equal(updatedInq.data.status, 'Contacted');

  // 3. Packages
  const createdPkg = await packageService.createPackageAsync({
    title: 'Hospitality Website Package',
    category: 'Hospitality, Travel & Real Estate Websites',
    startingPrice: 32000,
    features: ['Room Showcase', 'Inquiry Form'],
  });
  assert.equal(createdPkg.success, true);
  assert.equal(createdPkg.data.startingPrice, 32000);
  assert.equal(createdPkg.data.priceConfirmed, true);

  // 4. Services
  const currentServices = packageService.getServices();
  const updatedServicesList = currentServices.map((s) =>
    s.id === 'svc-business' ? { ...s, startingPrice: 25000, priceConfirmed: true } : s
  );
  const updatedSvc = await packageService.saveServicesAsync(updatedServicesList);
  assert.equal(updatedSvc.success, true);
  assert.equal(updatedSvc.data.find((s) => s.id === 'svc-business').startingPrice, 25000);

  // 5. Maintenance Plans
  const currentMaint = packageService.getMaintenancePlans();
  const updatedMaintList = currentMaint.map((m) =>
    m.id === 'maint-monthly' ? { ...m, price: 2000, priceConfirmed: true } : m
  );
  const updatedMaint = await packageService.saveMaintenancePlansAsync(updatedMaintList);
  assert.equal(updatedMaint.success, true);
  assert.equal(updatedMaint.data.find((m) => m.id === 'maint-monthly').price, 2000);

  // 6. Add-ons
  const currentAddons = packageService.getAddons();
  const updatedAddonsList = currentAddons.map((a) =>
    a.id === 'addon-seo' ? { ...a, pricingNote: '₹5,000 one-time setup' } : a
  );
  const updatedAddon = await packageService.saveAddonsAsync(updatedAddonsList);
  assert.equal(updatedAddon.success, true);
  assert.equal(updatedAddon.data.find((a) => a.id === 'addon-seo').pricingNote, '₹5,000 one-time setup');

  // 7. Portfolio
  const createdProj = await portfolioService.createProject({
    title: 'Dal Lake Houseboat Collective',
    category: 'Hospitality, Travel & Real Estate Websites',
    shortDescription: 'Direct reservation inquiry platform.',
    published: true,
  });
  assert.equal(createdProj.success, true);
  assert.equal(createdProj.data.slug, 'dal-lake-houseboat-collective');

  // 8. Team
  const createdMember = await teamService.createTeamMember({
    fullName: 'Muneeb Lone',
    role: 'Frontend Developer',
    skills: ['React', 'Tailwind CSS'],
  });
  assert.equal(createdMember.success, true);

  // 9. Settings
  const savedSettings = await settingsService.saveSettings({
    contactEmail: 'hello@dreamtechkashmirsolutions.studio',
  });
  assert.equal(savedSettings.success, true);
  assert.equal(savedSettings.data.contactEmail, 'hello@dreamtechkashmirsolutions.studio');

  setRuntimeEnvOverrides(null);
});

test('Adapter Test 2: API mode uses fetch and NEVER silently falls back to LocalStorage on failure', async () => {
  const storage = createMockLocalStorage();
  ensureSeededStorage();
  setRuntimeEnvOverrides({
    dataAdapter: 'api',
    apiBaseUrl: 'https://api.dreamtechkashmirsolutions.studio',
    isProd: true,
  });
  assert.equal(getDataAdapterMode(), 'api');

  // Simulate API 503 failure
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: false,
    status: 503,
    headers: { get: () => 'application/json' },
    json: async () => ({ message: 'Database service temporarily unavailable' }),
  });

  try {
    const orderCreateRes = await orderService.submitOrder({
      projectName: 'Should Not Save Locally',
      customerName: 'API Test Customer',
      customerEmail: 'api@test.com',
      customerPhone: '+91 90000 00000',
    });

    assert.equal(orderCreateRes.success, false);
    assert.match(orderCreateRes.message, /Database service temporarily unavailable/);

    // Verify LocalStorage was NOT written as a fallback
    const localOrders = JSON.parse(storage.getItem(STORAGE_KEYS.ORDERS));
    assert.equal(localOrders.length, 0);
  } finally {
    globalThis.fetch = originalFetch;
    setRuntimeEnvOverrides(null);
  }
});

test('Adapter Test 3: LocalStorage write failure in local mode returns { success: false } and never claims success', async () => {
  const storage = createMockLocalStorage();
  ensureSeededStorage();
  setRuntimeEnvOverrides({ dataAdapter: 'local', isProd: false });

  storage._setFailure(STORAGE_KEYS.ORDERS, 'QuotaExceededError');
  const res = await orderService.submitOrder({
    projectName: 'Quota Fail Test',
    customerName: 'Customer',
  });

  assert.equal(res.success, false);
  assert.equal(res.errorType, 'QuotaExceededError');
  setRuntimeEnvOverrides(null);
});

// ============================================================================
// SUITE 4: ORDER VALIDATION, REFERENCE IDS & PRODUCTION SUBMISSION SAFETY
// ============================================================================

test('Order Validation & Reference Generation works across wizard steps', () => {
  // Step 1 validation
  const step1Empty = validateOrderStep(1, { service: '' });
  assert.equal(step1Empty.isValid, false);
  const step1Valid = validateOrderStep(1, { service: 'Business & Corporate Websites' });
  assert.equal(step1Valid.isValid, true);

  // Step 2 validation
  const step2Invalid = validateOrderStep(2, { packageId: '' });
  assert.equal(step2Invalid.isValid, false);
  const step2Valid = validateOrderStep(2, { packageId: 'pkg-business' });
  assert.equal(step2Valid.isValid, true);

  // Step 3 validation
  const step3Invalid = validateOrderStep(3, {
    projectName: '',
    businessName: '',
    projectDescription: 'Too short',
  });
  assert.equal(step3Invalid.isValid, false);
  const step3Valid = validateOrderStep(3, {
    projectName: 'Al-Noor Craft House',
    businessName: 'Al-Noor Exports',
    projectDescription: 'Full e-commerce catalog for Kashmiri handicrafts and carpets.',
  });
  assert.equal(step3Valid.isValid, true);

  // Step 6 contact validation
  const step6Invalid = validateOrderStep(6, {
    customerName: 'A',
    customerEmail: 'invalid-email',
    customerPhone: '123',
    customerCity: '',
  });
  assert.equal(step6Invalid.isValid, false);

  const step6Valid = validateOrderStep(6, {
    customerName: 'Riyaz Ahmad',
    customerEmail: 'riyaz@alnoorexports.in',
    customerPhone: '+91 94190 55667',
    customerCity: 'Srinagar, J&K',
  });
  assert.equal(step6Valid.isValid, true);

  // Unique Reference ID
  const existing = [{ referenceId: 'DKS-2026-0001' }];
  const ref = generateOrderReference(existing, 2026);
  assert.equal(ref, 'DKS-2026-0002');
});

test('Submission Mode & Admin Access Policy enforce production safety when backend is not configured', async () => {
  createMockLocalStorage();
  ensureSeededStorage();

  // 1. Local Development Mode
  setRuntimeEnvOverrides({ isProd: false, dataAdapter: 'local', apiBaseUrl: '' });
  assert.equal(getSubmissionMode(), 'local_demo');
  assert.equal(getAdminAccessPolicy(), 'allowed_dev');

  // 2. Production Build without Backend Configured -> blocks fake browser-only order & inquiry submissions
  setRuntimeEnvOverrides({ isProd: true, dataAdapter: 'local', apiBaseUrl: '' });
  assert.equal(getSubmissionMode(), 'production_unconfigured');
  assert.equal(getAdminAccessPolicy(), 'blocked_production_local');

  const blockedOrder = await orderService.submitOrder({
    projectName: 'Blocked Prod Order',
    customerName: 'Customer',
  });
  assert.equal(blockedOrder.success, false);
  assert.equal(blockedOrder.errorType, 'BackendNotConfiguredError');

  const blockedInquiry = await inquiryService.submitInquiry({
    name: 'Customer',
    email: 'customer@example.com',
    subject: 'Question',
    message: 'Testing production unconfigured mode.',
  });
  assert.equal(blockedInquiry.success, false);
  assert.equal(blockedInquiry.errorType, 'BackendNotConfiguredError');

  // 3. Production Build with API Configured
  setRuntimeEnvOverrides({
    isProd: true,
    dataAdapter: 'api',
    apiBaseUrl: 'https://api.dreamtechkashmirsolutions.studio',
  });
  assert.equal(getSubmissionMode(), 'api');
  assert.equal(getAdminAccessPolicy(), 'session_required');

  setRuntimeEnvOverrides(null);
});

test('Admin Session Verification blocks unauthenticated access in production local mode', async () => {
  setRuntimeEnvOverrides({ isProd: true, dataAdapter: 'local', apiBaseUrl: '' });
  const res = await verifyAdminSession();
  assert.equal(res.authenticated, false);
  assert.equal(res.policy, 'blocked_production_local');
  assert.match(res.message, /Secure Admin access will be enabled after backend authentication is configured/);
  setRuntimeEnvOverrides(null);
});

// ============================================================================
// SUITE 5: IMAGE VALIDATION & BINARY MEDIA STORAGE (NO BASE64 IN LOCALSTORAGE)
// ============================================================================

test('Image Validation & Media Upload rejects oversized/invalid files and stores valid images outside LocalStorage', async () => {
  const storage = createMockLocalStorage();
  setRuntimeEnvOverrides({ dataAdapter: 'local', isProd: false });

  // 1. Valid PNG image (1 KB)
  const validPngFile = {
    name: 'portfolio-banner.png',
    type: 'image/png',
    size: 1024,
  };
  const validCheck = mediaService.validateImage(validPngFile);
  assert.equal(validCheck.valid, true);

  const uploadRes = await mediaService.uploadImage(validPngFile, { entityType: 'portfolio' });
  assert.equal(uploadRes.success, true);
  assert.ok(uploadRes.data.reference.startsWith('idb://media-'));

  // Verify no Base64 image data was written to LocalStorage
  for (const [, val] of Object.entries(storage._dump())) {
    assert.ok(!String(val).includes('data:image/'));
  }

  // Delete image
  const deleteRes = await mediaService.deleteImage(uploadRes.data.reference);
  assert.equal(deleteRes.success, true);

  // 2. Oversized image (> 5 MB)
  const oversizedFile = {
    name: 'huge-photo.jpg',
    type: 'image/jpeg',
    size: 6 * 1024 * 1024,
  };
  const oversizedCheck = mediaService.validateImage(oversizedFile);
  assert.equal(oversizedCheck.valid, false);
  assert.match(oversizedCheck.message, /5 MB/);

  const failedUpload = await mediaService.uploadImage(oversizedFile);
  assert.equal(failedUpload.success, false);

  // 3. Unsupported file type (EXE)
  const invalidTypeFile = {
    name: 'malware.exe',
    type: 'application/x-msdownload',
    size: 2048,
  };
  const typeCheck = mediaService.validateImage(invalidTypeFile);
  assert.equal(typeCheck.valid, false);
  assert.match(typeCheck.message, /Unsupported image type/);

  setRuntimeEnvOverrides(null);
});

test('API Auth Client supports HttpOnly refresh cookies, X-CSRF-Token headers, automatic 401 refresh, and logout', async () => {
  createMockLocalStorage();
  clearAdminAuthSession();
  setRuntimeEnvOverrides({
    isProd: true,
    dataAdapter: 'api',
    apiBaseUrl: 'https://api.dreamtechkashmirsolutions.studio',
  });

  const recordedCalls = [];
  const originalFetch = globalThis.fetch;
  let protectedCallCount = 0;

  globalThis.fetch = async (url, init = {}) => {
    recordedCalls.push({ url, method: init.method || 'GET', headers: init.headers || {}, credentials: init.credentials });

    if (String(url).endsWith('/auth/login')) {
      return {
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({
          success: true,
          data: {
            accessToken: 'access-1',
            csrfToken: 'csrf-1',
            expiresIn: 900,
            admin: { id: 'adm-1', email: 'admin@dreamtechkashmirsolutions.studio', role: 'super_admin' },
          },
        }),
      };
    }

    if (String(url).endsWith('/admin/dashboard/stats')) {
      protectedCallCount += 1;
      if (protectedCallCount === 1) {
        return {
          ok: false,
          status: 401,
          headers: { get: () => 'application/json' },
          json: async () => ({ success: false, error: { code: 'TOKEN_EXPIRED', message: 'Expired' } }),
        };
      }
      return {
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({ success: true, data: { stats: { totalOrders: 3 } } }),
      };
    }

    if (String(url).endsWith('/auth/refresh')) {
      return {
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({
          success: true,
          data: {
            accessToken: 'access-2',
            csrfToken: 'csrf-2',
            expiresIn: 900,
          },
        }),
      };
    }

    return {
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ success: true, data: { loggedOut: true } }),
    };
  };

  try {
    const loginRes = await loginAdmin({
      email: 'admin@dreamtechkashmirsolutions.studio',
      password: 'ValidPassword#2026',
    });
    assert.equal(loginRes.success, true);
    assert.equal(loginRes.data.refreshToken, '');
    assert.equal(getCsrfToken(), 'csrf-1');

    // Trigger 401 -> automatic cookie+CSRF refresh -> retry with rotated accessToken
    const statsRes = await apiRequest('/api/v1/admin/dashboard/stats');
    assert.equal(statsRes.success, true);
    assert.equal(statsRes.data.stats.totalOrders, 3);

    const refreshCall = recordedCalls.find((c) => String(c.url).endsWith('/auth/refresh'));
    assert.ok(refreshCall, 'Refresh endpoint must be called even without refreshToken in JSON');
    assert.equal(refreshCall.credentials, 'include');
    assert.equal(refreshCall.headers['X-CSRF-Token'], 'csrf-1');

    const retriedStatsCall = recordedCalls.filter((c) => String(c.url).endsWith('/admin/dashboard/stats'))[1];
    assert.equal(retriedStatsCall.headers.Authorization, 'Bearer access-2');

    // Mutating request sends updated X-CSRF-Token and logout clears session
    const logoutRes = await logoutAdmin();
    assert.equal(logoutRes.success, true);
    const logoutCall = recordedCalls.find((c) => String(c.url).endsWith('/auth/logout'));
    assert.ok(logoutCall);
    assert.equal(logoutCall.headers['X-CSRF-Token'], 'csrf-2');
    assert.equal(getCsrfToken(), '');
  } finally {
    globalThis.fetch = originalFetch;
    clearAdminAuthSession();
    setRuntimeEnvOverrides(null);
  }
});
