/**
 * Markdown Export Handler
 * Generates structured Markdown document with YAML front matter
 */

import { ExportHandler } from '../types';

import type { ExportData, ExportOptions } from '../types';

export class MarkdownExportHandler extends ExportHandler {
  async generate(data: ExportData, options: ExportOptions): Promise<Blob> {
    try {
      // Generate markdown content
      const markdownContent = this.generateMarkdownContent(data, options);

      // Create blob with proper MIME type
      return new Blob([markdownContent], {
        type: this.getMimeType(),
      });
    } catch (error) {
      throw new Error(
        `Failed to generate Markdown export: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  getFileExtension(): string {
    return 'md';
  }

  getMimeType(): string {
    return 'text/markdown';
  }

  getFormatName(): string {
    return 'Markdown';
  }

  getFormatDescription(): string {
    return 'Well-structured Markdown document with YAML front matter, ideal for documentation and version control';
  }

  /**
   * Generate complete markdown content
   */
  private generateMarkdownContent(data: ExportData, options: ExportOptions): string {
    const sections: string[] = [];

    // Add YAML front matter
    sections.push(this.generateYAMLFrontMatter(data));

    // Add main title and introduction
    sections.push(this.generateIntroduction(data));

    // Add assessment summary
    sections.push(this.generateAssessmentSummary(data));

    // Add detailed results by domain
    sections.push(this.generateDetailedResults(data, options));

    // Add scoring methodology if details are included
    if (options.includeDetails) {
      sections.push(this.generateScoringMethodology());
    }

    return sections.join('\n\n');
  }

  /**
   * Generate YAML front matter with assessment metadata
   */
  private generateYAMLFrontMatter(data: ExportData): string {
    const frontMatter = {
      title: `MITA Assessment Export - ${data.assessment.stateName}`,
      assessment_id: data.assessment.id,
      state_name: data.assessment.stateName,
      system_name: data.metadata.systemName || null,
      created_at: data.assessment.createdAt,
      updated_at: data.assessment.updatedAt,
      status: data.assessment.status,
      exported_at: data.metadata.exportedAt,
      export_version: data.metadata.exportVersion,
      schema_version: data.metadata.schemaVersion,
      completion_percentage: data.metadata.completionPercentage,
      total_capabilities: data.assessment.capabilities.length,
      completed_capabilities: data.scores.filter(score => score.overallScore > 0).length,
      overall_average: this.calculateOverallAverage(data.scores),
    };

    const yamlLines = ['---'];
    for (const [key, value] of Object.entries(frontMatter)) {
      if (value === null) {
        yamlLines.push(`${key}: null`);
      } else if (typeof value === 'string') {
        yamlLines.push(`${key}: "${value}"`);
      } else {
        yamlLines.push(`${key}: ${value}`);
      }
    }
    yamlLines.push('---');

    return yamlLines.join('\n');
  }

  /**
   * Generate introduction section
   */
  private generateIntroduction(data: ExportData): string {
    const lines = [
      '# MITA Assessment Export',
      '',
      `This document contains the complete MITA maturity assessment results for **${data.assessment.stateName}**.`,
    ];

    if (data.metadata.systemName) {
      lines.push(`The assessment covers the **${data.metadata.systemName}** system.`);
    }

    lines.push(
      '',
      `- **Assessment Status:** ${this.formatStatus(data.assessment.status)}`,
      `- **Created:** ${this.formatDate(data.assessment.createdAt)}`,
      `- **Last Updated:** ${this.formatDate(data.assessment.updatedAt)}`,
      `- **Exported:** ${this.formatDate(data.metadata.exportedAt)}`,
      `- **Completion:** ${data.metadata.completionPercentage}%`
    );

    return lines.join('\n');
  }

  /**
   * Generate assessment summary section
   */
  private generateAssessmentSummary(data: ExportData): string {
    const lines = ['## Assessment Summary', ''];

    // Overall statistics
    const totalCapabilities = data.assessment.capabilities.length;
    const completedCapabilities = data.scores.filter(score => score.overallScore > 0).length;
    const overallAverage = this.calculateOverallAverage(data.scores);
    const uniqueDomains = new Set(data.scores.map(score => score.domain)).size;

    lines.push(
      '### Key Metrics',
      '',
      `- **Overall Average Score:** ${overallAverage.toFixed(2)} out of 5.0`,
      `- **Capability Areas Assessed:** ${completedCapabilities} of ${totalCapabilities}`,
      `- **Domains Covered:** ${uniqueDomains}`,
      `- **Assessment Completion:** ${data.metadata.completionPercentage}%`,
      ''
    );

    // Domain summary
    const domainSummary = this.calculateDomainSummary(data.scores);
    if (domainSummary.length > 0) {
      lines.push('### Domain Summary', '');

      for (const domain of domainSummary) {
        lines.push(
          `- **${domain.name}:** ${domain.average.toFixed(2)} average (${domain.count} capabilities)`
        );
      }
      lines.push('');
    }

    // Top performing areas
    const topPerformers = data.scores
      .filter(score => score.overallScore > 0)
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, 3);

    if (topPerformers.length > 0) {
      lines.push('### Top Performing Areas', '');
      topPerformers.forEach((score, index) => {
        lines.push(
          `${index + 1}. **${score.capabilityArea}** (${score.domain}): ${score.overallScore.toFixed(2)}`
        );
      });
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Generate detailed results by domain and capability
   */
  private generateDetailedResults(data: ExportData, options: ExportOptions): string {
    const lines = ['## Detailed Assessment Results', ''];

    // Group capabilities by domain
    const domainGroups = this.groupCapabilitiesByDomain(data.scores, data.assessment.capabilities);

    for (const [domainName, capabilities] of domainGroups) {
      lines.push(`### ${domainName}`, '');

      for (const capability of capabilities) {
        const score = data.scores.find(s => s.capabilityArea === capability.capabilityAreaName);
        const assessmentData = data.assessment.capabilities.find(
          c => c.capabilityAreaName === capability.capabilityAreaName
        );

        if (!score || !assessmentData) {
          continue;
        }

        lines.push(`#### ${capability.capabilityAreaName}`, '');

        // Overall score information
        lines.push(
          `- **Overall Score:** ${score.overallScore.toFixed(2)} out of 5.0`,
          `- **Base Maturity Level:** ${score.baseScore.toFixed(1)}`,
          `- **Checkbox Bonus:** +${score.partialCredit.toFixed(2)}`,
          `- **Status:** ${this.formatStatus(capability.status)}`,
          ''
        );

        // ORBIT dimension scores
        lines.push('##### ORBIT Dimension Scores', '');

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

          lines.push(`**${label}:**`);
          lines.push(`- Maturity Level: ${dimScore.maturityLevel}`);
          lines.push(`- Final Score: ${dimScore.finalScore.toFixed(2)}`);

          if (dimScore.partialCredit > 0) {
            lines.push(`- Partial Credit: +${dimScore.partialCredit.toFixed(2)}`);
          }

          if (dimScore.checkboxCompletion.total > 0) {
            lines.push(
              `- Checkbox Completion: ${dimScore.checkboxCompletion.completed}/${dimScore.checkboxCompletion.total} (${dimScore.checkboxCompletion.percentage.toFixed(1)}%)`
            );
          }

          lines.push('');

          // Include detailed text content if requested
          if (options.includeDetails && dimData) {
            if (dimData.evidence) {
              lines.push('**Supporting Attestation:**');
              lines.push(this.formatTextContent(dimData.evidence));
              lines.push('');
            }

            if (dimData.barriers) {
              lines.push('**Barriers and Challenges:**');
              lines.push(this.formatTextContent(dimData.barriers));
              lines.push('');
            }

            if (dimData.plans) {
              lines.push('**Outcomes-Based Advancement Plans:**');
              lines.push(this.formatTextContent(dimData.plans));
              lines.push('');
            }

            if (dimData.notes) {
              lines.push('**Additional Notes:**');
              lines.push(this.formatTextContent(dimData.notes));
              lines.push('');
            }
          }
        }

        lines.push('---', ''); // Separator between capabilities
      }
    }

    return lines.join('\n');
  }

