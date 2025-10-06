import { useState, useEffect } from 'react';

/**
 * Hook do synchronizacji stanu z localStorage
 * @param {string} key - klucz w localStorage
 * @param {any} defaultValue - domyślna wartość
 * @returns {[value, setValue]} - podobnie jak useState
 */
export function useLocalStorage(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Błąd wczytywania z localStorage (${key}):`, error);
      return defaultValue;
    }
  });

  const setStoredValue = (value) => {
    try {
      setValue(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Błąd zapisywania do localStorage (${key}):`, error);
    }
  };

  return [value, setStoredValue];
}

/**
 * Hook do automatycznej synchronizacji stanu z localStorage
 * @param {string} key - klucz w localStorage
 * @param {any} value - wartość do synchronizacji
 */
export function useSyncWithLocalStorage(key, value) {
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Błąd synchronizacji z localStorage (${key}):`, error);
    }
  }, [key, value]);
}

/**
 * Hook do importu/eksportu danych z localStorage
 * @param {string} key - klucz w localStorage
 * @returns {object} - funkcje do exportu i importu
 */
export function useLocalStorageIO(key) {
  const exportData = () => {
    try {
      const data = window.localStorage.getItem(key);
      if (!data) {
        throw new Error('Brak danych do eksportu');
      }
      return JSON.parse(data);
    } catch (error) {
      console.error(`Błąd eksportu z localStorage (${key}):`, error);
      throw error;
    }
  };

  const importData = (data) => {
    try {
      window.localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error(`Błąd importu do localStorage (${key}):`, error);
      return false;
    }
  };

  const clearData = () => {
    try {
      window.localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Błąd usuwania z localStorage (${key}):`, error);
      return false;
    }
  };

  return {
    exportData,
    importData,
    clearData
  };
}