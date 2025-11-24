/**
 * JSON Export Handler
 * Generates complete JSON representation of assessment data
 */

import { ExportHandler } from '../types';

import type { Assessment } from '../../../types';
import type { ExportData, ExportOptions } from '../types';

export class JSONExportHandler extends ExportHandler {
  async generate(data: ExportData, options: ExportOptions): Promise<Blob> {
    try {
      // Create complete JSON export structure
      const exportObject = {
        exportMetadata: {
          exportedAt: data.metadata.exportedAt,
          exportVersion: data.metadata.exportVersion,
          schemaVersion: data.metadata.schemaVersion,
          exportFormat: 'json',
          includeDetails: options.includeDetails ?? true,
          includeCheckboxDetails: options.includeCheckboxDetails ?? true,
        },
        assessment: this.serializeAssessment(data.assessment),
        enhancedScores: this.serializeScores(data.scores),
        capabilityDefinitions: this.serializeCapabilityDefinitions(data.capabilities),
        metadata: {
          totalCapabilities: data.assessment.capabilities.length,
          completedCapabilities: data.scores.filter(score => score.overallScore > 0).length,
          overallAverage: this.calculateOverallAverage(data.scores),
          exportSummary: {
            hasSystemName: Boolean(data.metadata.systemName),
            completionPercentage: data.metadata.completionPercentage,
            lastSavedAt: data.metadata.lastSavedAt,
          },
        },
      };

      // Serialize to JSON with proper formatting
      const jsonString = JSON.stringify(exportObject, null, 2);

      // Create blob with proper MIME type
      return new Blob([jsonString], {
        type: this.getMimeType(),
      });
    } catch (error) {
      throw new Error(
        `Failed to generate JSON export: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  getFileExtension(): string {
    return 'json';
  }

  getMimeType(): string {
    return 'application/json';
  }

  getFormatName(): string {
    return 'JSON';
  }

  getFormatDescription(): string {
    return 'Complete data preservation in JSON format, suitable for backup and future import functionality';
  }

  /**
   * Serialize assessment data with proper typing and null handling
   */
  private serializeAssessment(assessment: Assessment): Record<string, unknown> {
    return {
      id: assessment.id || null,
      stateName: assessment.stateName || null,
      createdAt: assessment.createdAt || null,
      updatedAt: assessment.updatedAt || null,
      status: assessment.status || 'not-started',
      metadata: {
        assessmentVersion: assessment.metadata?.assessmentVersion || null,
        systemName: assessment.metadata?.systemName || null,
        completedBy: assessment.metadata?.completedBy || null,
        completionDate: assessment.metadata?.completionDate || null,
        notes: assessment.metadata?.notes || null,
      },
      capabilities:
        assessment.capabilities?.map(capability => ({
          id: capability.id || null,
          capabilityDomainName: capability.capabilityDomainName || null,
          capabilityAreaName: capability.capabilityAreaName || null,
          status: capability.status || 'not-started',
          dimensions: {
            outcome: this.serializeDimension(capability.dimensions?.outcome),
            role: this.serializeDimension(capability.dimensions?.role),
            businessProcess: this.serializeDimension(capability.dimensions?.businessProcess),
            information: this.serializeDimension(capability.dimensions?.information),
            technology: this.serializeDimension(capability.dimensions?.technology),
          },
        })) || [],
    };
  }

  /**
   * Serialize dimension data with complete checkbox states
   */
  private serializeDimension(dimension: any): any {
    if (!dimension) {
      return {
        maturityLevel: 0,
        evidence: '',
        barriers: '',
        plans: '',
        notes: '',
        targetMaturityLevel: null,
        lastUpdated: null,
        checkboxes: {},
      };
    }

    return {
      maturityLevel: dimension.maturityLevel || 0,
      evidence: dimension.evidence || '',
      barriers: dimension.barriers || '',
      plans: dimension.plans || '',
      notes: dimension.notes || '',
      targetMaturityLevel: dimension.targetMaturityLevel || null,
      lastUpdated: dimension.lastUpdated || null,
      checkboxes: dimension.checkboxes || {},
    };
  }

  /**
   * Serialize enhanced scores with all calculation details
   */
  private serializeScores(scores: any[]): any[] {
    return scores.map(score => ({
      capabilityArea: score.capabilityArea || null,
      domain: score.domain || null,
      overallScore: this.roundToDecimal(score.overallScore, 2),
      baseScore: this.roundToDecimal(score.baseScore, 2),
      partialCredit: this.roundToDecimal(score.partialCredit, 2),
      dimensionScores: {
        outcome: this.serializeDimensionScore(score.dimensionScores?.outcome),
        role: this.serializeDimensionScore(score.dimensionScores?.role),
        businessProcess: this.serializeDimensionScore(score.dimensionScores?.businessProcess),
        information: this.serializeDimensionScore(score.dimensionScores?.information),
        technology: this.serializeDimensionScore(score.dimensionScores?.technology),
      },
    }));
  }

  /**
   * Serialize dimension score with checkbox completion details
   */
  private serializeDimensionScore(dimensionScore: any): any {
    if (!dimensionScore) {
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

    return {
      maturityLevel: dimensionScore.maturityLevel || 0,
      partialCredit: this.roundToDecimal(dimensionScore.partialCredit, 2),
      finalScore: this.roundToDecimal(dimensionScore.finalScore, 2),
      checkboxCompletion: {
        completed: dimensionScore.checkboxCompletion?.completed || 0,
        total: dimensionScore.checkboxCompletion?.total || 0,
        percentage: this.roundToDecimal(dimensionScore.checkboxCompletion?.percentage, 2),
      },
    };
  }

  /**
   * Serialize capability definitions for reference
   */
  private serializeCapabilityDefinitions(definitions: any[]): any[] {
    return definitions.map(definition => ({
      id: definition.id || null,
      capabilityDomainName: definition.capabilityDomainName || null,
      capabilityAreaName: definition.capabilityAreaName || null,
      capabilityVersion: definition.capabilityVersion || null,
      capabilityAreaCreated: definition.capabilityAreaCreated || null,
      capabilityAreaLastUpdated: definition.capabilityAreaLastUpdated || null,
      description: definition.description || '',
      domainDescription: definition.domainDescription || '',
      areaDescription: definition.areaDescription || '',
      dimensions: {
        outcome: this.serializeDimensionDefinition(definition.dimensions?.outcome),
        role: this.serializeDimensionDefinition(definition.dimensions?.role),
        businessProcess: this.serializeDimensionDefinition(definition.dimensions?.businessProcess),
        information: this.serializeDimensionDefinition(definition.dimensions?.information),
        technology: this.serializeDimensionDefinition(definition.dimensions?.technology),
      },
    }));
  }

  /**
   * Serialize dimension definition with checkbox items
   */
  private serializeDimensionDefinition(dimensionDef: any): any {
    if (!dimensionDef) {
      return {
        description: '',
        maturityAssessment: [],
        maturityLevels: {
          level1: '',
          level2: '',
          level3: '',
          level4: '',
          level5: '',
        },
        checkboxItems: {},
      };
    }

    return {
      description: dimensionDef.description || '',
      maturityAssessment: dimensionDef.maturityAssessment || [],
      maturityLevels: {
        level1: dimensionDef.maturityLevels?.level1 || '',
        level2: dimensionDef.maturityLevels?.level2 || '',
        level3: dimensionDef.maturityLevels?.level3 || '',
        level4: dimensionDef.maturityLevels?.level4 || '',
        level5: dimensionDef.maturityLevels?.level5 || '',
      },
      checkboxItems: {
        level1: dimensionDef.checkboxItems?.level1 || [],
        level2: dimensionDef.checkboxItems?.level2 || [],
        level3: dimensionDef.checkboxItems?.level3 || [],
        level4: dimensionDef.checkboxItems?.level4 || [],
        level5: dimensionDef.checkboxItems?.level5 || [],
      },
    };
  }

  /**
   * Calculate overall average score
   */
  private calculateOverallAverage(scores: any[]): number {
    if (!scores || scores.length === 0) {
      return 0;
    }

    const total = scores.reduce((sum, score) => sum + (score.overallScore || 0), 0);
    return this.roundToDecimal(total / scores.length, 2);
  }

  /**
   * Round number to specified decimal places
   */
  private roundToDecimal(value: number | undefined | null, decimals: number): number {
    if (value === null || value === undefined || isNaN(value)) {
      return 0;
    }
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }
}
