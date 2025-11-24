import type { Assessment, AssessmentStatus, AssessmentSummary, StorageManager } from '../types';

/**
 * Interface for storage options
 */
interface StorageOptions {
  preferredStorage?: 'localStorage' | 'indexedDB';
  compressionThreshold?: number; // Size in bytes before compression is applied
  chunkSize?: number; // Size in bytes for chunking large data
}

/**
 * Interface for storage information
 */
interface StorageInfo {
  isLocalStorageAvailable: boolean;
  isIndexedDBAvailable: boolean;
  localStorageUsage: number;
  localStorageLimit: number;
  indexedDBAvailable: boolean;
  preferredStorage: 'localStorage' | 'indexedDB';
}

/**
 * Enhanced storage service with tiered storage approach and fallback mechanisms
 */
export class EnhancedStorageService implements StorageManager {
  private options: StorageOptions;
  private localStoragePrefix = 'mita_';
  private localStorageMetaKey = 'mita_meta';
  private storageInfo: StorageInfo | null = null;

  constructor(options: StorageOptions = {}) {
    this.options = {
      preferredStorage: options.preferredStorage || 'localStorage',
      compressionThreshold: options.compressionThreshold || 100 * 1024, // 100KB
      chunkSize: options.chunkSize || 4 * 1024 * 1024, // 4MB
    };
  }

  /**
   * Initialize the storage service and detect available storage mechanisms
   */
  async initialize(): Promise<StorageInfo> {
    if (this.storageInfo) {
      return this.storageInfo;
    }

    const isLocalStorageAvailable = this.checkLocalStorageAvailability();
    const isIndexedDBAvailable = await this.checkIndexedDBAvailability();

    // Determine storage usage and limits
    const localStorageUsage = isLocalStorageAvailable ? this.getLocalStorageUsage() : 0;
    const localStorageLimit = isLocalStorageAvailable ? this.estimateLocalStorageLimit() : 0;

    // Set preferred storage based on availability and options
    let preferredStorage: 'localStorage' | 'indexedDB' =
      this.options.preferredStorage || 'localStorage';

    // If preferred storage is not available, fall back to the other option
    if (preferredStorage === 'localStorage' && !isLocalStorageAvailable) {
      preferredStorage = 'indexedDB';
    } else if (preferredStorage === 'indexedDB' && !isIndexedDBAvailable) {
      preferredStorage = 'localStorage';
    }

    this.storageInfo = {
      isLocalStorageAvailable,
      isIndexedDBAvailable,
      localStorageUsage,
      localStorageLimit,
      indexedDBAvailable: isIndexedDBAvailable,
      preferredStorage,
    };

    return this.storageInfo;
  }

  /**
   * Save assessment data to browser storage
   */
  async saveAssessment(assessment: Assessment): Promise<boolean> {
    await this.initialize();

    try {
      // First try to save to preferred storage
      if (this.storageInfo?.preferredStorage === 'localStorage') {
        return await this.saveToLocalStorage(assessment);
      } else {
        return await this.saveToIndexedDB(assessment);
      }
    } catch (error) {
      // If preferred storage fails, try the fallback
      console.error('Error saving to preferred storage, trying fallback:', error);

      try {
        if (this.storageInfo?.preferredStorage === 'localStorage') {
          return await this.saveToIndexedDB(assessment);
        } else {
          return await this.saveToLocalStorage(assessment);
        }
      } catch (fallbackError) {
        console.error('Error saving to fallback storage:', fallbackError);
        throw new Error('Failed to save assessment: Storage unavailable');
      }
    }
  }

  /**
   * Load assessment by ID
   */
  async loadAssessment(id: string): Promise<Assessment | null> {
    await this.initialize();

    try {
      // First try to load from preferred storage
      if (this.storageInfo?.preferredStorage === 'localStorage') {
        const assessment = await this.loadFromLocalStorage(id);
        if (assessment) {
          return assessment;
        }
      } else {
        const assessment = await this.loadFromIndexedDB(id);
        if (assessment) {
          return assessment;
        }
      }

      // If not found in preferred storage, try the fallback
      if (this.storageInfo?.preferredStorage === 'localStorage') {
        return await this.loadFromIndexedDB(id);
      } else {
        return await this.loadFromLocalStorage(id);
      }
    } catch (error) {
      console.error('Error loading assessment:', error);
      return null;
    }
  }

