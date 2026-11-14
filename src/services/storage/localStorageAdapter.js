import {
  INITIAL_SERVICES,
  INITIAL_PACKAGES,
  INITIAL_MAINTENANCE_PLANS,
  INITIAL_ADDONS,
  INITIAL_PORTFOLIO,
  INITIAL_TEAM,
  INITIAL_ORDERS,
  INITIAL_INQUIRIES,
  INITIAL_SETTINGS,
  KNOWN_DEMO_MARKERS,
  LEGACY_SEED_PRICE_BY_ID,
} from '../../data/seedData.js';

export const STORAGE_KEYS = {
  SERVICES: 'dks_v2_services',
  PACKAGES: 'dks_v2_packages',
  MAINTENANCE: 'dks_v2_maintenance_plans',
  ADDONS: 'dks_v2_addons',
  PORTFOLIO: 'dks_v2_portfolio',
  TEAM: 'dks_v2_team',
  ORDERS: 'dks_v2_orders',
  INQUIRIES: 'dks_v2_inquiries',
  SETTINGS: 'dks_v2_settings',
  SEEDED: 'dks_v2_seeded_flag',
  MIGRATION_VERSION: 'dks_v2_migration_version',
  MIGRATION_IN_PROGRESS: 'dks_v2_migration_in_progress',
  BACKUP_SNAPSHOT: 'dks_v2_backup_pre_cleanup',
};

export const DATA_STORAGE_SPECS = [
  { field: 'services', key: STORAGE_KEYS.SERVICES, fallback: INITIAL_SERVICES, expectedType: 'array' },
  { field: 'packages', key: STORAGE_KEYS.PACKAGES, fallback: INITIAL_PACKAGES, expectedType: 'array' },
  { field: 'maintenancePlans', key: STORAGE_KEYS.MAINTENANCE, fallback: INITIAL_MAINTENANCE_PLANS, expectedType: 'array' },
  { field: 'addons', key: STORAGE_KEYS.ADDONS, fallback: INITIAL_ADDONS, expectedType: 'array' },
  { field: 'portfolio', key: STORAGE_KEYS.PORTFOLIO, fallback: INITIAL_PORTFOLIO, expectedType: 'array' },
  { field: 'team', key: STORAGE_KEYS.TEAM, fallback: INITIAL_TEAM, expectedType: 'array' },
  { field: 'orders', key: STORAGE_KEYS.ORDERS, fallback: INITIAL_ORDERS, expectedType: 'array' },
  { field: 'inquiries', key: STORAGE_KEYS.INQUIRIES, fallback: INITIAL_INQUIRIES, expectedType: 'array' },
  { field: 'settings', key: STORAGE_KEYS.SETTINGS, fallback: INITIAL_SETTINGS, expectedType: 'object' },
];

export const CURRENT_MIGRATION_VERSION = '2026-11-verified-contact-v3';

const storageDiagnostics = {
  lastReadError: null,
  lastWriteError: null,
  corruptedKeys: [],
  lastMigrationResult: null,
};

export function getStorageDiagnostics() {
  return {
    ...storageDiagnostics,
    corruptedKeys: [...storageDiagnostics.corruptedKeys],
  };
}

export function clearStorageDiagnostics() {
  storageDiagnostics.lastReadError = null;
  storageDiagnostics.lastWriteError = null;
  storageDiagnostics.corruptedKeys = [];
  storageDiagnostics.lastMigrationResult = null;
}

function getStorageTarget(customStorage) {
  if (customStorage) return customStorage;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch (err) {
    storageDiagnostics.lastReadError = {
      errorType: classifyStorageError(err),
      message: err?.message || 'Browser LocalStorage is blocked or unavailable.',
    };
  }
  return null;
}

export function classifyStorageError(err) {
  if (!err) return 'UnknownStorageError';
  const name = String(err.name || '');
  const message = String(err.message || '').toLowerCase();
  const code = err.code;

  if (
    name === 'QuotaExceededError' ||
    name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    code === 22 ||
    code === 1014 ||
    message.includes('quota')
  ) {
    return 'QuotaExceededError';
  }
  if (name === 'SecurityError' || message.includes('security') || message.includes('access is denied')) {
    return 'SecurityError';
  }
  if (err instanceof SyntaxError || name === 'SyntaxError') {
    return 'CorruptedJsonError';
  }
  return name || 'StorageError';
}

