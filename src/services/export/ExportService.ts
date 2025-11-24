/**
 * Export Service
 * Central service for all export operations
 */

import { ExportDataCollector } from './ExportDataCollector';

import type {
  ExportData,
  ExportError,
  ExportFormatInfo,
  ExportHandler,
  ExportOptions,
  ExportProgress,
  ExportResult,
  FilenameOptions,
} from './types';
import type { Assessment } from '../../types';

export class ExportService {
  private dataCollector: ExportDataCollector;
  private formatHandlers: Map<string, ExportHandler>;
  private progressCallback?: (progress: ExportProgress) => void;
  private abortController?: AbortController;

  constructor() {
    this.dataCollector = new ExportDataCollector();
    this.formatHandlers = new Map();
  }

  /**
   * Register a format handler
   */
  registerHandler(format: string, handler: ExportHandler): void {
    this.formatHandlers.set(format, handler);
  }

  /**
   * Get available export formats
   */
  getAvailableFormats(): ExportFormatInfo[] {
    const formats: ExportFormatInfo[] = [];

    for (const [format, handler] of this.formatHandlers) {
      formats.push({
        format: format as ExportOptions['format'],
        name: handler.getFormatName(),
        description: handler.getFormatDescription(),
        extension: handler.getFileExtension(),
        mimeType: handler.getMimeType(),
        supportsCharts: format === 'pdf',
        supportsDetails: true,
        recommendedFor: this.getRecommendedUseCase(format),
      });
    }

    return formats;
  }

  /**
   * Export an assessment
   */
  async exportAssessment(
    assessment: Assessment,
    options: ExportOptions,
    progressCallback?: (progress: ExportProgress) => void
  ): Promise<ExportResult> {
    this.progressCallback = progressCallback;
    this.abortController = new AbortController();

    try {
      // Validate inputs
      if (!assessment) {
        throw new Error('Assessment is required');
      }

      if (!this.formatHandlers.has(options.format)) {
        throw new Error(`Unsupported export format: ${options.format}`);
      }

      // Report progress: Data collection
      this.reportProgress('collecting', 10, 'Collecting assessment data...');

      // Collect export data
      const exportData = await this.collectExportData(assessment);

      if (this.abortController.signal.aborted) {
        throw new Error('Export cancelled');
      }

      // Report progress: Processing
      this.reportProgress('processing', 40, 'Processing assessment data...');

      // Validate data
      const validation = await this.dataCollector.validateAssessmentData(assessment);
      if (!validation.isValid) {
        console.warn('Assessment data validation warnings:', validation.warnings);
        console.error('Assessment data validation errors:', validation.errors);
      }

      if (this.abortController.signal.aborted) {
        throw new Error('Export cancelled');
      }

      // Report progress: Generating
      this.reportProgress('generating', 70, `Generating ${options.format.toUpperCase()} file...`);

      // Generate export file
      const handler = this.formatHandlers.get(options.format);
      if (!handler) {
        throw new Error(`Handler not found for format: ${options.format}`);
      }
      const blob = await handler.generate(exportData, options);

      if (this.abortController.signal.aborted) {
        throw new Error('Export cancelled');
      }

      // Generate filename
      const filename = await this.generateFilename(assessment, options);

      // Report progress: Complete
      this.reportProgress('complete', 100, 'Export completed successfully');

      // Trigger download
      await this.downloadFile(blob, filename);

      return {
        success: true,
        filename,
        size: blob.size,
        blob,
      };
    } catch (error) {
      const exportError = this.handleExportError(error as Error);

      this.reportProgress('error', 0, exportError.message);

      return {
        success: false,
        filename: '',
        error: exportError.message,
      };
    } finally {
      this.progressCallback = undefined;
      this.abortController = undefined;
    }
  }

