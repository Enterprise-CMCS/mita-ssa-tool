import React from 'react';
import { render, screen } from '@testing-library/react';

import ProgressTracker from '../../../../src/components/assessment/ProgressTracker';

describe('ProgressTracker', () => {
  const defaultProps = {
    currentStep: 5,
    totalSteps: 10,
    completionPercentage: 75,
  };

  it('renders progress information correctly', () => {
    render(<ProgressTracker {...defaultProps} />);

    expect(screen.getByText('Step 5 of 10')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('Assessment Progress')).toBeInTheDocument();
    expect(screen.getByText('Overall Completion')).toBeInTheDocument();
  });

  it('shows saving state when saving prop is true', () => {
    render(<ProgressTracker {...defaultProps} saving={true} />);

    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });

  it('shows last saved time when provided', () => {
    const lastSaved = new Date('2024-01-01T12:00:00Z');
    render(<ProgressTracker {...defaultProps} lastSaved={lastSaved} />);

    expect(screen.getByText(/Saved/)).toBeInTheDocument();
  });

  it('shows auto-save enabled when no last saved time', () => {
    render(<ProgressTracker {...defaultProps} />);

    expect(screen.getByText('Auto-save enabled')).toBeInTheDocument();
  });

  it('calculates progress percentage correctly', () => {
    render(<ProgressTracker currentStep={3} totalSteps={6} completionPercentage={50} />);

    expect(screen.getByText('Step 3 of 6')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });
});
