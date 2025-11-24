import type {
  Assessment,
  CapabilityAreaAssessment,
  CapabilityDefinition,
  DimensionAssessment,
  OrbitDimension,
} from '../types';

/**
 * Interface for enhanced maturity score with partial credit
 */
export interface EnhancedMaturityScore {
  capabilityArea: string;
  domain: string;
  overallScore: number;
  baseScore: number;
  partialCredit: number;
  dimensionScores: Record<OrbitDimension, EnhancedDimensionScore>;
}

/**
 * Interface for enhanced dimension score with partial credit details
 */
export interface EnhancedDimensionScore {
  maturityLevel: number;
  partialCredit: number;
  finalScore: number;
  checkboxCompletion: {
    completed: number;
    total: number;
    percentage: number;
  };
}

/**
 * Interface for checkbox items structure
 */
export interface CheckboxItems {
  level1?: string[];
  level2?: string[];
  level3?: string[];
  level4?: string[];
  level5?: string[];
}

/**
 * Interface for scoring error details
 */
export interface ScoringError {
  type: 'missing_data' | 'invalid_data' | 'calculation_error';
  message: string;
  context?: Record<string, unknown>;
}

/**
 * Enhanced scoring service that implements partial credit scoring based on checkbox completion
 */
export class ScoringService {
  /**
   * Calculate enhanced dimension score with partial credit
   */
  calculateDimensionScore(
    dimension: DimensionAssessment,
    checkboxItems: CheckboxItems
  ): EnhancedDimensionScore {
    try {
      // Validate input data
      if (!dimension) {
        throw new Error('Dimension assessment data is required');
      }

      const maturityLevel = dimension.maturityLevel || 0;

      // If no maturity level is selected, return zero score
      if (maturityLevel === 0) {
        return {
          maturityLevel: 0,
          partialCredit: 0,
          finalScore: 0,
          checkboxCompletion: {
            completed: 0,
            total: 0,
            percentage: 0,
          },
        };
      }

      // Get checkbox items for the selected maturity level
      const levelKey = `level${maturityLevel}` as keyof CheckboxItems;
      const levelCheckboxItems = checkboxItems?.[levelKey] || [];
      const totalCheckboxes = levelCheckboxItems.length;

      // If no checkboxes exist for this level, return base score only
      if (totalCheckboxes === 0) {
        return {
          maturityLevel,
          partialCredit: 0,
          finalScore: maturityLevel,
          checkboxCompletion: {
            completed: 0,
            total: 0,
            percentage: 0,
          },
        };
      }

      // Count completed checkboxes for the selected level
      let completedCheckboxes = 0;
      const checkboxes = dimension.checkboxes || {};

      for (let i = 0; i < totalCheckboxes; i++) {
        const checkboxKey = `level${maturityLevel}-${i}`;
        if (checkboxes[checkboxKey] === true) {
          completedCheckboxes++;
        }
      }

      // Calculate partial credit
      const partialCredit = totalCheckboxes > 0 ? completedCheckboxes / totalCheckboxes : 0;
      const finalScore = maturityLevel + partialCredit;
      const completionPercentage =
        totalCheckboxes > 0 ? (completedCheckboxes / totalCheckboxes) * 100 : 0;

      return {
        maturityLevel,
        partialCredit: Math.round(partialCredit * 100) / 100, // Round to 2 decimal places
        finalScore: Math.round(finalScore * 100) / 100, // Round to 2 decimal places
        checkboxCompletion: {
          completed: completedCheckboxes,
          total: totalCheckboxes,
          percentage: Math.round(completionPercentage * 100) / 100,
        },
      };
    } catch (error) {
      // Return fallback score on error
      console.error('Error calculating dimension score:', error);
      return {
        maturityLevel: dimension?.maturityLevel || 0,
        partialCredit: 0,
        finalScore: dimension?.maturityLevel || 0,
        checkboxCompletion: {
          completed: 0,
          total: 0,
          percentage: 0,
        },
      };
    }
  }

