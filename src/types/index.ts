/**
 * MITA 4.0 State Self-Assessment Tool - Type Definitions
 *
 * This file contains all TypeScript interfaces for the application,
 * following the schema defined in PROJECT_FOUNDATION.md.
 */

// =============================================================================
// Capability Reference Model Types
// =============================================================================

/**
 * Capability layer classification
 */
export type CapabilityLayer = 'strategic' | 'core' | 'support';

/**
 * A capability area within a domain
 */
export interface CapabilityArea {
  id: string;
  name: string;
  description: string;
  topics: string[];
  /**
   * True for "<X> Information Management" areas. Drives the assessment-page
   * disclaimer about assessing information maturity once per domain.
   */
  informationManagement?: boolean;
}

/**
 * A capability domain with its areas.
 * The MITA 4.0 metamodel is strictly two levels: Domain -> Area.
 */
export interface CapabilityDomain {
  id: string;
  name: string;
  layer: CapabilityLayer;
  description: string;
  areas: CapabilityArea[];
}

/**
 * The complete capability reference model
 */
export interface CapabilityReferenceModel {
  version: string;
  lastUpdated: string;
  description: string;
  domains: CapabilityDomain[];
}

// =============================================================================
// ORBIT Model Types
// =============================================================================

/**
 * The three ORBIT dimension IDs (B-I-T)
 * Note: Outcomes, Roles, and Enterprise Architecture aspects are organizational assessments, not per-capability dimensions
 */
export type OrbitDimensionId = 'businessArchitecture' | 'information' | 'technology';

/**
 * Organizational assessment type IDs
 * These are assessed at the organizational level, not per capability area
 */
export type OrganizationalAssessmentId = 'outcomes' | 'roles' | 'enterprise-architecture';

/**
 * Combined type for rating storage - allows both dimension and organizational assessment IDs
 * Used in OrbitRating.dimensionId to support both standard and organizational assessments
 */
export type RatingDimensionId = OrbitDimensionId | OrganizationalAssessmentId;

/**
 * Technology sub-dimension IDs
 */
export type TechnologySubDimensionId =
  | 'technologyInfrastructureManagement'
  | 'applicationManagement';

/**
 * Maturity levels 1-5, 0 for not assessed, -1 for N/A
 */
export type MaturityLevel = 0 | 1 | 2 | 3 | 4 | 5;
export type MaturityLevelWithNA = MaturityLevel | -1;

/**
 * Level key type for accessing level definitions
 */
export type LevelKey = 'level1' | 'level2' | 'level3' | 'level4' | 'level5';

/**
 * Maturity level names
 */
export const MATURITY_LEVEL_NAMES: Record<MaturityLevel | -1, string> = {
  [-1]: 'Not Applicable',
  0: 'Not Assessed',
  1: 'Initial',
  2: 'Developing',
  3: 'Defined',
  4: 'Managed',
  5: 'Optimized',
};

/**
 * Definition of a single maturity level within an aspect
 */
export interface OrbitLevelDefinition {
  description: string;
  questions: string[];
  evidence: string[];
}

/**
 * All five level definitions for an aspect
 */
export interface OrbitLevelDefinitions {
  level1: OrbitLevelDefinition;
  level2: OrbitLevelDefinition;
  level3: OrbitLevelDefinition;
  level4: OrbitLevelDefinition;
  level5: OrbitLevelDefinition;
}

/**
 * An aspect within an ORBIT dimension
 */
export interface OrbitAspect {
  id: string;
  name: string;
  description: string;
  levels: OrbitLevelDefinitions;
}

/**
 * A standard ORBIT dimension (non-Technology)
 */
export interface OrbitDimension {
  id: string;
  name: string;
  description: string;
  required: boolean;
  aspects: OrbitAspect[];
}

/**
 * A Technology sub-dimension
 */
export interface TechnologySubDimension {
  id: TechnologySubDimensionId;
  name: string;
  description: string;
  aspects: OrbitAspect[];
}

/**
 * The Technology dimension with sub-dimensions
 */
export interface TechnologyDimension {
  id: 'technology';
  name: string;
  description: string;
  required: true;
  subDimensions: TechnologySubDimension[];
}

/**
 * Organizational assessment definition (from orbit-model.json)
 * Used for the organizational sections, which are assessed once for the whole
 * organization rather than per capability area
 */
export interface OrganizationalAssessmentDefinition {
  id: OrganizationalAssessmentId;
  name: string;
  description: string;
  capabilityAreaId: string;
  aspects: OrbitAspect[];
}

/**
 * Maturity level metadata
 */
export interface MaturityLevelMeta {
  name: string;
  description: string;
}

/**
 * The complete ORBIT maturity model
 */
export interface OrbitModel {
  version: string;
  lastUpdated: string;
  source: string;
  maturityLevels: {
    level1: MaturityLevelMeta;
    level2: MaturityLevelMeta;
    level3: MaturityLevelMeta;
    level4: MaturityLevelMeta;
    level5: MaturityLevelMeta;
    notApplicable: MaturityLevelMeta;
  };
  dimensions: {
    businessArchitecture: OrbitDimension;
    information: OrbitDimension;
    technology: TechnologyDimension;
  };
  organizationalAssessments: {
    outcomes: OrganizationalAssessmentDefinition;
    roles: OrganizationalAssessmentDefinition;
    'enterprise-architecture': OrganizationalAssessmentDefinition;
  };
}

