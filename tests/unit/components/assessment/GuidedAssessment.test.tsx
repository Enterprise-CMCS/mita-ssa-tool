import { render, screen } from '@testing-library/react';
import { useRouter } from 'next/router';
import { act } from 'react';

import GuidedAssessment from '../../../../src/components/assessment/GuidedAssessment';

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

// Mock services
jest.mock('../../../../src/services/ContentService');
jest.mock('../../../../src/services/EnhancedStorageService');

const mockRouter = {
  push: jest.fn(),
  query: {},
  pathname: '/assessment/test-id',
};

describe('GuidedAssessment', () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders error state when assessment fails to load', async () => {
    await act(async () => {
      render(<GuidedAssessment assessmentId="test-id" />);
    });

    // Since the services are mocked and will fail, expect error state
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Failed to load assessment. Please try again.')).toBeInTheDocument();
  });

  it('renders with correct assessment ID prop and shows error', async () => {
    const assessmentId = 'test-assessment-123';
    await act(async () => {
      render(<GuidedAssessment assessmentId={assessmentId} />);
    });

    // Component should attempt to load the assessment with the provided ID and show error when mocked services fail
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Failed to load assessment. Please try again.')).toBeInTheDocument();
  });
});
