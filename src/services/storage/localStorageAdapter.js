const STORAGE_PREFIX = 'dks_v1_';

export const storageAdapter = {
  getItem(key, fallbackValue) {
    if (typeof window === 'undefined' || !window.localStorage) {
      return fallbackValue;
    }
    try {
      const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${key}`);
      if (raw === null) return fallbackValue;
      const parsed = JSON.parse(raw);
      return parsed ?? fallbackValue;
    } catch {
      return fallbackValue;
    }
  },

  setItem(key, value) {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }
    try {
      window.localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },

  removeItem(key) {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    try {
      window.localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
    } catch {
      // Ignore storage access errors
    }
  },

  clearAll() {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    try {
      const keysToRemove = [];
      for (let i = 0; i < window.localStorage.length; i += 1) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith(STORAGE_PREFIX)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => window.localStorage.removeItem(k));
    } catch {
      // Ignore storage access errors
    }
  },
};
