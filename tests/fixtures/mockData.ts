import type {
  Assessment,
  CapabilityAreaAssessment,
  CapabilityDefinition,
  DimensionAssessment,
} from '../../src/types';

/**
 * Mock data for testing components
 */

// Mock dimension assessment
const mockDimensionAssessment: DimensionAssessment = {
  maturityLevel: 2,
  evidence: 'Current systems support basic functionality',
  barriers: 'Limited resources and legacy systems',
  plans: 'Upgrade systems in next fiscal year',
  notes: 'Additional notes about this dimension',
  targetMaturityLevel: 3,
  lastUpdated: '2023-10-15T10:30:00Z',
};

// Mock capability area assessment
const mockCapabilityAreaAssessment: CapabilityAreaAssessment = {
  id: 'capability-1',
  capabilityDomainName: 'Provider',
  capabilityAreaName: 'Provider Enrollment',
  status: 'in-progress',
  dimensions: {
    outcome: mockDimensionAssessment,
    role: mockDimensionAssessment,
    businessProcess: mockDimensionAssessment,
    information: mockDimensionAssessment,
    technology: mockDimensionAssessment,
  },
};

// Mock assessment data
export const mockAssessmentData: Assessment = {
  id: 'assessment-1',
  stateName: 'Example State',
  createdAt: '2023-10-15T10:00:00Z',
  updatedAt: '2023-10-15T15:30:00Z',
  status: 'in-progress',
  capabilities: [mockCapabilityAreaAssessment],
  metadata: {
    assessmentVersion: '1.0',
    completedBy: 'Test User',
    notes: 'Test assessment for development',
  },
};

// Mock user data
export const mockUserData = {
  id: 'user-1',
  name: 'Test User',
  role: 'assessor',
  email: 'test@example.gov',
  state: 'Example State',
  lastLogin: '2023-10-14T10:30:00Z',
};

// Export individual mock objects for easier testing
export { mockCapabilityAreaAssessment, mockDimensionAssessment };

// Mock capability definition
export const mockCapabilityDefinition: CapabilityDefinition = {
  id: 'provider-enrollment',
  capabilityDomainName: 'Provider',
  capabilityAreaName: 'Provider Enrollment',
  capabilityVersion: '1.1',
  capabilityAreaCreated: '2025-06-01',
  capabilityAreaLastUpdated: '2025-06-05',
  description:
    'Provider Enrollment encompasses the processes and systems used to register healthcare providers',
  domainDescription: 'The Provider capability domain encompasses provider-related processes.',
  areaDescription:
    'Provider Enrollment encompasses the processes and systems used to register healthcare providers',
  dimensions: {
    outcome: {
      description:
        'The Outcomes dimension focuses on the results and effectiveness of the provider enrollment process.',
      maturityAssessment: ['Select the level that most closely aligns to your business'],
      maturityLevels: {
        level1: 'Manual provider enrollment process with paper-based applications',
        level2: 'Basic online enrollment forms with some automated validation',
        level3: 'Fully electronic enrollment process with automated validation',
        level4: 'Intelligent workflow with predictive analytics',
        level5: 'Continuous monitoring and revalidation with cross-program coordination',
      },
    },
    role: {
      description:
        'The Roles dimension addresses the responsibilities and interactions of staff and providers.',
      maturityAssessment: ['Select the level that most closely aligns to your business'],
      maturityLevels: {
        level1: 'Provider enrollment specialists manually process applications',
        level2: 'Providers can submit applications online',
        level3: 'Provider self-service for most enrollment functions',
        level4: 'Automated assignment of tasks based on expertise',
        level5: 'Dynamic role assignment based on enrollment complexity',
      },
    },
    businessProcess: {
      description: 'The Business Processes dimension covers the workflows and procedures.',
      maturityAssessment: ['Select the level that most closely aligns to your business'],
      maturityLevels: {
        level1: 'Manual, paper-based workflow with sequential processing',
        level2: 'Basic electronic workflow with some automated validations',
        level3: 'Fully electronic workflow with parallel processing',
        level4: 'Intelligent workflow with adaptive routing',
        level5: 'Continuous process optimization with cross-program coordination',
      },
    },
    information: {
      description: 'The Information dimension addresses the data and information management.',
      maturityAssessment: ['Select the level that most closely aligns to your business'],
      maturityLevels: {
        level1: 'Basic provider demographic information with manual verification',
        level2: 'Structured provider data model with electronic storage',
        level3: 'Comprehensive provider data model with automated validation',
        level4: 'Enhanced data model supporting advanced analytics',
        level5: 'Dynamic data model adapting to changing requirements',
      },
    },
    technology: {
      description: 'The Technology dimension covers the systems and infrastructure.',
      maturityAssessment: ['Select the level that most closely aligns to your business'],
      maturityLevels: {
        level1: 'Legacy systems with limited integration',
        level2: 'Basic web forms for provider enrollment',
        level3: 'Integrated provider enrollment system',
        level4: 'Cloud-based enrollment platform',
        level5: 'Microservices architecture with AI/ML-powered processing',
      },
    },
  },
};

export const mockCapabilityDefinitions: CapabilityDefinition[] = [mockCapabilityDefinition];
