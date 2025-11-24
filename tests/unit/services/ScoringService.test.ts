import { ScoringService } from '../../../src/services/ScoringService';

import type { CheckboxItems } from '../../../src/services/ScoringService';
import type {
  Assessment,
  CapabilityAreaAssessment,
  CapabilityDefinition,
  DimensionAssessment,
} from '../../../src/types';

describe('ScoringService', () => {
  let scoringService: ScoringService;

  beforeEach(() => {
    scoringService = new ScoringService();
  });

  describe('calculateDimensionScore', () => {
    const mockCheckboxItems: CheckboxItems = {
      level1: ['Item 1', 'Item 2'],
      level2: ['Item 1', 'Item 2', 'Item 3', 'Item 4'],
      level3: ['Item 1', 'Item 2', 'Item 3'],
    };

    it('should calculate correct score with no checkboxes completed', () => {
      const dimension: DimensionAssessment = {
        maturityLevel: 2,
        evidence: '',
        barriers: '',
        plans: '',
        notes: '',
        lastUpdated: '2024-01-01',
        checkboxes: {},
      };

      const result = scoringService.calculateDimensionScore(dimension, mockCheckboxItems);

      expect(result.maturityLevel).toBe(2);
      expect(result.partialCredit).toBe(0);
      expect(result.finalScore).toBe(2);
      expect(result.checkboxCompletion.completed).toBe(0);
      expect(result.checkboxCompletion.total).toBe(4);
      expect(result.checkboxCompletion.percentage).toBe(0);
    });

    it('should calculate correct score with some checkboxes completed', () => {
      const dimension: DimensionAssessment = {
        maturityLevel: 2,
        evidence: '',
        barriers: '',
        plans: '',
        notes: '',
        lastUpdated: '2024-01-01',
        checkboxes: {
          'level2-0': true,
          'level2-1': true,
          'level2-2': false,
          'level2-3': false,
        },
      };

      const result = scoringService.calculateDimensionScore(dimension, mockCheckboxItems);

      expect(result.maturityLevel).toBe(2);
      expect(result.partialCredit).toBe(0.5); // 2/4
      expect(result.finalScore).toBe(2.5);
      expect(result.checkboxCompletion.completed).toBe(2);
      expect(result.checkboxCompletion.total).toBe(4);
      expect(result.checkboxCompletion.percentage).toBe(50);
    });

    it('should calculate correct score with all checkboxes completed', () => {
      const dimension: DimensionAssessment = {
        maturityLevel: 2,
        evidence: '',
        barriers: '',
        plans: '',
        notes: '',
        lastUpdated: '2024-01-01',
        checkboxes: {
          'level2-0': true,
          'level2-1': true,
          'level2-2': true,
          'level2-3': true,
        },
      };

      const result = scoringService.calculateDimensionScore(dimension, mockCheckboxItems);

      expect(result.maturityLevel).toBe(2);
      expect(result.partialCredit).toBe(1);
      expect(result.finalScore).toBe(3);
      expect(result.checkboxCompletion.completed).toBe(4);
      expect(result.checkboxCompletion.total).toBe(4);
      expect(result.checkboxCompletion.percentage).toBe(100);
    });

    it('should return zero score when no maturity level is selected', () => {
      const dimension: DimensionAssessment = {
        maturityLevel: 0,
        evidence: '',
        barriers: '',
        plans: '',
        notes: '',
        lastUpdated: '2024-01-01',
        checkboxes: {},
      };

      const result = scoringService.calculateDimensionScore(dimension, mockCheckboxItems);

      expect(result.maturityLevel).toBe(0);
      expect(result.partialCredit).toBe(0);
      expect(result.finalScore).toBe(0);
      expect(result.checkboxCompletion.completed).toBe(0);
      expect(result.checkboxCompletion.total).toBe(0);
      expect(result.checkboxCompletion.percentage).toBe(0);
    });

    it('should handle missing checkbox items gracefully', () => {
      const dimension: DimensionAssessment = {
        maturityLevel: 2,
        evidence: '',
        barriers: '',
        plans: '',
        notes: '',
        lastUpdated: '2024-01-01',
        checkboxes: {},
      };

      const emptyCheckboxItems: CheckboxItems = {};

      const result = scoringService.calculateDimensionScore(dimension, emptyCheckboxItems);

      expect(result.maturityLevel).toBe(2);
      expect(result.partialCredit).toBe(0);
      expect(result.finalScore).toBe(2);
      expect(result.checkboxCompletion.completed).toBe(0);
      expect(result.checkboxCompletion.total).toBe(0);
      expect(result.checkboxCompletion.percentage).toBe(0);
    });

    it('should handle invalid dimension data gracefully', () => {
      const result = scoringService.calculateDimensionScore(null as any, mockCheckboxItems);

      expect(result.maturityLevel).toBe(0);
      expect(result.partialCredit).toBe(0);
      expect(result.finalScore).toBe(0);
      expect(result.checkboxCompletion.completed).toBe(0);
      expect(result.checkboxCompletion.total).toBe(0);
      expect(result.checkboxCompletion.percentage).toBe(0);
    });

    it('should round final score to 2 decimal places', () => {
      const dimension: DimensionAssessment = {
        maturityLevel: 2,
        evidence: '',
        barriers: '',
        plans: '',
        notes: '',
        lastUpdated: '2024-01-01',
        checkboxes: {
          'level2-0': true,
          'level2-1': false,
          'level2-2': true,
        },
      };

      const checkboxItems: CheckboxItems = {
        level2: ['Item 1', 'Item 2', 'Item 3'], // 2/3 = 0.6666...
      };

      const result = scoringService.calculateDimensionScore(dimension, checkboxItems);

      expect(result.finalScore).toBe(2.67); // 2 + 0.67 (rounded)
      expect(result.partialCredit).toBe(0.67);
    });
  });

  describe('calculateCapabilityScore', () => {
    const mockCapability: CapabilityAreaAssessment = {
      id: 'test-capability',
      capabilityDomainName: 'Test Domain',
      capabilityAreaName: 'Test Capability',
      status: 'in-progress',
      dimensions: {
        outcome: {
          maturityLevel: 2,
          evidence: '',
          barriers: '',
          plans: '',
          notes: '',
          lastUpdated: '2024-01-01',
          checkboxes: { 'level2-0': true, 'level2-1': true },
        },
        role: {
          maturityLevel: 3,
          evidence: '',
          barriers: '',
          plans: '',
          notes: '',
          lastUpdated: '2024-01-01',
          checkboxes: { 'level3-0': true },
        },
        businessProcess: {
          maturityLevel: 1,
          evidence: '',
          barriers: '',
          plans: '',
          notes: '',
          lastUpdated: '2024-01-01',
          checkboxes: {},
        },
        information: {
          maturityLevel: 2,
          evidence: '',
          barriers: '',
          plans: '',
          notes: '',
          lastUpdated: '2024-01-01',
          checkboxes: { 'level2-0': true },
        },
        technology: {
          maturityLevel: 0,
          evidence: '',
          barriers: '',
          plans: '',
          notes: '',
          lastUpdated: '2024-01-01',
          checkboxes: {},
        },
      },
    };

    const mockDefinition: CapabilityDefinition = {
      id: 'test-capability',
      capabilityDomainName: 'Test Domain',
      capabilityAreaName: 'Test Capability',
      capabilityVersion: '1.0',
      capabilityAreaCreated: '2024-01-01',
      capabilityAreaLastUpdated: '2024-01-01',
      description: 'Test description',
      domainDescription: 'Test domain description',
      areaDescription: 'Test area description',
      dimensions: {
        outcome: {
          description: 'Outcome dimension',
          maturityAssessment: [],
          maturityLevels: { level1: '', level2: '', level3: '', level4: '', level5: '' },
          checkboxItems: { level2: ['Item 1', 'Item 2'] },
        },
        role: {
          description: 'Role dimension',
          maturityAssessment: [],
          maturityLevels: { level1: '', level2: '', level3: '', level4: '', level5: '' },
          checkboxItems: { level3: ['Item 1'] },
        },
        businessProcess: {
          description: 'Business Process dimension',
          maturityAssessment: [],
          maturityLevels: { level1: '', level2: '', level3: '', level4: '', level5: '' },
          checkboxItems: { level1: [] },
        },
        information: {
          description: 'Information dimension',
          maturityAssessment: [],
          maturityLevels: { level1: '', level2: '', level3: '', level4: '', level5: '' },
          checkboxItems: { level2: ['Item 1', 'Item 2'] },
        },
        technology: {
          description: 'Technology dimension',
          maturityAssessment: [],
          maturityLevels: { level1: '', level2: '', level3: '', level4: '', level5: '' },
          checkboxItems: {},
        },
      },
    };

    it('should calculate correct capability score with mixed dimension scores', () => {
      const result = scoringService.calculateCapabilityScore(mockCapability, mockDefinition);

      expect(result.capabilityArea).toBe('Test Capability');
      expect(result.domain).toBe('Test Domain');

      // Expected scores:
      // outcome: 2 + 2/2 = 3.0
      // role: 3 + 1/1 = 4.0
      // businessProcess: 1 + 0/0 = 1.0
      // information: 2 + 1/2 = 2.5
      // technology: 0 + 0/0 = 0.0
      // Average: (3.0 + 4.0 + 1.0 + 2.5 + 0.0) / 5 = 2.1

      expect(result.overallScore).toBe(2.1);
      expect(result.baseScore).toBe(1.6); // (2+3+1+2+0)/5
      expect(result.partialCredit).toBe(0.5); // (1+1+0+0.5+0)/5
    });

    it('should handle missing definition gracefully', () => {
      const result = scoringService.calculateCapabilityScore(mockCapability, null as any);

      expect(result.capabilityArea).toBe('Test Capability'); // Uses capability data
      expect(result.domain).toBe('Test Domain'); // Uses capability data
      expect(result.overallScore).toBe(1.6); // Fallback to base scores only
      expect(result.baseScore).toBe(1.6);
      expect(result.partialCredit).toBe(0);
    });

    it('should handle missing capability gracefully', () => {
      const result = scoringService.calculateCapabilityScore(null as any, mockDefinition);

      expect(result.capabilityArea).toBe('Unknown');
      expect(result.domain).toBe('Unknown');
      expect(result.overallScore).toBe(0);
      expect(result.baseScore).toBe(0);
      expect(result.partialCredit).toBe(0);
    });
  });

  describe('calculateOverallScore', () => {
    const mockAssessment: Assessment = {
      id: 'test-assessment',
      stateName: 'Test State',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
      status: 'in-progress',
      metadata: {
        assessmentVersion: '1.0',
      },
      capabilities: [
        {
          id: 'capability-1',
          capabilityDomainName: 'Domain 1',
          capabilityAreaName: 'Capability 1',
          status: 'in-progress',
          dimensions: {
            outcome: {
              maturityLevel: 2,
              evidence: '',
              barriers: '',
              plans: '',
              notes: '',
              lastUpdated: '2024-01-01',
              checkboxes: { 'level2-0': true },
            },
            role: {
              maturityLevel: 3,
              evidence: '',
              barriers: '',
              plans: '',
              notes: '',
              lastUpdated: '2024-01-01',
              checkboxes: {},
            },
            businessProcess: {
              maturityLevel: 1,
              evidence: '',
              barriers: '',
              plans: '',
              notes: '',
              lastUpdated: '2024-01-01',
              checkboxes: {},
            },
            information: {
              maturityLevel: 2,
              evidence: '',
              barriers: '',
              plans: '',
              notes: '',
              lastUpdated: '2024-01-01',
              checkboxes: {},
            },
            technology: {
              maturityLevel: 1,
              evidence: '',
              barriers: '',
              plans: '',
              notes: '',
              lastUpdated: '2024-01-01',
              checkboxes: {},
            },
          },
        },
      ],
    };

    const mockDefinitions: CapabilityDefinition[] = [
      {
        id: 'capability-1',
        capabilityDomainName: 'Domain 1',
        capabilityAreaName: 'Capability 1',
        capabilityVersion: '1.0',
        capabilityAreaCreated: '2024-01-01',
        capabilityAreaLastUpdated: '2024-01-01',
        description: 'Test description',
        domainDescription: 'Test domain description',
        areaDescription: 'Test area description',
        dimensions: {
          outcome: {
            description: 'Outcome dimension',
            maturityAssessment: [],
            maturityLevels: { level1: '', level2: '', level3: '', level4: '', level5: '' },
            checkboxItems: { level2: ['Item 1', 'Item 2'] },
          },
          role: {
            description: 'Role dimension',
            maturityAssessment: [],
            maturityLevels: { level1: '', level2: '', level3: '', level4: '', level5: '' },
            checkboxItems: {},
          },
          businessProcess: {
            description: 'Business Process dimension',
            maturityAssessment: [],
            maturityLevels: { level1: '', level2: '', level3: '', level4: '', level5: '' },
            checkboxItems: {},
          },
          information: {
            description: 'Information dimension',
            maturityAssessment: [],
            maturityLevels: { level1: '', level2: '', level3: '', level4: '', level5: '' },
            checkboxItems: {},
          },
          technology: {
            description: 'Technology dimension',
            maturityAssessment: [],
            maturityLevels: { level1: '', level2: '', level3: '', level4: '', level5: '' },
            checkboxItems: {},
          },
        },
      },
    ];

    it('should calculate overall scores correctly', () => {
      const result = scoringService.calculateOverallScore(mockAssessment, mockDefinitions);

      expect(result).toHaveLength(1);
      expect(result[0].capabilityArea).toBe('Capability 1');
      expect(result[0].domain).toBe('Domain 1');
      expect(result[0].overallScore).toBeGreaterThan(0);
    });

    it('should handle missing definitions gracefully', () => {
      const result = scoringService.calculateOverallScore(mockAssessment, []);

      expect(result).toHaveLength(1);
      expect(result[0].overallScore).toBe(1.8); // Fallback calculation
    });

    it('should handle invalid assessment gracefully', () => {
      const result = scoringService.calculateOverallScore(null as any, mockDefinitions);

      expect(result).toEqual([]);
    });

    it('should handle empty capabilities array', () => {
      const emptyAssessment = { ...mockAssessment, capabilities: [] };
      const result = scoringService.calculateOverallScore(emptyAssessment, mockDefinitions);

      expect(result).toEqual([]);
    });
  });

  describe('shouldPromptLevelAdvancement', () => {
    const mockCheckboxItems: CheckboxItems = {
      level1: ['Item 1', 'Item 2'],
      level2: ['Item 1', 'Item 2', 'Item 3'],
      level3: ['Item 1'],
    };

    it('should return true when all checkboxes are completed', () => {
      const dimension: DimensionAssessment = {
        maturityLevel: 2,
        evidence: '',
        barriers: '',
        plans: '',
        notes: '',
        lastUpdated: '2024-01-01',
        checkboxes: {
          'level2-0': true,
          'level2-1': true,
          'level2-2': true,
        },
      };

      const result = scoringService.shouldPromptLevelAdvancement(dimension, mockCheckboxItems);
      expect(result).toBe(true);
    });

    it('should return false when not all checkboxes are completed', () => {
      const dimension: DimensionAssessment = {
        maturityLevel: 2,
        evidence: '',
        barriers: '',
        plans: '',
        notes: '',
        lastUpdated: '2024-01-01',
        checkboxes: {
          'level2-0': true,
          'level2-1': false,
          'level2-2': true,
        },
      };

      const result = scoringService.shouldPromptLevelAdvancement(dimension, mockCheckboxItems);
      expect(result).toBe(false);
    });

    it('should return false when no maturity level is selected', () => {
      const dimension: DimensionAssessment = {
        maturityLevel: 0,
        evidence: '',
        barriers: '',
        plans: '',
        notes: '',
        lastUpdated: '2024-01-01',
        checkboxes: {},
      };

      const result = scoringService.shouldPromptLevelAdvancement(dimension, mockCheckboxItems);
      expect(result).toBe(false);
    });

    it('should return false when at maximum level', () => {
      const dimension: DimensionAssessment = {
        maturityLevel: 5,
        evidence: '',
        barriers: '',
        plans: '',
        notes: '',
        lastUpdated: '2024-01-01',
        checkboxes: {},
      };

      const result = scoringService.shouldPromptLevelAdvancement(dimension, mockCheckboxItems);
      expect(result).toBe(false);
    });

    it('should return false when no checkboxes exist for the level', () => {
      const dimension: DimensionAssessment = {
        maturityLevel: 4,
        evidence: '',
        barriers: '',
        plans: '',
        notes: '',
        lastUpdated: '2024-01-01',
        checkboxes: {},
      };

      const result = scoringService.shouldPromptLevelAdvancement(dimension, mockCheckboxItems);
      expect(result).toBe(false);
    });

    it('should handle invalid dimension data gracefully', () => {
      const result = scoringService.shouldPromptLevelAdvancement(null as any, mockCheckboxItems);
      expect(result).toBe(false);
    });
  });

  describe('validateCheckboxData', () => {
    const mockCheckboxItems: CheckboxItems = {
      level1: ['Item 1', 'Item 2'],
      level2: ['Item 1', 'Item 2', 'Item 3'],
    };

    it('should return null for valid data', () => {
      const dimension: DimensionAssessment = {
        maturityLevel: 2,
        evidence: '',
        barriers: '',
        plans: '',
        notes: '',
        lastUpdated: '2024-01-01',
        checkboxes: {
          'level2-0': true,
          'level2-1': false,
          'level2-2': true,
        },
      };

      const result = scoringService.validateCheckboxData(dimension, mockCheckboxItems);
      expect(result).toBeNull();
    });

    it('should return error for missing dimension data', () => {
      const result = scoringService.validateCheckboxData(null as any, mockCheckboxItems);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('missing_data');
      expect(result?.message).toBe('Dimension assessment data is missing');
    });

    it('should return error for invalid maturity level', () => {
      const dimension: DimensionAssessment = {
        maturityLevel: 6,
        evidence: '',
        barriers: '',
        plans: '',
        notes: '',
        lastUpdated: '2024-01-01',
        checkboxes: {},
      };

      const result = scoringService.validateCheckboxData(dimension, mockCheckboxItems);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('invalid_data');
      expect(result?.message).toBe('Invalid maturity level');
    });

    it('should return error for orphaned checkbox data', () => {
      const dimension: DimensionAssessment = {
        maturityLevel: 2,
        evidence: '',
        barriers: '',
        plans: '',
        notes: '',
        lastUpdated: '2024-01-01',
        checkboxes: {
          'level2-0': true,
          'level2-1': false,
          'level2-2': true,
          'level2-5': true, // This is orphaned - only 3 items exist (0,1,2)
        },
      };

      const result = scoringService.validateCheckboxData(dimension, mockCheckboxItems);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('invalid_data');
      expect(result?.message).toBe('Orphaned checkbox data detected');
      expect(result?.context?.orphanedKeys).toEqual(['level2-5']);
    });
  });

  describe('getScoringSummary', () => {
    const mockScores = [
      {
        capabilityArea: 'Capability 1',
        domain: 'Domain 1',
        overallScore: 2.5,
        baseScore: 2.0,
        partialCredit: 0.5,
        dimensionScores: {} as any,
      },
      {
        capabilityArea: 'Capability 2',
        domain: 'Domain 1',
        overallScore: 3.0,
        baseScore: 3.0,
        partialCredit: 0.0,
        dimensionScores: {} as any,
      },
      {
        capabilityArea: 'Capability 3',
        domain: 'Domain 2',
        overallScore: 0.0,
        baseScore: 0.0,
        partialCredit: 0.0,
        dimensionScores: {} as any,
      },
    ];

    it('should calculate correct summary statistics', () => {
      const result = scoringService.getScoringSummary(mockScores);

      expect(result.overallAverage).toBe(1.83); // (2.5 + 3.0 + 0.0) / 3
      expect(result.baseAverage).toBe(1.67); // (2.0 + 3.0 + 0.0) / 3
      expect(result.partialCreditAverage).toBe(0.17); // (0.5 + 0.0 + 0.0) / 3
      expect(result.totalCapabilities).toBe(3);
      expect(result.completedCapabilities).toBe(2); // Only capabilities with score > 0
    });

    it('should handle empty scores array', () => {
      const result = scoringService.getScoringSummary([]);

      expect(result.overallAverage).toBe(0);
      expect(result.baseAverage).toBe(0);
      expect(result.partialCreditAverage).toBe(0);
      expect(result.totalCapabilities).toBe(0);
      expect(result.completedCapabilities).toBe(0);
    });

    it('should handle invalid input gracefully', () => {
      const result = scoringService.getScoringSummary(null as any);

      expect(result.overallAverage).toBe(0);
      expect(result.baseAverage).toBe(0);
      expect(result.partialCreditAverage).toBe(0);
      expect(result.totalCapabilities).toBe(0);
      expect(result.completedCapabilities).toBe(0);
    });
  });
});
