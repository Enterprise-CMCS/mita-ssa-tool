/**
 * Export service types and interfaces
 * Defines the core data structures for the comprehensive export functionality
 */

import type { Assessment, CapabilityDefinition } from '../../types';
import type { EnhancedMaturityScore } from '../ScoringService';

/**
 * Complete export data structure containing all assessment information
 */
export interface ExportData {
  assessment: Assessment;
  scores: EnhancedMaturityScore[];
  metadata: ExportMetadata;
  capabilities: CapabilityDefinition[];
}

/**
 * Export metadata including timestamps and version information
 */
export interface ExportMetadata {
  exportedAt: string;
  exportedBy?: string;
  exportVersion: string;
  systemName?: string;
  lastSavedAt?: string;
  completionPercentage: number;
  schemaVersion: string;
}

/**
 * Export options for customizing output format and content
 */
export interface ExportOptions {
  format: 'pdf' | 'csv' | 'markdown' | 'json';
  includeCharts?: boolean;
  includeDetails?: boolean;
  includeCheckboxDetails?: boolean;
  customFilename?: string;
}

/**
 * Result of an export operation
 */
export interface ExportResult {
  success: boolean;
  filename: string;
  size?: number;
  error?: string;
  blob?: Blob;
}

/**
 * Export progress information
 */
export interface ExportProgress {
  stage: 'collecting' | 'processing' | 'generating' | 'complete' | 'error';
  percentage: number;
  message: string;
  canCancel: boolean;
}

/**
 * Export error categories and details
 */
export interface ExportError {
  type: 'data_collection' | 'format_generation' | 'browser_limitation' | 'unknown';
  message: string;
  originalError?: Error;
  context?: Record<string, unknown>;
  recoverable: boolean;
}

/**
 * Abstract base class for format-specific export handlers
 */
export abstract class ExportHandler {
  abstract generate(data: ExportData, options: ExportOptions): Promise<Blob>;
  abstract getFileExtension(): string;
  abstract getMimeType(): string;
  abstract getFormatName(): string;
  abstract getFormatDescription(): string;
}

/**
 * Export format information for UI display
 */
export interface ExportFormatInfo {
  format: ExportOptions['format'];
  name: string;
  description: string;
  extension: string;
  mimeType: string;
  supportsCharts: boolean;
  supportsDetails: boolean;
  recommendedFor: string[];
}

/**
 * Filename generation options
 */
export interface FilenameOptions {
  assessmentName?: string;
  systemName?: string;
  stateName: string;
  format: string;
  timestamp?: Date;
  customName?: string;
  includeVersion?: boolean;
}
