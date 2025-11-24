import { useState, useEffect } from 'react';

/**
 * Custom hook to detect browser storage availability
 * Checks if localStorage, sessionStorage, and indexedDB are available and working
 *
 * @returns Object with availability status for each storage type
 */
export function useStorageAvailability() {
  const [storageAvailable, setStorageAvailable] = useState<{
    localStorage: boolean;
    sessionStorage: boolean;
    indexedDB: boolean;
  }>({
    localStorage: false,
    sessionStorage: false,
    indexedDB: false,
  });

  useEffect(() => {
    // Check localStorage
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, testKey);
      localStorage.removeItem(testKey);
      setStorageAvailable(prev => ({ ...prev, localStorage: true }));
    } catch (e) {
      console.warn('localStorage not available:', e);
    }

    // Check sessionStorage
    try {
      const testKey = '__storage_test__';
      sessionStorage.setItem(testKey, testKey);
      sessionStorage.removeItem(testKey);
      setStorageAvailable(prev => ({ ...prev, sessionStorage: true }));
    } catch (e) {
      console.warn('sessionStorage not available:', e);
    }

    // Check indexedDB
    try {
      const testRequest = indexedDB.open('__idb_test__');
      testRequest.onerror = () => {
        console.warn('indexedDB not available');
      };
      testRequest.onsuccess = () => {
        testRequest.result.close();
        indexedDB.deleteDatabase('__idb_test__');
        setStorageAvailable(prev => ({ ...prev, indexedDB: true }));
      };
    } catch (e) {
      console.warn('indexedDB not available:', e);
    }
  }, []);

  return storageAvailable;
}

export default useStorageAvailability;
