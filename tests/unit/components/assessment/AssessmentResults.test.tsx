import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { AssessmentResults } from '../../../../src/components/assessment/AssessmentResults';
import { useStorageContext } from '../../../../src/components/storage/StorageProvider';
import type { Assessment } from '../../../../src/types';

// Mock the useStorageContext hook
jest.mock('../../../../src/components/storage/StorageProvider', () => ({
  ...jest.requireActual('../../../../src/components/storage/StorageProvider'),
  useStorageContext: jest.fn(),
}));

// Mock Chart.js
jest.mock('chart.js', () => ({
  Chart: {
    register: jest.fn(),
  },
  CategoryScale: jest.fn(),
  LinearScale: jest.fn(),
  BarElement: jest.fn(),
  Title: jest.fn(),
  Tooltip: jest.fn(),
  Legend: jest.fn(),
  RadialLinearScale: jest.fn(),
  PointElement: jest.fn(),
  LineElement: jest.fn(),
  Filler: jest.fn(),
}));

jest.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="bar-chart">Bar Chart</div>,
  Radar: () => <div data-testid="radar-chart">Radar Chart</div>,
}));

// Mock jsPDF
jest.mock('jspdf', () => {
  return jest.fn().mockImplementation(() => ({
    setFontSize: jest.fn(),
    text: jest.fn(),
    addPage: jest.fn(),
    save: jest.fn(),
    splitTextToSize: jest.fn(() => ['line1', 'line2']),
  }));
});

jest.mock('jspdf-autotable', () => jest.fn());

// Mock enhanced storage service
jest.mock('../../../../src/services/EnhancedStorageService', () => ({
  __esModule: true,
  default: {
    initialize: jest.fn().mockResolvedValue({
      isLocalStorageAvailable: true,
      isIndexedDBAvailable: true,
      localStorageUsage: 0,
      localStorageLimit: 5242880,
      indexedDBAvailable: true,
      preferredStorage: 'localStorage',
    }),
    loadAssessment: jest.fn(),
    updateAssessmentStatus: jest.fn().mockResolvedValue(true),
    listAssessments: jest.fn().mockResolvedValue([]),
    saveAssessment: jest.fn().mockResolvedValue(true),
    deleteAssessment: jest.fn().mockResolvedValue(true),
    exportAssessment: jest.fn().mockResolvedValue(new Blob()),
    importAssessment: jest.fn(),
  },
}));

// Mock assessment data
const mockAssessment: Assessment = {
  id: 'test-assessment-1',
  stateName: 'Test State',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-02T00:00:00.000Z',
  status: 'completed',
  capabilities: [
    {
      id: 'test-capability-1',
      capabilityDomainName: 'Provider Management',
      capabilityAreaName: 'Provider Enrollment',
      status: 'completed',
      dimensions: {
        outcome: {
          maturityLevel: 3,
          evidence: 'Test evidence',
          barriers: 'Test barriers',
          plans: 'Test plans',
          notes: 'Test notes',
          lastUpdated: '2024-01-01T00:00:00.000Z',
        },
        role: {
          maturityLevel: 4,
          evidence: 'Test evidence',
          barriers: 'Test barriers',
          plans: 'Test plans',
          notes: 'Test notes',
          lastUpdated: '2024-01-01T00:00:00.000Z',
        },
        businessProcess: {
          maturityLevel: 2,
          evidence: 'Test evidence',
          barriers: 'Test barriers',
          plans: 'Test plans',
          notes: 'Test notes',
          lastUpdated: '2024-01-01T00:00:00.000Z',
        },
        information: {
          maturityLevel: 3,
          evidence: 'Test evidence',
          barriers: 'Test barriers',
          plans: 'Test plans',
          notes: 'Test notes',
          lastUpdated: '2024-01-01T00:00:00.000Z',
        },
        technology: {
          maturityLevel: 5,
          evidence: 'Test evidence',
          barriers: 'Test barriers',
          plans: 'Test plans',
          notes: 'Test notes',
          lastUpdated: '2024-01-01T00:00:00.000Z',
        },
      },
    },
  ],
  metadata: {
    assessmentVersion: '1.0',
    completedBy: 'Test User',
    completionDate: '2024-01-02',
    notes: 'Test assessment',
  },
};