function isExpectedShape(value, expectedType) {
  if (!expectedType) return true;
  if (expectedType === 'array') return Array.isArray(value);
  if (expectedType === 'object') return Boolean(value && typeof value === 'object' && !Array.isArray(value));
  return true;
}

/**
 * Detailed storage reader that distinguishes:
 * - missing keys (`status: 'missing'`)
 * - valid parsed JSON (`status: 'ok'`)
 * - corrupted JSON or invalid data shape (`status: 'corrupted'`)
 * - inaccessible storage (`status: 'unavailable'` or `'error'`)
 */
export function readStorageDetailed(key, fallback, options = {}) {
  const { expectedType = null, storage = null } = options;
  const target = getStorageTarget(storage);
  if (!target) {
    return {
      ok: false,
      status: 'unavailable',
      key,
      data: fallback,
      raw: null,
      errorType: 'StorageUnavailable',
      message: 'LocalStorage is not available in this environment.',
    };
  }

  let raw = null;
  try {
    raw = target.getItem(key);
  } catch (err) {
    const errorType = classifyStorageError(err);
    const message = `Failed accessing LocalStorage key "${key}": ${err?.message || errorType}`;
    storageDiagnostics.lastReadError = { key, errorType, message };
    return {
      ok: false,
      status: 'error',
      key,
      data: fallback,
      raw: null,
      errorType,
      message,
    };
  }

  if (raw === null || raw === undefined || raw === '') {
    return {
      ok: true,
      status: 'missing',
      key,
      data: fallback,
      raw: null,
      errorType: null,
      message: null,
    };
  }

  try {
    const parsed = JSON.parse(raw);
    if (!isExpectedShape(parsed, expectedType)) {
      const message = `Stored value for "${key}" did not match expected shape (${expectedType}).`;
      if (!storageDiagnostics.corruptedKeys.includes(key)) {
        storageDiagnostics.corruptedKeys.push(key);
      }
      storageDiagnostics.lastReadError = { key, errorType: 'InvalidShapeError', message };
      return {
        ok: false,
        status: 'corrupted',
        key,
        data: fallback,
        raw,
        errorType: 'InvalidShapeError',
        message,
      };
    }

    return {
      ok: true,
      status: 'ok',
      key,
      data: parsed,
      raw,
      errorType: null,
      message: null,
    };
  } catch (err) {
    const errorType = classifyStorageError(err);
    const message = `Corrupted JSON in LocalStorage key "${key}": ${err?.message || 'SyntaxError'}`;
    if (!storageDiagnostics.corruptedKeys.includes(key)) {
      storageDiagnostics.corruptedKeys.push(key);
    }
    storageDiagnostics.lastReadError = { key, errorType, message };
    return {
      ok: false,
      status: 'corrupted',
      key,
      data: fallback,
      raw,
      errorType,
      message,
    };
  }
}

/**
 * Detailed storage writer that detects QuotaExceededError, SecurityError,
 * read-only storage, and verifies write persistence.
 */
export function writeStorageDetailed(key, value, options = {}) {
  const { storage = null, verify = false } = options;
  const target = getStorageTarget(storage);
  if (!target) {
    const errObj = {
      ok: false,
      key,
      errorType: 'StorageUnavailable',
      message: 'LocalStorage is unavailable in this environment.',
    };
    storageDiagnostics.lastWriteError = errObj;
    return errObj;
  }

  let serialized;
  try {
    serialized = JSON.stringify(value);
  } catch (err) {
    const errObj = {
      ok: false,
      key,
      errorType: 'SerializationError',
      message: `Failed serializing data for "${key}": ${err?.message || 'Invalid JSON value'}`,
    };
    storageDiagnostics.lastWriteError = errObj;
    return errObj;
  }

  try {
    target.setItem(key, serialized);
    if (verify) {
      const readBack = target.getItem(key);
      if (readBack !== serialized) {
        const errObj = {
          ok: false,
          key,
          errorType: 'WriteVerificationError',
          message: `Storage write verification failed for "${key}" (storage may be read-only).`,
        };
        storageDiagnostics.lastWriteError = errObj;
        return errObj;
      }
    }
    return {
      ok: true,
      key,
      errorType: null,
      message: null,
    };
  } catch (err) {
    const errorType = classifyStorageError(err);
    const friendlyMessage =
      errorType === 'QuotaExceededError'
        ? 'Browser LocalStorage quota exceeded. Please remove large attachments or export and clear old records.'
        : errorType === 'SecurityError'
        ? 'Browser security settings blocked saving to LocalStorage.'
        : `Failed saving to LocalStorage (${key}): ${err?.message || errorType}`;
    const errObj = {
      ok: false,
      key,
      errorType,
      message: friendlyMessage,
    };
    storageDiagnostics.lastWriteError = errObj;
    return errObj;
  }
}

