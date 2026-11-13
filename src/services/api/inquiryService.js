import { storageAdapter } from '../storage/localStorageAdapter.js';
import { INITIAL_INQUIRIES } from '../../data/seedData.js';

const INQUIRIES_KEY = 'inquiries';

export const inquiryService = {
  getAll() {
    return storageAdapter.getItem(INQUIRIES_KEY, INITIAL_INQUIRIES);
  },

  saveAll(items) {
    storageAdapter.setItem(INQUIRIES_KEY, items);
    return items;
  },

  create(payload) {
    const existing = this.getAll();
    const newItem = {
      ...payload,
      id: `inq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      status: 'New',
      adminNotes: '',
      createdAt: new Date().toISOString(),
    };
    const next = [newItem, ...existing];
    this.saveAll(next);
    return { inquiry: newItem, inquiries: next };
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
