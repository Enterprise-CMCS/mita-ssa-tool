/**
 * Tests for ExportDataCollector
 */

import { ExportDataCollector } from '../ExportDataCollector';

import type { Assessment } from '../../../types';

// Mock ContentService
jest.mock('../../ContentService', () => {
  return jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    isInitialized: true,
    getCapability: jest.fn().mockImplementation((id: string) => {
      if (id === 'test-capability-1') {
        return Promise.resolve({
          id: 'test-capability-1',
          capabilityDomainName: 'Test Domain',
          capabilityAreaName: 'Test Area',
          capabilityVersion: '1.0',
          capabilityAreaCreated: '2024-01-01',
          capabilityAreaLastUpdated: '2024-06-01',
          description: 'Test capability',
          domainDescription: 'Test domain',
          areaDescription: 'Test area',
          dimensions: {
            outcome: {
              description: 'Outcome dimension',
              maturityAssessment: [],
              maturityLevels: {
                level1: 'Level 1',
                level2: 'Level 2',
                level3: 'Level 3',
                level4: 'Level 4',
                level5: 'Level 5',
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
        });
      }
      return Promise.resolve(null);
    }),
  }));
});

// Mock ScoringService
jest.mock('../../ScoringService', () => ({
  ScoringService: jest.fn().mockImplementation(() => ({
    calculateOverallScore: jest.fn().mockReturnValue([
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
            checkboxCompletion: { completed: 1, total: 2, percentage: 50 },
          },
          role: {
            maturityLevel: 2,
            partialCredit: 0,
            finalScore: 2,
            checkboxCompletion: { completed: 0, total: 0, percentage: 0 },
          },
          businessProcess: {
            maturityLevel: 1,
            partialCredit: 0,
            finalScore: 1,
            checkboxCompletion: { completed: 0, total: 0, percentage: 0 },
          },
          information: {
            maturityLevel: 4,
            partialCredit: 0,
            finalScore: 4,
            checkboxCompletion: { completed: 0, total: 0, percentage: 0 },
          },
          technology: {
            maturityLevel: 2,
            partialCredit: 0,
            finalScore: 2,
            checkboxCompletion: { completed: 0, total: 0, percentage: 0 },
          },
        },
      },
    ]),
  })),
}));

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

