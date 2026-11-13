import { STORAGE_KEYS, readStorage, writeStorage } from '../storage/localStorageAdapter.js';
import { INITIAL_PORTFOLIO } from '../../data/seedData.js';
import { slugify } from '../../utils/orderUtils.js';
import { API_ENDPOINTS } from '../models/backendModels.js';
import {
  apiRequest,
  createServiceResponse,
  getDataAdapterMode,
} from './apiClient.js';

export const portfolioService = {
  getAll() {
    return readStorage(STORAGE_KEYS.PORTFOLIO, INITIAL_PORTFOLIO);
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
      id: `proj-${Date.now()}`,
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
    writeStorage(STORAGE_KEYS.PORTFOLIO, next);
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
    writeStorage(STORAGE_KEYS.PORTFOLIO, next);
    return updated;
  },

  remove(id) {
    const next = this.getAll().filter((p) => p.id !== id);
    writeStorage(STORAGE_KEYS.PORTFOLIO, next);
    return next;
  },

  /**
   * Async Repository Interface (Backend-Ready Envelope: { success, data, message })
   */
  async listPortfolio() {
    if (getDataAdapterMode() === 'api') {
      return apiRequest(API_ENDPOINTS.portfolio, { method: 'GET' });
    }
    return createServiceResponse(this.getAll(), 'Portfolio items loaded from local storage.');
  },
};
