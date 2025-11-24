'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import enhancedStorageService from '../../services/EnhancedStorageService';

import type { Assessment, AssessmentStatus, AssessmentSummary } from '../../types';

interface StorageContextType {
  isInitialized: boolean;
  isStorageAvailable: boolean;
  isLoading: boolean;
  error: Error | null;
  assessmentSummaries: AssessmentSummary[];
  saveAssessment: (assessment: Assessment) => Promise<boolean>;
  loadAssessment: (id: string) => Promise<Assessment | null>;
  deleteAssessment: (id: string) => Promise<boolean>;
  exportAssessment: (id: string) => Promise<Blob>;
  importAssessment: (file: File) => Promise<Assessment>;
  updateAssessmentStatus: (id: string, status: AssessmentStatus) => Promise<boolean>;
  refreshAssessmentList: () => Promise<void>;
}

const StorageContext = createContext<StorageContextType | null>(null);

interface StorageProviderProps {
  children: ReactNode;
}

/**
 * Provider component for storage service
 */
export function StorageProvider({ children }: StorageProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isStorageAvailable, setIsStorageAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [assessmentSummaries, setAssessmentSummaries] = useState<AssessmentSummary[]>([]);

  // Initialize storage service
  useEffect(() => {
    async function initialize() {
      try {
        setIsLoading(true);
        const storageInfo = await enhancedStorageService.initialize();
        setIsInitialized(true);
        setIsStorageAvailable(
          storageInfo.isLocalStorageAvailable || storageInfo.isIndexedDBAvailable
        );

        // Load assessment summaries
        if (storageInfo.isLocalStorageAvailable || storageInfo.isIndexedDBAvailable) {
          const summaries = await enhancedStorageService.listAssessments();
          setAssessmentSummaries(summaries);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to initialize storage'));
      } finally {
        setIsLoading(false);
      }
    }

    initialize();
  }, []);

  // Save assessment
  const saveAssessment = async (assessment: Assessment): Promise<boolean> => {
    try {
      setError(null);
      const result = await enhancedStorageService.saveAssessment(assessment);

      // Refresh assessment list
      const summaries = await enhancedStorageService.listAssessments();
      setAssessmentSummaries(summaries);

      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to save assessment'));
      return false;
    }
  };

  // Load assessment
  const loadAssessment = async (id: string): Promise<Assessment | null> => {
    try {
      setError(null);
      // Don't set global loading state for individual assessment loads
      // This prevents unnecessary re-renders across the app
      return await enhancedStorageService.loadAssessment(id);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load assessment'));
      return null;
    }
  };

  // Delete assessment
  const deleteAssessment = async (id: string): Promise<boolean> => {
    try {
      setError(null);
      const result = await enhancedStorageService.deleteAssessment(id);

      // Refresh assessment list
      const summaries = await enhancedStorageService.listAssessments();
      setAssessmentSummaries(summaries);

      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete assessment'));
      return false;
    }
  };

  // Export assessment
  const exportAssessment = async (id: string): Promise<Blob> => {
    try {
      setError(null);
      return await enhancedStorageService.exportAssessment(id);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to export assessment'));
      throw err;
    }
  };

  // Import assessment
  const importAssessment = async (file: File): Promise<Assessment> => {
    try {
      setError(null);
      const assessment = await enhancedStorageService.importAssessment(file);

      // Refresh assessment list
      const summaries = await enhancedStorageService.listAssessments();
      setAssessmentSummaries(summaries);

      return assessment;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to import assessment'));
      throw err;
    }
  };

  // Update assessment status
  const updateAssessmentStatus = async (id: string, status: AssessmentStatus): Promise<boolean> => {
    try {
      setError(null);
      const result = await enhancedStorageService.updateAssessmentStatus(id, status);

      if (result) {
        // Refresh assessment list to reflect the status change
        const summaries = await enhancedStorageService.listAssessments();
        setAssessmentSummaries(summaries);
      }

      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update assessment status'));
      return false;
    }
  };

  // Refresh assessment list
  const refreshAssessmentList = async (): Promise<void> => {
    try {
      setError(null);
      const summaries = await enhancedStorageService.listAssessments();
      setAssessmentSummaries(summaries);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to refresh assessment list'));
    }
  };

  const value: StorageContextType = {
    isInitialized,
    isStorageAvailable,
    isLoading,
    error,
    assessmentSummaries,
    saveAssessment,
    loadAssessment,
    deleteAssessment,
    exportAssessment,
    importAssessment,
    updateAssessmentStatus,
    refreshAssessmentList,
  };

  return <StorageContext.Provider value={value}>{children}</StorageContext.Provider>;
}

/**
 * Hook for accessing storage context
 */
export function useStorageContext(): StorageContextType {
  const context = useContext(StorageContext);

  if (!context) {
    throw new Error('useStorageContext must be used within a StorageProvider');
  }

  return context;
}

export default StorageProvider;
