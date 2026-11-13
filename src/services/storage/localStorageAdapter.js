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
  BACKUP_SNAPSHOT: 'dks_v2_backup_pre_cleanup',
};

export const CURRENT_MIGRATION_VERSION = '2026-11-real-data-v1';

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function readStorage(key, fallback) {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Failed reading storage key ${key}:`, err);
    return fallback;
  }
}

export function writeStorage(key, value) {
  if (!isBrowser()) return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.error(`Failed writing storage key ${key}:`, err);
    return false;
  }
}

/**
 * Pure, deterministic sanitizer that strips only known prototype demo records
 * while preserving every user-created or admin-edited record.
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

  const rawPackages = Array.isArray(dataset.packages) ? dataset.packages : INITIAL_PACKAGES;
  const packages = rawPackages.map((pkg) => {
    if (!pkg || typeof pkg !== 'object') return pkg;
    const isLegacyPrice =
      pkg.priceConfirmed !== true &&
      KNOWN_DEMO_MARKERS.legacyUnconfirmedPrices.includes(Number(pkg.startingPrice));
    return {
      ...pkg,
      startingPrice: isLegacyPrice ? null : (pkg.startingPrice ?? null),
      priceConfirmed: isLegacyPrice ? false : Boolean(pkg.priceConfirmed || pkg.startingPrice !== null),
    };
  });

  const rawServices = Array.isArray(dataset.services) ? dataset.services : INITIAL_SERVICES;
  const services = rawServices.map((svc) => {
    if (!svc || typeof svc !== 'object') return svc;
    const isLegacyPrice =
      svc.priceConfirmed !== true &&
      KNOWN_DEMO_MARKERS.legacyUnconfirmedPrices.includes(Number(svc.startingPrice));
    return {
      ...svc,
      startingPrice: isLegacyPrice ? null : (svc.startingPrice ?? null),
      priceConfirmed: isLegacyPrice ? false : Boolean(svc.priceConfirmed || svc.startingPrice !== null),
    };
  });

  const rawSettings =
    dataset.settings && typeof dataset.settings === 'object'
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

  const settings = {
    ...INITIAL_SETTINGS,
    ...rawSettings,
    companyName: rawSettings.companyName || INITIAL_SETTINGS.companyName,
    brandAbbreviation: rawSettings.brandAbbreviation || INITIAL_SETTINGS.brandAbbreviation,
    officialDomain: INITIAL_SETTINGS.officialDomain,
    serviceArea: rawSettings.serviceArea || INITIAL_SETTINGS.serviceArea,
    contactEmail: cleanPlaceholderField(rawSettings.contactEmail),
    contactPhone: cleanPlaceholderField(rawSettings.contactPhone),
    whatsappNumber: cleanPlaceholderField(rawSettings.whatsappNumber),
    businessLocation: cleanPlaceholderField(rawSettings.businessLocation),
    workingHours:
      rawSettings.workingHours === 'Monday – Saturday · 10:00 AM – 6:30 PM IST' &&
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
    settings,
  };
}

/**
 * Safe, non-destructive LocalStorage migration.
 * - Backs up any pre-existing LocalStorage state under STORAGE_KEYS.BACKUP_SNAPSHOT before modifying.
 * - Removes only known legacy demo/sample records.
 * - Preserves all user-created orders, inquiries, portfolio items, team members, and custom settings.
 */
export function ensureSeededStorage() {
  if (!isBrowser()) return;

  const isSeeded = window.localStorage.getItem(STORAGE_KEYS.SEEDED);
  const appliedMigration = window.localStorage.getItem(STORAGE_KEYS.MIGRATION_VERSION);

  if (!isSeeded) {
    writeStorage(STORAGE_KEYS.SERVICES, INITIAL_SERVICES);
    writeStorage(STORAGE_KEYS.PACKAGES, INITIAL_PACKAGES);
    writeStorage(STORAGE_KEYS.MAINTENANCE, INITIAL_MAINTENANCE_PLANS);
    writeStorage(STORAGE_KEYS.ADDONS, INITIAL_ADDONS);
    writeStorage(STORAGE_KEYS.PORTFOLIO, INITIAL_PORTFOLIO);
    writeStorage(STORAGE_KEYS.TEAM, INITIAL_TEAM);
    writeStorage(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
    writeStorage(STORAGE_KEYS.INQUIRIES, INITIAL_INQUIRIES);
    writeStorage(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
    window.localStorage.setItem(STORAGE_KEYS.SEEDED, 'true');
    window.localStorage.setItem(STORAGE_KEYS.MIGRATION_VERSION, CURRENT_MIGRATION_VERSION);
    return;
  }

  if (appliedMigration !== CURRENT_MIGRATION_VERSION) {
    const existingDataset = {
      orders: readStorage(STORAGE_KEYS.ORDERS, INITIAL_ORDERS),
      inquiries: readStorage(STORAGE_KEYS.INQUIRIES, INITIAL_INQUIRIES),
      portfolio: readStorage(STORAGE_KEYS.PORTFOLIO, INITIAL_PORTFOLIO),
      team: readStorage(STORAGE_KEYS.TEAM, INITIAL_TEAM),
      packages: readStorage(STORAGE_KEYS.PACKAGES, INITIAL_PACKAGES),
      services: readStorage(STORAGE_KEYS.SERVICES, INITIAL_SERVICES),
      maintenancePlans: readStorage(STORAGE_KEYS.MAINTENANCE, INITIAL_MAINTENANCE_PLANS),
      addons: readStorage(STORAGE_KEYS.ADDONS, INITIAL_ADDONS),
      settings: readStorage(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS),
    };

    // Preserve a recoverable backup snapshot before modifying any records
    if (!window.localStorage.getItem(STORAGE_KEYS.BACKUP_SNAPSHOT)) {
      writeStorage(STORAGE_KEYS.BACKUP_SNAPSHOT, {
        backedUpAt: new Date().toISOString(),
        migrationVersion: CURRENT_MIGRATION_VERSION,
        data: existingDataset,
      });
    }

    const sanitized = sanitizeLegacyDataset(existingDataset);

    writeStorage(STORAGE_KEYS.ORDERS, sanitized.orders);
    writeStorage(STORAGE_KEYS.INQUIRIES, sanitized.inquiries);
    writeStorage(STORAGE_KEYS.PORTFOLIO, sanitized.portfolio);
    writeStorage(STORAGE_KEYS.TEAM, sanitized.team);
    writeStorage(STORAGE_KEYS.PACKAGES, sanitized.packages);
    writeStorage(STORAGE_KEYS.SERVICES, sanitized.services);
    writeStorage(STORAGE_KEYS.SETTINGS, sanitized.settings);
    window.localStorage.setItem(STORAGE_KEYS.MIGRATION_VERSION, CURRENT_MIGRATION_VERSION);
  }
}

/**
 * Exports all current LocalStorage records + any pre-migration backup snapshot
 * so the website owner can save or inspect their data before/during backend migration.
 */
export function exportLocalDataSnapshot() {
  if (!isBrowser()) return null;
  return {
    exportedAt: new Date().toISOString(),
    migrationVersion: window.localStorage.getItem(STORAGE_KEYS.MIGRATION_VERSION) || null,
    currentData: {
      orders: readStorage(STORAGE_KEYS.ORDERS, []),
      inquiries: readStorage(STORAGE_KEYS.INQUIRIES, []),
      portfolio: readStorage(STORAGE_KEYS.PORTFOLIO, []),
      team: readStorage(STORAGE_KEYS.TEAM, []),
      packages: readStorage(STORAGE_KEYS.PACKAGES, []),
      services: readStorage(STORAGE_KEYS.SERVICES, []),
      maintenancePlans: readStorage(STORAGE_KEYS.MAINTENANCE, []),
      addons: readStorage(STORAGE_KEYS.ADDONS, []),
      settings: readStorage(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS),
    },
    preCleanupBackup: readStorage(STORAGE_KEYS.BACKUP_SNAPSHOT, null),
  };
}

/**
 * Safe reset helper: only resets catalog/configuration defaults if explicitly confirmed by Admin,
 * while backing up current state first.
 */
export function resetAllDemoData() {
  if (!isBrowser()) return;
  const currentSnapshot = exportLocalDataSnapshot();
  if (currentSnapshot) {
    writeStorage(STORAGE_KEYS.BACKUP_SNAPSHOT, {
      backedUpAt: new Date().toISOString(),
      reason: 'manual_admin_reset',
      data: currentSnapshot.currentData,
    });
  }
  // Remove only demo/sample artifacts and restore clean default catalog without wiping real orders/inquiries
  const sanitized = sanitizeLegacyDataset(currentSnapshot?.currentData || {});
  writeStorage(STORAGE_KEYS.SERVICES, INITIAL_SERVICES);
  writeStorage(STORAGE_KEYS.PACKAGES, INITIAL_PACKAGES);
  writeStorage(STORAGE_KEYS.MAINTENANCE, INITIAL_MAINTENANCE_PLANS);
  writeStorage(STORAGE_KEYS.ADDONS, INITIAL_ADDONS);
  writeStorage(STORAGE_KEYS.PORTFOLIO, sanitized.portfolio);
  writeStorage(STORAGE_KEYS.TEAM, sanitized.team);
  writeStorage(STORAGE_KEYS.ORDERS, sanitized.orders);
  writeStorage(STORAGE_KEYS.INQUIRIES, sanitized.inquiries);
  writeStorage(STORAGE_KEYS.SETTINGS, sanitized.settings);
  window.localStorage.setItem(STORAGE_KEYS.SEEDED, 'true');
  window.localStorage.setItem(STORAGE_KEYS.MIGRATION_VERSION, CURRENT_MIGRATION_VERSION);
}
