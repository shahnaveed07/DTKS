import { STORAGE_KEYS, readStorage, writeStorage } from '../storage/localStorageAdapter.js';
import { INITIAL_SETTINGS } from '../../data/seedData.js';
import { API_ENDPOINTS } from '../models/backendModels.js';
import {
  apiRequest,
  createServiceResponse,
  getDataAdapterMode,
} from './apiClient.js';

export const settingsService = {
  get() {
    return readStorage(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
  },

  update(patch) {
    const current = this.get();
    const next = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    writeStorage(STORAGE_KEYS.SETTINGS, next);
    return next;
  },

  /**
   * Async Repository Interface (Backend-Ready Envelope: { success, data, message })
   */
  async getSettings() {
    if (getDataAdapterMode() === 'api') {
      return apiRequest(API_ENDPOINTS.settings, { method: 'GET' });
    }
    return createServiceResponse(this.get(), 'Settings loaded from local storage.');
  },

  async saveSettings(patch) {
    if (getDataAdapterMode() === 'api') {
      return apiRequest(API_ENDPOINTS.settings, { method: 'PUT', body: patch });
    }
    const updated = this.update(patch);
    return createServiceResponse(updated, 'Settings saved in local browser storage.');
  },
};
