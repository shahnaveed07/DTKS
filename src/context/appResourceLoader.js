export const API_LOADING_SETTINGS = Object.freeze({
  companyName: 'DreamTech Kashmir Solutions',
  brandAbbreviation: 'DTKS',
  officialDomain: 'https://dreamtechkashmirsolutions.studio/',
  tagline: '',
  heroSupportText: '',
  contactEmail: '',
  contactPhone: '',
  whatsappNumber: '',
  businessLocation: '',
  serviceArea: 'Srinagar, Kashmir, Jammu & Kashmir, India',
  workingHours: '',
  socialLinks: {
    github: '',
    linkedin: '',
    instagram: '',
    facebook: '',
    x: '',
    other: '',
  },
  highlights: [],
});

export function createInitialResourceMap(initialValue) {
  return {
    catalog: initialValue,
    services: initialValue,
    portfolio: initialValue,
    team: initialValue,
    orders: initialValue,
    inquiries: initialValue,
    settings: initialValue,
  };
}

/**
 * Computes initial AppContext state based strictly on the active data adapter mode.
 * CRITICAL: In 'api' mode, NEVER calls ensureSeededStorage() and NEVER reads seed/LocalStorage records.
 */
export function getInitialAppState(adapterMode, localGetters = {}) {
  if (adapterMode === 'api') {
    return {
      services: [],
      packages: [],
      maintenancePlans: [],
      addons: [],
      portfolio: [],
      team: [],
      orders: [],
      inquiries: [],
      settings: {
        ...API_LOADING_SETTINGS,
        socialLinks: { ...API_LOADING_SETTINGS.socialLinks },
        highlights: [],
      },
      isLoading: true,
      resourceStatus: createInitialResourceMap('loading'),
      resourceErrors: createInitialResourceMap(null),
    };
  }

  if (typeof localGetters.ensureSeededStorage === 'function') {
    localGetters.ensureSeededStorage();
  }

  return {
    services: localGetters.getServices ? localGetters.getServices() : [],
    packages: localGetters.getPackages ? localGetters.getPackages() : [],
    maintenancePlans: localGetters.getMaintenancePlans ? localGetters.getMaintenancePlans() : [],
    addons: localGetters.getAddons ? localGetters.getAddons() : [],
    portfolio: localGetters.getPortfolio ? localGetters.getPortfolio() : [],
    team: localGetters.getTeam ? localGetters.getTeam() : [],
    orders: localGetters.getOrders ? localGetters.getOrders() : [],
    inquiries: localGetters.getInquiries ? localGetters.getInquiries() : [],
    settings: localGetters.getSettings ? localGetters.getSettings() : { ...API_LOADING_SETTINGS },
    isLoading: false,
    resourceStatus: createInitialResourceMap('ready'),
    resourceErrors: createInitialResourceMap(null),
  };
}

function extractSettledResult(settled, fallbackMessage) {
  if (!settled) {
    return { ok: false, data: null, skipped: false, message: fallbackMessage };
  }
  if (settled.status === 'rejected') {
    return {
      ok: false,
      data: null,
      skipped: false,
      message: settled.reason?.message || fallbackMessage,
    };
  }
  const value = settled.value;
  if (!value || value.success === false) {
    return {
      ok: false,
      data: null,
      skipped: false,
      message: value?.message || fallbackMessage,
    };
  }
  return {
    ok: true,
    data: value.data ?? null,
    skipped: Boolean(value.skipped),
    message: null,
  };
}

/**
 * Loads all backend resources independently via Promise.allSettled() so a single failing
 * endpoint never discards successful data or falsely claims total failure.
 */
