// Core data models based on data_models.md

export interface Assessment {
  id: string;
  stateName: string;
  createdAt: string;
  updatedAt: string;
  status: AssessmentStatus;
  capabilities: CapabilityAreaAssessment[];
  metadata: AssessmentMetadata;
}

export type AssessmentStatus = 'not-started' | 'in-progress' | 'completed';

export interface AssessmentMetadata {
  assessmentVersion: string;
  systemName?: string;
  completedBy?: string;
  completionDate?: string;
  notes?: string;
}

export interface CapabilityAreaAssessment {
  id: string;
  capabilityDomainName: string;
  capabilityAreaName: string;
  status: 'not-started' | 'in-progress' | 'completed';
  dimensions: {
    outcome: DimensionAssessment;
    role: DimensionAssessment;
    businessProcess: DimensionAssessment;
    information: DimensionAssessment;
    technology: DimensionAssessment;
  };
}

export interface DimensionAssessment {
  maturityLevel: number;
  evidence: string;
  barriers: string;
  plans: string;
  notes: string;
  targetMaturityLevel?: number;
  lastUpdated: string;
  checkboxes?: Record<string, boolean>;
}

export interface CapabilityDefinition {
  id: string;
  capabilityDomainName: string;
  capabilityAreaName: string;
  capabilityVersion: string;
  capabilityAreaCreated: string;
  capabilityAreaLastUpdated: string;
  description: string;
  domainDescription: string;
  areaDescription: string;
  dimensions: {
    outcome: DimensionDefinition;
    role: DimensionDefinition;
    businessProcess: DimensionDefinition;
    information: DimensionDefinition;
    technology: DimensionDefinition;
  };
}

export interface DimensionDefinition {
  description: string;
  maturityAssessment: string[];
  maturityLevels: {
    level1: string;
    level2: string;
    level3: string;
    level4: string;
    level5: string;
  };
  checkboxItems?: {
    level1?: string[];
    level2?: string[];
    level3?: string[];
    level4?: string[];
    level5?: string[];
  };
}

export interface AssessmentSummary {
  id: string;
  stateName: string;
  createdAt: string;
  updatedAt: string;
  status: AssessmentStatus;
  completionPercentage: number;
  systemName?: string;
  domains?: string[];
  areas?: string[];
}

// Front matter metadata interface
export interface CapabilityFrontMatter {
  capabilityDomain: string;
  capabilityArea: string;
  capabilityVersion: string;
  capabilityAreaCreated: string;
  capabilityAreaLastUpdated: string;
  assessmentCreated?: string;
  assessmentUpdated?: string;
  assessmentStatus?: AssessmentStatus;
}

// Storage Manager Interface
export interface StorageManager {
  saveAssessment(assessment: Assessment): Promise<boolean>;
  loadAssessment(id: string): Promise<Assessment | null>;
  listAssessments(): Promise<AssessmentSummary[]>;
  deleteAssessment(id: string): Promise<boolean>;
  exportAssessment(id: string): Promise<Blob>;
  importAssessment(file: File): Promise<Assessment>;
}

// Content Manager Interface
export interface ContentManager {
  loadCapabilityDefinitions(): Promise<CapabilityDefinition[]>;
  getCapability(id: string): Promise<CapabilityDefinition | null>;
  getCapabilitiesByDomain(domainName: string): Promise<CapabilityDefinition[]>;
}

// Assessment Context Interface
export interface AssessmentContext {
  currentAssessment: Assessment | null;
  loading: boolean;
  error: Error | null;
  createAssessment: (stateName: string) => Promise<string>;
  loadAssessment: (id: string) => Promise<void>;
  saveAssessment: () => Promise<boolean>;
  updateCapabilityDimension: (
    capabilityId: string,
    dimension: 'outcome' | 'role' | 'businessProcess' | 'information' | 'technology',
    data: Partial<DimensionAssessment>
  ) => void;
  updateAssessmentStatus: (id: string, status: AssessmentStatus) => Promise<void>;
  exportAssessment: (format: 'json' | 'pdf' | 'csv') => Promise<void>;
}

// ORBIT Dimensions constant
export const ORBIT_DIMENSIONS = {
  outcome: 'outcome',
  role: 'role',
  businessProcess: 'businessProcess',
  information: 'information',
  technology: 'technology',
} as const;

export type OrbitDimension = keyof typeof ORBIT_DIMENSIONS;

// Backward compatibility alias
export type CapabilityAssessment = CapabilityAreaAssessment;

// Legacy data structure for migration
export interface AssessmentData {
  assessmentId: string;
  stateName: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  capabilities: Record<string, OldCapabilityAssessment>;
}

export interface OldCapabilityAssessment {
  id: string;
  name: string;
  dimensions: {
    outcome: OldDimensionAssessment;
    role: OldDimensionAssessment;
    businessProcess: OldDimensionAssessment;
    information: OldDimensionAssessment;
    technology: OldDimensionAssessment;
  };
}

export interface OldDimensionAssessment {
  maturityLevel: number;
  evidence: string;
  notes: string;
}
