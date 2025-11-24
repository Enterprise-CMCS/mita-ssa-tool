/**
 * Enhanced CSV Export Handler
 * Generates comprehensive CSV with all text fields and checkbox details
 */

import { ExportHandler } from '../types';

import type { ExportData, ExportOptions } from '../types';

export class CSVExportHandler extends ExportHandler {
  async generate(data: ExportData, options: ExportOptions): Promise<Blob> {
    try {
      // Generate CSV content
      const csvContent = this.generateCSVContent(data, options);

      // Create blob with proper MIME type and BOM for Excel compatibility
      const bom = '\uFEFF'; // UTF-8 BOM
      return new Blob([bom + csvContent], {
        type: this.getMimeType(),
      });
    } catch (error) {
      throw new Error(
        `Failed to generate CSV export: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  getFileExtension(): string {
    return 'csv';
  }

  getMimeType(): string {
    return 'text/csv';
  }

  getFormatName(): string {
    return 'CSV';
  }

  getFormatDescription(): string {
    return 'Comprehensive CSV with all text fields and checkbox details, ideal for spreadsheet analysis';
  }

  /**
   * Generate complete CSV content
   */
  private generateCSVContent(data: ExportData, options: ExportOptions): string {
    const rows: string[] = [];

    // Add metadata header
    rows.push(this.generateMetadataSection(data));

    // Add empty row separator
    rows.push('');

    // Add main data headers and rows
    const headers = this.generateHeaders(options);
    rows.push(this.formatCSVRow(headers));

    // Add data rows
    for (const score of data.scores) {
      const assessmentData = data.assessment.capabilities.find(
        c => c.capabilityAreaName === score.capabilityArea
      );

      if (assessmentData) {
        // Create one row per ORBIT dimension for detailed analysis
        const dimensionLabels = {
          outcome: 'Outcomes',
          role: 'Roles',
          businessProcess: 'Business Process',
          information: 'Information',
          technology: 'Technology',
        };

        for (const [dimension, label] of Object.entries(dimensionLabels)) {
          const dimScore = score.dimensionScores[dimension as keyof typeof score.dimensionScores];
          const dimData =
            assessmentData.dimensions[dimension as keyof typeof assessmentData.dimensions];

          const row = this.generateDataRow(
            data,
            score,
            assessmentData,
            dimension,
            label,
            dimScore,
            dimData,
            options
          );

          rows.push(this.formatCSVRow(row));
        }
      }
    }

    return rows.join('\n');
  }

  /**
   * Generate metadata section
   */
  private generateMetadataSection(data: ExportData): string {
    const metadataRows = [
      ['Assessment Export Metadata'],
      ['Assessment ID', data.assessment.id],
      ['State Name', data.assessment.stateName],
      ['System Name', data.metadata.systemName || 'Not specified'],
      ['Created', data.assessment.createdAt],
      ['Last Updated', data.assessment.updatedAt],
      ['Last Saved', data.metadata.lastSavedAt || 'Not available'],
      ['Status', data.assessment.status],
      ['Completion Percentage', `${data.metadata.completionPercentage}%`],
      ['Exported At', data.metadata.exportedAt],
      ['Export Version', data.metadata.exportVersion],
      ['Schema Version', data.metadata.schemaVersion],
      ['Total Capabilities', data.assessment.capabilities.length.toString()],
      ['Completed Capabilities', data.scores.filter(s => s.overallScore > 0).length.toString()],
      ['Overall Average', this.calculateOverallAverage(data.scores).toFixed(2)],
    ];

    return metadataRows.map(row => this.formatCSVRow(row)).join('\n');
  }

  /**
   * Generate CSV headers
   */
  private generateHeaders(options: ExportOptions): string[] {
    const headers = [
      // Basic identification
      'Domain',
      'Capability_Area',
      'Dimension',
      'Dimension_Label',

      // Overall scores
      'Overall_Score',
      'Base_Score',
      'Partial_Credit',

      // Dimension-specific scores
      'Dimension_Maturity_Level',
      'Dimension_Final_Score',
      'Dimension_Partial_Credit',

      // Checkbox completion details
      'Checkboxes_Completed',
      'Checkboxes_Total',
      'Checkbox_Completion_Percentage',
    ];

    // Add text content fields if details are included
    if (options.includeDetails !== false) {
      headers.push(
        'Supporting_Attestation',
        'Barriers_and_Challenges',
        'Outcomes_Based_Advancement_Plans',
        'Additional_Notes'
      );
    }

    // Add checkbox details if requested
    if (options.includeCheckboxDetails) {
      headers.push('Individual_Checkbox_States');
    }

    // Add metadata fields
    headers.push('Last_Updated', 'Target_Maturity_Level', 'Assessment_Status');

    return headers;
  }

  /**
   * Generate data row for a specific dimension
   */
  private generateDataRow(
    data: ExportData,
    score: any,
    assessmentData: any,
    dimension: string,
    dimensionLabel: string,
    dimScore: any,
    dimData: any,
    options: ExportOptions
  ): string[] {
    const row = [
      // Basic identification
      score.domain,
      score.capabilityArea,
      dimension,
      dimensionLabel,

      // Overall scores (same for all dimensions of this capability)
      score.overallScore.toFixed(2),
      score.baseScore.toFixed(2),
      score.partialCredit.toFixed(2),

      // Dimension-specific scores
      dimScore.maturityLevel.toString(),
      dimScore.finalScore.toFixed(2),
      dimScore.partialCredit.toFixed(2),

      // Checkbox completion details
      dimScore.checkboxCompletion.completed.toString(),
      dimScore.checkboxCompletion.total.toString(),
      dimScore.checkboxCompletion.percentage.toFixed(1),
    ];

    // Add text content fields if details are included
    if (options.includeDetails !== false) {
      row.push(
        dimData.evidence || '',
        dimData.barriers || '',
        dimData.plans || '',
        dimData.notes || ''
      );
    }

    // Add checkbox details if requested
    if (options.includeCheckboxDetails) {
      const checkboxStates = this.formatCheckboxStates(dimData.checkboxes, dimScore.maturityLevel);
      row.push(checkboxStates);
    }

    // Add metadata fields
    row.push(
      dimData.lastUpdated || '',
      dimData.targetMaturityLevel?.toString() || '',
      assessmentData.status
    );

    return row;
  }

  /**
   * Format checkbox states for CSV
   */
  private formatCheckboxStates(
    checkboxes: Record<string, boolean> | undefined,
    maturityLevel: number
  ): string {
    if (!checkboxes || maturityLevel === 0) {
      return '';
    }

    const states: string[] = [];

    // Find all checkboxes for the current maturity level
    for (const [key, value] of Object.entries(checkboxes)) {
      if (key.startsWith(`level${maturityLevel}-`)) {
        const index = key.split('-')[1];
        states.push(`${index}:${value ? 'true' : 'false'}`);
      }
    }

    return states.join(';');
  }

  /**
   * Format a CSV row with proper escaping
   */
  private formatCSVRow(values: string[]): string {
    return values.map(value => this.escapeCSVValue(value)).join(',');
  }

  /**
   * Escape CSV value with proper quoting and escaping
   */
  private escapeCSVValue(value: string): string {
    if (value === null || value === undefined) {
      return '';
    }

    const stringValue = value.toString();

    // Check if value needs quoting (contains comma, quote, newline, or starts/ends with whitespace)
    const needsQuoting =
      /[",\n\r]/.test(stringValue) || stringValue.startsWith(' ') || stringValue.endsWith(' ');

    if (needsQuoting) {
      // Escape existing quotes by doubling them
      const escapedValue = stringValue.replace(/"/g, '""');
      return `"${escapedValue}"`;
    }

    return stringValue;
  }

  /**
   * Calculate overall average score
   */
  private calculateOverallAverage(scores: any[]): number {
    if (!scores || scores.length === 0) {
      return 0;
    }

    const total = scores.reduce((sum, score) => sum + (score.overallScore || 0), 0);
    return total / scores.length;
  }
}
