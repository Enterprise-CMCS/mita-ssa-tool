import React from 'react';
import { render, screen } from '@testing-library/react';

import { UserDashboard } from '../../../../src/components/dashboard/UserDashboard';
import { StorageProvider } from '../../../../src/components/storage/StorageProvider';

// Mock the storage service
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
    listAssessments: jest.fn().mockResolvedValue([]),
    saveAssessment: jest.fn().mockResolvedValue(true),
    loadAssessment: jest.fn().mockResolvedValue(null),
    deleteAssessment: jest.fn().mockResolvedValue(true),
    exportAssessment: jest.fn().mockResolvedValue(new Blob()),
    importAssessment: jest.fn().mockResolvedValue({}),
  },
}));

describe('UserDashboard', () => {
  const renderWithProvider = (component: React.ReactElement) => {
    return render(<StorageProvider>{component}</StorageProvider>);
  };

  it('renders dashboard header', async () => {
    renderWithProvider(<UserDashboard />);

    expect(await screen.findByText('Assessment Dashboard')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Manage your MITA assessments and track your progress across capability areas.'
      )
    ).toBeInTheDocument();
  });

  it('shows begin new assessment button', async () => {
    renderWithProvider(<UserDashboard />);

    expect(await screen.findByText('Begin New Assessment')).toBeInTheDocument();
  });

  it('shows no assessments message when list is empty', async () => {
    renderWithProvider(<UserDashboard />);

    expect(await screen.findByText('No Assessments Found')).toBeInTheDocument();
    expect(
      screen.getByText(
        'You haven\'t created any assessments yet. Click "Begin New Assessment" to get started.'
      )
    ).toBeInTheDocument();
  });

  it('shows help section', async () => {
    renderWithProvider(<UserDashboard />);

    expect(await screen.findByText('Need Help?')).toBeInTheDocument();
    expect(screen.getByText('Learn About MITA Framework')).toBeInTheDocument();
    expect(screen.getByText('Back to Home')).toBeInTheDocument();
  });
});
