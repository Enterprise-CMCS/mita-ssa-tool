import type { DBSchema, IDBPDatabase, StoreNames } from 'idb';

/**
 * Interface for database schema
 */
export interface AppDB extends DBSchema {
  assessments: {
    key: string;
    value: Assessment;
    indexes: {
      'by-date': Date;
    };
  };
  capabilities: {
    key: string;
    value: Capability;
  };
  settings: {
    key: string;
    value: unknown;
  };
}

/**
 * Interface for assessment data
 */
export interface Assessment {
  id: string;
  title: string;
  description?: string;
  date: Date;
  state: string;
  capabilities: AssessmentCapability[];
  status: 'draft' | 'completed';
  version: string;
}

/**
 * Interface for capability data
 */
export interface Capability {
  id: string;
  name: string;
  description: string;
  businessArea: string;
  levels: CapabilityLevel[];
}

/**
 * Interface for capability level
 */
export interface CapabilityLevel {
  level: number;
  description: string;
  criteria: string[];
}

/**
 * Interface for assessment capability
 */
export interface AssessmentCapability {
  id: string;
  capabilityId: string;
  currentLevel: number;
  targetLevel: number;
  notes?: string;
  evidence?: string[];
}

/**
 * Storage service for managing IndexedDB operations
 */
class StorageService {
  private db: IDBPDatabase<AppDB> | null = null;
  private dbName = 'mita-assessment-tool';
  private dbVersion = 1;

  /**
   * Initialize the database
   */
  async initDB(): Promise<IDBPDatabase<AppDB>> {
    if (this.db) {
      return this.db;
    }

    try {
      const { openDB } = await import('idb');
      this.db = await openDB<AppDB>(this.dbName, this.dbVersion, {
        upgrade(db) {
          // Create stores if they don't exist
          if (!db.objectStoreNames.contains('assessments')) {
            const assessmentStore = db.createObjectStore('assessments', { keyPath: 'id' });
            assessmentStore.createIndex('by-date', 'date');
          }

          if (!db.objectStoreNames.contains('capabilities')) {
            db.createObjectStore('capabilities', { keyPath: 'id' });
          }

          if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings', { keyPath: 'id' });
          }
        },
      });

      return this.db;
    } catch (error) {
      console.error('Error initializing database:', error);
      throw new Error('Failed to initialize database');
    }
  }

  /**
   * Get all items from a store
   */
  async getAll<T extends StoreNames<AppDB>>(storeName: T): Promise<AppDB[T]['value'][]> {
    try {
      const db = await this.initDB();
      return await db.getAll(storeName);
    } catch (error) {
      console.error(`Error getting all items from ${storeName}:`, error);
      throw new Error(`Failed to get items from ${storeName}`);
    }
  }

  /**
   * Get an item by ID from a store
   */
  async getById<T extends StoreNames<AppDB>>(
    storeName: T,
    id: string
  ): Promise<AppDB[T]['value'] | undefined> {
    try {
      const db = await this.initDB();
      return await db.get(storeName, id);
    } catch (error) {
      console.error(`Error getting item ${id} from ${storeName}:`, error);
      throw new Error(`Failed to get item ${id} from ${storeName}`);
    }
  }

  /**
   * Add or update an item in a store
   */
  async put<T extends StoreNames<AppDB>>(storeName: T, item: AppDB[T]['value']): Promise<string> {
    try {
      const db = await this.initDB();
      const key = await db.put(storeName, item);
      return String(key);
    } catch (error) {
      console.error(`Error putting item in ${storeName}:`, error);
      throw new Error(`Failed to save item to ${storeName}`);
    }
  }

  /**
   * Delete an item from a store
   */
  async delete<T extends StoreNames<AppDB>>(storeName: T, id: string): Promise<void> {
    try {
      const db = await this.initDB();
      await db.delete(storeName, id);
    } catch (error) {
      console.error(`Error deleting item ${id} from ${storeName}:`, error);
      throw new Error(`Failed to delete item ${id} from ${storeName}`);
    }
  }

  /**
   * Clear all items from a store
   */
  async clear<T extends StoreNames<AppDB>>(storeName: T): Promise<void> {
    try {
      const db = await this.initDB();
      await db.clear(storeName);
    } catch (error) {
      console.error(`Error clearing store ${storeName}:`, error);
      throw new Error(`Failed to clear store ${storeName}`);
    }
  }

  /**
   * Check if IndexedDB is available in the browser
   */
  isAvailable(): boolean {
    return typeof window !== 'undefined' && 'indexedDB' in window;
  }

  /**
   * Export all data from the database
   */
  async exportData(): Promise<Record<string, unknown>> {
    try {
      const data: Record<string, unknown> = {};
      const storeNames: StoreNames<AppDB>[] = ['assessments', 'capabilities', 'settings'];

      for (const storeName of storeNames) {
        data[storeName] = await this.getAll(storeName);
      }

      return data;
    } catch {
      throw new Error('Failed to export data');
    }
  }

  /**
   * Import data into the database
   */
  async importData(data: Record<string, unknown[]>): Promise<void> {
    try {
      const db = await this.initDB();
      const tx = db.transaction(['assessments', 'capabilities', 'settings'], 'readwrite');

      for (const [storeName, items] of Object.entries(data)) {
        const store = tx.objectStore(storeName as StoreNames<AppDB>);
        await store.clear();

        for (const item of items) {
          await store.add(item);
        }
      }

      await tx.done;
    } catch (error) {
      console.error('Error importing data:', error);
      throw new Error('Failed to import data');
    }
  }

  /**
   * Get assessments by date range
   */
  async getAssessmentsByDateRange(startDate: Date, endDate: Date): Promise<Assessment[]> {
    try {
      const db = await this.initDB();
      const tx = db.transaction('assessments', 'readonly');
      const store = tx.objectStore('assessments');
      const index = store.index('by-date');
      const assessments = await index.getAll(IDBKeyRange.bound(startDate, endDate));

      return assessments;
    } catch (error) {
      console.error('Error getting assessments by date range:', error);
      throw new Error('Failed to get assessments by date range');
    }
  }

  /**
   * Get the latest assessment
   */
  async getLatestAssessment(): Promise<Assessment | undefined> {
    try {
      const db = await this.initDB();
      const tx = db.transaction('assessments', 'readonly');
      const store = tx.objectStore('assessments');
      const index = store.index('by-date');
      const cursor = await index.openCursor(null, 'prev');

      if (cursor) {
        return cursor.value;
      }

      return undefined;
    } catch (error) {
      console.error('Error getting latest assessment:', error);
      throw new Error('Failed to get latest assessment');
    }
  }

  /**
   * Get a setting value
   */
  async getSetting(key: string): Promise<unknown> {
    try {
      return await this.getById('settings', key);
    } catch (error) {
      console.error(`Error getting setting ${key}:`, error);
      return null;
    }
  }

  /**
   * Set a setting value
   */
  async setSetting(key: string, value: unknown): Promise<void> {
    try {
      await this.put('settings', { id: key, value });
    } catch (error) {
      console.error(`Error setting ${key}:`, error);
      throw new Error(`Failed to set setting ${key}`);
    }
  }
}

// Export as singleton
const storageService = new StorageService();
export default storageService;
