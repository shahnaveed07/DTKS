import { STORAGE_KEYS, readStorage, writeStorage } from '../storage/localStorageAdapter.js';
import { INITIAL_TEAM } from '../../data/seedData.js';
import { API_ENDPOINTS } from '../models/backendModels.js';
import {
  apiRequest,
  createServiceResponse,
  getDataAdapterMode,
} from './apiClient.js';

export const teamService = {
  getAll() {
    const list = readStorage(STORAGE_KEYS.TEAM, INITIAL_TEAM);
    return [...list].sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  },

  create(payload) {
    const list = this.getAll();
    const maxOrder = list.reduce((max, m) => Math.max(max, m.order || 0), 0);
    const created = {
      id: `team-${Date.now()}`,
      order: maxOrder + 1,
      visible: true,
      isPlaceholder: false,
      skills: [],
      technologies: [],
      ...payload,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const next = [...list, created];
    writeStorage(STORAGE_KEYS.TEAM, next);
    return created;
  },

  update(id, patch) {
    const list = this.getAll();
    let updated = null;
    const next = list.map((item) => {
      if (item.id !== id) return item;
      updated = { ...item, ...patch, updatedAt: new Date().toISOString() };
      return updated;
    });
    writeStorage(STORAGE_KEYS.TEAM, next);
    return updated;
  },

  reorder(id, direction) {
    const list = this.getAll();
    const index = list.findIndex((m) => m.id === id);
    if (index === -1) return list;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return list;

    const swapped = [...list];
    const temp = swapped[index];
    swapped[index] = swapped[targetIndex];
    swapped[targetIndex] = temp;

    const normalized = swapped.map((member, idx) => ({
      ...member,
      order: idx + 1,
    }));
    writeStorage(STORAGE_KEYS.TEAM, normalized);
    return normalized;
  },

  remove(id) {
    const next = this.getAll().filter((m) => m.id !== id);
    writeStorage(STORAGE_KEYS.TEAM, next);
    return next;
  },

  /**
   * Async Repository Interface (Backend-Ready Envelope: { success, data, message })
   */
  async listTeam() {
    if (getDataAdapterMode() === 'api') {
      return apiRequest(API_ENDPOINTS.team, { method: 'GET' });
    }
    return createServiceResponse(this.getAll(), 'Team members loaded from local storage.');
  },
};