  /**
   * Cancel ongoing export
   */
  cancelExport(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  /**
   * Generate filename for export
   */
  async generateFilename(assessment: Assessment, options: ExportOptions): Promise<string> {
    const filenameOptions: FilenameOptions = {
      assessmentName: `mita-assessment-${assessment.id}`,
      systemName: assessment.metadata?.systemName,
      stateName: assessment.stateName,
      format: options.format,
      timestamp: new Date(),
      customName: options.customFilename,
    };

    return this.buildFilename(filenameOptions);
  }

  /**
   * Build filename from options
   */
  private buildFilename(options: FilenameOptions): string {
    const parts: string[] = [];

    // Use custom name if provided
    if (options.customName) {
      parts.push(this.sanitizeFilename(options.customName));
    } else {
      // Build standard filename
      if (options.systemName) {
        parts.push(this.sanitizeFilename(options.systemName));
      }

      parts.push(this.sanitizeFilename(options.stateName));
      parts.push('mita-assessment');
    }

    // Add timestamp
    if (options.timestamp) {
      const timestamp = options.timestamp.toISOString().split('T')[0]; // YYYY-MM-DD
      parts.push(timestamp);
    }

    // Join parts and add extension
    const baseName = parts.join('-');
    const handler = this.formatHandlers.get(options.format);
    const extension = handler?.getFileExtension() || options.format;

    return `${baseName}.${extension}`;
  }

  /**
   * Sanitize filename for cross-platform compatibility
   */
  private sanitizeFilename(filename: string): string {
    return filename
      .toLowerCase()
      .replace(/[^a-z0-9\-_]/g, '-') // Replace invalid characters with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
      .substring(0, 50); // Limit length
  }

  /**
   * Collect export data
   */
  private async collectExportData(assessment: Assessment): Promise<ExportData> {
    return await this.dataCollector.collectExportData(assessment);
  }

  /**
   * Download file to user's device
   */
  private async downloadFile(blob: Blob, filename: string): Promise<void> {
    try {
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;

      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      URL.revokeObjectURL(url);
    } catch (error) {
      throw new Error(
        `Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Report export progress
   */
  private reportProgress(
    stage: ExportProgress['stage'],
    percentage: number,
    message: string
  ): void {
    if (this.progressCallback) {
      this.progressCallback({
        stage,
        percentage,
        message,
        canCancel: stage !== 'complete' && stage !== 'error',
      });
    }
  }

  /**
   * Handle export errors
   */
  private handleExportError(error: Error): ExportError {
    // Categorize error types
    if (error.message.includes('cancelled')) {
      return {
        type: 'unknown',
        message: 'Export was cancelled',
        originalError: error,
        recoverable: true,
      };
    }

    if (error.message.includes('data') || error.message.includes('collect')) {
      return {
        type: 'data_collection',
        message: 'Failed to collect assessment data for export',
        originalError: error,
        recoverable: true,
      };
    }

    if (error.message.includes('format') || error.message.includes('generate')) {
      return {
        type: 'format_generation',
        message: 'Failed to generate export file',
        originalError: error,
        recoverable: true,
      };
    }

    if (error.message.includes('download') || error.message.includes('browser')) {
      return {
        type: 'browser_limitation',
        message: 'Browser limitation prevented file download',
        originalError: error,
        recoverable: false,
      };
    }

    return {
      type: 'unknown',
      message: error.message || 'An unknown error occurred during export',
      originalError: error,
      recoverable: false,
    };
  }

  /**
   * Get recommended use cases for format
   */
  private getRecommendedUseCase(format: string): string[] {
    switch (format) {
      case 'pdf':
        return ['Professional reports', 'Stakeholder sharing', 'Official documentation'];
      case 'csv':
        return ['Data analysis', 'Spreadsheet import', 'Statistical processing'];
      case 'markdown':
        return ['Documentation', 'Version control', 'Easy editing'];
      case 'json':
        return ['Data backup', 'System integration', 'Future import'];
      default:
        return ['General use'];
    }
  }
}
