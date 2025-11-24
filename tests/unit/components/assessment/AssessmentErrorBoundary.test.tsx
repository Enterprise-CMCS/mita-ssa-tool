import React from 'react';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import AssessmentErrorBoundary from '../../../../src/components/assessment/AssessmentErrorBoundary';
import enhancedStorageService from '../../../../src/services/EnhancedStorageService';

// Mock the storage service
jest.mock('../../../../src/services/EnhancedStorageService');
const mockStorageService = enhancedStorageService as jest.Mocked<typeof enhancedStorageService>;

// Mock URL.createObjectURL and related APIs
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock document.createElement and related DOM APIs
const mockLink = {
  href: '',
  download: '',
  click: jest.fn(),
};
const originalCreateElement = document.createElement;
document.createElement = jest.fn(tagName => {
  if (tagName === 'a') {
    return mockLink as any;
  }
  return originalCreateElement.call(document, tagName);
});

// Mock document.body methods for link creation only
const originalAppendChild = document.body.appendChild;
const originalRemoveChild = document.body.removeChild;
const mockAppendChild = jest.fn(element => {
  // Only mock for link elements, let other elements through
  if (element === mockLink) {
    return element;
  }
  return originalAppendChild.call(document.body, element);
});
const mockRemoveChild = jest.fn(element => {
  // Only mock for link elements, let other elements through
  if (element === mockLink) {
    return element;
  }
  return originalRemoveChild.call(document.body, element);
});
document.body.appendChild = mockAppendChild;
document.body.removeChild = mockRemoveChild;

// Component that throws an error for testing
const ThrowError: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

describe('AssessmentErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn(); // Suppress console.error in tests
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders children when there is no error', () => {
    render(
      <AssessmentErrorBoundary>
        <ThrowError shouldThrow={false} />
      </AssessmentErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('renders error UI when child component throws', () => {
    render(
      <AssessmentErrorBoundary>
        <ThrowError shouldThrow={true} />
      </AssessmentErrorBoundary>
    );

    expect(screen.getByText('Assessment Error')).toBeInTheDocument();
    expect(
      screen.getByText(/Something went wrong while processing your assessment/)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
  });

  it('shows export button when assessmentId is provided', () => {
    render(
      <AssessmentErrorBoundary assessmentId="test-assessment-123">
        <ThrowError shouldThrow={true} />
      </AssessmentErrorBoundary>
    );

    expect(screen.getByRole('button', { name: 'Export Data' })).toBeInTheDocument();
  });

  it('does not show export button when assessmentId is not provided', () => {
    render(
      <AssessmentErrorBoundary>
        <ThrowError shouldThrow={true} />
      </AssessmentErrorBoundary>
    );

    expect(screen.queryByRole('button', { name: 'Export Data' })).not.toBeInTheDocument();
  });

  it('calls onRetry when Try Again button is clicked', () => {
    const mockOnRetry = jest.fn();

    render(
      <AssessmentErrorBoundary onRetry={mockOnRetry}>
        <ThrowError shouldThrow={true} />
      </AssessmentErrorBoundary>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });

  it('exports assessment data when Export Data button is clicked', async () => {
    const mockAssessment = {
      id: 'test-assessment-123',
      stateName: 'Test State',
      capabilities: [],
    };

    mockStorageService.exportAssessment.mockResolvedValue(
      new Blob([JSON.stringify(mockAssessment)], { type: 'application/json' })
    );

    render(
      <AssessmentErrorBoundary assessmentId="test-assessment-123">
        <ThrowError shouldThrow={true} />
      </AssessmentErrorBoundary>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Export Data' }));

    await waitFor(() => {
      expect(mockStorageService.exportAssessment).toHaveBeenCalledWith('test-assessment-123');
    });

    // Check that download was triggered
    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(mockLink.download).toContain('assessment-backup-test-assessment-123');
    expect(mockLink.click).toHaveBeenCalled();
    expect(mockAppendChild).toHaveBeenCalled();
    expect(mockRemoveChild).toHaveBeenCalled();
    expect(global.URL.revokeObjectURL).toHaveBeenCalled();
  });

  it('shows success message after successful export', async () => {
    const mockAssessment = {
      id: 'test-assessment-123',
      stateName: 'Test State',
      capabilities: [],
    };

    mockStorageService.exportAssessment.mockResolvedValue(
      new Blob([JSON.stringify(mockAssessment)], { type: 'application/json' })
    );

    render(
      <AssessmentErrorBoundary assessmentId="test-assessment-123">
        <ThrowError shouldThrow={true} />
      </AssessmentErrorBoundary>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Export Data' }));

    await waitFor(() => {
      expect(
        screen.getByText(/Your assessment data has been exported successfully/)
      ).toBeInTheDocument();
    });
  });

  it('handles export failure gracefully', async () => {
    mockStorageService.exportAssessment.mockRejectedValue(new Error('Export failed'));
    mockStorageService.loadAssessment.mockResolvedValue({
      id: 'test-assessment-123',
      stateName: 'Test State',
      capabilities: [],
    } as any);

    // Mock window.open
    const mockWindow = {
      document: {
        write: jest.fn(),
      },
    };
    global.window.open = jest.fn(() => mockWindow as any);

    render(
      <AssessmentErrorBoundary assessmentId="test-assessment-123">
        <ThrowError shouldThrow={true} />
      </AssessmentErrorBoundary>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Export Data' }));

    await waitFor(() => {
      expect(mockStorageService.exportAssessment).toHaveBeenCalledWith('test-assessment-123');
    });

    // Should fall back to raw data display
    await waitFor(() => {
      expect(mockStorageService.loadAssessment).toHaveBeenCalledWith('test-assessment-123');
      expect(global.window.open).toHaveBeenCalled();
    });
  });

  it('shows technical details when expanded', () => {
    render(
      <AssessmentErrorBoundary>
        <ThrowError shouldThrow={true} />
      </AssessmentErrorBoundary>
    );

    const detailsElement = screen.getByText('Technical Details');
    fireEvent.click(detailsElement);

    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('renders custom fallback when provided', () => {
    const customFallback = <div>Custom error message</div>;

    render(
      <AssessmentErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </AssessmentErrorBoundary>
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
    expect(screen.queryByText('Assessment Error')).not.toBeInTheDocument();
  });

  it('calls onExportData callback after successful export', async () => {
    const mockOnExportData = jest.fn();
    const mockAssessment = {
      id: 'test-assessment-123',
      stateName: 'Test State',
      capabilities: [],
    };

    mockStorageService.exportAssessment.mockResolvedValue(
      new Blob([JSON.stringify(mockAssessment)], { type: 'application/json' })
    );

    render(
      <AssessmentErrorBoundary assessmentId="test-assessment-123" onExportData={mockOnExportData}>
        <ThrowError shouldThrow={true} />
      </AssessmentErrorBoundary>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Export Data' }));

    await waitFor(() => {
      expect(mockOnExportData).toHaveBeenCalledTimes(1);
    });
  });

  it('disables export button while exporting', async () => {
    mockStorageService.exportAssessment.mockImplementation(
      () =>
        new Promise(resolve =>
          setTimeout(() => resolve(new Blob(['{}'], { type: 'application/json' })), 100)
        )
    );

    render(
      <AssessmentErrorBoundary assessmentId="test-assessment-123">
        <ThrowError shouldThrow={true} />
      </AssessmentErrorBoundary>
    );

    const exportButton = screen.getByRole('button', { name: 'Export Data' });
    fireEvent.click(exportButton);

    expect(screen.getByRole('button', { name: 'Exporting...' })).toBeDisabled();
  });
});
