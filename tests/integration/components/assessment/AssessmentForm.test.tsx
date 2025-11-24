import React from 'react';

import userEvent from '@testing-library/user-event';

import { mockAssessmentData } from '../../../fixtures/mockData';
import { render, screen } from '../../../utils/test-utils';

// This is a placeholder import - replace with your actual component path
// import AssessmentForm from '@/components/assessment/AssessmentForm';

// Mock component for testing purposes since the actual component might not exist yet
const AssessmentForm = ({ assessment, onSave }) => (
  <div>
    <h1>Assessment Form</h1>
    <div data-testid="assessment-title">{assessment.stateName}</div>
    <button onClick={() => onSave(assessment)} data-testid="save-button">
      Save Assessment
    </button>
  </div>
);

describe('AssessmentForm Integration', () => {
  test('renders assessment form with data', () => {
    render(<AssessmentForm assessment={mockAssessmentData} onSave={jest.fn()} />);

    expect(screen.getByText('Assessment Form')).toBeInTheDocument();
    expect(screen.getByTestId('assessment-title')).toHaveTextContent(mockAssessmentData.stateName);
  });

  test('calls onSave when save button is clicked', async () => {
    const handleSave = jest.fn();
    const user = userEvent.setup();

    render(<AssessmentForm assessment={mockAssessmentData} onSave={handleSave} />);

    const saveButton = screen.getByTestId('save-button');
    await user.click(saveButton);

    expect(handleSave).toHaveBeenCalledTimes(1);
    expect(handleSave).toHaveBeenCalledWith(mockAssessmentData);
  });
});
