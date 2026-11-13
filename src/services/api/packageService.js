import { storageAdapter } from '../storage/localStorageAdapter.js';
import {
  INITIAL_PACKAGES,
  INITIAL_ADDONS,
  INITIAL_MAINTENANCE_PLANS,
} from '../../data/seedData.js';

const PACKAGES_KEY = 'packages';
const ADDONS_KEY = 'addons';
const MAINTENANCE_KEY = 'maintenance_plans';

function createUniqueId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const packageService = {
  getAll() {
    return storageAdapter.getItem(PACKAGES_KEY, INITIAL_PACKAGES);
  },

  saveAll(packages) {
    storageAdapter.setItem(PACKAGES_KEY, packages);
    return packages;
  },

  create(payload) {
    const list = this.getAll();
    const newItem = {
      ...payload,
      id: createUniqueId('pkg'),
    };
    const next = [...list, newItem];
    return this.saveAll(next);
  },

  update(id, updates) {
    const list = this.getAll();
    const next = list.map((item) => (item.id === id ? { ...item, ...updates } : item));
    return this.saveAll(next);
  },

  remove(id) {
    const list = this.getAll();
    const next = list.filter((item) => item.id !== id);
    return this.saveAll(next);
  },

  getAddons() {
    return storageAdapter.getItem(ADDONS_KEY, INITIAL_ADDONS);
  },

  saveAddons(addons) {
    storageAdapter.setItem(ADDONS_KEY, addons);
    return addons;
  },

  getMaintenancePlans() {
    return storageAdapter.getItem(MAINTENANCE_KEY, INITIAL_MAINTENANCE_PLANS);
  },

  saveMaintenancePlans(plans) {
    storageAdapter.setItem(MAINTENANCE_KEY, plans);
    return plans;
  },
};
