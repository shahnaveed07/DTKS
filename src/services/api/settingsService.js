import { storageAdapter } from '../storage/localStorageAdapter.js';
import { INITIAL_SETTINGS, INITIAL_SERVICES } from '../../data/seedData.js';

const SETTINGS_KEY = 'settings';
const SERVICES_KEY = 'services';
const THEME_KEY = 'theme';

export const settingsService = {
  getSettings() {
    return storageAdapter.getItem(SETTINGS_KEY, INITIAL_SETTINGS);
  },

  saveSettings(settings) {
    storageAdapter.setItem(SETTINGS_KEY, settings);
    return settings;
  },

  getServices() {
    return storageAdapter.getItem(SERVICES_KEY, INITIAL_SERVICES);
  },

  saveServices(services) {
    storageAdapter.setItem(SERVICES_KEY, services);
    return services;
  },

  resetAllDemoData() {
    storageAdapter.clearAll();
  },
};
