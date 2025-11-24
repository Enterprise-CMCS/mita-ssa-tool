import { render, screen } from '@testing-library/react';
import { CapabilityDetail } from '../../../../src/components/content/CapabilityDetail';
import { useContent } from '../../../../src/components/content/ContentProvider';

// Mock the useContent hook
jest.mock('../../../../src/components/content/ContentProvider', () => ({
  useContent: jest.fn(),
}));

describe('CapabilityDetail', () => {
  const mockCapability = {
    id: 'test-capability',
    capabilityAreaName: 'Test Capability',
    capabilityDomainName: 'Test Domain',
    capabilityVersion: '1.0',
    capabilityAreaCreated: '2025-06-01',
    capabilityAreaLastUpdated: '2025-06-01',
    description: 'This is a test capability description',
    dimensions: {
      outcome: {
        description: 'Outcome dimension description',
        maturityAssessment: ['Outcome assessment 1', 'Outcome assessment 2'],
        maturityLevels: {
          level1: 'Outcome level 1',
          level2: 'Outcome level 2',
          level3: 'Outcome level 3',
          level4: 'Outcome level 4',
          level5: 'Outcome level 5',
        },
      },
      role: {
        description: 'Role dimension description',
        maturityAssessment: ['Role assessment 1', 'Role assessment 2'],
        maturityLevels: {
          level1: 'Role level 1',
          level2: 'Role level 2',
          level3: 'Role level 3',
          level4: 'Role level 4',
          level5: 'Role level 5',
        },
      },
      businessProcess: {
        description: 'Business Process dimension description',
        maturityAssessment: ['Business Process assessment 1', 'Business Process assessment 2'],
        maturityLevels: {
          level1: 'Business Process level 1',
          level2: 'Business Process level 2',
          level3: 'Business Process level 3',
          level4: 'Business Process level 4',
          level5: 'Business Process level 5',
        },
      },
      information: {
        description: 'Information dimension description',
        maturityAssessment: ['Information assessment 1', 'Information assessment 2'],
        maturityLevels: {
          level1: 'Information level 1',
          level2: 'Information level 2',
          level3: 'Information level 3',
          level4: 'Information level 4',
          level5: 'Information level 5',
        },
      },
      technology: {
        description: 'Technology dimension description',
        maturityAssessment: ['Technology assessment 1', 'Technology assessment 2'],
        maturityLevels: {
          level1: 'Technology level 1',
          level2: 'Technology level 2',
          level3: 'Technology level 3',
          level4: 'Technology level 4',
          level5: 'Technology level 5',
        },
      },
    },
  };

  beforeEach(() => {
    // Reset mock
    (useContent as jest.Mock).mockReset();
  });

  test('renders loading state', () => {
    (useContent as jest.Mock).mockReturnValue({
      getCapability: jest.fn(),
      isLoading: true,
      error: null,
    });

    render(<CapabilityDetail capabilityId="test-capability" />);
    expect(screen.getByText('Loading capability details...')).toBeInTheDocument();
  });

  test('renders error state', () => {
    const errorMessage = 'Failed to load capability';
    (useContent as jest.Mock).mockReturnValue({
      getCapability: jest.fn(),
      isLoading: false,
      error: new Error(errorMessage),
    });

    render(<CapabilityDetail capabilityId="test-capability" />);
    expect(screen.getByText(`Error loading capability: ${errorMessage}`)).toBeInTheDocument();
  });

  test('renders not found state', () => {
    (useContent as jest.Mock).mockReturnValue({
      getCapability: jest.fn().mockReturnValue(null),
      isLoading: false,
      error: null,
    });

    render(<CapabilityDetail capabilityId="non-existent-capability" />);
    expect(screen.getByText('Capability not found: non-existent-capability')).toBeInTheDocument();
  });

  test('renders capability details with all five ORBIT dimensions', () => {
    (useContent as jest.Mock).mockReturnValue({
      getCapability: jest.fn().mockReturnValue(mockCapability),
      isLoading: false,
      error: null,
    });

    render(<CapabilityDetail capabilityId="test-capability" />);

    // Check basic capability info
    expect(screen.getByText('Test Capability')).toBeInTheDocument();
    expect(screen.getByText('Domain: Test Domain')).toBeInTheDocument();
    expect(screen.getByText('Version: 1.0')).toBeInTheDocument();
    expect(screen.getByText('This is a test capability description')).toBeInTheDocument();

    // Check all five ORBIT dimensions are rendered
    expect(screen.getByText('Outcome')).toBeInTheDocument();
    expect(screen.getByText('Role')).toBeInTheDocument();
    expect(screen.getByText('Business Process')).toBeInTheDocument();
    expect(screen.getByText('Information')).toBeInTheDocument();
    expect(screen.getByText('Technology')).toBeInTheDocument();

    // Check dimension descriptions
    expect(screen.getByText('Outcome dimension description')).toBeInTheDocument();
    expect(screen.getByText('Role dimension description')).toBeInTheDocument();
    expect(screen.getByText('Business Process dimension description')).toBeInTheDocument();
    expect(screen.getByText('Information dimension description')).toBeInTheDocument();
    expect(screen.getByText('Technology dimension description')).toBeInTheDocument();

    // Check maturity assessments
    expect(screen.getByText('Outcome assessment 1')).toBeInTheDocument();
    expect(screen.getByText('Role assessment 1')).toBeInTheDocument();
    expect(screen.getByText('Business Process assessment 1')).toBeInTheDocument();
    expect(screen.getByText('Information assessment 1')).toBeInTheDocument();
    expect(screen.getByText('Technology assessment 1')).toBeInTheDocument();
  });
});
