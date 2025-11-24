/**
 * Tests for ExportService
 */

import { ExportService } from '../ExportService';
import { ExportHandler } from '../types';

import type { Assessment } from '../../../types';
import type { ExportData, ExportOptions } from '../types';

// Mock handler for testing
class MockExportHandler extends ExportHandler {
  async generate(_data: ExportData, _options: ExportOptions): Promise<Blob> {
    const content = JSON.stringify({ test: 'data' });
    return new Blob([content], { type: 'application/json' });
  }

  getFileExtension(): string {
    return 'json';
  }

  getMimeType(): string {
    return 'application/json';
  }

  getFormatName(): string {
    return 'Test JSON';
  }

  getFormatDescription(): string {
    return 'Test JSON format for unit testing';
  }
}

// Mock assessment data
const mockAssessment: Assessment = {
  id: 'test-assessment-1',
  stateName: 'Test State',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-02T00:00:00Z',
  status: 'completed',
  capabilities: [
    {
      id: 'test-capability-1',
      capabilityDomainName: 'Test Domain',
      capabilityAreaName: 'Test Area',
      status: 'completed',
      dimensions: {
        outcome: {
          maturityLevel: 3,
          evidence: 'Test evidence',
          barriers: 'Test barriers',
          plans: 'Test plans',
          notes: 'Test notes',
          lastUpdated: '2025-01-02T00:00:00Z',
        },
        role: {
          maturityLevel: 2,
          evidence: '',
          barriers: '',
          plans: '',
          notes: '',
          lastUpdated: '2025-01-02T00:00:00Z',
        },
        businessProcess: {
          maturityLevel: 1,
          evidence: '',
          barriers: '',
          plans: '',
          notes: '',
          lastUpdated: '2025-01-02T00:00:00Z',
        },
        information: {
          maturityLevel: 4,
          evidence: '',
          barriers: '',
          plans: '',
          notes: '',
          lastUpdated: '2025-01-02T00:00:00Z',
        },
        technology: {
          maturityLevel: 2,
          evidence: '',
          barriers: '',
          plans: '',
          notes: '',
          lastUpdated: '2025-01-02T00:00:00Z',
        },
      },
    },
  ],
  metadata: {
    assessmentVersion: '1.0',
    systemName: 'Test System',
  },
};

describe('ExportService', () => {
  let exportService: ExportService;
  let mockHandler: MockExportHandler;

  beforeEach(() => {
    exportService = new ExportService();
    mockHandler = new MockExportHandler();
    exportService.registerHandler('test', mockHandler);
  });

  describe('registerHandler', () => {
    it('should register a format handler', () => {
      const formats = exportService.getAvailableFormats();
      expect(formats).toHaveLength(1);
      expect(formats[0].format).toBe('test');
      expect(formats[0].name).toBe('Test JSON');
    });
  });

  describe('getAvailableFormats', () => {
    it('should return format information', () => {
      const formats = exportService.getAvailableFormats();
      expect(formats).toHaveLength(1);

      const format = formats[0];
      expect(format.format).toBe('test');
      expect(format.name).toBe('Test JSON');
      expect(format.description).toBe('Test JSON format for unit testing');
      expect(format.extension).toBe('json');
      expect(format.mimeType).toBe('application/json');
      expect(format.recommendedFor).toEqual(['General use']);
    });
  });

  describe('generateFilename', () => {
    it('should generate filename with system name and state', async () => {
      const options = { format: 'test' as const };
      const filename = await exportService.generateFilename(mockAssessment, options);

      expect(filename).toMatch(/test-system-test-state-mita-assessment-\d{4}-\d{2}-\d{2}\.json/);
    });

    it('should use custom filename when provided', async () => {
      const options = {
        format: 'test' as const,
        customFilename: 'My Custom Export',
      };
      const filename = await exportService.generateFilename(mockAssessment, options);

      expect(filename).toMatch(/my-custom-export-\d{4}-\d{2}-\d{2}\.json/);
    });

    it('should sanitize special characters in filename', async () => {
      const assessmentWithSpecialChars = {
        ...mockAssessment,
        stateName: 'Test/State\\With:Special*Characters',
        metadata: {
          ...mockAssessment.metadata,
          systemName: 'System<With>Special|Characters',
        },
      };

      const options = { format: 'test' as const };
      const filename = await exportService.generateFilename(assessmentWithSpecialChars, options);

      expect(filename).toMatch(
        /system-with-special-characters-test-state-with-special-characters-mita-assessment-\d{4}-\d{2}-\d{2}\.json/
      );
    });
  });

  describe('exportAssessment', () => {
    // Mock DOM methods for testing
    beforeEach(() => {
      // Mock URL.createObjectURL and URL.revokeObjectURL
      global.URL.createObjectURL = jest.fn(() => 'mock-url');
      global.URL.revokeObjectURL = jest.fn();

      // Mock document methods
      const mockLink = {
        href: '',
        download: '',
        click: jest.fn(),
      };

      document.createElement = jest.fn(() => mockLink as any);
      document.body.appendChild = jest.fn();
      document.body.removeChild = jest.fn();
    });

    it('should export assessment successfully', async () => {
      const options = { format: 'test' as const };
      const result = await exportService.exportAssessment(mockAssessment, options);

      expect(result.success).toBe(true);
      expect(result.filename).toMatch(/\.json$/);
      expect(result.size).toBeGreaterThan(0);
      expect(result.error).toBeUndefined();
    });

    it('should handle unsupported format error', async () => {
      const options = { format: 'unsupported' as any };
      const result = await exportService.exportAssessment(mockAssessment, options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to generate export file');
    });

    it('should handle missing assessment error', async () => {
      const options = { format: 'test' as const };
      const result = await exportService.exportAssessment(null as any, options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Assessment is required');
    });

    it('should report progress during export', async () => {
      const progressCallback = jest.fn();
      const options = { format: 'test' as const };

      await exportService.exportAssessment(mockAssessment, options, progressCallback);

      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          stage: 'collecting',
          percentage: 10,
          message: 'Collecting assessment data...',
        })
      );

      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          stage: 'complete',
          percentage: 100,
          message: 'Export completed successfully',
        })
      );
    });
  });

  describe('cancelExport', () => {
    it('should not throw when no export is in progress', () => {
      expect(() => exportService.cancelExport()).not.toThrow();
    });
  });
});
