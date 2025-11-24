/**
 * Filename Generation Utility
 * Handles filename generation with sanitization and versioning
 */

import type { Assessment } from '../../../types';
import type { FilenameOptions } from '../types';

export class FilenameGenerator {
  private static readonly MAX_FILENAME_LENGTH = 100;
  private static readonly INVALID_CHARS_REGEX = /[<>:"/\\|?*]/g;
  private static readonly RESERVED_NAMES = [
    'CON',
    'PRN',
    'AUX',
    'NUL',
    'COM1',
    'COM2',
    'COM3',
    'COM4',
    'COM5',
    'COM6',
    'COM7',
    'COM8',
    'COM9',
    'LPT1',
    'LPT2',
    'LPT3',
    'LPT4',
    'LPT5',
    'LPT6',
    'LPT7',
    'LPT8',
    'LPT9',
  ];

  /**
   * Generate filename for assessment export
   */
  static generateFilename(
    assessment: Assessment,
    format: string,
    options: Partial<FilenameOptions> = {}
  ): string {
    const filenameOptions: FilenameOptions = {
      assessmentName: `mita-assessment-${assessment.id}`,
      systemName: assessment.metadata?.systemName,
      stateName: assessment.stateName,
      format,
      timestamp: new Date(),
      customName: options.customName,
      includeVersion: options.includeVersion ?? false,
    };

    return this.buildFilename(filenameOptions);
  }

  /**
   * Build filename from options
   */
  static buildFilename(options: FilenameOptions): string {
    const parts: string[] = [];

    // Use custom name if provided
    if (options.customName) {
      parts.push(this.sanitizeComponent(options.customName));
    } else {
      // Build standard filename components
      if (options.systemName) {
        parts.push(this.sanitizeComponent(options.systemName));
      }

      parts.push(this.sanitizeComponent(options.stateName));
      parts.push('mita-assessment');
    }

    // Add timestamp
    if (options.timestamp) {
      const timestamp = this.formatTimestamp(options.timestamp);
      parts.push(timestamp);
    }

    // Add version if requested
    if (options.includeVersion) {
      parts.push('v1');
    }

    // Join parts and add extension
    const baseName = parts.join('-');
    const extension = this.getFileExtension(options.format);

    // Ensure filename length is within limits
    const maxBaseLength = this.MAX_FILENAME_LENGTH - extension.length - 1; // -1 for the dot
    const truncatedBaseName =
      baseName.length > maxBaseLength ? baseName.substring(0, maxBaseLength) : baseName;

    return `${truncatedBaseName}.${extension}`;
  }

  /**
   * Generate versioned filename to avoid overwrites
   */
  static generateVersionedFilename(baseFilename: string, existingFilenames: string[] = []): string {
    if (!existingFilenames.includes(baseFilename)) {
      return baseFilename;
    }

    const { name, extension } = this.parseFilename(baseFilename);
    let version = 1;
    let versionedFilename: string;

    do {
      version++;
      versionedFilename = `${name}-v${version}.${extension}`;
    } while (existingFilenames.includes(versionedFilename));

    return versionedFilename;
  }

  /**
   * Sanitize filename component for cross-platform compatibility
   */
  private static sanitizeComponent(component: string): string {
    if (!component) {
      return '';
    }

    return (
      component
        .toLowerCase()
        .trim()
        // Replace invalid characters with hyphens
        .replace(this.INVALID_CHARS_REGEX, '-')
        // Replace spaces and other whitespace with hyphens
        .replace(/\s+/g, '-')
        // Replace multiple hyphens with single hyphen
        .replace(/-+/g, '-')
        // Remove leading/trailing hyphens
        .replace(/^-|-$/g, '')
        // Limit length
        .substring(0, 50)
        // Ensure it's not a reserved name
        .replace(new RegExp(`^(${this.RESERVED_NAMES.join('|')})$`, 'i'), '$1-file')
    );
  }

  /**
   * Format timestamp for filename
   */
  private static formatTimestamp(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  /**
   * Get file extension for format
   */
  private static getFileExtension(format: string): string {
    const extensions: Record<string, string> = {
      pdf: 'pdf',
      csv: 'csv',
      json: 'json',
      markdown: 'md',
      md: 'md',
    };

    return extensions[format.toLowerCase()] || format.toLowerCase();
  }

  /**
   * Parse filename into name and extension
   */
  private static parseFilename(filename: string): { name: string; extension: string } {
    const lastDotIndex = filename.lastIndexOf('.');

    if (lastDotIndex === -1) {
      return { name: filename, extension: '' };
    }

    return {
      name: filename.substring(0, lastDotIndex),
      extension: filename.substring(lastDotIndex + 1),
    };
  }

  /**
   * Validate filename for common issues
   */
  static validateFilename(filename: string): {
    isValid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // Check length
    if (filename.length > this.MAX_FILENAME_LENGTH) {
      issues.push(`Filename too long (${filename.length} > ${this.MAX_FILENAME_LENGTH})`);
    }

    // Check for invalid characters
    if (this.INVALID_CHARS_REGEX.test(filename)) {
      issues.push('Contains invalid characters');
    }

    // Check for reserved names
    const { name } = this.parseFilename(filename);
    if (this.RESERVED_NAMES.includes(name.toUpperCase())) {
      issues.push('Uses reserved system name');
    }

    // Check for leading/trailing spaces or dots
    if (filename.startsWith(' ') || filename.endsWith(' ')) {
      issues.push('Contains leading or trailing spaces');
    }

    if (filename.startsWith('.') || filename.endsWith('.')) {
      issues.push('Contains leading or trailing dots');
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }

  /**
   * Generate suggested filename based on assessment data
   */
  static suggestFilename(assessment: Assessment, format: string): string[] {
    const suggestions: string[] = [];

    // Standard suggestion
    suggestions.push(this.generateFilename(assessment, format));

    // With system name emphasis
    if (assessment.metadata?.systemName) {
      suggestions.push(
        this.generateFilename(assessment, format, {
          customName: `${assessment.metadata.systemName} MITA Assessment`,
        })
      );
    }

    // Short version
    suggestions.push(
      this.generateFilename(assessment, format, {
        customName: `${assessment.stateName} MITA`,
      })
    );

    // With completion status
    const status = assessment.status === 'completed' ? 'Final' : 'Draft';
    suggestions.push(
      this.generateFilename(assessment, format, {
        customName: `${assessment.stateName} MITA ${status}`,
      })
    );

    return [...new Set(suggestions)]; // Remove duplicates
  }
}