export function readStorage(key, fallback, expectedType = null) {
  const spec = DATA_STORAGE_SPECS.find((s) => s.key === key);
  const resolvedType = expectedType || spec?.expectedType || null;
  const result = readStorageDetailed(key, fallback, { expectedType: resolvedType });
  return result.data;
}

export function writeStorage(key, value) {
  const result = writeStorageDetailed(key, value);
  return result.ok;
}

/**
 * Pure, deterministic sanitizer that strips only known prototype demo records
 * while preserving every user-created or admin-edited record.
 *
 * Price Migration Rules (Phase 2):
 * - Only clears `startingPrice` if:
 *   1. `item.id` is in `LEGACY_SEED_PRICE_BY_ID`
 *   2. `Number(item.startingPrice) === LEGACY_SEED_PRICE_BY_ID[item.id]`
 *   3. `item.priceConfirmed !== true`
 * - Never modifies custom packages created by the admin, even if priced at ₹15,000 or ₹28,000.
 * - Never overwrites admin-modified prices on seed packages (e.g., ₹18,000).
 * - Preserves `priceConfirmed` accurately without blindly marking every non-null price confirmed.
 */
export function sanitizeLegacyDataset(dataset = {}) {
  const rawOrders = Array.isArray(dataset.orders) ? dataset.orders : [];
  const orders = rawOrders.filter((ord) => {
    if (!ord || typeof ord !== 'object') return false;
    if (KNOWN_DEMO_MARKERS.orderIds.includes(ord.id)) return false;
    const email = String(ord.customerEmail || '').trim().toLowerCase();
    if (
      KNOWN_DEMO_MARKERS.orderReferences.includes(ord.referenceId) &&
      KNOWN_DEMO_MARKERS.demoEmails.includes(email)
    ) {
      return false;
    }
    return true;
  });

  const rawInquiries = Array.isArray(dataset.inquiries) ? dataset.inquiries : [];
  const inquiries = rawInquiries.filter((inq) => {
    if (!inq || typeof inq !== 'object') return false;
    if (KNOWN_DEMO_MARKERS.inquiryIds.includes(inq.id)) return false;
    const email = String(inq.email || '').trim().toLowerCase();
    if (KNOWN_DEMO_MARKERS.demoEmails.includes(email)) return false;
    return true;
  });

  const rawPortfolio = Array.isArray(dataset.portfolio) ? dataset.portfolio : [];
  const portfolio = rawPortfolio.filter((proj) => {
    if (!proj || typeof proj !== 'object') return false;
    if (KNOWN_DEMO_MARKERS.portfolioIds.includes(proj.id)) return false;
    if (KNOWN_DEMO_MARKERS.portfolioSlugs.includes(proj.slug)) return false;
    if (proj.isSample === true && String(proj.id || '').startsWith('proj-sample-')) return false;
    return true;
  });

  const rawTeam = Array.isArray(dataset.team) ? dataset.team : [];
  const team = rawTeam.filter((member) => {
    if (!member || typeof member !== 'object') return false;
    const isLegacyId = KNOWN_DEMO_MARKERS.teamIds.includes(member.id);
    const hasPendingName = String(member.fullName || '').includes('(Profile Pending)');
    if (isLegacyId && (member.isPlaceholder === true || hasPendingName)) {
      return false;
    }
    if (member.isPlaceholder === true && hasPendingName) {
      return false;
    }
    return true;
  });

  const sanitizePricedCatalogItem = (item) => {
    if (!item || typeof item !== 'object') return item;
    const hasKnownSeedId = Object.prototype.hasOwnProperty.call(LEGACY_SEED_PRICE_BY_ID, item.id);
    const expectedSeedPrice = hasKnownSeedId ? LEGACY_SEED_PRICE_BY_ID[item.id] : undefined;
    const hasNumericPrice =
      item.startingPrice !== null &&
      item.startingPrice !== undefined &&
      item.startingPrice !== '' &&
      !Number.isNaN(Number(item.startingPrice));
    const numericPrice = hasNumericPrice ? Number(item.startingPrice) : null;

    const isUnconfirmedLegacySeedPrice =
      hasKnownSeedId &&
      numericPrice !== null &&
      numericPrice === expectedSeedPrice &&
      item.priceConfirmed !== true;

    if (isUnconfirmedLegacySeedPrice) {
      return {
        ...item,
        startingPrice: null,
        priceConfirmed: false,
      };
    }

    return {
      ...item,
      startingPrice: numericPrice,
      priceConfirmed: Boolean(item.priceConfirmed),
    };
  };

  const rawPackages = Array.isArray(dataset.packages) ? dataset.packages : INITIAL_PACKAGES;
  const packages = rawPackages.map(sanitizePricedCatalogItem);

  const rawServices = Array.isArray(dataset.services) ? dataset.services : INITIAL_SERVICES;
  const services = rawServices.map(sanitizePricedCatalogItem);

  const maintenancePlans = Array.isArray(dataset.maintenancePlans)
    ? dataset.maintenancePlans.map((plan) => {
        if (!plan || typeof plan !== 'object') return plan;
        const seedMatch = INITIAL_MAINTENANCE_PLANS.find((s) => s.id === plan.id);
        return seedMatch ? { ...seedMatch, ...plan } : plan;
      })
    : INITIAL_MAINTENANCE_PLANS;

  const addons = Array.isArray(dataset.addons) ? dataset.addons : INITIAL_ADDONS;

  const rawSettings =
    dataset.settings && typeof dataset.settings === 'object' && !Array.isArray(dataset.settings)
      ? dataset.settings
      : INITIAL_SETTINGS;

  const cleanPlaceholderField = (val) => {
    if (!val || typeof val !== 'string') return '';
    const trimmed = val.trim();
    if (KNOWN_DEMO_MARKERS.placeholderStrings.includes(trimmed)) return '';
    if (
      trimmed.toLowerCase().includes('(placeholder)') ||
      trimmed.toLowerCase().includes('.example') ||
      trimmed.toLowerCase().includes('(office address configurable)')
    ) {
      return '';
    }
    return trimmed;
  };

  const legacyHighlightValues = new Set(['10', '30 Days', 'Srinagar, J&K']);
  const rawHighlights = Array.isArray(rawSettings.highlights)
    ? rawSettings.highlights
    : INITIAL_SETTINGS.highlights;

  const highlights = rawHighlights.map((hl) => {
    if (!hl || typeof hl !== 'object') return hl;
    if (legacyHighlightValues.has(String(hl.value || '').trim()) && !hl.adminConfirmed) {
      return {
        ...hl,
        value: '',
        verified: false,
      };
    }
    return hl;
  });

  const cleanedEmail = cleanPlaceholderField(rawSettings.contactEmail);
  const cleanedWhatsapp = cleanPlaceholderField(rawSettings.whatsappNumber);
  const isLegacyDemoWhatsapp =
    cleanedWhatsapp === '919419012345' || cleanedWhatsapp === '+91 94190 12345';
  const isLegacyDemoEmail = cleanedEmail.toLowerCase() === 'hello@dreamtechkashmir.com';
  const isLegacyDemoPhone =
    cleanPlaceholderField(rawSettings.contactPhone) === '+91 94190 12345';
  const isLegacyDemoLocation = cleanPlaceholderField(rawSettings.businessLocation).includes(
    'Residency Road, Lal Chowk'
  );

  const settings = {
    ...INITIAL_SETTINGS,
    ...rawSettings,
    companyName: rawSettings.companyName || INITIAL_SETTINGS.companyName,
    brandAbbreviation: rawSettings.brandAbbreviation || INITIAL_SETTINGS.brandAbbreviation,
    officialDomain: INITIAL_SETTINGS.officialDomain,
    serviceArea: rawSettings.serviceArea || INITIAL_SETTINGS.serviceArea,
    contactEmail:
      rawSettings.contactDetailsCustomized === true
        ? isLegacyDemoEmail
          ? ''
          : cleanedEmail
        : !cleanedEmail || isLegacyDemoEmail
        ? INITIAL_SETTINGS.contactEmail
        : cleanedEmail,
    contactPhone: isLegacyDemoPhone ? '' : cleanPlaceholderField(rawSettings.contactPhone),
    whatsappNumber:
      rawSettings.contactDetailsCustomized === true
        ? isLegacyDemoWhatsapp
          ? ''
          : cleanedWhatsapp
        : !cleanedWhatsapp || isLegacyDemoWhatsapp
        ? INITIAL_SETTINGS.whatsappNumber
        : cleanedWhatsapp,
    businessLocation: isLegacyDemoLocation
      ? ''
      : cleanPlaceholderField(rawSettings.businessLocation),
    workingHours:
      (rawSettings.workingHours === 'Monday – Saturday · 10:00 AM – 6:30 PM IST' ||
        rawSettings.workingHours === 'Monday – Saturday · 9:30 AM – 6:30 PM IST') &&
      !rawSettings.workingHoursConfirmed
        ? ''
        : cleanPlaceholderField(rawSettings.workingHours),
    socialLinks: {
      ...INITIAL_SETTINGS.socialLinks,
      ...(rawSettings.socialLinks || {}),
    },
    highlights,
  };

  return {
    orders,
    inquiries,
    portfolio,
    team,
    packages,
    services,
    maintenancePlans,
    addons,
    settings,
  };
}