export async function loadAppResources({
  includeAdmin = false,
  packageService,
  portfolioService,
  teamService,
  orderService,
  inquiryService,
  settingsService,
}) {
  const settled = await Promise.allSettled([
    packageService.fetchCatalog({ includeInactive: includeAdmin }),
    packageService.listServices({ includeInactive: includeAdmin }),
    portfolioService.listPortfolio({ includeDrafts: includeAdmin }),
    teamService.listTeam({ includeHidden: includeAdmin }),
    includeAdmin
      ? orderService.listOrders()
      : Promise.resolve({ success: true, data: null, skipped: true }),
    includeAdmin
      ? inquiryService.listInquiries()
      : Promise.resolve({ success: true, data: null, skipped: true }),
    settingsService.getSettings(),
  ]);

  const catalogResult = extractSettledResult(settled[0], 'Failed loading website packages catalog.');
  const servicesResult = extractSettledResult(settled[1], 'Failed loading website services.');
  const portfolioResult = extractSettledResult(settled[2], 'Failed loading portfolio projects.');
  const teamResult = extractSettledResult(settled[3], 'Failed loading team profiles.');
  const ordersResult = extractSettledResult(settled[4], 'Failed loading website orders.');
  const inquiriesResult = extractSettledResult(settled[5], 'Failed loading customer inquiries.');
  const settingsResult = extractSettledResult(settled[6], 'Failed loading website settings.');

  const updates = {};
  const resourceStatus = {
    catalog: catalogResult.ok ? 'ready' : 'error',
    services: servicesResult.ok ? 'ready' : 'error',
    portfolio: portfolioResult.ok ? 'ready' : 'error',
    team: teamResult.ok ? 'ready' : 'error',
    orders: !includeAdmin || ordersResult.skipped ? 'skipped' : ordersResult.ok ? 'ready' : 'error',
    inquiries:
      !includeAdmin || inquiriesResult.skipped ? 'skipped' : inquiriesResult.ok ? 'ready' : 'error',
    settings: settingsResult.ok ? 'ready' : 'error',
  };

  const resourceErrors = {
    catalog: catalogResult.ok ? null : catalogResult.message,
    services: servicesResult.ok ? null : servicesResult.message,
    portfolio: portfolioResult.ok ? null : portfolioResult.message,
    team: teamResult.ok ? null : teamResult.message,
    orders: !includeAdmin || ordersResult.skipped || ordersResult.ok ? null : ordersResult.message,
    inquiries:
      !includeAdmin || inquiriesResult.skipped || inquiriesResult.ok
        ? null
        : inquiriesResult.message,
    settings: settingsResult.ok ? null : settingsResult.message,
  };

  if (catalogResult.ok && catalogResult.data) {
    if (Array.isArray(catalogResult.data.packages)) {
      updates.packages = catalogResult.data.packages;
    }
    if (Array.isArray(catalogResult.data.maintenancePlans)) {
      updates.maintenancePlans = catalogResult.data.maintenancePlans;
    }
    if (Array.isArray(catalogResult.data.addons)) {
      updates.addons = catalogResult.data.addons;
    }
    if (Array.isArray(catalogResult.data.services) && !servicesResult.ok) {
      updates.services = catalogResult.data.services;
      resourceStatus.services = 'ready';
      resourceErrors.services = null;
    }
  }

  if (servicesResult.ok && Array.isArray(servicesResult.data)) {
    updates.services = servicesResult.data;
  }
  if (portfolioResult.ok && Array.isArray(portfolioResult.data)) {
    updates.portfolio = portfolioResult.data;
  }
  if (teamResult.ok && Array.isArray(teamResult.data)) {
    updates.team = teamResult.data;
  }
  if (includeAdmin && ordersResult.ok && Array.isArray(ordersResult.data)) {
    updates.orders = ordersResult.data;
  }
  if (includeAdmin && inquiriesResult.ok && Array.isArray(inquiriesResult.data)) {
    updates.inquiries = inquiriesResult.data;
  }
  if (settingsResult.ok && settingsResult.data && typeof settingsResult.data === 'object') {
    updates.settings = settingsResult.data;
  }

  const activeErrors = Object.values(resourceErrors).filter(Boolean);

  return {
    updates,
    resourceStatus,
    resourceErrors,
    error: activeErrors.length > 0 ? activeErrors[0] : null,
    hasErrors: activeErrors.length > 0,
  };
}
