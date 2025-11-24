# Design Document - Storage and Data Management

## Overview

The Storage and Data Management system provides a robust, client-side data persistence solution using a tiered storage approach. The system prioritizes localStorage for optimal performance while providing IndexedDB as a fallback for larger datasets, implementing comprehensive error handling, auto-save functionality, and data optimization strategies.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                Storage and Data Management                  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │ Storage Manager │    │   Auto-Save     │                │
│  │                 │    │   Controller    │                │
│  │ - Tiered        │◄──►│ - 30s intervals │                │
│  │   Storage       │    │ - Visual        │                │
│  │ - Fallback      │    │   feedback      │                │
│  │   Logic         │    │ - Error retry   │                │
│  └─────────────────┘    └─────────────────┘                │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │  localStorage   │    │    IndexedDB    │                │
│  │   Service       │    │    Service      │                │
│  │                 │    │                 │                │
│  │ - Primary       │◄──►│ - Fallback      │                │
│  │   Storage       │    │ - Large Data    │                │
│  │ - Fast Access   │    │ - Structured    │                │
│  └─────────────────┘    └─────────────────┘                │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │ Data Optimizer  │    │ Import/Export   │                │
│  │                 │    │   Manager       │                │
│  │ - Compression   │◄──►│ - JSON Export   │                │
│  │ - Chunking      │    │ - Data Import   │                │
│  │ - Quota Mgmt    │    │ - Validation    │                │
│  └─────────────────┘    └─────────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Storage Detection**: Initialize and detect available storage mechanisms
2. **Tiered Storage**: Use localStorage first, fallback to IndexedDB if needed
3. **Auto-Save**: Continuously save data every 30 seconds with visual feedback
4. **Data Optimization**: Compress and chunk large datasets for efficient storage
5. **Error Handling**: Implement retry logic and fallback mechanisms
6. **Import/Export**: Provide data portability and backup capabilities

## Components and Interfaces

### EnhancedStorageService

Main storage service implementing tiered storage approach:

```typescript
export class EnhancedStorageService implements StorageManager {
  private options: StorageOptions;
  private localStoragePrefix: string = 'mita_';
  private storageInfo: StorageInfo | null = null;
  private autoSaveController: AutoSaveController;

  // Core methods
  async initialize(): Promise<StorageInfo>
  async saveAssessment(assessment: Assessment): Promise<boolean>
  async loadAssessment(id: string): Promise<Assessment | null>
  async deleteAssessment(id: string): Promise<boolean>
  async getAllAssessments(): Promise<AssessmentSummary[]>
  
  // Storage management
  async getStorageInfo(): Promise<StorageInfo>
  async optimizeStorage(): Promise<StorageOptimizationResult>
  async exportData(format: ExportFormat): Promise<ExportResult>
  async importData(data: string, format: ExportFormat): Promise<ImportResult>
}
```

### Storage Options and Configuration

```typescript
interface StorageOptions {
  preferredStorage?: 'localStorage' | 'indexedDB';
  compressionThreshold?: number; // Size in bytes before compression
  chunkSize?: number; // Size for chunking large data
  autoSaveInterval?: number; // Auto-save interval in milliseconds
  maxRetries?: number; // Maximum retry attempts for failed operations
  enableCompression?: boolean; // Enable data compression
}

interface StorageInfo {
  isLocalStorageAvailable: boolean;
  isIndexedDBAvailable: boolean;
  localStorageUsage: number;
  localStorageLimit: number;
  indexedDBUsage: number;
  preferredStorage: 'localStorage' | 'indexedDB';
  compressionEnabled: boolean;
  autoSaveEnabled: boolean;
}
```

### Auto-Save Controller

Manages automatic saving with visual feedback and error handling:

```typescript
class AutoSaveController {
  private interval: number = 30000; // 30 seconds
  private timer: NodeJS.Timeout | null = null;
  private isEnabled: boolean = true;
  private retryCount: number = 0;
  private maxRetries: number = 3;

  start(callback: () => Promise<boolean>): void
  stop(): void
  pause(): void
  resume(): void
  setInterval(interval: number): void
  getStatus(): AutoSaveStatus
  
  private handleSaveError(error: Error): void
  private scheduleRetry(callback: () => Promise<boolean>): void
  private notifyUser(status: AutoSaveStatus): void
}

interface AutoSaveStatus {
  isEnabled: boolean;
  lastSaveTime: Date | null;
  status: 'idle' | 'saving' | 'saved' | 'error' | 'retrying';
  error?: string;
  nextSaveIn?: number; // milliseconds
}
```