/**
 * Inspects current storage state before any initialization or migration.
 * Detects existing `dks_v2_*` data keys even if `dks_v2_seeded_flag` is missing!
 */
export function inspectStorageState(customStorage = null) {
  const target = getStorageTarget(customStorage);
  if (!target) {
    return {
      available: false,
      hasAnyDataKey: false,
      isSeeded: false,
      appliedMigration: null,
      inProgress: false,
      existingDataKeys: [],
      unknownKeys: {},
      corruptedKeys: [],
      readResults: {},
    };
  }

  let isSeeded = false;
  let appliedMigration = null;
  let inProgress = false;
  const existingDataKeys = [];
  const corruptedKeys = [];
  const readResults = {};
  const unknownKeys = {};

  try {
    isSeeded = target.getItem(STORAGE_KEYS.SEEDED) === 'true';
    appliedMigration = target.getItem(STORAGE_KEYS.MIGRATION_VERSION);
    inProgress = target.getItem(STORAGE_KEYS.MIGRATION_IN_PROGRESS) === 'true';
  } catch (err) {
    return {
      available: false,
      hasAnyDataKey: false,
      isSeeded: false,
      appliedMigration: null,
      inProgress: false,
      existingDataKeys: [],
      unknownKeys: {},
      corruptedKeys: [],
      readResults: {},
      error: classifyStorageError(err),
    };
  }

  const knownKeySet = new Set(Object.values(STORAGE_KEYS));

  for (const spec of DATA_STORAGE_SPECS) {
    const res = readStorageDetailed(spec.key, spec.fallback, {
      expectedType: spec.expectedType,
      storage: target,
    });
    readResults[spec.field] = res;
    if (res.status === 'ok' || res.status === 'corrupted') {
      existingDataKeys.push(spec.key);
    }
    if (res.status === 'corrupted') {
      corruptedKeys.push(spec.key);
    }
  }

  // Capture any extra or unknown keys in storage so they are preserved in backups
  try {
    const length = typeof target.length === 'number' ? target.length : 0;
    for (let i = 0; i < length; i += 1) {
      const k = target.key(i);
      if (k && !knownKeySet.has(k)) {
        unknownKeys[k] = target.getItem(k);
      }
    }
  } catch {
    // Ignore enumeration issues if custom storage mock does not implement .key(i)
  }

  return {
    available: true,
    hasAnyDataKey: existingDataKeys.length > 0,
    isSeeded,
    appliedMigration,
    inProgress,
    existingDataKeys,
    unknownKeys,
    corruptedKeys,
    readResults,
  };
}

