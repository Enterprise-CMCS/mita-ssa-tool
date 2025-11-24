/**
 * Tests for MarkdownExportHandler
 */

import { MarkdownExportHandler } from '../MarkdownExportHandler';

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
            evidence: 'This is test evidence\nwith multiple lines',
            barriers: 'Test barriers',
            plans: 'Test advancement plans',
            notes: 'Additional test notes',
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
  capabilities: [],
};

describe('MarkdownExportHandler', () => {
  let handler: MarkdownExportHandler;

  beforeEach(() => {
    handler = new MarkdownExportHandler();
  });

  describe('format information', () => {
    it('should return correct format information', () => {
      expect(handler.getFileExtension()).toBe('md');
      expect(handler.getMimeType()).toBe('text/markdown');
      expect(handler.getFormatName()).toBe('Markdown');
      expect(handler.getFormatDescription()).toContain('Well-structured Markdown document');
    });
  });

  describe('generate', () => {
    it('should generate valid markdown blob', async () => {
      const options: ExportOptions = {
        format: 'markdown',
        includeDetails: true,
      };

      const blob = await handler.generate(mockExportData, options);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('text/markdown');
      expect(blob.size).toBeGreaterThan(0);
    });

    it('should include YAML front matter', async () => {
      const options: ExportOptions = {
        format: 'markdown',
        includeDetails: false,
      };

      const blob = await handler.generate(mockExportData, options);
      const text = await blob.text();

      expect(text).toMatch(/^---\n/);
      expect(text).toContain('title: "MITA Assessment Export - Test State"');
      expect(text).toContain('assessment_id: "test-assessment-1"');
      expect(text).toContain('state_name: "Test State"');
      expect(text).toContain('system_name: "Test System"');
      expect(text).toContain('status: "completed"');
      expect(text).toContain('completion_percentage: 100');
    });

    it('should include main title and introduction', async () => {
      const options: ExportOptions = { format: 'markdown' };

      const blob = await handler.generate(mockExportData, options);
      const text = await blob.text();

      expect(text).toContain('# MITA Assessment Export');
      expect(text).toContain('**Test State**');
      expect(text).toContain('**Test System**');
      expect(text).toContain('**Assessment Status:** Completed');
    });

    it('should include assessment summary', async () => {
      const options: ExportOptions = { format: 'markdown' };

      const blob = await handler.generate(mockExportData, options);
      const text = await blob.text();

      expect(text).toContain('## Assessment Summary');
      expect(text).toContain('### Key Metrics');
      expect(text).toContain('**Overall Average Score:** 2.40 out of 5.0');
      expect(text).toContain('**Capability Areas Assessed:** 1 of 1');
      expect(text).toContain('**Assessment Completion:** 100%');
    });

    it('should include detailed results by domain', async () => {
      const options: ExportOptions = { format: 'markdown' };

      const blob = await handler.generate(mockExportData, options);
      const text = await blob.text();

      expect(text).toContain('## Detailed Assessment Results');
      expect(text).toContain('### Test Domain');
      expect(text).toContain('#### Test Area');
      expect(text).toContain('**Overall Score:** 2.40 out of 5.0');
      expect(text).toContain('**Base Maturity Level:** 2.4');
      expect(text).toContain('**Checkbox Bonus:** +0.10');
    });

    it('should include ORBIT dimension scores', async () => {
      const options: ExportOptions = { format: 'markdown' };

      const blob = await handler.generate(mockExportData, options);
      const text = await blob.text();

      expect(text).toContain('##### ORBIT Dimension Scores');
      expect(text).toContain('**Outcomes:**');
      expect(text).toContain('- Maturity Level: 3');
      expect(text).toContain('- Final Score: 3.50');
      expect(text).toContain('- Partial Credit: +0.50');
      expect(text).toContain('- Checkbox Completion: 1/2 (50.0%)');

      expect(text).toContain('**Roles:**');
      expect(text).toContain('**Business Process:**');
      expect(text).toContain('**Information:**');
      expect(text).toContain('**Technology:**');
    });

    it('should include detailed text content when includeDetails is true', async () => {
      const options: ExportOptions = {
        format: 'markdown',
        includeDetails: true,
      };

      const blob = await handler.generate(mockExportData, options);
      const text = await blob.text();

      expect(text).toContain('**Supporting Attestation:**');
      expect(text).toContain('> This is test evidence');
      expect(text).toContain('> with multiple lines');

      expect(text).toContain('**Barriers and Challenges:**');
      expect(text).toContain('> Test barriers');

      expect(text).toContain('**Outcomes-Based Advancement Plans:**');
      expect(text).toContain('> Test advancement plans');

      expect(text).toContain('**Additional Notes:**');
      expect(text).toContain('> Additional test notes');
    });

    it('should exclude detailed text content when includeDetails is false', async () => {
      const options: ExportOptions = {
        format: 'markdown',
        includeDetails: false,
      };

      const blob = await handler.generate(mockExportData, options);
      const text = await blob.text();

      expect(text).not.toContain('**Supporting Attestation:**');
      expect(text).not.toContain('**Barriers and Challenges:**');
      expect(text).not.toContain('**Outcomes-Based Advancement Plans:**');
      expect(text).not.toContain('**Additional Notes:**');
    });

    it('should include scoring methodology when includeDetails is true', async () => {
      const options: ExportOptions = {
        format: 'markdown',
        includeDetails: true,
      };

      const blob = await handler.generate(mockExportData, options);
      const text = await blob.text();

      expect(text).toContain('## Scoring Methodology');
      expect(text).toContain('### Base Scoring');
      expect(text).toContain('### Partial Credit');
      expect(text).toContain('### Overall Calculation');
      expect(text).toContain('### ORBIT Dimensions');
    });

    it('should exclude scoring methodology when includeDetails is false', async () => {
      const options: ExportOptions = {
        format: 'markdown',
        includeDetails: false,
      };

      const blob = await handler.generate(mockExportData, options);
      const text = await blob.text();

      expect(text).not.toContain('## Scoring Methodology');
    });

    it('should handle empty text content gracefully', async () => {
      const dataWithEmptyText = {
        ...mockExportData,
        assessment: {
          ...mockExportData.assessment,
          capabilities: [
            {
              ...mockExportData.assessment.capabilities[0],
              dimensions: {
                ...mockExportData.assessment.capabilities[0].dimensions,
                outcome: {
                  ...mockExportData.assessment.capabilities[0].dimensions.outcome,
                  evidence: '',
                  barriers: '',
                  plans: '',
                  notes: '',
                },
              },
            },
          ],
        },
      };

      const options: ExportOptions = {
        format: 'markdown',
        includeDetails: true,
      };

      const blob = await handler.generate(dataWithEmptyText, options);
      const text = await blob.text();

      // When content is empty, the sections should not appear at all
      expect(text).not.toContain('**Supporting Attestation:**');
      expect(text).not.toContain('**Barriers and Challenges:**');
      expect(text).not.toContain('**Outcomes-Based Advancement Plans:**');
      expect(text).not.toContain('**Additional Notes:**');
    });

    it('should handle multiple domains and capabilities', async () => {
      const multiDomainData = {
        ...mockExportData,
        assessment: {
          ...mockExportData.assessment,
          capabilities: [
            mockExportData.assessment.capabilities[0],
            {
              ...mockExportData.assessment.capabilities[0],
              id: 'test-capability-2',
              capabilityDomainName: 'Another Domain',
              capabilityAreaName: 'Another Area',
            },
          ],
        },
        scores: [
          mockExportData.scores[0],
          {
            ...mockExportData.scores[0],
            capabilityArea: 'Another Area',
            domain: 'Another Domain',
            overallScore: 3.2,
          },
        ],
      };

      const options: ExportOptions = { format: 'markdown' };

      const blob = await handler.generate(multiDomainData, options);
      const text = await blob.text();

      expect(text).toContain('### Test Domain');
      expect(text).toContain('### Another Domain');
      expect(text).toContain('#### Test Area');
      expect(text).toContain('#### Another Area');
    });

    it('should handle generation errors', async () => {
      const options: ExportOptions = { format: 'markdown' };

      // Create data that will cause an error
      const invalidData = null as any;

      await expect(handler.generate(invalidData, options)).rejects.toThrow(
        'Failed to generate Markdown export'
      );
    });
  });
});
