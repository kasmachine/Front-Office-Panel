/**
 * Safe wrapper for window.localStorage to prevent DOMException / SecurityError
 * in restricted webviews, private browsing, and mobile Safari iframe contexts.
 */

export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (e) {
      console.warn(`[storage] Failed to getItem('${key}'):`, e);
    }
    return null;
  },

  setItem: (key: string, value: string): boolean => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return true;
      }
    } catch (e) {
      console.warn(`[storage] Failed to setItem('${key}'):`, e);
    }
    return false;
  },

  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (e) {
      console.warn(`[storage] Failed to removeItem('${key}'):`, e);
    }
  },

  getAllKeys: (): string[] => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const keys: string[] = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k) keys.push(k);
        }
        return keys;
      }
    } catch (e) {
      console.warn(`[storage] Failed to read localStorage keys:`, e);
    }
    return [];
  },
};
