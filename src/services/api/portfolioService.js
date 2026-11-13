import { storageAdapter } from '../storage/localStorageAdapter.js';
import { INITIAL_PORTFOLIO } from '../../data/seedData.js';
import { slugify } from '../../utils/orderUtils.js';

const PORTFOLIO_KEY = 'portfolio';

export const portfolioService = {
  getAll() {
    return storageAdapter.getItem(PORTFOLIO_KEY, INITIAL_PORTFOLIO);
  },

  saveAll(items) {
    storageAdapter.setItem(PORTFOLIO_KEY, items);
    return items;
  },

  create(payload) {
    const existing = this.getAll();
    const baseSlug = slugify(payload.slug || payload.title || 'project');
    let uniqueSlug = baseSlug || `project-${Date.now()}`;
    if (existing.some((p) => p.slug === uniqueSlug)) {
      uniqueSlug = `${uniqueSlug}-${Math.random().toString(36).slice(2, 5)}`;
    }

    const newProject = {
      ...payload,
      id: `proj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      slug: uniqueSlug,
    };
    const next = [newProject, ...existing];
    return this.saveAll(next);
  },

  update(id, updates) {
    const existing = this.getAll();
    const next = existing.map((item) => (item.id === id ? { ...item, ...updates } : item));
    return this.saveAll(next);
  },

  remove(id) {
    const existing = this.getAll();
    const next = existing.filter((item) => item.id !== id);
    return this.saveAll(next);
  },
};
