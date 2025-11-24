import React, { useCallback } from 'react';

interface ProgressTrackerProps {
  currentStep: number;
  totalSteps: number;
  completionPercentage: number;
  saving?: boolean;
  lastSaved?: Date | null;
}

const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  currentStep,
  totalSteps,
  completionPercentage,
  saving = false,
  lastSaved,
}) => {
  const progressPercentage = Math.round((currentStep / totalSteps) * 100);

  const formatLastSaved = useCallback((date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) {
      return 'just now';
    } else if (diffMins < 60) {
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  }, []);

  return (
    <div className="ds-c-card progress-tracker" role="region" aria-label="Assessment progress">
      <div className="ds-c-card__body">
        <div className="ds-l-row ds-u-align-items--center">
          <div className="ds-l-col--12 ds-l-md-col--8">
            <div className="ds-u-margin-bottom--2">
              <div className="ds-u-display--flex ds-u-justify-content--between ds-u-align-items--center ds-u-margin-bottom--1">
                <span className="ds-text--small ds-u-font-weight--bold">Assessment Progress</span>
                <span className="ds-text--small">
                  Step {currentStep} of {totalSteps}
                </span>
              </div>
              <div className="ds-c-progress">
                <div
                  className="ds-c-progress__bar"
                  role="progressbar"
                  aria-valuenow={progressPercentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Assessment progress: ${progressPercentage}% complete, step ${currentStep} of ${totalSteps}`}
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>

            <div className="ds-u-margin-bottom--1">
              <div className="ds-u-display--flex ds-u-justify-content--between ds-u-align-items--center ds-u-margin-bottom--1">
                <span className="ds-text--small ds-u-font-weight--bold">Overall Completion</span>
                <span className="ds-text--small">{completionPercentage}%</span>
              </div>
              <div className="ds-c-progress">
                <div
                  className="ds-c-progress__bar"
                  role="progressbar"
                  aria-valuenow={completionPercentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Overall completion: ${completionPercentage}% of assessment completed`}
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </div>
          </div>

          <div className="ds-l-col--12 ds-l-md-col--4">
            <div className="ds-u-text-align--right ds-u-text-align--left--md">
              {saving ? (
                <div className="ds-u-display--flex ds-u-align-items--center ds-u-justify-content--end ds-u-justify-content--start--md">
                  <div
                    className="ds-c-spinner ds-c-spinner--small ds-u-margin-right--1"
                    aria-label="Saving progress"
                  />
                  <span className="ds-text--small ds-u-color--muted" aria-live="polite">
                    Saving...
                  </span>
                </div>
              ) : lastSaved ? (
                <div className="ds-u-display--flex ds-u-align-items--center ds-u-justify-content--end ds-u-justify-content--start--md">
                  <svg
                    className="ds-u-margin-right--1"
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-label="Saved successfully"
                    role="img"
                  >
                    <path
                      d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"
                      fill="#00a91c"
                    />
                  </svg>
                  <span className="ds-text--small ds-u-color--success" aria-live="polite">
                    Saved {lastSaved ? formatLastSaved(lastSaved) : ''}
                  </span>
                </div>
              ) : (
                <span className="ds-text--small ds-u-color--muted">Auto-save enabled</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressTracker;
