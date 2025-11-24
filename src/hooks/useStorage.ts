import { useState, useEffect } from 'react';

import enhancedStorageService from '../services/EnhancedStorageService';

import type { EnhancedStorageService } from '../services/EnhancedStorageService';

interface StorageState {
  isInitialized: boolean;
  isLocalStorageAvailable: boolean;
  isIndexedDBAvailable: boolean;
  localStorageUsage: number;
  localStorageLimit: number;
  preferredStorage: 'localStorage' | 'indexedDB';
  error: Error | null;
}

/**
 * Hook for accessing storage service and storage availability information
 */
export function useStorage(customStorageService?: EnhancedStorageService) {
  const storageService = customStorageService || enhancedStorageService;

  const [state, setState] = useState<StorageState>({
    isInitialized: false,
    isLocalStorageAvailable: false,
    isIndexedDBAvailable: false,
    localStorageUsage: 0,
    localStorageLimit: 0,
    preferredStorage: 'localStorage',
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    async function initializeStorage() {
      try {
        const storageInfo = await storageService.getStorageInfo();

        if (isMounted) {
          setState({
            isInitialized: true,
            isLocalStorageAvailable: storageInfo.isLocalStorageAvailable,
            isIndexedDBAvailable: storageInfo.isIndexedDBAvailable,
            localStorageUsage: storageInfo.localStorageUsage,
            localStorageLimit: storageInfo.localStorageLimit,
            preferredStorage: storageInfo.preferredStorage,
            error: null,
          });
        }
      } catch (error) {
        if (isMounted) {
          setState(prevState => ({
            ...prevState,
            isInitialized: true,
            error: error instanceof Error ? error : new Error('Failed to initialize storage'),
          }));
        }
      }
    }

    initializeStorage();

    return () => {
      isMounted = false;
    };
  }, [storageService]);

  return {
    ...state,
    storageService,
    isStorageAvailable: state.isLocalStorageAvailable || state.isIndexedDBAvailable,
    storageUsagePercentage:
      state.localStorageLimit > 0
        ? Math.round((state.localStorageUsage / state.localStorageLimit) * 100)
        : 0,
  };
}

export default useStorage;