/**
 * Safe, non-destructive LocalStorage initialization and migration (Phase 1):
 * 1. Checks if ANY `dks_v2_*` data key exists BEFORE writing `INITIAL_*` defaults.
 * 2. Only seeds `INITIAL_*` defaults when the browser has ZERO existing `dks_v2_*` data keys.
 * 3. When legacy or un-migrated data exists (even if `dks_v2_seeded_flag` is missing):
 *    - Writes a complete backup snapshot to `dks_v2_backup_pre_cleanup` first (including raw values of any corrupted or unknown keys).
 *    - Verifies that the backup write succeeded; if the backup write fails, ABORTS migration immediately without overwriting any user data.
 *    - Never overwrites a key containing corrupted JSON with an empty array — leaves the raw key untouched and records a diagnostic error.
 *    - Sanitizes only known demo records and unconfirmed legacy seed prices while preserving all user/admin data.
 */
export function ensureSeededStorage(customStorage = null) {
  const target = getStorageTarget(customStorage);
  if (!target) {
    const result = { status: 'unavailable', migrated: false, backedUp: false };
    storageDiagnostics.lastMigrationResult = result;
    return result;
  }

  const inspection = inspectStorageState(target);
  if (!inspection.available) {
    const result = { status: 'unavailable', migrated: false, backedUp: false };
    storageDiagnostics.lastMigrationResult = result;
    return result;
  }

  // Case 1: Fresh browser with zero existing dks_v2_* data keys and not seeded
  if (!inspection.hasAnyDataKey && !inspection.isSeeded) {
    for (const spec of DATA_STORAGE_SPECS) {
      const writeRes = writeStorageDetailed(spec.key, spec.fallback, { storage: target });
      if (!writeRes.ok) {
        const result = {
          status: 'seed_failed',
          migrated: false,
          backedUp: false,
          errorType: writeRes.errorType,
          message: writeRes.message,
        };
        storageDiagnostics.lastMigrationResult = result;
        return result;
      }
    }
    try {
      target.setItem(STORAGE_KEYS.SEEDED, 'true');
      target.setItem(STORAGE_KEYS.MIGRATION_VERSION, CURRENT_MIGRATION_VERSION);
    } catch (err) {
      const result = {
        status: 'seed_failed',
        migrated: false,
        backedUp: false,
        errorType: classifyStorageError(err),
        message: err?.message || 'Failed setting seeded flag.',
      };
      storageDiagnostics.lastMigrationResult = result;
      return result;
    }

    const result = { status: 'seeded_fresh', migrated: false, backedUp: false };
    storageDiagnostics.lastMigrationResult = result;
    return result;
  }

  // Case 2: Already seeded, migration version matches current, no interrupted migration, and no missing keys
  const allSpecsPresent = DATA_STORAGE_SPECS.every(
    (spec) => inspection.readResults[spec.field]?.status === 'ok'
  );
  if (
    inspection.isSeeded &&
    inspection.appliedMigration === CURRENT_MIGRATION_VERSION &&
    !inspection.inProgress &&
    allSpecsPresent &&
    inspection.corruptedKeys.length === 0
  ) {
    const result = { status: 'already_up_to_date', migrated: false, backedUp: false };
    storageDiagnostics.lastMigrationResult = result;
    return result;
  }

  // Case 3: Existing data is present (with or without dks_v2_seeded_flag) or partial/older migration
  const existingDataset = {};
  const rawCorruptedMap = {};

  for (const spec of DATA_STORAGE_SPECS) {
    const res = inspection.readResults[spec.field];
    if (res.status === 'corrupted') {
      rawCorruptedMap[spec.key] = res.raw;
      existingDataset[spec.field] = spec.fallback;
    } else if (res.status === 'ok') {
      existingDataset[spec.field] = res.data;
    } else {
      existingDataset[spec.field] = spec.fallback;
    }
  }

  // Step 3A: Create or verify backup snapshot BEFORE modifying any existing key
  let existingBackupRaw = null;
  try {
    existingBackupRaw = target.getItem(STORAGE_KEYS.BACKUP_SNAPSHOT);
  } catch {
    existingBackupRaw = null;
  }

  let backupVerified = Boolean(existingBackupRaw);
  if (!existingBackupRaw) {
    const backupPayload = {
      backedUpAt: new Date().toISOString(),
      migrationVersion: CURRENT_MIGRATION_VERSION,
      previousMigrationVersion: inspection.appliedMigration || null,
      wasSeededFlagPresent: inspection.isSeeded,
      data: existingDataset,
      corruptedRawKeys: rawCorruptedMap,
      unknownKeys: inspection.unknownKeys,
    };

    const backupWrite = writeStorageDetailed(STORAGE_KEYS.BACKUP_SNAPSHOT, backupPayload, {
      storage: target,
      verify: true,
    });

    if (!backupWrite.ok) {
      // CRITICAL SAFETY RULE: Abort migration if backup fails! Never overwrite existing data without backup.
      const result = {
        status: 'aborted_backup_failed',
        migrated: false,
        backedUp: false,
        errorType: backupWrite.errorType,
        message: backupWrite.message,
      };
      storageDiagnostics.lastMigrationResult = result;
      return result;
    }
    backupVerified = true;
  }

  // Step 3B: Mark migration in progress so partial failures can be detected
  try {
    target.setItem(STORAGE_KEYS.MIGRATION_IN_PROGRESS, 'true');
  } catch (err) {
    const result = {
      status: 'aborted_write_failed',
      migrated: false,
      backedUp: backupVerified,
      errorType: classifyStorageError(err),
      message: 'Failed writing migration in-progress marker.',
    };
    storageDiagnostics.lastMigrationResult = result;
    return result;
  }

  const sanitized = sanitizeLegacyDataset(existingDataset);

  // Step 3C: Write sanitized dataset, skipping any key that had corrupted raw JSON so user data is never wiped
  for (const spec of DATA_STORAGE_SPECS) {
    if (inspection.corruptedKeys.includes(spec.key)) {
      // Preserve raw corrupted value in place rather than overwriting with empty fallback
      continue;
    }
    const nextValue = sanitized[spec.field] ?? spec.fallback;
    const writeRes = writeStorageDetailed(spec.key, nextValue, { storage: target });
    if (!writeRes.ok) {
      const result = {
        status: 'partial_migration_error',
        migrated: false,
        backedUp: backupVerified,
        failedKey: spec.key,
        errorType: writeRes.errorType,
        message: writeRes.message,
      };
      storageDiagnostics.lastMigrationResult = result;
      return result;
    }
  }

  try {
    target.setItem(STORAGE_KEYS.SEEDED, 'true');
    if (inspection.corruptedKeys.length === 0) {
      target.setItem(STORAGE_KEYS.MIGRATION_VERSION, CURRENT_MIGRATION_VERSION);
    }
    target.removeItem(STORAGE_KEYS.MIGRATION_IN_PROGRESS);
  } catch (err) {
    const result = {
      status: 'partial_migration_error',
      migrated: false,
      backedUp: backupVerified,
      errorType: classifyStorageError(err),
      message: err?.message || 'Failed finalizing migration flags.',
    };
    storageDiagnostics.lastMigrationResult = result;
    return result;
  }

  const result = {
    status: inspection.corruptedKeys.length > 0 ? 'migrated_with_corrupted_keys_preserved' : 'migrated',
    migrated: true,
    backedUp: backupVerified,
    corruptedKeys: [...inspection.corruptedKeys],
  };
  storageDiagnostics.lastMigrationResult = result;
  return result;
}

