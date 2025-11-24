/**
 * Tests for JSONExportHandler
 */

import { JSONExportHandler } from '../JSONExportHandler';

import type { Assessment } from '../../../../types';
import type { ExportData, ExportOptions } from '../../types';

// Mock export data
const mockExportData: ExportData = {
  assessment: {
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
            checkboxes: {
              'level3-0': true,
              'level3-1': false,
            },
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
  } as Assessment,
  scores: [
    {
      capabilityArea: 'Test Area',
      domain: 'Test Domain',
      overallScore: 2.4,
      baseScore: 2.4,
      partialCredit: 0.1,
      dimensionScores: {
        outcome: {
          maturityLevel: 3,
          partialCredit: 0.5,
          finalScore: 3.5,
          checkboxCompletion: {
            completed: 1,
            total: 2,
            percentage: 50,
          },
        },
        role: {
          maturityLevel: 2,
          partialCredit: 0,
          finalScore: 2,
          checkboxCompletion: {
            completed: 0,
            total: 0,
            percentage: 0,
          },
        },
        businessProcess: {
          maturityLevel: 1,
          partialCredit: 0,
          finalScore: 1,
          checkboxCompletion: {
            completed: 0,
            total: 0,
            percentage: 0,
          },
        },
        information: {
          maturityLevel: 4,
          partialCredit: 0,
          finalScore: 4,
          checkboxCompletion: {
            completed: 0,
            total: 0,
            percentage: 0,
          },
        },
        technology: {
          maturityLevel: 2,
          partialCredit: 0,
          finalScore: 2,
          checkboxCompletion: {
            completed: 0,
            total: 0,
            percentage: 0,
          },
        },
      },
    },
  ],
  metadata: {
    exportedAt: '2025-01-03T00:00:00Z',
    exportVersion: '1.0.0',
    schemaVersion: '1.0',
    systemName: 'Test System',
    lastSavedAt: '2025-01-02T00:00:00Z',
    completionPercentage: 100,
  },
  capabilities: [
    {
      id: 'test-capability-1',
      capabilityDomainName: 'Test Domain',
      capabilityAreaName: 'Test Area',
      capabilityVersion: '1.0',
      capabilityAreaCreated: '2024-01-01',
      capabilityAreaLastUpdated: '2024-06-01',
      description: 'Test capability description',
      domainDescription: 'Test domain description',
      areaDescription: 'Test area description',
      dimensions: {
        outcome: {
          description: 'Outcome dimension',
          maturityAssessment: ['Assessment item 1'],
          maturityLevels: {
            level1: 'Level 1 description',
            level2: 'Level 2 description',
            level3: 'Level 3 description',
            level4: 'Level 4 description',
            level5: 'Level 5 description',
          },
          checkboxItems: {
            level3: ['Checkbox 1', 'Checkbox 2'],
          },
        },
        role: {
          description: 'Role dimension',
          maturityAssessment: [],
          maturityLevels: {
            level1: '',
            level2: '',
            level3: '',
            level4: '',
            level5: '',
          },
        },
        businessProcess: {
          description: 'Business Process dimension',
          maturityAssessment: [],
          maturityLevels: {
            level1: '',
            level2: '',
            level3: '',
            level4: '',
            level5: '',
          },
        },
        information: {
          description: 'Information dimension',
          maturityAssessment: [],
          maturityLevels: {
            level1: '',
            level2: '',
            level3: '',
            level4: '',
            level5: '',
          },
        },
        technology: {
          description: 'Technology dimension',
          maturityAssessment: [],
          maturityLevels: {
            level1: '',
            level2: '',
            level3: '',
            level4: '',
            level5: '',
          },
        },
      },
    },
  ],
};