// =============================================================================
// Database Entity Types (Dexie/IndexedDB)
// =============================================================================

/**
 * Assessment status
 * Note: "not started" is implied by no record existing
 */
export type AssessmentStatus = 'in_progress' | 'finalized';

/**
 * Capability Assessment - one per capability area being assessed
 */
export interface CapabilityAssessment {
  id: string;
  capabilityDomainId: string;
  capabilityDomainName: string;
  capabilityAreaId: string;
  capabilityAreaName: string;
  status: AssessmentStatus;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  finalizedAt?: Date;
  overallScore?: number;
}

/**
 * Response to a single question
 */
export interface QuestionResponse {
  questionIndex: number;
  answer: boolean;
}

/**
 * Evidence response
 */
export interface EvidenceResponse {
  evidenceIndex: number;
  provided: boolean;
  notes?: string;
}

/**
 * ORBIT Rating - one per aspect per capability assessment
 * For standard assessments: dimensionId is OrbitDimensionId (B, I, T)
 * For organizational assessments: dimensionId is an OrganizationalAssessmentId
 * ('outcomes' | 'roles' | 'enterprise-architecture')
 */
export interface OrbitRating {
  id: string;
  capabilityAssessmentId: string;
  dimensionId: RatingDimensionId;
  subDimensionId?: TechnologySubDimensionId;
  aspectId: string;
  currentLevel: MaturityLevelWithNA;
  targetLevel?: MaturityLevelWithNA; // "To Be" target maturity level
  previousLevel?: MaturityLevelWithNA;
  questionResponses: QuestionResponse[];
  evidenceResponses: EvidenceResponse[];
  notes: string;
  barriers: string;
  plans: string;
  carriedForward: boolean;
  attachmentIds: string[];
  updatedAt: Date;
}

/**
 * File Attachment - stored as Blob in IndexedDB
 */
export interface Attachment {
  id: string;
  capabilityAssessmentId: string;
  orbitRatingId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  blob: Blob;
  description?: string;
  uploadedAt: Date;
}

/**
 * Historical rating snapshot (without attachment blobs)
 */
export interface HistoricalRating {
  dimensionId: RatingDimensionId;
  subDimensionId?: TechnologySubDimensionId;
  aspectId: string;
  currentLevel: MaturityLevelWithNA;
  targetLevel?: MaturityLevelWithNA;
  questionResponses: QuestionResponse[];
  evidenceResponses: EvidenceResponse[];
  notes: string;
  barriers: string;
  plans: string;
}

/**
 * Aggregate dimension metadata stored in history snapshots.
 * Captures point-in-time aggregate data for enterprise domains.
 */
export interface AggregateSnapshotData {
  /** The dimension that was aggregated (e.g., 'information' or 'technology') */
  dimensionId: RatingDimensionId;
  /** The aggregate score at snapshot time */
  score: number | null;
  /** Number of assessments that contributed to the aggregate */
  contributingCount: number;
  /** IDs of assessments that contributed (for traceability) */
  contributingAssessmentIds: string[];
}

/**
 * Assessment History - snapshots of finalized assessments
 */
export interface AssessmentHistory {
  id: string;
  capabilityAssessmentId: string;
  capabilityAreaId: string;
  snapshotDate: Date;
  tags: string[];
  overallScore: number;
  dimensionScores: Record<string, number>;
  ratings: HistoricalRating[];
  /** Aggregate dimension data for enterprise domains (stored at snapshot time) */
  aggregateData?: AggregateSnapshotData;
}

/**
 * Tag record for autocomplete
 */
export interface Tag {
  id: string;
  name: string;
  usageCount: number;
  lastUsed: Date;
}

// =============================================================================
// Scoring Types
// =============================================================================

/**
 * Score for a single aspect
 */
export interface AspectScore {
  aspectId: string;
  aspectName: string;
  dimensionId: RatingDimensionId;
  subDimensionId?: TechnologySubDimensionId;
  currentLevel: MaturityLevelWithNA;
  isAssessed: boolean;
}

/**
 * Score for a dimension
 */
export interface DimensionScore {
  dimensionId: RatingDimensionId;
  dimensionName: string;
  required: boolean;
  averageLevel: number | null;
  aspectScores: AspectScore[];
  subDimensionScores?: SubDimensionScore[];
}

/**
 * Score for a Technology sub-dimension
 */
export interface SubDimensionScore {
  subDimensionId: TechnologySubDimensionId;
  subDimensionName: string;
  averageLevel: number | null;
  aspectScores: AspectScore[];
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Convert MaturityLevel to LevelKey
 */
export function maturityLevelToKey(level: 1 | 2 | 3 | 4 | 5): LevelKey {
  return `level${level}` as LevelKey;
}
