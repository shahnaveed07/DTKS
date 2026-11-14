import {
  STORAGE_KEYS,
  readStorage,
  writeStorageDetailed,
} from '../storage/localStorageAdapter.js';
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
  createServiceError,
  createServiceResponse,
  getDataAdapterMode,
} from './apiClient.js';

export const packageService = {
  getServices() {
    return readStorage(STORAGE_KEYS.SERVICES, INITIAL_SERVICES, 'array');
  },

  saveServices(services) {
    const writeRes = writeStorageDetailed(STORAGE_KEYS.SERVICES, services, { verify: true });
    if (!writeRes.ok) {
      return { __writeError: writeRes };
    }
    return services;
  },

  getPackages() {
    return readStorage(STORAGE_KEYS.PACKAGES, INITIAL_PACKAGES, 'array');
  },

  createPackage(payload) {
    const list = this.getPackages();
    const hasNumericPrice =
      payload.startingPrice !== null &&
      payload.startingPrice !== undefined &&
      payload.startingPrice !== '' &&
      !Number.isNaN(Number(payload.startingPrice));
    const created = {
      id: `pkg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      slug: slugify(payload.title || `package-${Date.now()}`),
      currency: 'INR',
      active: true,
      featured: false,
      extraServices: '',
      ...payload,
      startingPrice: hasNumericPrice ? Number(payload.startingPrice) : null,
      priceConfirmed:
        typeof payload.priceConfirmed === 'boolean'
          ? payload.priceConfirmed
          : hasNumericPrice,
    };
    const next = [...list, created];
    const writeRes = writeStorageDetailed(STORAGE_KEYS.PACKAGES, next, { verify: true });
    if (!writeRes.ok) {
      return { __writeError: writeRes };
    }
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
          patch.startingPrice !== '' &&
          !Number.isNaN(Number(patch.startingPrice));
        merged.startingPrice = hasNumericPrice ? Number(patch.startingPrice) : null;
        merged.priceConfirmed =
          typeof patch.priceConfirmed === 'boolean'
            ? patch.priceConfirmed
            : hasNumericPrice;
      }
      updated = merged;
      return updated;
    });
    if (!updated) {
      return { __notFound: true };
    }
    const writeRes = writeStorageDetailed(STORAGE_KEYS.PACKAGES, next, { verify: true });
    if (!writeRes.ok) {
      return { __writeError: writeRes };
    }
    return updated;
  },

  deletePackage(id) {
    const list = this.getPackages();
    if (!list.some((p) => p.id === id)) {
      return { __notFound: true };
    }
    const next = list.filter((p) => p.id !== id);
    const writeRes = writeStorageDetailed(STORAGE_KEYS.PACKAGES, next, { verify: true });
    if (!writeRes.ok) {
      return { __writeError: writeRes };
    }
    return next;
  },

  getMaintenancePlans() {
    return readStorage(STORAGE_KEYS.MAINTENANCE, INITIAL_MAINTENANCE_PLANS, 'array');
  },

  saveMaintenancePlans(plans) {
    const writeRes = writeStorageDetailed(STORAGE_KEYS.MAINTENANCE, plans, { verify: true });
    if (!writeRes.ok) {
      return { __writeError: writeRes };
    }
    return plans;
  },

  getAddons() {
    return readStorage(STORAGE_KEYS.ADDONS, INITIAL_ADDONS, 'array');
  },

  saveAddons(addons) {
    const writeRes = writeStorageDetailed(STORAGE_KEYS.ADDONS, addons, { verify: true });
    if (!writeRes.ok) {
      return { __writeError: writeRes };
    }
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

  async listPackages() {
    if (getDataAdapterMode() === 'api') {
      return apiRequest(API_ENDPOINTS.packages, { method: 'GET' });
    }
    return createServiceResponse(this.getPackages(), 'Packages loaded from local storage.');
  },

  async createPackageAsync(payload) {
    if (getDataAdapterMode() === 'api') {
      return apiRequest(API_ENDPOINTS.packages, { method: 'POST', body: payload });
    }
    const created = this.createPackage(payload);
    if (created?.__writeError) {
      return createServiceError(created.__writeError.message, null, {
        errorType: created.__writeError.errorType,
      });
    }
    return createServiceResponse(created, `Package "${created.title}" created.`);
  },

  async updatePackageAsync(id, patch) {
    if (getDataAdapterMode() === 'api') {
      return apiRequest(`${API_ENDPOINTS.packages}/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: patch,
      });
    }
    const updated = this.updatePackage(id, patch);
    if (updated?.__notFound) {
      return createServiceError(`Package "${id}" not found.`, null, { errorType: 'NotFoundError' });
    }
    if (updated?.__writeError) {
      return createServiceError(updated.__writeError.message, null, {
        errorType: updated.__writeError.errorType,
      });
    }
    return createServiceResponse(updated, 'Package updated.');
  },

  async deletePackageAsync(id) {
    if (getDataAdapterMode() === 'api') {
      return apiRequest(`${API_ENDPOINTS.packages}/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    }
    const res = this.deletePackage(id);
    if (res?.__notFound) {
      return createServiceError(`Package "${id}" not found.`, null, { errorType: 'NotFoundError' });
    }
    if (res?.__writeError) {
      return createServiceError(res.__writeError.message, null, {
        errorType: res.__writeError.errorType,
      });
    }
    return createServiceResponse(res, 'Package deleted.');
  },

  async listServices() {
    if (getDataAdapterMode() === 'api') {
      return apiRequest(API_ENDPOINTS.services, { method: 'GET' });
    }
    return createServiceResponse(this.getServices(), 'Services loaded from local storage.');
  },

  async saveServicesAsync(services) {
    if (getDataAdapterMode() === 'api') {
      return apiRequest(API_ENDPOINTS.services, { method: 'PUT', body: services });
    }
    const res = this.saveServices(services);
    if (res?.__writeError) {
      return createServiceError(res.__writeError.message, null, {
        errorType: res.__writeError.errorType,
      });
    }
    return createServiceResponse(res, 'Services catalog updated.');
  },

  async listMaintenancePlans() {
    if (getDataAdapterMode() === 'api') {
      return apiRequest(API_ENDPOINTS.maintenancePlans, { method: 'GET' });
    }
    return createServiceResponse(this.getMaintenancePlans(), 'Maintenance plans loaded.');
  },

  async saveMaintenancePlansAsync(plans) {
    if (getDataAdapterMode() === 'api') {
      return apiRequest(API_ENDPOINTS.maintenancePlans, { method: 'PUT', body: plans });
    }
    const res = this.saveMaintenancePlans(plans);
    if (res?.__writeError) {
      return createServiceError(res.__writeError.message, null, {
        errorType: res.__writeError.errorType,
      });
    }
    return createServiceResponse(res, 'Maintenance plans updated.');
  },

  async listAddons() {
    if (getDataAdapterMode() === 'api') {
      return apiRequest(API_ENDPOINTS.addons, { method: 'GET' });
    }
    return createServiceResponse(this.getAddons(), 'Add-ons loaded.');
  },

  async saveAddonsAsync(addons) {
    if (getDataAdapterMode() === 'api') {
      return apiRequest(API_ENDPOINTS.addons, { method: 'PUT', body: addons });
    }
    const res = this.saveAddons(addons);
    if (res?.__writeError) {
      return createServiceError(res.__writeError.message, null, {
        errorType: res.__writeError.errorType,
      });
    }
    return createServiceResponse(res, 'Optional add-ons updated.');
  },
};

