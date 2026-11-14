import {
  STORAGE_KEYS,
  readStorage,
  writeStorageDetailed,
} from '../storage/localStorageAdapter.js';
import { INITIAL_INQUIRIES } from '../../data/seedData.js';
import { API_ENDPOINTS } from '../models/backendModels.js';
import {
  apiRequest,
  createServiceError,
  createServiceResponse,
  getDataAdapterMode,
  getSubmissionMode,
} from './apiClient.js';

export const inquiryService = {
  getAll() {
    return readStorage(STORAGE_KEYS.INQUIRIES, INITIAL_INQUIRIES, 'array');
  },

  getById(id) {
    return this.getAll().find((i) => i.id === id) || null;
  },

  create(payload) {
    const list = this.getAll();
    const now = new Date().toISOString();
    const created = {
      id: `inq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      status: 'New',
      adminNotes: '',
      ...payload,
      createdAt: now,
      updatedAt: now,
    };
    const writeRes = writeStorageDetailed(STORAGE_KEYS.INQUIRIES, [created, ...list], { verify: true });
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
    const writeRes = writeStorageDetailed(STORAGE_KEYS.INQUIRIES, next, { verify: true });
    if (!writeRes.ok) {
      return { __writeError: writeRes };
    }
    return updated;
  },

  remove(id) {
    const list = this.getAll();
    if (!list.some((i) => i.id === id)) {
      return { __notFound: true };
    }
    const next = list.filter((i) => i.id !== id);
    const writeRes = writeStorageDetailed(STORAGE_KEYS.INQUIRIES, next, { verify: true });
    if (!writeRes.ok) {
      return { __writeError: writeRes };
    }
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
    if (getSubmissionMode() === 'production_unconfigured') {
      return createServiceError(
        'Online inquiry submission is currently being configured. Please contact DreamTech Kashmir Solutions through a verified contact channel.',
        null,
        { errorType: 'BackendNotConfiguredError' }
      );
    }
    const created = this.create(payload);
    if (created?.__writeError) {
      return createServiceError(created.__writeError.message, null, {
        errorType: created.__writeError.errorType,
      });
    }
    return createServiceResponse(created, 'Inquiry saved in local browser storage.');
  },

  async updateInquiry(id, patch) {
    if (getDataAdapterMode() === 'api') {
      return apiRequest(`${API_ENDPOINTS.inquiries}/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: patch,
      });
    }
    const updated = this.update(id, patch);
    if (updated?.__notFound) {
      return createServiceError(`Inquiry "${id}" not found.`, null, { errorType: 'NotFoundError' });
    }
    if (updated?.__writeError) {
      return createServiceError(updated.__writeError.message, null, {
        errorType: updated.__writeError.errorType,
      });
    }
    return createServiceResponse(updated, 'Inquiry updated.');
  },

  async deleteInquiry(id) {
    if (getDataAdapterMode() === 'api') {
      return apiRequest(`${API_ENDPOINTS.inquiries}/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    }
    const res = this.remove(id);
    if (res?.__notFound) {
      return createServiceError(`Inquiry "${id}" not found.`, null, { errorType: 'NotFoundError' });
    }
    if (res?.__writeError) {
      return createServiceError(res.__writeError.message, null, {
        errorType: res.__writeError.errorType,
      });
    }
    return createServiceResponse(res, 'Inquiry removed.');
  },
};