  /**
   * Generate scoring methodology section
   */
  private generateScoringMethodology(): string {
    return [
      '## Scoring Methodology',
      '',
      'This assessment uses the enhanced MITA scoring methodology with partial credit:',
      '',
      '### Base Scoring',
      '- Each ORBIT dimension receives a base maturity level score (1-5)',
      '- The overall capability score is the average of all five dimension scores',
      '',
      '### Partial Credit',
      '- Additional points are awarded based on checkbox completion within each maturity level',
      '- Partial credit ranges from 0.0 to 1.0 points per dimension',
      '- Final dimension score = Base maturity level + Partial credit',
      '',
      '### Overall Calculation',
      '- Overall Score = Average of all five enhanced dimension scores',
      '- Base Score = Average of base maturity levels only',
      '- Partial Credit = Average of all partial credit bonuses',
      '',
      '### ORBIT Dimensions',
      '- **Outcomes:** Business outcomes and value delivered',
      '- **Roles:** Organizational roles and responsibilities',
      '- **Business Process:** Business processes and workflows',
      '- **Information:** Data and information management',
      '- **Technology:** Technical infrastructure and capabilities',
    ].join('\n');
  }

  /**
   * Group capabilities by domain
   */
  private groupCapabilitiesByDomain(scores: any[], capabilities: any[]): Map<string, any[]> {
    const domainGroups = new Map<string, any[]>();

    for (const capability of capabilities) {
      const domainName = capability.capabilityDomainName;
      if (!domainGroups.has(domainName)) {
        domainGroups.set(domainName, []);
      }
      const domainCapabilities = domainGroups.get(domainName);
      if (domainCapabilities) {
        domainCapabilities.push(capability);
      }
    }

    // Sort capabilities within each domain
    for (const [_domain, caps] of domainGroups) {
      caps.sort((a, b) => a.capabilityAreaName.localeCompare(b.capabilityAreaName));
    }

    return domainGroups;
  }

  /**
   * Calculate domain summary statistics
   */
  private calculateDomainSummary(
    scores: any[]
  ): Array<{ name: string; average: number; count: number }> {
    const domainStats = new Map<string, { total: number; count: number }>();

    for (const score of scores) {
      if (score.overallScore > 0) {
        const domain = score.domain;
        if (!domainStats.has(domain)) {
          domainStats.set(domain, { total: 0, count: 0 });
        }
        const stats = domainStats.get(domain);
        if (stats) {
          stats.total += score.overallScore;
          stats.count += 1;
        }
      }
    }

    return Array.from(domainStats.entries())
      .map(([name, stats]) => ({
        name,
        average: stats.total / stats.count,
        count: stats.count,
      }))
      .sort((a, b) => b.average - a.average);
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

  /**
   * Format status for display
   */
  private formatStatus(status: string): string {
    switch (status) {
      case 'not-started':
        return 'Not Started';
      case 'in-progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      default:
        return status;
    }
  }

  /**
   * Format date for display
   */
  private formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  }

  /**
   * Format text content with proper line breaks
   */
  private formatTextContent(text: string): string {
    if (!text || text.trim() === '') {
      return '*No content provided*';
    }

    // Split into paragraphs and format each one
    return text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => `> ${line}`)
      .join('\n>\n');
  }
}
