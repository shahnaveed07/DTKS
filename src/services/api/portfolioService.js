import {
  STORAGE_KEYS,
  readStorage,
  writeStorageDetailed,
} from '../storage/localStorageAdapter.js';
import { INITIAL_PORTFOLIO } from '../../data/seedData.js';
import { slugify } from '../../utils/orderUtils.js';
import { API_ENDPOINTS } from '../models/backendModels.js';
import {
  apiRequest,
  createServiceError,
  createServiceResponse,
  getDataAdapterMode,
} from './apiClient.js';

export const portfolioService = {
  getAll() {
    return readStorage(STORAGE_KEYS.PORTFOLIO, INITIAL_PORTFOLIO, 'array');
  },

  getBySlug(slug) {
    return this.getAll().find((p) => p.slug === slug) || null;
  },

  create(payload) {
    const list = this.getAll();
    const baseSlug = slugify(payload.slug || payload.title || `project-${Date.now()}`);
    const exists = list.some((p) => p.slug === baseSlug);
    const slug = exists ? `${baseSlug}-${Date.now().toString().slice(-4)}` : baseSlug;

    const created = {
      id: `proj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      slug,
      published: false,
      visibility: 'private',
      featured: false,
      isSample: false,
      keyFeatures: [],
      technologies: [],
      gallery: [],
      ...payload,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const next = [created, ...list];
    const writeRes = writeStorageDetailed(STORAGE_KEYS.PORTFOLIO, next, { verify: true });
    if (!writeRes.ok) {
      return { __writeError: writeRes };
    }
    return created;
  },

  update(id, patch) {
    const list = this.getAll();
    let updated = null;
    const next = list.map((item) => {
      if (item.id !== id) return item;
      updated = {
        ...item,
        ...patch,
        slug: patch.slug ? slugify(patch.slug) : item.slug,
        updatedAt: new Date().toISOString(),
      };
      return updated;
    });
    if (!updated) {
      return { __notFound: true };
    }
    const writeRes = writeStorageDetailed(STORAGE_KEYS.PORTFOLIO, next, { verify: true });
    if (!writeRes.ok) {
      return { __writeError: writeRes };
    }
    return updated;
  },

  remove(id) {
    const list = this.getAll();
    if (!list.some((p) => p.id === id)) {
      return { __notFound: true };
    }
    const next = list.filter((p) => p.id !== id);
    const writeRes = writeStorageDetailed(STORAGE_KEYS.PORTFOLIO, next, { verify: true });
    if (!writeRes.ok) {
      return { __writeError: writeRes };
    }
    return next;
  },

  /**
   * Async Repository Interface (Backend-Ready Envelope: { success, data, message })
   */
  async listPortfolio({ includeDrafts = false } = {}) {
    if (getDataAdapterMode() === 'api') {
      const endpoint = includeDrafts
        ? `${API_ENDPOINTS.portfolio}?includeDrafts=true`
        : API_ENDPOINTS.portfolio;
      const res = await apiRequest(endpoint, { method: 'GET' });
      if (!res.success) return res;
      const list = Array.isArray(res.data?.portfolio)
        ? res.data.portfolio
        : Array.isArray(res.data)
        ? res.data
        : [];
      return createServiceResponse(list, res.message || 'Portfolio loaded.');
    }
    return createServiceResponse(this.getAll(), 'Portfolio items loaded from local storage.');
  },

  async getProjectBySlug(slug) {
    if (getDataAdapterMode() === 'api') {
      const res = await apiRequest(`${API_ENDPOINTS.portfolio}/${encodeURIComponent(slug)}`, {
        method: 'GET',
      });
      if (!res.success) return res;
      return createServiceResponse(
        res.data?.project || res.data?.item || res.data,
        res.message || 'Project retrieved.'
      );
    }
    const found = this.getBySlug(slug);
    if (!found) {
      return createServiceError(`Project "${slug}" not found.`, null, { errorType: 'NotFoundError' });
    }
    return createServiceResponse(found, 'Project retrieved.');
  },

  async createProject(payload) {
    if (getDataAdapterMode() === 'api') {
      const res = await apiRequest(API_ENDPOINTS.portfolio, { method: 'POST', body: payload });
      if (!res.success) return res;
      return createServiceResponse(
        res.data?.project || res.data?.item || res.data,
        res.message || 'Portfolio project added.'
      );
    }
    const created = this.create(payload);
    if (created?.__writeError) {
      return createServiceError(created.__writeError.message, null, {
        errorType: created.__writeError.errorType,
      });
    }
    return createServiceResponse(created, `Project "${created.title}" added.`);
  },

  async updateProject(id, patch) {
    if (getDataAdapterMode() === 'api') {
      const res = await apiRequest(`${API_ENDPOINTS.portfolio}/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: patch,
      });
      if (!res.success) return res;
      return createServiceResponse(
        res.data?.project || res.data?.item || res.data,
        res.message || 'Portfolio project updated.'
      );
    }
    const updated = this.update(id, patch);
    if (updated?.__notFound) {
      return createServiceError(`Project "${id}" not found.`, null, { errorType: 'NotFoundError' });
    }
    if (updated?.__writeError) {
      return createServiceError(updated.__writeError.message, null, {
        errorType: updated.__writeError.errorType,
      });
    }
    return createServiceResponse(updated, 'Portfolio project updated.');
  },

  async deleteProject(id) {
    if (getDataAdapterMode() === 'api') {
      return apiRequest(`${API_ENDPOINTS.portfolio}/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    }
    const res = this.remove(id);
    if (res?.__notFound) {
      return createServiceError(`Project "${id}" not found.`, null, { errorType: 'NotFoundError' });
    }
    if (res?.__writeError) {
      return createServiceError(res.__writeError.message, null, {
        errorType: res.__writeError.errorType,
      });
    }
    return createServiceResponse(res, 'Portfolio project removed.');
  },
};