### Data Optimization

Handles compression, chunking, and storage optimization:

```typescript
class DataOptimizer {
  private compressionThreshold: number;
  private chunkSize: number;

  compress(data: string): Promise<string>
  decompress(compressedData: string): Promise<string>
  chunk(data: string): string[]
  reassemble(chunks: string[]): string
  
  estimateStorageSize(assessment: Assessment): number
  optimizeAssessmentData(assessment: Assessment): OptimizedAssessment
  validateDataIntegrity(data: string): boolean
}

interface OptimizedAssessment {
  id: string;
  compressed: boolean;
  chunked: boolean;
  chunks?: string[];
  data: string;
  metadata: {
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
  };
}
```

## Data Models

### Storage Schema

```typescript
interface StoredAssessment {
  id: string;
  version: string;
  timestamp: number;
  compressed: boolean;
  chunked: boolean;
  data: string | string[]; // Raw data or chunks
  metadata: AssessmentMetadata;
  checksum: string; // For data integrity validation
}

interface AssessmentMetadata {
  stateName: string;
  createdAt: string;
  updatedAt: string;
  status: AssessmentStatus;
  progress: number; // 0-100
  capabilityCount: number;
  completedCapabilities: number;
  size: number; // Storage size in bytes
}

interface StorageMetadata {
  version: string;
  assessments: Record<string, AssessmentMetadata>;
  totalSize: number;
  lastCleanup: string;
  settings: StorageSettings;
}
```

### Import/Export Formats

```typescript
interface ExportFormat {
  type: 'json' | 'encrypted' | 'compressed';
  includeMetadata: boolean;
  compression: boolean;
  encryption?: {
    algorithm: string;
    key?: string;
  };
}

interface ExportResult {
  success: boolean;
  data?: string;
  filename: string;
  size: number;
  format: ExportFormat;
  error?: string;
}

interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: ImportError[];
  assessments: Assessment[];
}

interface ImportError {
  assessmentId?: string;
  error: string;
  severity: 'warning' | 'error';
}
```

## Storage Implementation

### localStorage Implementation

```typescript
class LocalStorageService {
  private prefix: string = 'mita_';
  
  async save(key: string, data: any): Promise<boolean> {
    try {
      const serialized = JSON.stringify(data);
      const compressed = await this.compressIfNeeded(serialized);
      localStorage.setItem(this.prefix + key, compressed);
      return true;
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        throw new StorageQuotaError('localStorage quota exceeded');
      }
      throw error;
    }
  }
  
  async load(key: string): Promise<any> {
    try {
      const stored = localStorage.getItem(this.prefix + key);
      if (!stored) return null;
      
      const decompressed = await this.decompressIfNeeded(stored);
      return JSON.parse(decompressed);
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      return null;
    }
  }
  
  getUsage(): number {
    let total = 0;
    for (let key in localStorage) {
      if (key.startsWith(this.prefix)) {
        total += localStorage[key].length;
      }
    }
    return total;
  }
  
  estimateLimit(): number {
    // Estimate localStorage limit (typically 5-10MB)
    try {
      const testKey = 'test_limit';
      const chunk = 'x'.repeat(1024); // 1KB chunks
      let size = 0;
      
      while (size < 10 * 1024 * 1024) { // Max 10MB test
        try {
          localStorage.setItem(testKey + size, chunk);
          size += 1024;
        } catch (e) {
          localStorage.removeItem(testKey + size);
          break;
        }
      }
      
      // Clean up test data
      for (let i = 0; i < size; i += 1024) {
        localStorage.removeItem(testKey + i);
      }
      
      return size;
    } catch (error) {
      return 5 * 1024 * 1024; // Default 5MB estimate
    }
  }
}
```

### IndexedDB Implementation