  /**
   * Calculate enhanced capability score with partial credit
   */
  calculateCapabilityScore(
    capability: CapabilityAreaAssessment,
    definition: CapabilityDefinition
  ): EnhancedMaturityScore {
    try {
      // Validate input data
      if (!capability) {
        throw new Error('Capability assessment is required');
      }

      if (!definition) {
        throw new Error('Capability definition is required');
      }

      const dimensionScores: Record<OrbitDimension, EnhancedDimensionScore> = {} as Record<
        OrbitDimension,
        EnhancedDimensionScore
      >;

      let totalScore = 0;
      let totalBaseScore = 0;
      let totalPartialCredit = 0;
      const dimensionCount = 5; // ORBIT dimensions

      // Calculate scores for each dimension
      const orbitDimensions: OrbitDimension[] = [
        'outcome',
        'role',
        'businessProcess',
        'information',
        'technology',
      ];

      for (const dimension of orbitDimensions) {
        const dimensionData = capability.dimensions[dimension];
        const dimensionDefinition = definition.dimensions[dimension];
        const checkboxItems = dimensionDefinition?.checkboxItems || {};

        const dimensionScore = this.calculateDimensionScore(dimensionData, checkboxItems);
        dimensionScores[dimension] = dimensionScore;

        totalScore += dimensionScore.finalScore;
        totalBaseScore += dimensionScore.maturityLevel;
        totalPartialCredit += dimensionScore.partialCredit;
      }

      // Calculate overall scores
      const overallScore = totalScore / dimensionCount;
      const baseScore = totalBaseScore / dimensionCount;
      const partialCredit = totalPartialCredit / dimensionCount;

      return {
        capabilityArea: capability.capabilityAreaName,
        domain: capability.capabilityDomainName,
        overallScore: Math.round(overallScore * 100) / 100,
        baseScore: Math.round(baseScore * 100) / 100, // Keep as calculated average for now
        partialCredit: Math.round(partialCredit * 100) / 100,
        dimensionScores,
      };
    } catch (error) {
      console.error('Error calculating capability score:', error);

      // Return fallback score with basic calculation
      const fallbackScores: Record<OrbitDimension, EnhancedDimensionScore> = {} as Record<
        OrbitDimension,
        EnhancedDimensionScore
      >;

      let fallbackTotal = 0;
      const orbitDimensions: OrbitDimension[] = [
        'outcome',
        'role',
        'businessProcess',
        'information',
        'technology',
      ];

      for (const dimension of orbitDimensions) {
        const maturityLevel = capability?.dimensions?.[dimension]?.maturityLevel || 0;
        fallbackScores[dimension] = {
          maturityLevel,
          partialCredit: 0,
          finalScore: maturityLevel,
          checkboxCompletion: {
            completed: 0,
            total: 0,
            percentage: 0,
          },
        };
        fallbackTotal += maturityLevel;
      }

      const fallbackOverall = fallbackTotal / 5;

      return {
        capabilityArea: capability?.capabilityAreaName || 'Unknown',
        domain: capability?.capabilityDomainName || 'Unknown',
        overallScore: Math.round(fallbackOverall * 100) / 100,
        baseScore: Math.round(fallbackOverall * 100) / 100,
        partialCredit: 0,
        dimensionScores: fallbackScores,
      };
    }
  }

  /**
   * Calculate overall assessment score with enhanced scoring
   */
  calculateOverallScore(
    assessment: Assessment,
    definitions: CapabilityDefinition[]
  ): EnhancedMaturityScore[] {
    try {
      // Validate input data
      if (!assessment || !Array.isArray(assessment.capabilities)) {
        throw new Error('Valid assessment with capabilities array is required');
      }

      if (!Array.isArray(definitions)) {
        console.warn('Capability definitions not provided, using fallback scoring');
      }

      const scores: EnhancedMaturityScore[] = [];

      for (const capability of assessment.capabilities) {
        try {
          // Find matching definition
          const definition = definitions?.find(def => def.id === capability.id);

          if (!definition) {
            console.warn(`Definition not found for capability ${capability.id}, using fallback`);
            // Use fallback calculation without checkbox data
            const fallbackScore = this.calculateCapabilityScore(capability, {
              id: capability.id,
              capabilityDomainName: capability.capabilityDomainName,
              capabilityAreaName: capability.capabilityAreaName,
              capabilityVersion: '1.0',
              capabilityAreaCreated: '',
              capabilityAreaLastUpdated: '',
              description: '',
              domainDescription: '',
              areaDescription: '',
              dimensions: {
                outcome: {
                  description: '',
                  maturityAssessment: [],
                  maturityLevels: { level1: '', level2: '', level3: '', level4: '', level5: '' },
                },
                role: {
                  description: '',
                  maturityAssessment: [],
                  maturityLevels: { level1: '', level2: '', level3: '', level4: '', level5: '' },
                },
                businessProcess: {
                  description: '',
                  maturityAssessment: [],
                  maturityLevels: { level1: '', level2: '', level3: '', level4: '', level5: '' },
                },
                information: {
                  description: '',
                  maturityAssessment: [],
                  maturityLevels: { level1: '', level2: '', level3: '', level4: '', level5: '' },
                },
                technology: {
                  description: '',
                  maturityAssessment: [],
                  maturityLevels: { level1: '', level2: '', level3: '', level4: '', level5: '' },
                },
              },
            });
            scores.push(fallbackScore);
            continue;
          }

          const capabilityScore = this.calculateCapabilityScore(capability, definition);
          scores.push(capabilityScore);
        } catch (error) {
          console.error(`Error calculating score for capability ${capability.id}:`, error);
          // Continue with other capabilities even if one fails
        }
      }

      return scores;
    } catch (error) {
      console.error('Error calculating overall assessment scores:', error);
      return [];
    }
  }