/**
 * Restores data from STORAGE_KEYS.BACKUP_SNAPSHOT if available.
 */
export function restoreFromBackupSnapshot(customStorage = null) {
  const target = getStorageTarget(customStorage);
  if (!target) {
    return { ok: false, message: 'LocalStorage is unavailable.' };
  }

  const backupRes = readStorageDetailed(STORAGE_KEYS.BACKUP_SNAPSHOT, null, {
    expectedType: 'object',
    storage: target,
  });

  if (!backupRes.ok || !backupRes.data || !backupRes.data.data) {
    return {
      ok: false,
      message: 'No valid backup snapshot found in LocalStorage.',
    };
  }

  const savedData = backupRes.data.data;
  for (const spec of DATA_STORAGE_SPECS) {
    if (spec.field in savedData) {
      const writeRes = writeStorageDetailed(spec.key, savedData[spec.field], { storage: target });
      if (!writeRes.ok) {
        return {
          ok: false,
          message: `Failed restoring "${spec.key}": ${writeRes.message}`,
        };
      }
    }
  }

  return {
    ok: true,
    restoredAt: new Date().toISOString(),
    data: savedData,
    message: 'LocalStorage data restored from backup snapshot.',
  };
}

/**
 * Exports all current LocalStorage records + any pre-migration backup snapshot
 * so the website owner can save or inspect their data before/during backend migration.
 */
