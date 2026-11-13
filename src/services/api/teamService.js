import { storageAdapter } from '../storage/localStorageAdapter.js';
import { INITIAL_TEAM } from '../../data/seedData.js';

const TEAM_KEY = 'team';

export const teamService = {
  getAll() {
    const list = storageAdapter.getItem(TEAM_KEY, INITIAL_TEAM);
    return [...list].sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));
  },

  saveAll(members) {
    storageAdapter.setItem(TEAM_KEY, members);
    return [...members].sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));
  },

  create(payload) {
    const existing = this.getAll();
    const maxOrder = existing.reduce((acc, m) => Math.max(acc, m.sortOrder || 0), 0);
    const newMember = {
      ...payload,
      id: `team-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sortOrder: payload.sortOrder ?? maxOrder + 1,
    };
    return this.saveAll([...existing, newMember]);
  },

  update(id, updates) {
    const existing = this.getAll();
    const next = existing.map((m) => (m.id === id ? { ...m, ...updates } : m));
    return this.saveAll(next);
  },

  remove(id) {
    const existing = this.getAll();
    const next = existing.filter((m) => m.id !== id);
    return this.saveAll(next);
  },

  reorder(id, direction) {
    const existing = this.getAll();
    const idx = existing.findIndex((m) => m.id === id);
    if (idx < 0) return existing;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= existing.length) return existing;

    const copy = [...existing];
    const [moved] = copy.splice(idx, 1);
    copy.splice(targetIdx, 0, moved);
    const reindexed = copy.map((m, index) => ({ ...m, sortOrder: index + 1 }));
    return this.saveAll(reindexed);
  },
};
