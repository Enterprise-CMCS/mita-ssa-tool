'use client';

import { useState } from 'react';

import Link from 'next/link';

import { useStorageContext } from '../storage/StorageProvider';

import type { AssessmentStatus, AssessmentSummary } from '../../types';

/**
 * Get status display information
 */
function getStatusInfo(status: AssessmentStatus) {
  switch (status) {
    case 'not-started':
      return { label: 'Not Started', className: 'ds-c-badge--neutral' };
    case 'in-progress':
      return { label: 'In Progress', className: 'ds-c-badge--warn' };
    case 'completed':
      return { label: 'Completed', className: 'ds-c-badge--success' };
    default:
      return { label: 'Unknown', className: 'ds-c-badge--neutral' };
  }
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'Invalid Date';
  }
}

/**
 * Assessment card component
 */
interface AssessmentCardProps {
  assessment: AssessmentSummary;
  onDelete: (id: string) => void;
}

function AssessmentCard({ assessment, onDelete }: AssessmentCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const statusInfo = getStatusInfo(assessment.status);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(assessment.id);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="ds-c-card ds-u-margin-bottom--3">
      <div className="ds-c-card__body">
        <div className="ds-u-margin-bottom--3">
          <h3 className="ds-h3 ds-u-margin--0">State: {assessment.stateName}</h3>
          {assessment.systemName && (
            <h3 className="ds-h3 ds-u-margin--0 ds-u-margin-top--2">
              System Name: {assessment.systemName}
            </h3>
          )}
          {assessment.domains && assessment.domains.length > 0 && (
            <div className="ds-u-margin-top--2">
              <div className="ds-u-margin-bottom--2">
                <span className="ds-text--small ds-u-color--muted">Domains:</span>
                <div className="ds-u-margin-top--1">
                  <span className="ds-text--small">{assessment.domains.join(', ')}</span>
                </div>
              </div>
              {assessment.areas && assessment.areas.length > 0 && (
                <div className="ds-u-margin-bottom--2">
                  <span className="ds-text--small ds-u-color--muted">Areas:</span>
                  <div className="ds-u-margin-top--1">
                    <span className="ds-text--small">{assessment.areas.join(', ')}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Assessment Details */}
        <div className="ds-u-margin-bottom--3">
          {/* Status */}
          <div className="ds-u-margin-bottom--2">
            <span className="ds-text--small ds-u-color--muted">Status:</span>
            <div className="ds-u-margin-top--1">
              <span className={`ds-c-badge ${statusInfo.className}`}>{statusInfo.label}</span>
            </div>
          </div>

          {/* Created Date */}
          <div className="ds-u-margin-bottom--2">
            <span className="ds-text--small ds-u-color--muted">Created:</span>
            <div className="ds-u-margin-top--1">
              <span className="ds-text--small">{formatDate(assessment.createdAt)}</span>
            </div>
          </div>

          {/* Last Updated Date */}
          <div className="ds-u-margin-bottom--2">
            <span className="ds-text--small ds-u-color--muted">Last Updated:</span>
            <div className="ds-u-margin-top--1">
              <span className="ds-text--small">{formatDate(assessment.updatedAt)}</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="ds-l-row ds-u-flex-wrap--wrap ds-u-margin-top--2">
          <div className="ds-l-col--auto ds-u-margin-right--3 ds-u-margin-bottom--2">
            <Link
              href={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/assessment/${assessment.id}`}
              className="ds-c-button ds-c-button--primary ds-c-button--small"
            >
              {assessment.status === 'completed' ? 'Open Assessment' : 'Continue Assessment'}
            </Link>
          </div>
          <div className="ds-l-col--auto ds-u-margin-right--3 ds-u-margin-bottom--2">
            <Link
              href={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/assessment/${assessment.id}/results`}
              className="ds-c-button ds-c-button--transparent ds-c-button--small"
            >
              View Results
            </Link>
          </div>
          <div className="ds-l-col--auto ds-u-margin-bottom--2">
            <button
              type="button"
              className="ds-c-button ds-c-button--danger ds-c-button--small"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>

        {/* Delete confirmation dialog */}
        {showDeleteConfirm && (
          <div className="ds-c-alert ds-c-alert--error ds-u-margin-top--2">
            <div className="ds-c-alert__body">
              <h4 className="ds-c-alert__heading">Confirm Deletion</h4>
              <p className="ds-c-alert__text">
                Are you sure you want to delete this assessment? This action cannot be undone.
              </p>
              <div className="ds-u-margin-top--2">
                <button
                  type="button"
                  className="ds-c-button ds-c-button--danger ds-c-button--small ds-u-margin-right--2"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                </button>
                <button
                  type="button"
                  className="ds-c-button ds-c-button--transparent ds-c-button--small"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * User Dashboard Component
 */
export function UserDashboard() {
  const {
    isInitialized,
    isStorageAvailable,
    isLoading,
    error,
    assessmentSummaries,
    deleteAssessment,
    refreshAssessmentList,
  } = useStorageContext();

  const handleDeleteAssessment = async (id: string) => {
    const success = await deleteAssessment(id);
    if (success) {
      await refreshAssessmentList();
    }
  };

  // Loading state
  if (!isInitialized || isLoading) {
    return (
      <div className="ds-u-text-align--center ds-u-padding--4">
        <div className="ds-c-spinner" role="status" aria-label="Loading assessments">
          <span className="ds-u-visibility--screen-reader">Loading...</span>
        </div>
        <p className="ds-u-margin-top--2">Loading your assessments...</p>
      </div>
    );
  }

  // Storage not available
  if (!isStorageAvailable) {
    return (
      <div className="ds-c-alert ds-c-alert--error">
        <div className="ds-c-alert__body">
          <h3 className="ds-c-alert__heading">Storage Not Available</h3>
          <p className="ds-c-alert__text">
            Browser storage is not available. You won't be able to save or load assessments. Please
            check your browser settings and try again.
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="ds-c-alert ds-c-alert--error">
        <div className="ds-c-alert__body">
          <h3 className="ds-c-alert__heading">Error Loading Assessments</h3>
          <p className="ds-c-alert__text">
            {error.message || 'An error occurred while loading your assessments.'}
          </p>
          <button
            type="button"
            className="ds-c-button ds-c-button--primary ds-u-margin-top--2"
            onClick={refreshAssessmentList}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ds-l-container">
      <div className="ds-l-row ds-u-justify-content--center">
        <div className="ds-l-col--12 ds-l-lg-col--10">
          {/* Header */}
          <header className="ds-u-margin-bottom--4">
            <h1 className="ds-display--1 ds-u-margin-bottom--2">Assessment Dashboard</h1>
            <p className="ds-text--lead">
              Manage your MITA assessments and track your progress across capability areas.
            </p>
          </header>

          {/* Action buttons */}
          <div className="ds-u-margin-bottom--4">
            <div className="ds-l-row ds-u-flex-wrap--wrap">
              <div className="ds-l-col--auto ds-u-margin-right--2 ds-u-margin-bottom--2">
                <Link
                  href={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/assessment/new`}
                  className="ds-c-button ds-c-button--primary ds-c-button--big"
                >
                  Begin New Assessment
                </Link>
              </div>
              <div className="ds-l-col--auto ds-u-margin-bottom--2">
                <button
                  type="button"
                  className="ds-c-button ds-c-button--transparent ds-c-button--big"
                  onClick={refreshAssessmentList}
                  disabled={isLoading}
                >
                  {isLoading ? 'Refreshing...' : 'Refresh List'}
                </button>
              </div>
            </div>
          </div>

          {/* Assessment list */}
          {assessmentSummaries.length === 0 ? (
            <div className="ds-c-alert ds-c-alert--info">
              <div className="ds-c-alert__body">
                <h3 className="ds-c-alert__heading">No Assessments Found</h3>
                <p className="ds-c-alert__text">
                  You haven't created any assessments yet. Click "Begin New Assessment" to get
                  started.
                </p>
              </div>
            </div>
          ) : (
            <div>
              <h2 className="ds-h2 ds-u-margin-bottom--3">
                Your Assessments ({assessmentSummaries.length})
              </h2>
              <div className="ds-l-row">
                <div className="ds-l-col--12">
                  {assessmentSummaries
                    .sort(
                      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
                    )
                    .map(assessment => (
                      <AssessmentCard
                        key={assessment.id}
                        assessment={assessment}
                        onDelete={handleDeleteAssessment}
                      />
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Help section */}
          <div className="ds-u-margin-top--6 ds-u-padding-top--4 ds-u-border-top--1">
            <h2 className="ds-h3 ds-u-margin-bottom--2">Need Help?</h2>
            <div className="ds-l-row">
              <div className="ds-l-col--12 ds-l-md-col--6">
                <p className="ds-u-margin-bottom--2">
                  <Link href="/about-mita" className="ds-c-button ds-c-button--transparent">
                    Learn About MITA Framework
                  </Link>
                </p>
              </div>
              <div className="ds-l-col--12 ds-l-md-col--6">
                <p className="ds-u-margin-bottom--2">
                  <Link href="/" className="ds-c-button ds-c-button--transparent">
                    Back to Home
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserDashboard;