export function exportLocalDataSnapshot(customStorage = null) {
  const target = getStorageTarget(customStorage);
  if (!target) return null;
  return {
    exportedAt: new Date().toISOString(),
    migrationVersion: target.getItem(STORAGE_KEYS.MIGRATION_VERSION) || null,
    diagnostics: getStorageDiagnostics(),
    currentData: {
      orders: readStorageDetailed(STORAGE_KEYS.ORDERS, [], { expectedType: 'array', storage: target }).data,
      inquiries: readStorageDetailed(STORAGE_KEYS.INQUIRIES, [], { expectedType: 'array', storage: target }).data,
      portfolio: readStorageDetailed(STORAGE_KEYS.PORTFOLIO, [], { expectedType: 'array', storage: target }).data,
      team: readStorageDetailed(STORAGE_KEYS.TEAM, [], { expectedType: 'array', storage: target }).data,
      packages: readStorageDetailed(STORAGE_KEYS.PACKAGES, [], { expectedType: 'array', storage: target }).data,
      services: readStorageDetailed(STORAGE_KEYS.SERVICES, [], { expectedType: 'array', storage: target }).data,
      maintenancePlans: readStorageDetailed(STORAGE_KEYS.MAINTENANCE, [], { expectedType: 'array', storage: target }).data,
      addons: readStorageDetailed(STORAGE_KEYS.ADDONS, [], { expectedType: 'array', storage: target }).data,
      settings: readStorageDetailed(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS, { expectedType: 'object', storage: target }).data,
    },
    preCleanupBackup: readStorageDetailed(STORAGE_KEYS.BACKUP_SNAPSHOT, null, { storage: target }).data,
  };
}

