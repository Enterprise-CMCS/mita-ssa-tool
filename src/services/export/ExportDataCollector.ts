/**
 * Export Data Collector
 * Aggregates all assessment data from multiple sources for export
 */

import ContentService from '../ContentService';
import { ScoringService } from '../ScoringService';

import type { ExportData, ExportError, ExportMetadata } from './types';
import type { Assessment, CapabilityDefinition } from '../../types';

export class ExportDataCollector {
  private contentService: ContentService;
  private scoringService: ScoringService;

  constructor() {
    this.contentService = new ContentService('/content');
    this.scoringService = new ScoringService();
  }

  /**
   * Collect complete export data for an assessment
   */
  async collectExportData(assessment: Assessment): Promise<ExportData> {
    try {
      // Initialize content service if not already done
      if (!this.contentService.isInitialized) {
        await this.contentService.initialize();
      }

      // Collect capability definitions
      const capabilities = await this.collectCapabilityDefinitions(assessment);

      // Calculate enhanced scores
      const scores = this.scoringService.calculateOverallScore(assessment, capabilities);

      // Generate export metadata
      const metadata = this.generateExportMetadata(assessment, scores);

      return {
        assessment,
        scores,
        metadata,
        capabilities,
      };
    } catch (error) {
      throw this.createExportError(
        'data_collection',
        'Failed to collect export data',
        error as Error,
        { assessmentId: assessment.id }
      );
    }
  }

  /**
   * Collect capability definitions for the assessment
   */
  private async collectCapabilityDefinitions(
    assessment: Assessment
  ): Promise<CapabilityDefinition[]> {
    try {
      const definitions: CapabilityDefinition[] = [];

      // Get definitions for each capability in the assessment
      for (const capability of assessment.capabilities) {
        try {
          const definition = await this.contentService.getCapability(capability.id);
          if (definition) {
            definitions.push(definition);
          } else {
            console.warn(`Definition not found for capability ${capability.id}`);
          }
        } catch (error) {
          console.warn(`Failed to load definition for capability ${capability.id}:`, error);
        }
      }

      return definitions;
    } catch (error) {
      console.warn('Failed to load capability definitions, using empty array:', error);
      return [];
    }
  }

  /**
   * Generate export metadata
   */
  private generateExportMetadata(assessment: Assessment, scores: any[]): ExportMetadata {
    const now = new Date().toISOString();

    // Calculate completion percentage
    const completedCapabilities = scores.filter(score => score.overallScore > 0).length;
    const completionPercentage =
      scores.length > 0 ? Math.round((completedCapabilities / scores.length) * 100) : 0;

    return {
      exportedAt: now,
      exportVersion: '1.0.0',
      schemaVersion: '1.0',
      systemName: assessment.metadata?.systemName,
      lastSavedAt: assessment.updatedAt,
      completionPercentage,
    };
  }

  /**
   * Validate assessment data completeness
   */
  async validateAssessmentData(assessment: Assessment): Promise<{
    isValid: boolean;
    warnings: string[];
    errors: string[];
  }> {
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      // Check basic assessment structure
      if (!assessment) {
        errors.push('Assessment data is missing');
        return { isValid: false, warnings, errors };
      }

      if (!assessment.id) {
        errors.push('Assessment ID is missing');
      }

      if (!assessment.stateName) {
        warnings.push('State name is missing');
      }

      if (!assessment.metadata?.systemName) {
        warnings.push('System name is missing - will not be included in export');
      }

      // Check capabilities
      if (!assessment.capabilities || assessment.capabilities.length === 0) {
        errors.push('No capabilities found in assessment');
        return { isValid: false, warnings, errors };
      }

      // Check each capability
      for (const capability of assessment.capabilities) {
        if (!capability.id) {
          warnings.push(`Capability missing ID: ${capability.capabilityAreaName}`);
        }

        if (!capability.capabilityAreaName) {
          warnings.push(`Capability missing area name: ${capability.id}`);
        }

        if (!capability.capabilityDomainName) {
          warnings.push(`Capability missing domain name: ${capability.id}`);
        }

        // Check dimensions
        const dimensions = ['outcome', 'role', 'businessProcess', 'information', 'technology'];
        for (const dimension of dimensions) {
          const dimData = capability.dimensions[dimension as keyof typeof capability.dimensions];
          if (!dimData) {
            warnings.push(
              `Missing ${dimension} dimension data for ${capability.capabilityAreaName}`
            );
          } else {
            if (dimData.maturityLevel === 0) {
              warnings.push(
                `No maturity level selected for ${dimension} in ${capability.capabilityAreaName}`
              );
            }
          }
        }
      }

      const isValid = errors.length === 0;
      return { isValid, warnings, errors };
    } catch (error) {
      errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { isValid: false, warnings, errors };
    }
  }

  /**
   * Get export data summary for progress tracking
   */
  getExportDataSummary(assessment: Assessment): {
    totalCapabilities: number;
    completedCapabilities: number;
    totalDimensions: number;
    completedDimensions: number;
    hasSystemName: boolean;
    hasMetadata: boolean;
  } {
    const totalCapabilities = assessment.capabilities?.length || 0;
    const totalDimensions = totalCapabilities * 5; // 5 ORBIT dimensions per capability

    let completedCapabilities = 0;
    let completedDimensions = 0;

    if (assessment.capabilities) {
      for (const capability of assessment.capabilities) {
        let capabilityCompleted = false;
        const dimensions = ['outcome', 'role', 'businessProcess', 'information', 'technology'];

        for (const dimension of dimensions) {
          const dimData = capability.dimensions[dimension as keyof typeof capability.dimensions];
          if (dimData && dimData.maturityLevel > 0) {
            completedDimensions++;
            capabilityCompleted = true;
          }
        }

        if (capabilityCompleted) {
          completedCapabilities++;
        }
      }
    }

    return {
      totalCapabilities,
      completedCapabilities,
      totalDimensions,
      completedDimensions,
      hasSystemName: Boolean(assessment.metadata?.systemName),
      hasMetadata: Boolean(assessment.metadata),
    };
  }

  /**
   * Create a standardized export error
   */
  private createExportError(
    type: ExportError['type'],
    message: string,
    originalError?: Error,
    context?: Record<string, unknown>
  ): ExportError {
    return {
      type,
      message,
      originalError,
      context,
      recoverable: type !== 'unknown',
    };
  }
}