describe('ExportDataCollector', () => {
  let collector: ExportDataCollector;

  beforeEach(() => {
    collector = new ExportDataCollector();
    jest.clearAllMocks();
  });

  describe('collectExportData', () => {
    it('should collect complete export data', async () => {
      const exportData = await collector.collectExportData(mockAssessment);

      expect(exportData).toHaveProperty('assessment');
      expect(exportData).toHaveProperty('scores');
      expect(exportData).toHaveProperty('metadata');
      expect(exportData).toHaveProperty('capabilities');

      expect(exportData.assessment).toBe(mockAssessment);
      expect(exportData.scores).toHaveLength(1);
      expect(exportData.capabilities).toHaveLength(1);
    });

    it('should generate export metadata', async () => {
      const exportData = await collector.collectExportData(mockAssessment);

      expect(exportData.metadata).toHaveProperty('exportedAt');
      expect(exportData.metadata).toHaveProperty('exportVersion');
      expect(exportData.metadata).toHaveProperty('schemaVersion');
      expect(exportData.metadata).toHaveProperty('systemName', 'Test System');
      expect(exportData.metadata).toHaveProperty('lastSavedAt', '2025-01-02T00:00:00Z');
      expect(exportData.metadata).toHaveProperty('completionPercentage', 100);
    });

    it('should handle missing capability definitions gracefully', async () => {
      const assessmentWithMissingDef = {
        ...mockAssessment,
        capabilities: [
          {
            ...mockAssessment.capabilities[0],
            id: 'missing-capability',
          },
        ],
      };

      const exportData = await collector.collectExportData(assessmentWithMissingDef);

      expect(exportData.capabilities).toHaveLength(0);
      expect(exportData.scores).toHaveLength(1); // Scoring should still work
    });

    it('should handle errors gracefully', async () => {
      const invalidAssessment = null as any;

      await expect(collector.collectExportData(invalidAssessment)).rejects.toThrow();
    });
  });

  describe('validateAssessmentData', () => {
    it('should validate complete assessment data', async () => {
      const validation = await collector.validateAssessmentData(mockAssessment);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.warnings).toHaveLength(0);
    });

    it('should detect missing assessment data', async () => {
      const validation = await collector.validateAssessmentData(null as any);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Assessment data is missing');
    });

    it('should detect missing required fields', async () => {
      const incompleteAssessment = {
        ...mockAssessment,
        id: '',
        stateName: '',
      };

      const validation = await collector.validateAssessmentData(incompleteAssessment);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Assessment ID is missing');
      expect(validation.warnings).toContain('State name is missing');
    });

    it('should detect missing capabilities', async () => {
      const assessmentWithoutCapabilities = {
        ...mockAssessment,
        capabilities: [],
      };

      const validation = await collector.validateAssessmentData(assessmentWithoutCapabilities);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('No capabilities found in assessment');
    });

    it('should warn about incomplete dimensions', async () => {
      const assessmentWithIncompleteData = {
        ...mockAssessment,
        capabilities: [
          {
            ...mockAssessment.capabilities[0],
            dimensions: {
              ...mockAssessment.capabilities[0].dimensions,
              outcome: {
                ...mockAssessment.capabilities[0].dimensions.outcome,
                maturityLevel: 0,
              },
            },
          },
        ],
      };

      const validation = await collector.validateAssessmentData(assessmentWithIncompleteData);

      expect(validation.isValid).toBe(true);
      expect(validation.warnings.some(w => w.includes('No maturity level selected'))).toBe(true);
    });
  });

  describe('getExportDataSummary', () => {
    it('should calculate export data summary', () => {
      const summary = collector.getExportDataSummary(mockAssessment);

      expect(summary.totalCapabilities).toBe(1);
      expect(summary.completedCapabilities).toBe(1);
      expect(summary.totalDimensions).toBe(5);
      expect(summary.completedDimensions).toBe(5);
      expect(summary.hasSystemName).toBe(true);
      expect(summary.hasMetadata).toBe(true);
    });

    it('should handle empty assessment', () => {
      const emptyAssessment = {
        ...mockAssessment,
        capabilities: [],
        metadata: undefined,
      };

      const summary = collector.getExportDataSummary(emptyAssessment);

      expect(summary.totalCapabilities).toBe(0);
      expect(summary.completedCapabilities).toBe(0);
      expect(summary.totalDimensions).toBe(0);
      expect(summary.completedDimensions).toBe(0);
      expect(summary.hasSystemName).toBe(false);
      expect(summary.hasMetadata).toBe(false);
    });

    it('should count only completed dimensions', () => {
      const partialAssessment = {
        ...mockAssessment,
        capabilities: [
          {
            ...mockAssessment.capabilities[0],
            dimensions: {
              ...mockAssessment.capabilities[0].dimensions,
              outcome: {
                ...mockAssessment.capabilities[0].dimensions.outcome,
                maturityLevel: 3,
              },
              role: {
                ...mockAssessment.capabilities[0].dimensions.role,
                maturityLevel: 0, // Not completed
              },
              businessProcess: {
                ...mockAssessment.capabilities[0].dimensions.businessProcess,
                maturityLevel: 2,
              },
              information: {
                ...mockAssessment.capabilities[0].dimensions.information,
                maturityLevel: 0, // Not completed
              },
              technology: {
                ...mockAssessment.capabilities[0].dimensions.technology,
                maturityLevel: 1,
              },
            },
          },
        ],
      };

      const summary = collector.getExportDataSummary(partialAssessment);

      expect(summary.completedDimensions).toBe(3); // outcome, businessProcess, technology
    });
  });
});
