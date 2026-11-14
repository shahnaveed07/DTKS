import {
  STORAGE_KEYS,
  readStorage,
  writeStorageDetailed,
} from '../storage/localStorageAdapter.js';
import { INITIAL_ORDERS } from '../../data/seedData.js';
import { generateOrderReference, findTrackedOrder } from '../../utils/orderUtils.js';
import { API_ENDPOINTS } from '../models/backendModels.js';
import {
  apiRequest,
  createServiceError,
  createServiceResponse,
  getDataAdapterMode,
  getSubmissionMode,
} from './apiClient.js';

export const orderService = {
  getAll() {
    return readStorage(STORAGE_KEYS.ORDERS, INITIAL_ORDERS, 'array');
  },

  getById(id) {
    return this.getAll().find((o) => o.id === id) || null;
  },

  track(referenceId, email) {
    return findTrackedOrder(this.getAll(), referenceId, email);
  },

  create(payload) {
    const orders = this.getAll();
    const referenceId = generateOrderReference(orders);
    const now = new Date().toISOString();

    const newOrder = {
      id: `ord-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      referenceId,
      status: 'New Request',
      quotationAmount: null,
      quotationNotes: '',
      adminNotes: '',
      ...payload,
      createdAt: now,
      updatedAt: now,
    };

    const next = [newOrder, ...orders];
    const writeRes = writeStorageDetailed(STORAGE_KEYS.ORDERS, next, { verify: true });
    if (!writeRes.ok) {
      return { __writeError: writeRes };
    }
    return newOrder;
  },

  update(id, patch) {
    const orders = this.getAll();
    let updatedItem = null;
    const next = orders.map((order) => {
      if (order.id !== id) return order;
      updatedItem = {
        ...order,
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      return updatedItem;
    });
    if (!updatedItem) {
      return { __notFound: true };
    }
    const writeRes = writeStorageDetailed(STORAGE_KEYS.ORDERS, next, { verify: true });
    if (!writeRes.ok) {
      return { __writeError: writeRes };
    }
    return updatedItem;
  },

  remove(id) {
    const orders = this.getAll();
    const exists = orders.some((o) => o.id === id);
    if (!exists) {
      return { __notFound: true };
    }
    const next = orders.filter((o) => o.id !== id);
    const writeRes = writeStorageDetailed(STORAGE_KEYS.ORDERS, next, { verify: true });
    if (!writeRes.ok) {
      return { __writeError: writeRes };
    }
    return next;
  },

  /**
   * Async Repository Interface (Backend-Ready Envelope: { success, data, message })
   * Never silently falls back to LocalStorage when VITE_DATA_ADAPTER='api'.
   */
  async listOrders() {
    if (getDataAdapterMode() === 'api') {
      return apiRequest(API_ENDPOINTS.orders, { method: 'GET' });
    }
    return createServiceResponse(this.getAll(), 'Orders loaded from local storage.');
  },

  async getOrderById(id) {
    if (getDataAdapterMode() === 'api') {
      return apiRequest(`${API_ENDPOINTS.orders}/${encodeURIComponent(id)}`, { method: 'GET' });
    }
    const found = this.getById(id);
    if (!found) {
      return createServiceError(`Order "${id}" not found.`, null, { errorType: 'NotFoundError' });
    }
    return createServiceResponse(found, 'Order loaded.');
  },

  async submitOrder(payload) {
    if (getDataAdapterMode() === 'api') {
      return apiRequest(API_ENDPOINTS.orders, { method: 'POST', body: payload });
    }
    if (getSubmissionMode() === 'production_unconfigured') {
      return createServiceError(
        'Online website order submission is currently being configured. Please contact DreamTech Kashmir Solutions through a verified contact channel.',
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
    return createServiceResponse(
      created,
      `Order ${created.referenceId} saved in local browser storage.`
    );
  },

  async updateOrder(id, patch) {
    if (getDataAdapterMode() === 'api') {
      return apiRequest(`${API_ENDPOINTS.orders}/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: patch,
      });
    }
    const updated = this.update(id, patch);
    if (updated?.__notFound) {
      return createServiceError(`Order "${id}" not found.`, null, { errorType: 'NotFoundError' });
    }
    if (updated?.__writeError) {
      return createServiceError(updated.__writeError.message, null, {
        errorType: updated.__writeError.errorType,
      });
    }
    return createServiceResponse(updated, 'Order record updated.');
  },

  async deleteOrder(id) {
    if (getDataAdapterMode() === 'api') {
      return apiRequest(`${API_ENDPOINTS.orders}/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    }
    const res = this.remove(id);
    if (res?.__notFound) {
      return createServiceError(`Order "${id}" not found.`, null, { errorType: 'NotFoundError' });
    }
    if (res?.__writeError) {
      return createServiceError(res.__writeError.message, null, {
        errorType: res.__writeError.errorType,
      });
    }
    return createServiceResponse(res, 'Order deleted.');
  },

  async trackOrder(referenceId, email) {
    if (getDataAdapterMode() === 'api') {
      const refParam = encodeURIComponent(String(referenceId || '').trim());
      const emailParam = encodeURIComponent(String(email || '').trim());
      const res = await apiRequest(
        `${API_ENDPOINTS.orderTrack}?ref=${refParam}&email=${emailParam}`,
        { method: 'GET' }
      );
      if (!res.success) return res;
      return createServiceResponse(res.data?.order || res.data, res.message);
    }
    const found = this.track(referenceId, email);
    if (!found) {
      return createServiceError(
        'No matching website order found for this Reference ID and Email.',
        null,
        { errorType: 'NotFoundError' }
      );
    }
    return createServiceResponse(found, 'Order record retrieved.');
  },
};

