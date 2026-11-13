import { STORAGE_KEYS, readStorage, writeStorage } from '../storage/localStorageAdapter.js';
import { INITIAL_INQUIRIES } from '../../data/seedData.js';
import { API_ENDPOINTS } from '../models/backendModels.js';
import {
  apiRequest,
  createServiceResponse,
  getDataAdapterMode,
} from './apiClient.js';

export const inquiryService = {
  getAll() {
    return readStorage(STORAGE_KEYS.INQUIRIES, INITIAL_INQUIRIES);
  },

  create(payload) {
    const list = this.getAll();
    const now = new Date().toISOString();
    const created = {
      id: `inq-${Date.now()}`,
      status: 'New',
      adminNotes: '',
      ...payload,
      createdAt: now,
      updatedAt: now,
    };
    writeStorage(STORAGE_KEYS.INQUIRIES, [created, ...list]);
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
    writeStorage(STORAGE_KEYS.INQUIRIES, next);
    return updated;
  },

  remove(id) {
    const next = this.getAll().filter((i) => i.id !== id);
    writeStorage(STORAGE_KEYS.INQUIRIES, next);
    return next;
  },

  /**
   * Async Repository Interface (Backend-Ready Envelope: { success, data, message })
   */
  async listInquiries() {
    if (getDataAdapterMode() === 'api') {
      return apiRequest(API_ENDPOINTS.inquiries, { method: 'GET' });
    }
    return createServiceResponse(this.getAll(), 'Inquiries loaded from local storage.');
  },

  async submitInquiry(payload) {
    if (getDataAdapterMode() === 'api') {
      return apiRequest(API_ENDPOINTS.inquiries, { method: 'POST', body: payload });
    }
    const created = this.create(payload);
    return createServiceResponse(created, 'Inquiry saved in local browser storage.');
  },
};