  /**
   * Check if user should be prompted to advance to next maturity level
   */
  shouldPromptLevelAdvancement(
    dimension: DimensionAssessment,
    checkboxItems: CheckboxItems
  ): boolean {
    try {
      // Validate input data
      if (!dimension || dimension.maturityLevel === 0) {
        return false;
      }

      const maturityLevel = dimension.maturityLevel;

      // Don't prompt if already at maximum level
      if (maturityLevel >= 5) {
        return false;
      }

      // Get checkbox items for the selected maturity level
      const levelKey = `level${maturityLevel}` as keyof CheckboxItems;
      const levelCheckboxItems = checkboxItems?.[levelKey] || [];
      const totalCheckboxes = levelCheckboxItems.length;

      // If no checkboxes exist, don't prompt
      if (totalCheckboxes === 0) {
        return false;
      }

      // Count completed checkboxes
      let completedCheckboxes = 0;
      const checkboxes = dimension.checkboxes || {};

      for (let i = 0; i < totalCheckboxes; i++) {
        const checkboxKey = `level${maturityLevel}-${i}`;
        if (checkboxes[checkboxKey] === true) {
          completedCheckboxes++;
        }
      }

      // Prompt if all checkboxes are completed
      return completedCheckboxes === totalCheckboxes && totalCheckboxes > 0;
    } catch (error) {
      console.error('Error checking level advancement:', error);
      return false;
    }
  }

  /**
   * Validate checkbox data integrity
   */
  validateCheckboxData(
    dimension: DimensionAssessment,
    checkboxItems: CheckboxItems
  ): ScoringError | null {
    try {
      if (!dimension) {
        return {
          type: 'missing_data',
          message: 'Dimension assessment data is missing',
        };
      }

      const maturityLevel = dimension.maturityLevel;

      if (maturityLevel < 0 || maturityLevel > 5) {
        return {
          type: 'invalid_data',
          message: 'Invalid maturity level',
          context: { maturityLevel },
        };
      }

      if (maturityLevel > 0 && checkboxItems) {
        const levelKey = `level${maturityLevel}` as keyof CheckboxItems;
        const levelCheckboxItems = checkboxItems[levelKey];

        if (levelCheckboxItems && dimension.checkboxes) {
          // Check for orphaned checkbox data
          const validCheckboxKeys = levelCheckboxItems.map(
            (_, index) => `level${maturityLevel}-${index}`
          );
          const actualCheckboxKeys = Object.keys(dimension.checkboxes);

          const orphanedKeys = actualCheckboxKeys.filter(
            key => key.startsWith(`level${maturityLevel}-`) && !validCheckboxKeys.includes(key)
          );

          if (orphanedKeys.length > 0) {
            return {
              type: 'invalid_data',
              message: 'Orphaned checkbox data detected',
              context: { orphanedKeys },
            };
          }
        }
      }

      return null;
    } catch (error) {
      return {
        type: 'calculation_error',
        message: 'Error validating checkbox data',
        context: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  }

  /**
   * Get scoring summary for an assessment
   */
  getScoringSummary(scores: EnhancedMaturityScore[]): {
    overallAverage: number;
    baseAverage: number;
    partialCreditAverage: number;
    totalCapabilities: number;
    completedCapabilities: number;
  } {
    try {
      if (!Array.isArray(scores) || scores.length === 0) {
        return {
          overallAverage: 0,
          baseAverage: 0,
          partialCreditAverage: 0,
          totalCapabilities: 0,
          completedCapabilities: 0,
        };
      }

      const totalCapabilities = scores.length;
      const completedCapabilities = scores.filter(score => score.overallScore > 0).length;

      const overallSum = scores.reduce((sum, score) => sum + score.overallScore, 0);
      const baseSum = scores.reduce((sum, score) => sum + score.baseScore, 0);
      const partialCreditSum = scores.reduce((sum, score) => sum + score.partialCredit, 0);

      return {
        overallAverage: Math.round((overallSum / totalCapabilities) * 100) / 100,
        baseAverage: Math.round((baseSum / totalCapabilities) * 100) / 100,
        partialCreditAverage: Math.round((partialCreditSum / totalCapabilities) * 100) / 100,
        totalCapabilities,
        completedCapabilities,
      };
    } catch (error) {
      console.error('Error calculating scoring summary:', error);
      return {
        overallAverage: 0,
        baseAverage: 0,
        partialCreditAverage: 0,
        totalCapabilities: 0,
        completedCapabilities: 0,
      };
    }
  }
}

// Export as singleton
const scoringService = new ScoringService();
export default scoringService;
