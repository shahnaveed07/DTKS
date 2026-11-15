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
  async fetchCatalog({ includeInactive = false } = {}) {
    if (getDataAdapterMode() === 'api') {
      const endpoint = includeInactive
        ? `${API_ENDPOINTS.packages}?includeInactive=true`
        : API_ENDPOINTS.packages;
      const res = await apiRequest(endpoint, { method: 'GET' });
      if (!res.success) return res;
      const data = res.data || {};
      return createServiceResponse(
        {
          ...(Array.isArray(data.services) ? { services: data.services } : {}),
          packages: Array.isArray(data.packages)
            ? data.packages
            : Array.isArray(data)
            ? data
            : [],
          maintenancePlans: Array.isArray(data.maintenancePlans) ? data.maintenancePlans : [],
          addons: Array.isArray(data.addons) ? data.addons : [],
        },
        res.message || 'Packages catalog loaded.'
      );
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

  async listPackages({ includeInactive = false } = {}) {
    if (getDataAdapterMode() === 'api') {
      const endpoint = includeInactive
        ? `${API_ENDPOINTS.packages}?includeInactive=true`
        : API_ENDPOINTS.packages;
      const res = await apiRequest(endpoint, { method: 'GET' });
      if (!res.success) return res;
      const list = Array.isArray(res.data?.packages)
        ? res.data.packages
        : Array.isArray(res.data)
        ? res.data
        : [];
      return createServiceResponse(list, res.message || 'Packages loaded.');
    }
    return createServiceResponse(this.getPackages(), 'Packages loaded from local storage.');
  },

  async createPackageAsync(payload) {
    if (getDataAdapterMode() === 'api') {
      const res = await apiRequest(API_ENDPOINTS.packages, { method: 'POST', body: payload });
      if (!res.success) return res;
      return createServiceResponse(
        res.data?.package || res.data,
        res.message || 'Package created.'
      );
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
      const res = await apiRequest(`${API_ENDPOINTS.packages}/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: patch,
      });
      if (!res.success) return res;
      return createServiceResponse(
        res.data?.package || res.data,
        res.message || 'Package updated.'
      );
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

  async listServices({ includeInactive = false } = {}) {
    if (getDataAdapterMode() === 'api') {
      const endpoint = includeInactive
        ? `${API_ENDPOINTS.services}?includeInactive=true`
        : API_ENDPOINTS.services;
      const res = await apiRequest(endpoint, { method: 'GET' });
      if (!res.success) return res;
      const list = Array.isArray(res.data?.services)
        ? res.data.services
        : Array.isArray(res.data)
        ? res.data
        : [];
      return createServiceResponse(list, res.message || 'Services loaded.');
    }
    return createServiceResponse(this.getServices(), 'Services loaded from local storage.');
  },

  async saveServicesAsync(services) {
    if (getDataAdapterMode() === 'api') {
      return createServiceError(
        'Bulk PUT /api/v1/services is not supported by DTKS_BE; update individual services via PATCH /api/v1/services/:id.',
        null,
        { errorType: 'UnsupportedOperationError', statusCode: 405 }
      );
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
      const res = await apiRequest(API_ENDPOINTS.maintenancePlans, { method: 'GET' });
      if (!res.success) return res;
      const list = Array.isArray(res.data?.maintenancePlans)
        ? res.data.maintenancePlans
        : Array.isArray(res.data)
        ? res.data
        : [];
      return createServiceResponse(list, res.message || 'Maintenance plans loaded.');
    }
    return createServiceResponse(this.getMaintenancePlans(), 'Maintenance plans loaded.');
  },

  async saveMaintenancePlansAsync(plans) {
    if (getDataAdapterMode() === 'api') {
      const res = await apiRequest(API_ENDPOINTS.maintenancePlans, { method: 'PUT', body: plans });
      if (!res.success) return res;
      const list = Array.isArray(res.data?.maintenancePlans)
        ? res.data.maintenancePlans
        : Array.isArray(res.data)
        ? res.data
        : plans;
      return createServiceResponse(list, res.message || 'Maintenance plans updated.');
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
      const res = await apiRequest(API_ENDPOINTS.addons, { method: 'GET' });
      if (!res.success) return res;
      const list = Array.isArray(res.data?.addons)
        ? res.data.addons
        : Array.isArray(res.data)
        ? res.data
        : [];
      return createServiceResponse(list, res.message || 'Add-ons loaded.');
    }
    return createServiceResponse(this.getAddons(), 'Add-ons loaded.');
  },

  async saveAddonsAsync(addons) {
    if (getDataAdapterMode() === 'api') {
      const res = await apiRequest(API_ENDPOINTS.addons, { method: 'PUT', body: addons });
      if (!res.success) return res;
      const list = Array.isArray(res.data?.addons)
        ? res.data.addons
        : Array.isArray(res.data)
        ? res.data
        : addons;
      return createServiceResponse(list, res.message || 'Optional add-ons updated.');
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

