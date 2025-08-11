import React from 'react';

/**
 * SSR-safe localStorage and sessionStorage utilities
 * These functions check for window availability to prevent server-side rendering errors
 */

export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem(key);
      } catch (error) {
        console.warn(`Failed to read from localStorage:`, error);
        return null;
      }
    }
    return null;
  },

  setItem: (key: string, value: string): void => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        console.warn(`Failed to write to localStorage:`, error);
      }
    }
  },

  removeItem: (key: string): void => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn(`Failed to remove from localStorage:`, error);
      }
    }
  },

  clear: (): void => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.clear();
      } catch (error) {
        console.warn(`Failed to clear localStorage:`, error);
      }
    }
  }
};

export const safeSessionStorage = {
  getItem: (key: string): string | null => {
    if (typeof window !== 'undefined') {
      try {
        return sessionStorage.getItem(key);
      } catch (error) {
        console.warn(`Failed to read from sessionStorage:`, error);
        return null;
      }
    }
    return null;
  },

  setItem: (key: string, value: string): void => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(key, value);
      } catch (error) {
        console.warn(`Failed to write to sessionStorage:`, error);
      }
    }
  },

  removeItem: (key: string): void => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(key);
      } catch (error) {
        console.warn(`Failed to remove from sessionStorage:`, error);
      }
    }
  },

  clear: (): void => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.clear();
      } catch (error) {
        console.warn(`Failed to clear sessionStorage:`, error);
      }
    }
  }
};

/**
 * Hook for safely accessing localStorage in React components
 * Returns [value, setValue, removeValue] tuple
 */
export const useLocalStorage = <T>(
  key: string, 
  initialValue: T
): [T, (value: T) => void, () => void] => {
  // State to store the value
  const [storedValue, setStoredValue] = React.useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that persists the new value to localStorage
  const setValue = (value: T) => {
    try {
      setStoredValue(value);
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  };

  // Function to remove the key from localStorage
  const removeValue = () => {
    try {
      setStoredValue(initialValue);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue, removeValue];
};

/**
 * Check if storage is available (for older browsers or privacy settings)
 */
export const isStorageAvailable = (type: 'localStorage' | 'sessionStorage'): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const storage = window[type];
    const testKey = '__storage_test__';
    storage.setItem(testKey, 'test');
    storage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};