```typescript
class IndexedDBService {
  private dbName: string = 'mita-assessment-tool';
  private version: number = 1;
  private db: IDBDatabase | null = null;
  
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create assessments store
        if (!db.objectStoreNames.contains('assessments')) {
          const store = db.createObjectStore('assessments', { keyPath: 'id' });
          store.createIndex('stateName', 'stateName', { unique: false });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      };
    });
  }
  
  async save(assessment: StoredAssessment): Promise<boolean> {
    if (!this.db) await this.initialize();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['assessments'], 'readwrite');
      const store = transaction.objectStore('assessments');
      const request = store.put(assessment);
      
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }
  
  async load(id: string): Promise<StoredAssessment | null> {
    if (!this.db) await this.initialize();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['assessments'], 'readonly');
      const store = transaction.objectStore('assessments');
      const request = store.get(id);
      
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }
  
  async getUsage(): Promise<number> {
    if (!navigator.storage || !navigator.storage.estimate) {
      return 0;
    }
    
    const estimate = await navigator.storage.estimate();
    return estimate.usage || 0;
  }
}
```

## Error Handling

### Storage Error Types

```typescript
class StorageError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'StorageError';
  }
}

class StorageQuotaError extends StorageError {
  constructor(message: string) {
    super(message, 'QUOTA_EXCEEDED');
  }
}

class StorageUnavailableError extends StorageError {
  constructor(message: string) {
    super(message, 'STORAGE_UNAVAILABLE');
  }
}

class DataCorruptionError extends StorageError {
  constructor(message: string) {
    super(message, 'DATA_CORRUPTION');
  }
}
```

### Error Recovery Strategies

```typescript
class StorageErrorHandler {
  static async handleQuotaExceeded(
    service: EnhancedStorageService
  ): Promise<StorageRecoveryResult> {
    // 1. Try to free space by cleaning old data
    const cleanupResult = await service.cleanupOldData();
    
    // 2. Suggest user actions (delete old assessments)
    const suggestions = await service.getStorageOptimizationSuggestions();
    
    // 3. Offer alternative storage options
    const alternatives = await service.getAlternativeStorageOptions();
    
    return {
      success: cleanupResult.success,
      freedSpace: cleanupResult.freedSpace,
      suggestions,
      alternatives
    };
  }
  
  static async handleDataCorruption(
    assessmentId: string,
    service: EnhancedStorageService
  ): Promise<DataRecoveryResult> {
    // 1. Attempt to recover from backup
    const backupResult = await service.recoverFromBackup(assessmentId);
    
    // 2. Try partial data recovery
    if (!backupResult.success) {
      const partialResult = await service.attemptPartialRecovery(assessmentId);
      return partialResult;
    }
    
    return backupResult;
  }
}
```

## Testing Strategy

### Unit Tests

1. **Storage Service Tests**:
   - Test tiered storage fallback mechanisms
   - Validate data compression and decompression
   - Test quota management and optimization
   - Verify error handling and recovery

2. **Auto-Save Tests**:
   - Test automatic save intervals
   - Validate retry logic for failed saves
   - Test pause/resume functionality
   - Verify visual feedback updates

3. **Data Integrity Tests**:
   - Test checksum validation
   - Validate import/export functionality
   - Test data corruption detection
   - Verify recovery mechanisms

### Integration Tests

1. **Cross-Browser Storage**:
   - Test localStorage and IndexedDB across browsers
   - Validate storage limits and behavior
   - Test fallback mechanisms
   - Verify data persistence

2. **Large Dataset Handling**:
   - Test storage of large assessments
   - Validate compression effectiveness
   - Test chunking mechanisms
   - Verify performance with large datasets

### Performance Tests

1. **Storage Performance**:
   - Measure save/load times for various data sizes
   - Test compression/decompression performance
   - Validate auto-save impact on UI responsiveness
   - Test storage optimization effectiveness

## Security Considerations

### Data Protection

```typescript
interface SecurityConfig {
  enableEncryption: boolean;
  encryptionAlgorithm: string;
  keyDerivation: {
    algorithm: string;
    iterations: number;
    saltLength: number;
  };
  dataValidation: {
    enableChecksums: boolean;
    checksumAlgorithm: string;
  };
}
```

### Privacy and Compliance

- All data stored locally in browser
- No data transmitted to external servers
- User controls data retention and deletion
- Export functionality for data portability
- Clear data deletion capabilities