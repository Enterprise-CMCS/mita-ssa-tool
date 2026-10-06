/**
 * Export/Import Types
 *
 * Type definitions for the export and import system.
 */

import type {
  CapabilityAssessment,
  OrbitRating,
  AssessmentHistory,
  Tag,
  OrbitDimensionId,
} from '../../types';

/**
 * Export scope options
 */
export type ExportScope = 'full' | 'domain' | 'area';

/**
 * Export format options
 */
export type ExportFormat = 'json' | 'zip' | 'pdf' | 'csv';

/**
 * Export options
 */
export interface ExportOptions {
  scope: ExportScope;
  format: ExportFormat;
  domainId?: string;
  areaId?: string;
  includeAttachments?: boolean;
  includeHistory?: boolean;
  stateName?: string;
}

/**
 * Attachment metadata without blob (for JSON export)
 */
export interface AttachmentMetadata {
  id: string;
  capabilityAssessmentId: string;
  orbitRatingId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  description?: string;
  uploadedAt: string;
}

/**
 * Aggregate dimension metadata for export
 */
export interface ExportAggregateData {
  /** The dimension that is aggregated */
  dimensionId: OrbitDimensionId;
  /** The aggregate score */
  score: number | null;
  /** Number of contributing assessments */
  contributingCount: number;
  /** IDs of contributing assessments */
  contributingAssessmentIds: string[];
}

/**
 * Enterprise domain aggregate info for export
 */
export interface ExportEnterpriseAssessment {
  assessmentId: string;
  domainId: string;
  domainName: string;
  aggregateData: ExportAggregateData;
}

/**
 * Export data structure (JSON format)
 */
export interface ExportData {
  exportVersion: string;
  exportDate: string;
  appVersion: string;
  /**
   * Draft disclaimer, present only while the tool is built in draft mode
   * (`VITE_DRAFT_MODE !== 'false'`). JSON and ZIP are the primary export path, so
   * the marker has to reach them too — a state should not be able to circulate an
   * export that looks final when the tool it came from is not (Decision 4).
   * Absent, rather than empty, once the disclaimer is switched off.
   */
  draftNotice?: string;
  scope: ExportScope;
  scopeDetails?: {
    domainId?: string;
    domainName?: string;
    areaId?: string;
    areaName?: string;
  };
  data: {
    assessments: CapabilityAssessment[];
    ratings: OrbitRating[];
    history: AssessmentHistory[];
    tags: Tag[];
    attachments: AttachmentMetadata[];
  };
  metadata: {
    totalAssessments: number;
    totalRatings: number;
    totalHistory: number;
    totalAttachments: number;
    capabilities: string[];
  };
  /** Aggregate data for enterprise domain assessments */
  enterpriseAggregates?: ExportEnterpriseAssessment[];
}

/**
 * Import result summary
 */
export interface ImportResult {
  success: boolean;
  importedAsCurrent: number;
  importedAsHistory: number;
  skipped: number;
  errors: string[];
  details: ImportItemResult[];
}

/**
 * Individual import item result
 */
export interface ImportItemResult {
  areaId: string;
  areaName: string;
  action: 'imported_current' | 'imported_history' | 'skipped' | 'error';
  reason?: string;
}

/**
 * CSV Maturity Profile row
 */
export interface MaturityProfileRow {
  dimension: string;
  asIs: string;
  toBe: string;
  notes: string;
  barriers: string;
  plans: string;
  /**
   * True for organizational section label rows (e.g., "Organizational
   * Outcomes"). Label rows group the aspect rows that follow them and carry
   * no rating data.
   */
  isSectionLabel?: boolean;
}

/**
 * CSV Maturity Profile for a capability area
 */
export interface CapabilityAreaProfile {
  domainName: string;
  areaName: string;
  rows: MaturityProfileRow[];
  /** True if this is the combined organizational assessment */
  isOrganizationalAssessment?: boolean;
}

/**
 * CSV Maturity Profile (collection of capability area profiles)
 */
export interface MaturityProfile {
  stateName: string;
  domainName: string;
  areas: CapabilityAreaProfile[];
}

/**
 * Export progress callback
 */
export type ExportProgressCallback = (progress: number, message: string) => void;

/**
 * Import progress callback
 */
export type ImportProgressCallback = (progress: number, message: string) => void;
