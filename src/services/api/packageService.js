import { STORAGE_KEYS, readStorage, writeStorage } from '../storage/localStorageAdapter.js';
import {
  INITIAL_SERVICES,
  INITIAL_PACKAGES,
  INITIAL_MAINTENANCE_PLANS,
  INITIAL_ADDONS,
} from '../../data/seedData.js';
import { slugify } from '../../utils/orderUtils.js';
import { API_ENDPOINTS } from '../models/backendModels.js';
import {
  apiRequest,
  createServiceResponse,
  getDataAdapterMode,
} from './apiClient.js';

export const packageService = {
  getServices() {
    return readStorage(STORAGE_KEYS.SERVICES, INITIAL_SERVICES);
  },

  saveServices(services) {
    writeStorage(STORAGE_KEYS.SERVICES, services);
    return services;
  },

  getPackages() {
    return readStorage(STORAGE_KEYS.PACKAGES, INITIAL_PACKAGES);
  },

  createPackage(payload) {
    const list = this.getPackages();
    const hasNumericPrice =
      payload.startingPrice !== null &&
      payload.startingPrice !== undefined &&
      payload.startingPrice !== '';
    const created = {
      id: `pkg-${Date.now()}`,
      slug: slugify(payload.title || `package-${Date.now()}`),
      currency: 'INR',
      active: true,
      featured: false,
      extraServices: '',
      ...payload,
      startingPrice: hasNumericPrice ? Number(payload.startingPrice) : null,
      priceConfirmed: hasNumericPrice,
    };
    const next = [...list, created];
    writeStorage(STORAGE_KEYS.PACKAGES, next);
    return created;
  },

  updatePackage(id, patch) {
    const list = this.getPackages();
    let updated = null;
    const next = list.map((item) => {
      if (item.id !== id) return item;
      const merged = { ...item, ...patch };
      if ('startingPrice' in patch) {
        const hasNumericPrice =
          patch.startingPrice !== null &&
          patch.startingPrice !== undefined &&
          patch.startingPrice !== '';
        merged.startingPrice = hasNumericPrice ? Number(patch.startingPrice) : null;
        merged.priceConfirmed = hasNumericPrice;
      }
      updated = merged;
      return updated;
    });
    writeStorage(STORAGE_KEYS.PACKAGES, next);
    return updated;
  },

  deletePackage(id) {
    const next = this.getPackages().filter((p) => p.id !== id);
    writeStorage(STORAGE_KEYS.PACKAGES, next);
    return next;
  },

  getMaintenancePlans() {
    return readStorage(STORAGE_KEYS.MAINTENANCE, INITIAL_MAINTENANCE_PLANS);
  },

  saveMaintenancePlans(plans) {
    writeStorage(STORAGE_KEYS.MAINTENANCE, plans);
    return plans;
  },

  getAddons() {
    return readStorage(STORAGE_KEYS.ADDONS, INITIAL_ADDONS);
  },

  saveAddons(addons) {
    writeStorage(STORAGE_KEYS.ADDONS, addons);
    return addons;
  },

  /**
   * Async Repository Interface (Backend-Ready Envelope: { success, data, message })
   */
  async fetchCatalog() {
    if (getDataAdapterMode() === 'api') {
      return apiRequest(API_ENDPOINTS.packages, { method: 'GET' });
    }
    return createServiceResponse(
      {
        services: this.getServices(),
        packages: this.getPackages(),
        maintenancePlans: this.getMaintenancePlans(),
        addons: this.getAddons(),
      },
      'Packages and service catalog loaded.'
    );
  },
};