const mockStorageContext = {
  isInitialized: true,
  isStorageAvailable: true,
  isLoading: false,
  error: null,
  assessmentSummaries: [],
  saveAssessment: jest.fn().mockResolvedValue(true),
  loadAssessment: jest.fn().mockResolvedValue(mockAssessment),
  deleteAssessment: jest.fn().mockResolvedValue(true),
  exportAssessment: jest.fn().mockResolvedValue(new Blob()),
  importAssessment: jest.fn().mockResolvedValue(mockAssessment),
  updateAssessmentStatus: jest.fn().mockResolvedValue(true),
  refreshAssessmentList: jest.fn().mockResolvedValue(undefined),
};

describe('AssessmentResults', () => {
  const renderWithProvider = (component: React.ReactElement) => {
    return render(component);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useStorageContext as jest.Mock).mockReturnValue(mockStorageContext);
  });

  it('renders loading state initially', () => {
    renderWithProvider(<AssessmentResults assessmentId="test-assessment-1" />);

    expect(screen.getByText('Calculating assessment results...')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Loading results' })).toBeInTheDocument();
  });

  it('renders assessment results after loading', async () => {
    renderWithProvider(<AssessmentResults assessmentId="test-assessment-1" />);

    await waitFor(
      () => {
        expect(screen.getByText('Assessment Results')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    expect(screen.getByText('MITA maturity assessment results for Test State')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('displays summary cards with correct data', async () => {
    renderWithProvider(<AssessmentResults assessmentId="test-assessment-1" />);

    await waitFor(
      () => {
        expect(screen.getByText('Overall Average')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    expect(screen.getByText('3.4')).toBeInTheDocument(); // Should appear in summary
    expect(screen.getByText('3.40')).toBeInTheDocument(); // Should appear in detailed results with more precision

    // Check for capability areas count
    expect(screen.getByText('Capability Areas')).toBeInTheDocument();
    const capabilityAreasCard = screen.getByText('Capability Areas').closest('.ds-c-card');
    expect(capabilityAreasCard).toHaveTextContent('1');
    expect(capabilityAreasCard).toHaveTextContent('assessed');

    // Check for domains count
    expect(screen.getByText('Domains')).toBeInTheDocument();
    const domainsCard = screen.getByText('Domains').closest('.ds-c-card');
    expect(domainsCard).toHaveTextContent('1');
    expect(domainsCard).toHaveTextContent('covered');
  });

  it('renders charts', async () => {
    renderWithProvider(<AssessmentResults assessmentId="test-assessment-1" />);

    await waitFor(
      () => {
        expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    expect(screen.getByTestId('radar-chart')).toBeInTheDocument();
  });

  it('displays detailed results table', async () => {
    renderWithProvider(<AssessmentResults assessmentId="test-assessment-1" />);

    await waitFor(
      () => {
        expect(screen.getByText('Detailed Results')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    expect(screen.getByText('Provider Management')).toBeInTheDocument();
    expect(screen.getByText('Provider Enrollment')).toBeInTheDocument();
    expect(screen.getByText('3.40')).toBeInTheDocument(); // Overall score in detailed results

    // The detailed dimension scores are now in an expandable section
    // so they won't be visible until the section is expanded
  });

  it('provides export options', async () => {
    renderWithProvider(<AssessmentResults assessmentId="test-assessment-1" />);

    await waitFor(
      () => {
        expect(screen.getByText('Export')).toBeInTheDocument();
        expect(screen.getByText('PDF')).toBeInTheDocument();
        expect(screen.getByText('CSV')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    expect(screen.getByText('PDF')).toBeInTheDocument();
    expect(screen.getByText('CSV')).toBeInTheDocument();
  });

  it('provides navigation options', async () => {
    renderWithProvider(<AssessmentResults assessmentId="test-assessment-1" />);

    await waitFor(
      () => {
        expect(screen.getByText('Return to Dashboard')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    expect(screen.getByText('View Assessment Details')).toBeInTheDocument();
  });

  it('handles assessment not found error', async () => {
    // Mock the context to return null for loadAssessment
    (useStorageContext as jest.Mock).mockReturnValue({
      ...mockStorageContext,
      loadAssessment: jest.fn().mockResolvedValue(null),
    });

    renderWithProvider(<AssessmentResults assessmentId="non-existent-id" />);

    await waitFor(
      () => {
        expect(screen.getByText('Error Loading Results')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    expect(screen.getByText('Assessment not found')).toBeInTheDocument();
  });
});
