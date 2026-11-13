import { STORAGE_KEYS, readStorage, writeStorage } from '../storage/localStorageAdapter.js';
import { INITIAL_ORDERS } from '../../data/seedData.js';
import { generateOrderReference, findTrackedOrder } from '../../utils/orderUtils.js';
import { API_ENDPOINTS } from '../models/backendModels.js';
import {
  apiRequest,
  createServiceError,
  createServiceResponse,
  getDataAdapterMode,
} from './apiClient.js';

export const orderService = {
  getAll() {
    return readStorage(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
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
      id: `ord-${Date.now()}`,
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
    writeStorage(STORAGE_KEYS.ORDERS, next);
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
    writeStorage(STORAGE_KEYS.ORDERS, next);
    return updatedItem;
  },

  remove(id) {
    const orders = this.getAll();
    const next = orders.filter((o) => o.id !== id);
    writeStorage(STORAGE_KEYS.ORDERS, next);
    return next;
  },

  /**
   * Async Repository Interface (Backend-Ready Envelope: { success, data, message })
   */
  async listOrders() {
    if (getDataAdapterMode() === 'api') {
      return apiRequest(API_ENDPOINTS.orders, { method: 'GET' });
    }
    return createServiceResponse(this.getAll(), 'Orders loaded from local storage.');
  },

  async submitOrder(payload) {
    if (getDataAdapterMode() === 'api') {
      return apiRequest(API_ENDPOINTS.orders, { method: 'POST', body: payload });
    }
    const created = this.create(payload);
    return createServiceResponse(
      created,
      `Order ${created.referenceId} saved in local browser storage.`
    );
  },

  async trackOrder(referenceId, email) {
    if (getDataAdapterMode() === 'api') {
      return apiRequest(API_ENDPOINTS.orderTrack, {
        method: 'POST',
        body: { referenceId, email },
      });
    }
    const found = this.track(referenceId, email);
    if (!found) {
      return createServiceError(
        'No matching website order found for this Reference ID and Email.',
        null
      );
    }
    return createServiceResponse(found, 'Order record retrieved.');
  },
};
