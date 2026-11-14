import {
  STORAGE_KEYS,
  readStorage,
  writeStorageDetailed,
} from '../storage/localStorageAdapter.js';
import { INITIAL_TEAM } from '../../data/seedData.js';
import { API_ENDPOINTS } from '../models/backendModels.js';
import {
  apiRequest,
  createServiceError,
  createServiceResponse,
  getDataAdapterMode,
} from './apiClient.js';

export const teamService = {
  getAll() {
    const list = readStorage(STORAGE_KEYS.TEAM, INITIAL_TEAM, 'array');
    return [...list].sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  },

  create(payload) {
    const list = this.getAll();
    const maxOrder = list.reduce((max, m) => Math.max(max, m.order || 0), 0);
    const created = {
      id: `team-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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
    const writeRes = writeStorageDetailed(STORAGE_KEYS.TEAM, next, { verify: true });
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
      updated = { ...item, ...patch, updatedAt: new Date().toISOString() };
      return updated;
    });
    if (!updated) {
      return { __notFound: true };
    }
    const writeRes = writeStorageDetailed(STORAGE_KEYS.TEAM, next, { verify: true });
    if (!writeRes.ok) {
      return { __writeError: writeRes };
    }
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
    const writeRes = writeStorageDetailed(STORAGE_KEYS.TEAM, normalized, { verify: true });
    if (!writeRes.ok) {
      return { __writeError: writeRes };
    }
    return normalized;
  },

  remove(id) {
    const list = this.getAll();
    if (!list.some((m) => m.id === id)) {
      return { __notFound: true };
    }
    const next = list.filter((m) => m.id !== id);
    const writeRes = writeStorageDetailed(STORAGE_KEYS.TEAM, next, { verify: true });
    if (!writeRes.ok) {
      return { __writeError: writeRes };
    }
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

  async createTeamMember(payload) {
    if (getDataAdapterMode() === 'api') {
      return apiRequest(API_ENDPOINTS.team, { method: 'POST', body: payload });
    }
    const created = this.create(payload);
    if (created?.__writeError) {
      return createServiceError(created.__writeError.message, null, {
        errorType: created.__writeError.errorType,
      });
    }
    return createServiceResponse(created, `Team member "${created.fullName}" added.`);
  },

  async updateTeamMember(id, patch) {
    if (getDataAdapterMode() === 'api') {
      return apiRequest(`${API_ENDPOINTS.team}/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: patch,
      });
    }
    const updated = this.update(id, patch);
    if (updated?.__notFound) {
      return createServiceError(`Team member "${id}" not found.`, null, {
        errorType: 'NotFoundError',
      });
    }
    if (updated?.__writeError) {
      return createServiceError(updated.__writeError.message, null, {
        errorType: updated.__writeError.errorType,
      });
    }
    return createServiceResponse(updated, 'Team member updated.');
  },

  async reorderTeamMember(id, direction) {
    if (getDataAdapterMode() === 'api') {
      return apiRequest(`${API_ENDPOINTS.team}/${encodeURIComponent(id)}/reorder`, {
        method: 'POST',
        body: { direction },
      });
    }
    const res = this.reorder(id, direction);
    if (res?.__writeError) {
      return createServiceError(res.__writeError.message, null, {
        errorType: res.__writeError.errorType,
      });
    }
    return createServiceResponse(res, 'Team display order updated.');
  },

  async deleteTeamMember(id) {
    if (getDataAdapterMode() === 'api') {
      return apiRequest(`${API_ENDPOINTS.team}/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    }
    const res = this.remove(id);
    if (res?.__notFound) {
      return createServiceError(`Team member "${id}" not found.`, null, {
        errorType: 'NotFoundError',
      });
    }
    if (res?.__writeError) {
      return createServiceError(res.__writeError.message, null, {
        errorType: res.__writeError.errorType,
      });
    }
    return createServiceResponse(res, 'Team member removed.');
  },
};