  /**
   * List all saved assessments
   */
  async listAssessments(): Promise<AssessmentSummary[]> {
    await this.initialize();

    try {
      // Get assessments from both storage mechanisms and merge them
      const localStorageAssessments = this.storageInfo?.isLocalStorageAvailable
        ? await this.listFromLocalStorage()
        : [];

      const indexedDBAssessments = this.storageInfo?.isIndexedDBAvailable
        ? await this.listFromIndexedDB()
        : [];

      // Combine and deduplicate assessments (prefer IndexedDB versions if duplicates exist)
      const assessmentMap = new Map<string, AssessmentSummary>();

      // Add localStorage assessments first
      localStorageAssessments.forEach(assessment => {
        assessmentMap.set(assessment.id, assessment);
      });

      // Then add/override with IndexedDB assessments
      indexedDBAssessments.forEach(assessment => {
        assessmentMap.set(assessment.id, assessment);
      });

      return Array.from(assessmentMap.values());
    } catch (error) {
      console.error('Error listing assessments:', error);
      return [];
    }
  }

  /**
   * Delete assessment by ID
   */
  async deleteAssessment(id: string): Promise<boolean> {
    await this.initialize();

    try {
      let success = false;

      // Try to delete from localStorage
      if (this.storageInfo?.isLocalStorageAvailable) {
        success = (await this.deleteFromLocalStorage(id)) || success;
      }

      // Try to delete from IndexedDB
      if (this.storageInfo?.isIndexedDBAvailable) {
        success = (await this.deleteFromIndexedDB(id)) || success;
      }

      return success;
    } catch (error) {
      console.error('Error deleting assessment:', error);
      return false;
    }
  }

  /**
   * Export assessment to JSON file
   */
  async exportAssessment(id: string): Promise<Blob> {
    const assessment = await this.loadAssessment(id);

    if (!assessment) {
      throw new Error(`Assessment with ID ${id} not found`);
    }

    const jsonString = JSON.stringify(assessment, null, 2);
    return new Blob([jsonString], { type: 'application/json' });
  }

