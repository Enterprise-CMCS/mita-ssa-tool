/**
 * Tests for EnhancedExportSection component
 */

import React from 'react';

import { render, screen } from '@testing-library/react';

import { EnhancedExportSection } from '../EnhancedExportSection';

import type { Assessment } from '../../../types';

// Mock the ExportButton component
jest.mock('../../export/ExportButton', () => ({
  ExportButton: ({ children }: { children: React.ReactNode }) => (
    <button data-testid="export-button">{children}</button>
  ),
}));

const mockAssessment: Assessment = {
  id: 'test-assessment-1',
  stateName: 'Test State',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-02T00:00:00Z',
  status: 'completed',
  capabilities: [],
  metadata: {
    assessmentVersion: '1.0',
    systemName: 'Test System',
  },
};

describe('EnhancedExportSection', () => {
  it('should render export section with title', () => {
    render(<EnhancedExportSection assessment={mockAssessment} />);

    expect(screen.getByText('Export')).toBeInTheDocument();
  });

  it('should render direct export buttons', () => {
    render(<EnhancedExportSection assessment={mockAssessment} />);

    expect(screen.getByText('PDF')).toBeInTheDocument();
    expect(screen.getByText('CSV')).toBeInTheDocument();
    expect(screen.getByText('JSON')).toBeInTheDocument();
    expect(screen.getByText('Markdown')).toBeInTheDocument();
  });

  it('should display information about enhanced features', () => {
    render(<EnhancedExportSection assessment={mockAssessment} />);

    expect(screen.getByText(/enhanced scoring/i)).toBeInTheDocument();
    expect(screen.getByText(/metadata/i)).toBeInTheDocument();
  });

  it('should display available formats', () => {
    render(<EnhancedExportSection assessment={mockAssessment} />);

    expect(screen.getByText('PDF')).toBeInTheDocument();
    expect(screen.getByText('CSV')).toBeInTheDocument();
    expect(screen.getByText('Markdown')).toBeInTheDocument();
    expect(screen.getByText('JSON')).toBeInTheDocument();
  });

  it('should display direct export buttons', () => {
    render(<EnhancedExportSection assessment={mockAssessment} />);

    expect(screen.getByText('PDF')).toBeInTheDocument();
    expect(screen.getByText('CSV')).toBeInTheDocument();
    expect(screen.getByText('JSON')).toBeInTheDocument();
    expect(screen.getByText('Markdown')).toBeInTheDocument();
  });

  it('should display export description', () => {
    render(<EnhancedExportSection assessment={mockAssessment} />);

    expect(screen.getByText(/All exports include complete assessment data/)).toBeInTheDocument();
  });
});
