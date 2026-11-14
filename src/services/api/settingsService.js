import {
  STORAGE_KEYS,
  readStorage,
  writeStorageDetailed,
} from '../storage/localStorageAdapter.js';
import { INITIAL_SETTINGS } from '../../data/seedData.js';
import { API_ENDPOINTS } from '../models/backendModels.js';
import {
  apiRequest,
  createServiceError,
  createServiceResponse,
  getDataAdapterMode,
} from './apiClient.js';

export const settingsService = {
  get() {
    return readStorage(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS, 'object');
  },

  update(patch) {
    const current = this.get();
    const next = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    const writeRes = writeStorageDetailed(STORAGE_KEYS.SETTINGS, next, { verify: true });
    if (!writeRes.ok) {
      return { __writeError: writeRes };
    }
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
    if (updated?.__writeError) {
      return createServiceError(updated.__writeError.message, null, {
        errorType: updated.__writeError.errorType,
      });
    }
    return createServiceResponse(updated, 'Settings saved in local browser storage.');
  },
};