describe('JSONExportHandler', () => {
  let handler: JSONExportHandler;

  beforeEach(() => {
    handler = new JSONExportHandler();
  });

  describe('format information', () => {
    it('should return correct format information', () => {
      expect(handler.getFileExtension()).toBe('json');
      expect(handler.getMimeType()).toBe('application/json');
      expect(handler.getFormatName()).toBe('JSON');
      expect(handler.getFormatDescription()).toContain('Complete data preservation');
    });
  });

  describe('generate', () => {
    it('should generate valid JSON blob', async () => {
      const options: ExportOptions = {
        format: 'json',
        includeDetails: true,
        includeCheckboxDetails: true,
      };

      const blob = await handler.generate(mockExportData, options);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/json');
      expect(blob.size).toBeGreaterThan(0);
    });

    it('should generate parseable JSON content', async () => {
      const options: ExportOptions = {
        format: 'json',
        includeDetails: true,
        includeCheckboxDetails: true,
      };

      const blob = await handler.generate(mockExportData, options);
      const text = await blob.text();
      const parsed = JSON.parse(text);

      expect(parsed).toHaveProperty('exportMetadata');
      expect(parsed).toHaveProperty('assessment');
      expect(parsed).toHaveProperty('enhancedScores');
      expect(parsed).toHaveProperty('capabilityDefinitions');
      expect(parsed).toHaveProperty('metadata');
    });

    it('should include export metadata', async () => {
      const options: ExportOptions = {
        format: 'json',
        includeDetails: true,
      };

      const blob = await handler.generate(mockExportData, options);
      const text = await blob.text();
      const parsed = JSON.parse(text);

      expect(parsed.exportMetadata).toEqual({
        exportedAt: '2025-01-03T00:00:00Z',
        exportVersion: '1.0.0',
        schemaVersion: '1.0',
        exportFormat: 'json',
        includeDetails: true,
        includeCheckboxDetails: true,
      });
    });

    it('should serialize assessment data with proper null handling', async () => {
      const options: ExportOptions = { format: 'json' };

      const blob = await handler.generate(mockExportData, options);
      const text = await blob.text();
      const parsed = JSON.parse(text);

      const assessment = parsed.assessment;
      expect(assessment.id).toBe('test-assessment-1');
      expect(assessment.stateName).toBe('Test State');
      expect(assessment.status).toBe('completed');
      expect(assessment.metadata.systemName).toBe('Test System');
      expect(assessment.capabilities).toHaveLength(1);
    });

    it('should serialize enhanced scores with dimension details', async () => {
      const options: ExportOptions = { format: 'json' };

      const blob = await handler.generate(mockExportData, options);
      const text = await blob.text();
      const parsed = JSON.parse(text);

      const scores = parsed.enhancedScores;
      expect(scores).toHaveLength(1);

      const score = scores[0];
      expect(score.capabilityArea).toBe('Test Area');
      expect(score.domain).toBe('Test Domain');
      expect(score.overallScore).toBe(2.4);
      expect(score.dimensionScores.outcome.finalScore).toBe(3.5);
      expect(score.dimensionScores.outcome.checkboxCompletion.completed).toBe(1);
    });

    it('should serialize capability definitions', async () => {
      const options: ExportOptions = { format: 'json' };

      const blob = await handler.generate(mockExportData, options);
      const text = await blob.text();
      const parsed = JSON.parse(text);

      const definitions = parsed.capabilityDefinitions;
      expect(definitions).toHaveLength(1);

      const definition = definitions[0];
      expect(definition.id).toBe('test-capability-1');
      expect(definition.capabilityAreaName).toBe('Test Area');
      expect(definition.dimensions.outcome.checkboxItems.level3).toEqual([
        'Checkbox 1',
        'Checkbox 2',
      ]);
    });

    it('should include summary metadata', async () => {
      const options: ExportOptions = { format: 'json' };

      const blob = await handler.generate(mockExportData, options);
      const text = await blob.text();
      const parsed = JSON.parse(text);

      const metadata = parsed.metadata;
      expect(metadata.totalCapabilities).toBe(1);
      expect(metadata.completedCapabilities).toBe(1);
      expect(metadata.overallAverage).toBe(2.4);
      expect(metadata.exportSummary.hasSystemName).toBe(true);
      expect(metadata.exportSummary.completionPercentage).toBe(100);
    });

    it('should handle missing data gracefully', async () => {
      const incompleteData = {
        ...mockExportData,
        assessment: {
          ...mockExportData.assessment,
          capabilities: [
            {
              id: 'incomplete-capability',
              capabilityDomainName: '',
              capabilityAreaName: '',
              status: 'not-started',
              dimensions: {
                outcome: {
                  maturityLevel: 0,
                  evidence: '',
                  barriers: '',
                  plans: '',
                  notes: '',
                  lastUpdated: '',
                },
                role: null,
                businessProcess: undefined,
                information: {},
                technology: {
                  maturityLevel: null,
                  evidence: null,
                },
              },
            },
          ],
        },
      };

      const options: ExportOptions = { format: 'json' };
      const blob = await handler.generate(incompleteData as any, options);
      const text = await blob.text();

      // Should not throw and should produce valid JSON
      expect(() => JSON.parse(text)).not.toThrow();

      const parsed = JSON.parse(text);
      expect(parsed.assessment.capabilities[0].dimensions.role.maturityLevel).toBe(0);
      expect(parsed.assessment.capabilities[0].dimensions.businessProcess.evidence).toBe('');
    });

    it('should handle generation errors', async () => {
      const options: ExportOptions = { format: 'json' };

      // Mock JSON.stringify to throw an error
      const originalStringify = JSON.stringify;
      JSON.stringify = jest.fn(() => {
        throw new Error('Circular reference detected');
      });

      try {
        await expect(handler.generate(mockExportData, options)).rejects.toThrow(
          'Failed to generate JSON export'
        );
      } finally {
        // Restore original JSON.stringify
        JSON.stringify = originalStringify;
      }
    });
  });
});
