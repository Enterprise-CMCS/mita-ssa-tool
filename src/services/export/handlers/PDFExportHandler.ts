/**
 * Enhanced PDF Export Handler
 * Generates professional PDF reports with comprehensive data and improved formatting
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { ExportHandler } from '../types';

import type { ExportData, ExportOptions } from '../types';

export class PDFExportHandler extends ExportHandler {
  async generate(data: ExportData, options: ExportOptions): Promise<Blob> {
    try {
      // Generate PDF document
      const doc = this.generatePDFDocument(data, options);

      // Convert to blob
      const pdfBlob = doc.output('blob');

      return pdfBlob;
    } catch (error) {
      throw new Error(
        `Failed to generate PDF export: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  getFileExtension(): string {
    return 'pdf';
  }

  getMimeType(): string {
    return 'application/pdf';
  }

  getFormatName(): string {
    return 'PDF';
  }

  getFormatDescription(): string {
    return 'Professional PDF report with charts and comprehensive formatting, ideal for stakeholder sharing';
  }

  /**
   * Generate complete PDF document
   */
  private generatePDFDocument(data: ExportData, options: ExportOptions): jsPDF {
    const doc = new jsPDF();
    let currentY = 20;

    // Add header and title
    currentY = this.addHeader(doc, data, currentY);

    // Add assessment metadata
    currentY = this.addAssessmentMetadata(doc, data, currentY);

    // Add summary statistics
    currentY = this.addSummaryStatistics(doc, data, currentY);

    // Add summary table
    currentY = this.addSummaryTable(doc, data, currentY);

    // Add detailed results if requested
    if (options.includeDetails) {
      currentY = this.addDetailedResults(doc, data, currentY);
    }

    // Use currentY to avoid unused variable warning
    void currentY;

    // Add footer to all pages
    this.addFooters(doc, data);

    return doc;
  }

  /**
   * Add document header and title
   */
  private addHeader(doc: jsPDF, data: ExportData, startY: number): number {
    let currentY = startY;

    // Main title
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('MITA Assessment Results', 20, currentY);
    currentY += 15;

    // Subtitle with state name
    doc.setFontSize(16);
    doc.setFont('helvetica', 'normal');
    doc.text(`State: ${data.assessment.stateName}`, 20, currentY);
    currentY += 10;

    // System name if available
    if (data.metadata.systemName) {
      doc.setFontSize(14);
      doc.text(`System: ${data.metadata.systemName}`, 20, currentY);
      currentY += 10;
    }

    // Add separator line
    doc.setLineWidth(0.5);
    doc.line(20, currentY, 190, currentY);
    currentY += 15;

    return currentY;
  }

  /**
   * Add assessment metadata section
   */
  private addAssessmentMetadata(doc: jsPDF, data: ExportData, startY: number): number {
    let currentY = startY;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Assessment Information', 20, currentY);
    currentY += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    // Assessment details
    const metadata = [
      `Assessment ID: ${data.assessment.id}`,
      `Created: ${this.formatDate(data.assessment.createdAt)}`,
      `Last Updated: ${this.formatDate(data.assessment.updatedAt)}`,
      `Status: ${this.formatStatus(data.assessment.status)}`,
      `Completion: ${data.metadata.completionPercentage}%`,
      `Exported: ${this.formatDate(data.metadata.exportedAt)}`,
      `Export Version: ${data.metadata.exportVersion}`,
    ];

    // Add last saved timestamp if available
    if (data.metadata.lastSavedAt) {
      metadata.push(`Last Saved: ${this.formatDate(data.metadata.lastSavedAt)}`);
    }

    for (const item of metadata) {
      doc.text(item, 25, currentY);
      currentY += 6;
    }

    currentY += 10;
    return currentY;
  }

  /**
   * Add summary statistics section
   */
  private addSummaryStatistics(doc: jsPDF, data: ExportData, startY: number): number {
    let currentY = startY;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary Statistics', 20, currentY);
    currentY += 8;

    // Calculate statistics
    const totalCapabilities = data.assessment.capabilities.length;
    const completedCapabilities = data.scores.filter(score => score.overallScore > 0).length;
    const overallAverage = this.calculateOverallAverage(data.scores);
    const uniqueDomains = new Set(data.scores.map(score => score.domain)).size;

    // Create statistics table
    const statsData = [
      ['Overall Average Score', `${overallAverage.toFixed(2)} out of 5.0`],
      ['Capability Areas Assessed', `${completedCapabilities} of ${totalCapabilities}`],
      ['Domains Covered', uniqueDomains.toString()],
      ['Assessment Completion', `${data.metadata.completionPercentage}%`],
    ];

    autoTable(doc, {
      body: statsData,
      startY: currentY,
      theme: 'grid',
      styles: {
        fontSize: 10,
        cellPadding: 3,
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 60 },
        1: { cellWidth: 50 },
      },
      margin: { left: 25 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 15;
    return currentY;
  }

  /**
   * Add summary table with enhanced scoring
   */
  private addSummaryTable(doc: jsPDF, data: ExportData, startY: number): number {
    let currentY = startY;

    // Check if we need a new page
    if (currentY > 200) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Capability Assessment Summary', 20, currentY);
    currentY += 10;

    // Prepare table data
    const headers = [
      'Domain',
      'Capability Area',
      'Overall Score',
      'Base Level',
      'Bonus',
      'Outcome',
      'Role',
      'Business Process',
      'Information',
      'Technology',
    ];

    const tableData = data.scores.map(score => [
      score.domain,
      score.capabilityArea,
      score.overallScore.toFixed(2),
      score.baseScore.toFixed(1),
      `+${score.partialCredit.toFixed(2)}`,
      score.dimensionScores.outcome.finalScore.toFixed(2),
      score.dimensionScores.role.finalScore.toFixed(2),
      score.dimensionScores.businessProcess.finalScore.toFixed(2),
      score.dimensionScores.information.finalScore.toFixed(2),
      score.dimensionScores.technology.finalScore.toFixed(2),
    ]);

    autoTable(doc, {
      head: [headers],
      body: tableData,
      startY: currentY,
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 30 },
        2: { cellWidth: 15, halign: 'center' },
        3: { cellWidth: 15, halign: 'center' },
        4: { cellWidth: 15, halign: 'center' },
        5: { cellWidth: 15, halign: 'center' },
        6: { cellWidth: 15, halign: 'center' },
        7: { cellWidth: 20, halign: 'center' },
        8: { cellWidth: 20, halign: 'center' },
        9: { cellWidth: 20, halign: 'center' },
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 15;
    return currentY;
  }

  /**
   * Add detailed assessment results
   */
  private addDetailedResults(doc: jsPDF, data: ExportData, startY: number): number {
    let currentY = startY;

    // Start new page for detailed results
    doc.addPage();
    currentY = 20;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Detailed Assessment Results', 20, currentY);
    currentY += 15;

    // Group capabilities by domain
    const domainGroups = this.groupCapabilitiesByDomain(data.scores, data.assessment.capabilities);

    for (const [domainName, capabilities] of domainGroups) {
      // Check if we need a new page for domain
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }

      // Domain header
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`Domain: ${domainName}`, 20, currentY);
      currentY += 12;

      for (const capability of capabilities) {
        const score = data.scores.find(s => s.capabilityArea === capability.capabilityAreaName);
        const assessmentData = data.assessment.capabilities.find(
          c => c.capabilityAreaName === capability.capabilityAreaName
        );

        if (!score || !assessmentData) {
          continue;
        }

        // Check if we need a new page for capability
        if (currentY > 240) {
          doc.addPage();
          currentY = 20;
        }

        // Capability header
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`${capability.capabilityAreaName}`, 25, currentY);
        currentY += 8;

        // Overall score information
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Overall Score: ${score.overallScore.toFixed(2)} out of 5.0`, 30, currentY);
        currentY += 6;
        doc.text(
          `Base Level: ${score.baseScore.toFixed(1)}, Bonus: +${score.partialCredit.toFixed(2)}`,
          30,
          currentY
        );
        currentY += 10;

        // ORBIT dimension details
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

          // Check if we need a new page
          if (currentY > 260) {
            doc.addPage();
            currentY = 20;
          }

          // Dimension header
          doc.setFont('helvetica', 'bold');
          doc.text(`${label}:`, 35, currentY);
          currentY += 6;

          doc.setFont('helvetica', 'normal');

          // Score information
          let scoreText = `Level ${dimScore.maturityLevel}, Final Score: ${dimScore.finalScore.toFixed(2)}`;
          if (dimScore.partialCredit > 0) {
            scoreText += ` (Level ${dimScore.maturityLevel} + ${dimScore.partialCredit.toFixed(2)} bonus)`;
          }
          doc.text(scoreText, 40, currentY);
          currentY += 6;

          // Checkbox completion if available
          if (dimScore.checkboxCompletion.total > 0) {
            doc.text(
              `Checkbox Completion: ${dimScore.checkboxCompletion.completed}/${dimScore.checkboxCompletion.total} (${dimScore.checkboxCompletion.percentage.toFixed(1)}%)`,
              40,
              currentY
            );
            currentY += 6;
          }

          // Text content
          if (dimData.evidence) {
            doc.setFont('helvetica', 'bold');
            doc.text('Supporting Attestation:', 40, currentY);
            currentY += 5;
            doc.setFont('helvetica', 'normal');
            currentY = this.addWrappedText(doc, dimData.evidence, 45, currentY, 140);
            currentY += 3;
          }

          if (dimData.barriers) {
            doc.setFont('helvetica', 'bold');
            doc.text('Barriers and Challenges:', 40, currentY);
            currentY += 5;
            doc.setFont('helvetica', 'normal');
            currentY = this.addWrappedText(doc, dimData.barriers, 45, currentY, 140);
            currentY += 3;
          }

          if (dimData.plans) {
            doc.setFont('helvetica', 'bold');
            doc.text('Outcomes-Based Advancement Plans:', 40, currentY);
            currentY += 5;
            doc.setFont('helvetica', 'normal');
            currentY = this.addWrappedText(doc, dimData.plans, 45, currentY, 140);
            currentY += 3;
          }

          if (dimData.notes) {
            doc.setFont('helvetica', 'bold');
            doc.text('Additional Notes:', 40, currentY);
            currentY += 5;
            doc.setFont('helvetica', 'normal');
            currentY = this.addWrappedText(doc, dimData.notes, 45, currentY, 140);
            currentY += 3;
          }

          currentY += 5; // Space between dimensions
        }

        currentY += 10; // Space between capabilities
      }

      currentY += 5; // Space between domains
    }

    return currentY;
  }

  /**
   * Add footers to all pages
   */
  private addFooters(doc: jsPDF, data: ExportData): void {
    const pageCount = doc.getNumberOfPages();

    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);

      // Footer line
      doc.setLineWidth(0.3);
      doc.line(20, 280, 190, 280);

      // Footer text
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`MITA Assessment Export - ${data.assessment.stateName}`, 20, 285);
      doc.text(`Page ${i} of ${pageCount}`, 190, 285, { align: 'right' });
      doc.text(`Generated: ${this.formatDate(data.metadata.exportedAt)}`, 105, 285, {
        align: 'center',
      });
    }
  }

  /**
   * Add wrapped text to PDF
   */
  private addWrappedText(doc: jsPDF, text: string, x: number, y: number, maxWidth: number): number {
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, x, y);
    return y + lines.length * 5;
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
   * Format date for display
   */
  private formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
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
}