/**
 * Safe reset helper: only resets catalog/configuration defaults if explicitly confirmed by Admin,
 * while backing up current state first and aborting if backup fails.
 */
export function resetAllDemoData(customStorage = null) {
  const target = getStorageTarget(customStorage);
  if (!target) return { ok: false, message: 'LocalStorage is unavailable.' };

  const currentSnapshot = exportLocalDataSnapshot(target);
  if (currentSnapshot) {
    const backupRes = writeStorageDetailed(
      STORAGE_KEYS.BACKUP_SNAPSHOT,
      {
        backedUpAt: new Date().toISOString(),
        reason: 'manual_admin_reset',
        migrationVersion: CURRENT_MIGRATION_VERSION,
        data: currentSnapshot.currentData,
      },
      { storage: target, verify: true }
    );
    if (!backupRes.ok) {
      return { ok: false, message: backupRes.message };
    }
  }

  const sanitized = sanitizeLegacyDataset(currentSnapshot?.currentData || {});
  writeStorageDetailed(STORAGE_KEYS.SERVICES, INITIAL_SERVICES, { storage: target });
  writeStorageDetailed(STORAGE_KEYS.PACKAGES, INITIAL_PACKAGES, { storage: target });
  writeStorageDetailed(STORAGE_KEYS.MAINTENANCE, INITIAL_MAINTENANCE_PLANS, { storage: target });
  writeStorageDetailed(STORAGE_KEYS.ADDONS, INITIAL_ADDONS, { storage: target });
  writeStorageDetailed(STORAGE_KEYS.PORTFOLIO, sanitized.portfolio, { storage: target });
  writeStorageDetailed(STORAGE_KEYS.TEAM, sanitized.team, { storage: target });
  writeStorageDetailed(STORAGE_KEYS.ORDERS, sanitized.orders, { storage: target });
  writeStorageDetailed(STORAGE_KEYS.INQUIRIES, sanitized.inquiries, { storage: target });
  writeStorageDetailed(STORAGE_KEYS.SETTINGS, sanitized.settings, { storage: target });
  try {
    target.setItem(STORAGE_KEYS.SEEDED, 'true');
    target.setItem(STORAGE_KEYS.MIGRATION_VERSION, CURRENT_MIGRATION_VERSION);
  } catch {
    // Ignore flag write error if quota reached
  }
  return { ok: true, message: 'Catalog defaults restored and backup snapshot saved.' };
}

