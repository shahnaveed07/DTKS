import { storageAdapter } from '../storage/localStorageAdapter.js';
import { INITIAL_ORDERS } from '../../data/seedData.js';
import { generateOrderReference } from '../../utils/orderUtils.js';

const ORDERS_KEY = 'orders';

export const orderService = {
  getAll() {
    return storageAdapter.getItem(ORDERS_KEY, INITIAL_ORDERS);
  },

  saveAll(orders) {
    storageAdapter.setItem(ORDERS_KEY, orders);
    return orders;
  },

  create(formData) {
    const existing = this.getAll();
    const referenceId = generateOrderReference(existing);
    const now = new Date().toISOString();

    const newOrder = {
      ...formData,
      id: `ord-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      referenceId,
      status: 'New Request',
      quotationAmount: null,
      quotationCurrency: 'INR',
      quotationNotes: '',
      customerUpdate: 'Your project request has been recorded locally and is queued for review.',
      internalNotes: '',
      createdAt: now,
      updatedAt: now,
    };

    const next = [newOrder, ...existing];
    this.saveAll(next);
    return { order: newOrder, orders: next };
  },

  update(id, updates) {
    const existing = this.getAll();
    const now = new Date().toISOString();
    const next = existing.map((order) =>
      order.id === id ? { ...order, ...updates, updatedAt: now } : order
    );
    return this.saveAll(next);
  },

  remove(id) {
    const existing = this.getAll();
    const next = existing.filter((order) => order.id !== id);
    return this.saveAll(next);
  },
};
