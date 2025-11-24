/**
 * Tests for FilenameGenerator
 */

import { FilenameGenerator } from '../FilenameGenerator';

import type { Assessment } from '../../../../types';

const mockAssessment: Assessment = {
  id: 'test-assessment-1',
  stateName: 'Test State',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-02T00:00:00Z',
  status: 'completed',
  capabilities: [],
  metadata: {
    assessmentVersion: '1.0',
    systemName: 'Test System',
  },
};

describe('FilenameGenerator', () => {
  describe('generateFilename', () => {
    it('should generate standard filename', () => {
      const filename = FilenameGenerator.generateFilename(mockAssessment, 'pdf');

      expect(filename).toMatch(/test-system-test-state-mita-assessment-\d{4}-\d{2}-\d{2}\.pdf/);
    });

    it('should handle missing system name', () => {
      const assessmentWithoutSystem = {
        ...mockAssessment,
        metadata: {
          assessmentVersion: '1.0',
        },
      };

      const filename = FilenameGenerator.generateFilename(assessmentWithoutSystem, 'csv');

      expect(filename).toMatch(/test-state-mita-assessment-\d{4}-\d{2}-\d{2}\.csv/);
    });

    it('should use custom name when provided', () => {
      const filename = FilenameGenerator.generateFilename(mockAssessment, 'json', {
        customName: 'My Custom Export',
      });

      expect(filename).toMatch(/my-custom-export-\d{4}-\d{2}-\d{2}\.json/);
    });

    it('should include version when requested', () => {
      const filename = FilenameGenerator.generateFilename(mockAssessment, 'md', {
        includeVersion: true,
      });

      expect(filename).toMatch(/test-system-test-state-mita-assessment-\d{4}-\d{2}-\d{2}-v1\.md/);
    });

    it('should handle different formats', () => {
      const formats = ['pdf', 'csv', 'json', 'markdown'];

      for (const format of formats) {
        const filename = FilenameGenerator.generateFilename(mockAssessment, format);
        const expectedExt = format === 'markdown' ? 'md' : format;
        expect(filename).toMatch(new RegExp(`\\.${expectedExt}$`));
      }
    });
  });

  describe('buildFilename', () => {
    it('should build filename from options', () => {
      const options = {
        stateName: 'California',
        systemName: 'CA Medicaid System',
        format: 'pdf',
        timestamp: new Date('2025-01-15T10:30:00Z'),
      };

      const filename = FilenameGenerator.buildFilename(options);

      expect(filename).toBe('ca-medicaid-system-california-mita-assessment-2025-01-15.pdf');
    });

    it('should sanitize special characters', () => {
      const options = {
        stateName: 'Test/State\\With:Special*Characters',
        systemName: 'System<With>Special|Characters',
        format: 'csv',
        timestamp: new Date('2025-01-15T10:30:00Z'),
      };

      const filename = FilenameGenerator.buildFilename(options);

      expect(filename).toBe(
        'system-with-special-characters-test-state-with-special-characters-mita-assessment-2025-01-15.csv'
      );
    });

    it('should handle long names by truncating', () => {
      const options = {
        stateName: 'Very Long State Name That Exceeds Normal Length Limits',
        systemName: 'Very Long System Name That Also Exceeds Normal Length Limits',
        format: 'pdf',
        timestamp: new Date('2025-01-15T10:30:00Z'),
      };

      const filename = FilenameGenerator.buildFilename(options);

      expect(filename.length).toBeLessThanOrEqual(100);
      expect(filename).toMatch(/\.pdf$/);
    });

    it('should handle custom names', () => {
      const options = {
        customName: 'My Custom Export Name',
        stateName: 'Test State',
        format: 'json',
        timestamp: new Date('2025-01-15T10:30:00Z'),
      };

      const filename = FilenameGenerator.buildFilename(options);

      expect(filename).toBe('my-custom-export-name-2025-01-15.json');
    });
  });

  describe('generateVersionedFilename', () => {
    it('should return original filename if no conflicts', () => {
      const filename = 'test-export.pdf';
      const existing: string[] = [];

      const result = FilenameGenerator.generateVersionedFilename(filename, existing);

      expect(result).toBe('test-export.pdf');
    });

    it('should add version number for conflicts', () => {
      const filename = 'test-export.pdf';
      const existing = ['test-export.pdf'];

      const result = FilenameGenerator.generateVersionedFilename(filename, existing);

      expect(result).toBe('test-export-v2.pdf');
    });

    it('should increment version number for multiple conflicts', () => {
      const filename = 'test-export.pdf';
      const existing = ['test-export.pdf', 'test-export-v2.pdf', 'test-export-v3.pdf'];

      const result = FilenameGenerator.generateVersionedFilename(filename, existing);

      expect(result).toBe('test-export-v4.pdf');
    });

    it('should handle filenames without extensions', () => {
      const filename = 'test-export';
      const existing = ['test-export'];

      const result = FilenameGenerator.generateVersionedFilename(filename, existing);

      expect(result).toBe('test-export-v2.');
    });
  });

  describe('validateFilename', () => {
    it('should validate good filenames', () => {
      const result = FilenameGenerator.validateFilename('test-export.pdf');

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect long filenames', () => {
      const longFilename = 'a'.repeat(150) + '.pdf';
      const result = FilenameGenerator.validateFilename(longFilename);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContainEqual(expect.stringContaining('too long'));
    });

    it('should detect invalid characters', () => {
      const result = FilenameGenerator.validateFilename('test<file>.pdf');

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Contains invalid characters');
    });

    it('should detect reserved names', () => {
      const result = FilenameGenerator.validateFilename('CON.pdf');

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Uses reserved system name');
    });

    it('should detect leading/trailing spaces', () => {
      const result = FilenameGenerator.validateFilename(' test-file.pdf ');

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Contains leading or trailing spaces');
    });

    it('should detect leading/trailing dots', () => {
      const result = FilenameGenerator.validateFilename('.test-file.pdf.');

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Contains leading or trailing dots');
    });
  });

  describe('suggestFilename', () => {
    it('should generate multiple filename suggestions', () => {
      const suggestions = FilenameGenerator.suggestFilename(mockAssessment, 'pdf');

      expect(suggestions.length).toBeGreaterThan(1);
      expect(suggestions.every(s => s.endsWith('.pdf'))).toBe(true);
      expect(suggestions.some(s => s.includes('test-state'))).toBe(true);
    });

    it('should include system name in suggestions', () => {
      const suggestions = FilenameGenerator.suggestFilename(mockAssessment, 'csv');

      const systemSuggestion = suggestions.find(s => s.includes('test-system'));
      expect(systemSuggestion).toBeDefined();
    });

    it('should include status-based suggestions', () => {
      const completedAssessment = { ...mockAssessment, status: 'completed' as const };
      const suggestions = FilenameGenerator.suggestFilename(completedAssessment, 'json');

      const finalSuggestion = suggestions.find(s => s.includes('final'));
      expect(finalSuggestion).toBeDefined();
    });

    it('should handle in-progress assessments', () => {
      const draftAssessment = { ...mockAssessment, status: 'in-progress' as const };
      const suggestions = FilenameGenerator.suggestFilename(draftAssessment, 'md');

      const draftSuggestion = suggestions.find(s => s.includes('draft'));
      expect(draftSuggestion).toBeDefined();
    });

    it('should remove duplicate suggestions', () => {
      const suggestions = FilenameGenerator.suggestFilename(mockAssessment, 'pdf');
      const uniqueSuggestions = [...new Set(suggestions)];

      expect(suggestions.length).toBe(uniqueSuggestions.length);
    });
  });
});
