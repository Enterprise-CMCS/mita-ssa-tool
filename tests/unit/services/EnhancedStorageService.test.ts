import { EnhancedStorageService } from '../../../src/services/EnhancedStorageService';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    key: jest.fn((index: number) => Object.keys(store)[index] || null),
    length: 0,
  };
})();

// Mock IndexedDB
const indexedDBMock = {
  open: jest.fn(),
  deleteDatabase: jest.fn(),
};

// Mock idb module
jest.mock('idb', () => ({
  openDB: jest.fn().mockImplementation(() => ({
    put: jest.fn().mockResolvedValue('test-id'),
    get: jest.fn().mockResolvedValue({
      id: 'test-id',
      stateName: 'Test State',
      createdAt: '2025-06-06T12:00:00Z',
      updatedAt: '2025-06-06T12:00:00Z',
      status: 'in-progress',
      capabilities: [],
      metadata: { assessmentVersion: '1.0' },
    }),
    getAll: jest.fn().mockResolvedValue([
      {
        id: 'test-id',
        stateName: 'Test State',
        createdAt: '2025-06-06T12:00:00Z',
        updatedAt: '2025-06-06T12:00:00Z',
        status: 'in-progress',
        completionPercentage: 50,
      },
    ]),
    delete: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
    transaction: jest.fn().mockReturnValue({
      objectStore: jest.fn().mockReturnValue({
        put: jest.fn().mockResolvedValue(undefined),
        get: jest.fn().mockResolvedValue({}),
        getAll: jest.fn().mockResolvedValue([]),
        delete: jest.fn().mockResolvedValue(undefined),
        clear: jest.fn().mockResolvedValue(undefined),
      }),
      done: Promise.resolve(),
    }),
  })),
}));

describe('EnhancedStorageService', () => {
  let storageService: EnhancedStorageService;

  beforeEach(() => {
    // Set up mocks
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });
    Object.defineProperty(window, 'indexedDB', { value: indexedDBMock });

    // Reset mocks
    jest.clearAllMocks();
    localStorageMock.clear();

    // Create storage service
    storageService = new EnhancedStorageService();
  });

  test('initialize detects storage availability', async () => {
    const storageInfo = await storageService.initialize();

    expect(storageInfo).toHaveProperty('isLocalStorageAvailable');
    expect(storageInfo).toHaveProperty('isIndexedDBAvailable');
    expect(storageInfo).toHaveProperty('preferredStorage');
  });

  test('saveAssessment saves to localStorage when available', async () => {
    const assessment = {
      id: 'test-id',
      stateName: 'Test State',
      createdAt: '2025-06-06T12:00:00Z',
      updatedAt: '2025-06-06T12:00:00Z',
      status: 'in-progress' as const,
      capabilities: [],
      metadata: { assessmentVersion: '1.0' },
    };

    await storageService.initialize();
    const result = await storageService.saveAssessment(assessment);

    expect(result).toBe(true);
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  test('loadAssessment loads from localStorage when available', async () => {
    const assessment = {
      id: 'test-id',
      stateName: 'Test State',
      createdAt: '2025-06-06T12:00:00Z',
      updatedAt: '2025-06-06T12:00:00Z',
      status: 'in-progress' as const,
      capabilities: [],
      metadata: { assessmentVersion: '1.0' },
    };

    localStorageMock.setItem('mita_test-id', JSON.stringify(assessment));

    await storageService.initialize();
    const result = await storageService.loadAssessment('test-id');

    expect(result).toEqual(assessment);
    expect(localStorageMock.getItem).toHaveBeenCalled();
  });

  test('listAssessments returns assessments from both storage mechanisms', async () => {
    const metadata = {
      'test-id': {
        id: 'test-id',
        stateName: 'Test State',
        createdAt: '2025-06-06T12:00:00Z',
        updatedAt: '2025-06-06T12:00:00Z',
        status: 'in-progress' as const,
        completionPercentage: 50,
      },
    };

    localStorageMock.setItem('mita_meta', JSON.stringify(metadata));

    await storageService.initialize();
    const result = await storageService.listAssessments();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('test-id');
  });

  test('deleteAssessment removes assessment from storage', async () => {
    const assessment = {
      id: 'test-id',
      stateName: 'Test State',
      createdAt: '2025-06-06T12:00:00Z',
      updatedAt: '2025-06-06T12:00:00Z',
      status: 'in-progress' as const,
      capabilities: [],
      metadata: { assessmentVersion: '1.0' },
    };

    localStorageMock.setItem('mita_test-id', JSON.stringify(assessment));
    localStorageMock.setItem(
      'mita_meta',
      JSON.stringify({
        'test-id': {
          id: 'test-id',
          stateName: 'Test State',
          createdAt: '2025-06-06T12:00:00Z',
          updatedAt: '2025-06-06T12:00:00Z',
          status: 'in-progress',
          completionPercentage: 50,
        },
      })
    );

    await storageService.initialize();
    const result = await storageService.deleteAssessment('test-id');

    expect(result).toBe(true);
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('mita_test-id');
  });

  test('exportAssessment creates a JSON blob', async () => {
    const assessment = {
      id: 'test-id',
      stateName: 'Test State',
      createdAt: '2025-06-06T12:00:00Z',
      updatedAt: '2025-06-06T12:00:00Z',
      status: 'in-progress' as const,
      capabilities: [],
      metadata: { assessmentVersion: '1.0' },
    };

    localStorageMock.setItem('mita_test-id', JSON.stringify(assessment));

    await storageService.initialize();
    const result = await storageService.exportAssessment('test-id');

    expect(result).toBeInstanceOf(Blob);
    expect(result.type).toBe('application/json');
  });
});