  /**
   * Import assessment from JSON file
   */
  async importAssessment(file: File): Promise<Assessment> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async event => {
        try {
          const jsonString = event.target?.result as string;
          const assessment = JSON.parse(jsonString) as Assessment;

          // Validate the assessment structure
          if (!this.validateAssessment(assessment)) {
            reject(new Error('Invalid assessment data structure'));
            return;
          }

          // Save the imported assessment
          await this.saveAssessment(assessment);
          resolve(assessment);
        } catch {
          reject(new Error('Failed to parse assessment file'));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read assessment file'));
      };

      reader.readAsText(file);
    });
  }

  /**
   * Update assessment status
   */
  async updateAssessmentStatus(id: string, status: AssessmentStatus): Promise<boolean> {
    const assessment = await this.loadAssessment(id);

    if (!assessment) {
      return false;
    }

    assessment.status = status;
    assessment.updatedAt = new Date().toISOString();

    return await this.saveAssessment(assessment);
  }

  /**
   * Get storage information
   */
  async getStorageInfo(): Promise<StorageInfo> {
    return await this.initialize();
  }

  /**
   * Check if localStorage is available
   */
  private checkLocalStorageAvailability(): boolean {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, testKey);
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if IndexedDB is available
   */
  private async checkIndexedDBAvailability(): Promise<boolean> {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      return false;
    }

    try {
      const { openDB, deleteDB } = await import('idb');
      const testDb = await openDB('__idb_test__', 1, {
        upgrade(db) {
          db.createObjectStore('test');
        },
      });

      await testDb.close();
      await deleteDB('__idb_test__');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get current localStorage usage in bytes
   */
  private getLocalStorageUsage(): number {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key) || '';
        total += key.length + value.length;
      }
    }
    return total * 2; // Approximate bytes (2 bytes per character for UTF-16)
  }

  /**
   * Estimate localStorage limit by testing
   */
  private estimateLocalStorageLimit(): number {
    // Most browsers have a 5MB limit, but we'll use a conservative estimate
    return 5 * 1024 * 1024; // 5MB
  }

  /**
   * Save assessment to localStorage
   */
  private async saveToLocalStorage(assessment: Assessment): Promise<boolean> {
    if (!this.storageInfo?.isLocalStorageAvailable) {
      throw new Error('localStorage is not available');
    }

    try {
      // Check if the data is too large for localStorage
      const jsonString = JSON.stringify(assessment);
      const dataSize = jsonString.length * 2; // Approximate bytes (2 bytes per character for UTF-16)

      if (dataSize > this.storageInfo.localStorageLimit - this.storageInfo.localStorageUsage) {
        throw new Error('Assessment is too large for localStorage');
      }

      // Save the assessment
      localStorage.setItem(`${this.localStoragePrefix}${assessment.id}`, jsonString);

      // Update metadata
      this.updateLocalStorageMetadata(assessment);

      return true;
    } catch (error) {
      console.error('Error saving to localStorage:', error);
      throw error;
    }
  }

  /**
   * Load assessment from localStorage
   */
  private async loadFromLocalStorage(id: string): Promise<Assessment | null> {
    if (!this.storageInfo?.isLocalStorageAvailable) {
      return null;
    }

    try {
      const jsonString = localStorage.getItem(`${this.localStoragePrefix}${id}`);

      if (!jsonString) {
        return null;
      }

      return JSON.parse(jsonString) as Assessment;
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      return null;
    }
  }

  /**
   * List assessments from localStorage
   */
  private async listFromLocalStorage(): Promise<AssessmentSummary[]> {
    if (!this.storageInfo?.isLocalStorageAvailable) {
      return [];
    }

    try {
      const metaString = localStorage.getItem(this.localStorageMetaKey);

      if (!metaString) {
        return [];
      }

      const metadata = JSON.parse(metaString) as Record<string, AssessmentSummary>;
      return Object.values(metadata);
    } catch (error) {
      console.error('Error listing from localStorage:', error);
      return [];
    }
  }

  /**
   * Delete assessment from localStorage
   */
  private async deleteFromLocalStorage(id: string): Promise<boolean> {
    if (!this.storageInfo?.isLocalStorageAvailable) {
      return false;
    }

    try {
      localStorage.removeItem(`${this.localStoragePrefix}${id}`);

      // Update metadata
      const metaString = localStorage.getItem(this.localStorageMetaKey);

      if (metaString) {
        const metadata = JSON.parse(metaString) as Record<string, AssessmentSummary>;
        delete metadata[id];
        localStorage.setItem(this.localStorageMetaKey, JSON.stringify(metadata));
      }

      return true;
    } catch (error) {
      console.error('Error deleting from localStorage:', error);
      return false;
    }
  }

  /**
   * Update localStorage metadata
   */
  private updateLocalStorageMetadata(assessment: Assessment): void {
    try {
      const metaString = localStorage.getItem(this.localStorageMetaKey);
      const metadata: Record<string, AssessmentSummary> = metaString ? JSON.parse(metaString) : {};

      // Calculate completion percentage
      const totalDimensions = assessment.capabilities.length * 5; // 5 dimensions per capability
      let completedDimensions = 0;

      assessment.capabilities.forEach(capability => {
        Object.values(capability.dimensions).forEach(dimension => {
          if (dimension.maturityLevel > 0) {
            completedDimensions++;
          }
        });
      });

      const completionPercentage =
        totalDimensions > 0 ? Math.round((completedDimensions / totalDimensions) * 100) : 0;

      // Extract capability information
      const domains = [...new Set(assessment.capabilities.map(c => c.capabilityDomainName))];
      const areas = assessment.capabilities.map(c => c.capabilityAreaName);
      const systemName = assessment.metadata?.systemName;

      // Update metadata
      metadata[assessment.id] = {
        id: assessment.id,
        stateName: assessment.stateName,
        createdAt: assessment.createdAt,
        updatedAt: assessment.updatedAt,
        status: assessment.status,
        completionPercentage,
        systemName,
        domains,
        areas,
      };

      localStorage.setItem(this.localStorageMetaKey, JSON.stringify(metadata));
    } catch (error) {
      console.error('Error updating localStorage metadata:', error);
    }
  }

  /**
   * Save assessment to IndexedDB
   */
  private async saveToIndexedDB(assessment: Assessment): Promise<boolean> {
    if (!this.storageInfo?.isIndexedDBAvailable) {
      throw new Error('IndexedDB is not available');
    }

    try {
      const { openDB } = await import('idb');
      const db = await openDB('mita-assessments', 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('assessments')) {
            const store = db.createObjectStore('assessments', { keyPath: 'id' });
            store.createIndex('updatedAt', 'updatedAt');
          }

          if (!db.objectStoreNames.contains('summaries')) {
            db.createObjectStore('summaries', { keyPath: 'id' });
          }
        },
      });

      // Save the assessment
      await db.put('assessments', assessment);

      // Calculate completion percentage
      const totalDimensions = assessment.capabilities.length * 5; // 5 dimensions per capability
      let completedDimensions = 0;

      assessment.capabilities.forEach(capability => {
        Object.values(capability.dimensions).forEach(dimension => {
          if (dimension.maturityLevel > 0) {
            completedDimensions++;
          }
        });
      });

      const completionPercentage =
        totalDimensions > 0 ? Math.round((completedDimensions / totalDimensions) * 100) : 0;

      // Extract capability information
      const domains = [...new Set(assessment.capabilities.map(c => c.capabilityDomainName))];
      const areas = assessment.capabilities.map(c => c.capabilityAreaName);
      const systemName = assessment.metadata?.systemName;

      // Save the summary
      await db.put('summaries', {
        id: assessment.id,
        stateName: assessment.stateName,
        createdAt: assessment.createdAt,
        updatedAt: assessment.updatedAt,
        status: assessment.status,
        completionPercentage,
        systemName,
        domains,
        areas,
      });

      await db.close();
      return true;
    } catch (error) {
      console.error('Error saving to IndexedDB:', error);
      throw error;
    }
  }

  /**
   * Load assessment from IndexedDB
   */
  private async loadFromIndexedDB(id: string): Promise<Assessment | null> {
    if (!this.storageInfo?.isIndexedDBAvailable) {
      return null;
    }

    try {
      const { openDB } = await import('idb');
      const db = await openDB('mita-assessments', 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('assessments')) {
            const store = db.createObjectStore('assessments', { keyPath: 'id' });
            store.createIndex('updatedAt', 'updatedAt');
          }

          if (!db.objectStoreNames.contains('summaries')) {
            db.createObjectStore('summaries', { keyPath: 'id' });
          }
        },
      });

      // Check if assessments store exists before trying to access it
      if (!db.objectStoreNames.contains('assessments')) {
        await db.close();
        return null;
      }

      const assessment = await db.get('assessments', id);
      await db.close();

      return assessment || null;
    } catch (error) {
      console.error('Error loading from IndexedDB:', error);
      return null;
    }
  }

  /**
   * List assessments from IndexedDB
   */
  private async listFromIndexedDB(): Promise<AssessmentSummary[]> {
    if (!this.storageInfo?.isIndexedDBAvailable) {
      return [];
    }

    try {
      const { openDB } = await import('idb');
      const db = await openDB('mita-assessments', 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('assessments')) {
            const store = db.createObjectStore('assessments', { keyPath: 'id' });
            store.createIndex('updatedAt', 'updatedAt');
          }

          if (!db.objectStoreNames.contains('summaries')) {
            db.createObjectStore('summaries', { keyPath: 'id' });
          }
        },
      });

      // Check if summaries store exists before trying to access it
      if (!db.objectStoreNames.contains('summaries')) {
        await db.close();
        return [];
      }

      const summaries = await db.getAll('summaries');
      await db.close();

      return summaries;
    } catch (error) {
      console.error('Error listing from IndexedDB:', error);
      return [];
    }
  }

  /**
   * Delete assessment from IndexedDB
   */
  private async deleteFromIndexedDB(id: string): Promise<boolean> {
    if (!this.storageInfo?.isIndexedDBAvailable) {
      return false;
    }

    try {
      const { openDB } = await import('idb');
      const db = await openDB('mita-assessments', 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('assessments')) {
            const store = db.createObjectStore('assessments', { keyPath: 'id' });
            store.createIndex('updatedAt', 'updatedAt');
          }

          if (!db.objectStoreNames.contains('summaries')) {
            db.createObjectStore('summaries', { keyPath: 'id' });
          }
        },
      });

      // Only delete if the stores exist
      if (db.objectStoreNames.contains('assessments')) {
        await db.delete('assessments', id);
      }
      if (db.objectStoreNames.contains('summaries')) {
        await db.delete('summaries', id);
      }

      await db.close();
      return true;
    } catch (error) {
      console.error('Error deleting from IndexedDB:', error);
      return false;
    }
  }

  /**
   * Validate assessment structure
   */
  private validateAssessment(assessment: unknown): assessment is Assessment {
    if (!assessment || typeof assessment !== 'object') {
      return false;
    }

    const a = assessment as Partial<Assessment>;

    // Check required fields
    if (!a.id || !a.stateName || !a.createdAt || !a.updatedAt || !a.status || !a.capabilities) {
      return false;
    }

    // Check status is valid
    if (!['not-started', 'in-progress', 'completed'].includes(a.status as AssessmentStatus)) {
      return false;
    }

    // Check capabilities array
    if (!Array.isArray(a.capabilities)) {
      return false;
    }

    return true;
  }
}

// Export as singleton
const enhancedStorageService = new EnhancedStorageService();
export default enhancedStorageService;
