import React from 'react';

import { useRouter } from 'next/router';

/**
 * Props interface for the AssessmentHeader component
 */
interface AssessmentHeaderProps {
  /** The name of the assessment being displayed */
  assessmentName: string;
  /** Optional system name to display alongside assessment name */
  systemName?: string;
  /** Current step description for user context */
  currentStep?: string;
  /** Callback function to open the sidebar navigation */
  onOpenSidebar?: () => void;
  /** Whether to show the sidebar toggle button */
  showSidebarToggle?: boolean;
  /** Whether the assessment is currently being saved */
  saving?: boolean;
  /** Timestamp of the last successful save operation */
  lastSaved?: Date | null;
  /** Overall completion percentage (0-100) */
  completionPercentage?: number;
  /** Current step index in the assessment flow */
  currentStepIndex?: number;
  /** Total number of steps in the assessment */
  totalSteps?: number;
}

/**
 * AssessmentHeader component provides a sticky header for assessment pages
 * with progress tracking, save status, and navigation controls.
 *
 * Features:
 * - Development banner with prototype status
 * - Dashboard navigation and sidebar toggle
 * - Assessment title and current step display
 * - Progress tracking with completion percentage
 * - Real-time save status indicators
 * - Responsive design with mobile support
 *
 * @param props - The component props
 * @returns JSX element representing the assessment header
 */
const AssessmentHeader: React.FC<AssessmentHeaderProps> = React.memo(
  ({
    assessmentName,
    systemName,
    currentStep,
    onOpenSidebar,
    showSidebarToggle = true,
    saving = false,
    lastSaved,
    completionPercentage,
    currentStepIndex,
    totalSteps,
  }) => {
    const router = useRouter();

    // Type guards for optional props
    const hasProgressData = typeof completionPercentage === 'number';
    const hasStepData = typeof currentStepIndex === 'number' && typeof totalSteps === 'number';
    const hasSaveData = saving || lastSaved;

    // Memoized handlers
    const handleDashboardClick = React.useCallback(() => {
      try {
        router.push('/dashboard');
      } catch (error) {
        console.error('Failed to navigate to dashboard:', error);
        // Fallback: try window.location
        try {
          window.location.href = '/dashboard';
        } catch (fallbackError) {
          console.error('Fallback navigation also failed:', fallbackError);
        }
      }
    }, [router]);

    const handleKeyDown = React.useCallback(
      (event: KeyboardEvent) => {
        // Don't interfere with text input in form elements
        const target = event.target as HTMLElement;
        if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')) {
          return;
        }

        // Alt + S to toggle sidebar
        if (event.altKey && event.key === 's' && onOpenSidebar) {
          event.preventDefault();
          onOpenSidebar();
        }
        // Alt + D to go to dashboard
        if (event.altKey && event.key === 'd') {
          event.preventDefault();
          router.push('/dashboard');
        }
      },
      [onOpenSidebar, router]
    );

    // Keyboard shortcuts with error handling
    React.useEffect(() => {
      try {
        document.addEventListener('keydown', handleKeyDown);
        return () => {
          try {
            document.removeEventListener('keydown', handleKeyDown);
          } catch (error) {
            console.warn('Failed to remove keyboard event listener:', error);
          }
        };
      } catch (error) {
        console.warn('Failed to add keyboard event listener:', error);
      }
    }, [handleKeyDown]);
    return (
      <header className="assessment-header">
        <div className="assessment-header__banner">
          <div className="assessment-header__banner-content">
            <span className="assessment-header__banner-icon">⚠️</span>
            <span className="assessment-header__banner-text">
              <strong>Minimum Lovable Prototype:</strong> This tool is under active development
              using{' '}
              <a
                href="https://guides.18f.gov/agile/18f-agile-approach/"
                target="_blank"
                rel="noopener noreferrer"
              >
                18F's agile approach
              </a>
              . Content and workflows are placeholders while MITA workstreams finalize the maturity
              model and framework details.
              <strong>
                {' '}
                Your feedback drives our improvements—
                <a
                  href="https://github.com/naretakis/mita-state-self-assessment-tool"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  explore our repo
                </a>{' '}
                or{' '}
                <a
                  href="https://github.com/naretakis/mita-state-self-assessment-tool/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  share feedback
                </a>
                .
              </strong>
            </span>
          </div>
        </div>
        <div className="assessment-header__content">
          <div className="assessment-header__left">
            <button
              type="button"
              className="assessment-header__dashboard-btn"
              onClick={handleDashboardClick}
              aria-label="Return to dashboard (Alt+D)"
              title="Return to dashboard (Alt+D)"
            >
              <span className="assessment-header__dashboard-icon" aria-hidden="true">
                ←
              </span>
              <span className="assessment-header__dashboard-text">Dashboard</span>
            </button>

            {showSidebarToggle && (
              <button
                type="button"
                className="assessment-header__menu-button"
                onClick={onOpenSidebar}
                aria-label="Toggle assessment navigation (Alt+S)"
                title="Toggle assessment navigation (Alt+S)"
              >
                <span className="assessment-header__menu-icon" aria-hidden="true">
                  ☰
                </span>
              </button>
            )}
          </div>

          <div className="assessment-header__center">
            <div className="assessment-header__title-group">
              <h1 className="assessment-header__main-title">
                {assessmentName}{' '}
                {systemName && <span className="assessment-header__system">- {systemName}</span>}
              </h1>
              {currentStep && <p className="assessment-header__current-step">{currentStep}</p>}
            </div>
          </div>

          <div className="assessment-header__right">
            {hasProgressData && (
              <div className="assessment-header__progress">
                <div className="assessment-header__progress-info">
                  <span className="assessment-header__progress-text">
                    {completionPercentage}% Complete
                  </span>
                  {hasStepData && (
                    <span className="assessment-header__step-counter">
                      Step {(currentStepIndex as number) + 1} of {totalSteps}
                    </span>
                  )}
                </div>
                <div
                  className="assessment-header__progress-bar"
                  role="progressbar"
                  aria-valuenow={completionPercentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Assessment progress: ${completionPercentage}% complete`}
                >
                  <div
                    className="assessment-header__progress-fill"
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
                {hasSaveData && (
                  <div className="assessment-header__save-status-container">
                    {saving && (
                      <span className="assessment-header__save-status assessment-header__save-status--saving">
                        <span className="assessment-header__save-icon">💾</span>
                        Saving...
                      </span>
                    )}
                    {lastSaved && !saving && (
                      <span className="assessment-header__save-status assessment-header__save-status--saved">
                        <span className="assessment-header__save-icon">✓</span>
                        Saved {lastSaved.toLocaleTimeString()}
                      </span>
                    )}
                    {!saving && !lastSaved && (
                      <span className="assessment-header__save-status assessment-header__save-status--unsaved">
                        <span className="assessment-header__save-icon">○</span>
                        Not saved
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <style jsx>{`
          .assessment-header {
            background: linear-gradient(135deg, var(--sidebar-bg, #f8f9fa) 0%, #ffffff 100%);
            border-bottom: 1px solid var(--sidebar-border, #dee2e6);
            position: sticky;
            top: 0;
            z-index: 100;
            box-shadow: var(--sidebar-box-shadow, 0 2px 8px rgba(0, 0, 0, 0.08));
            box-sizing: border-box;
          }

          .assessment-header__banner {
            background: #fef7e0;
            border-left: 4px solid var(--warning-color, #f9c642);
            padding: 0.5rem 0;
            font-size: var(--sidebar-font-size-sm, 0.8125rem);
          }

          .assessment-header__banner-content {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 1rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            color: #5c4317;
          }

          .assessment-header__banner-icon {
            flex-shrink: 0;
          }

          .assessment-header__banner-text {
            line-height: 1.3;
          }

          .assessment-header__banner a {
            color: #5c4317;
            text-decoration: underline;
          }

          .assessment-header__content {
            padding: 1rem 0;
          }

          .assessment-header__content {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 1rem;
            gap: 1rem;
          }

          .assessment-header__left,
          .assessment-header__right {
            display: flex;
            align-items: center;
            gap: 0.75rem;
          }

          .assessment-header__center {
            flex: 1;
            min-width: 0;
            display: flex;
            align-items: center;
            justify-content: flex-start;
            margin-left: 1rem;
          }

          .assessment-header__title-group {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            gap: 0.125rem;
          }

          .assessment-header__main-title {
            margin: 0;
            font-size: 1.375rem;
            font-weight: 700;
            color: #212529;
            line-height: 1.2;
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }

          .assessment-header__system {
            font-weight: 500;
            color: #6c757d;
            font-size: 1.125rem;
          }

          .assessment-header__current-step {
            margin: 0;
            font-size: 0.875rem;
            color: #495057;
            font-weight: 500;
          }

          .assessment-header__dashboard-btn {
            display: flex;
            align-items: center;
            gap: var(--sidebar-gap, 0.5rem);
            background: none;
            border: 1px solid var(--sidebar-border, #ccc);
            border-radius: calc(var(--sidebar-border-radius, 4px) + 2px);
            padding: 0.5rem 0.75rem;
            cursor: pointer;
            font-size: var(--sidebar-font-size-base, 0.875rem);
            color: var(--sidebar-text, #495057);
            transition: all var(--sidebar-hover-transition, 0.2s ease);
            min-height: var(--touch-target-min, 44px);
          }

          .assessment-header__dashboard-btn:hover {
            background: var(--sidebar-bg, #f8f9fa);
            border-color: var(--sidebar-current-border, #0071bc);
            color: var(--sidebar-current-border, #0071bc);
            transform: translateY(-1px);
            box-shadow: 0 2px 4px rgba(0, 113, 188, 0.1);
          }

          .assessment-header__dashboard-btn:focus {
            outline: 2px solid var(--sidebar-current-border, #0071bc);
            outline-offset: 2px;
          }

          .assessment-header__dashboard-btn:active {
            transform: translateY(0);
          }

          .assessment-header__dashboard-icon {
            font-size: 1rem;
            font-weight: bold;
          }

          .assessment-header__menu-button {
            display: none;
            background: none;
            border: 1px solid var(--sidebar-border, #ccc);
            border-radius: var(--sidebar-border-radius, 4px);
            padding: var(--sidebar-gap, 0.5rem);
            cursor: pointer;
            margin-right: 1rem;
            min-height: var(--touch-target-min, 44px);
            min-width: var(--touch-target-min, 44px);
            transition: all var(--sidebar-hover-transition, 0.2s ease);
          }

          .assessment-header__menu-button:hover {
            background: var(--sidebar-bg, #f0f0f0);
            transform: scale(1.05);
          }

          .assessment-header__menu-button:focus {
            outline: 2px solid var(--sidebar-current-border, #0071bc);
            outline-offset: 2px;
          }

          .assessment-header__menu-button:active {
            transform: scale(0.95);
          }

          .assessment-header__menu-icon {
            font-size: 1.25rem;
            line-height: 1;
          }

          .assessment-header__progress {
            min-width: 200px;
            background: #ffffff;
            padding: 0.75rem;
            border-radius: 8px;
            border: 1px solid #dee2e6;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
            backdrop-filter: blur(10px);
            position: relative;
          }

          .assessment-header__progress::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: #ffffff;
            border-radius: 8px;
            z-index: -1;
            opacity: 0.95;
          }

          .assessment-header__progress-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.25rem;
            font-size: 0.75rem;
          }

          .assessment-header__progress-text {
            font-weight: 700;
            color: #212529;
          }

          .assessment-header__step-counter {
            color: #495057;
            font-weight: 500;
          }

          .assessment-header__progress-bar {
            height: 8px;
            background: #e9ecef;
            border-radius: 4px;
            overflow: hidden;
            border: 1px solid rgba(222, 226, 230, 0.5);
            box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);
          }

          .assessment-header__progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #28a745 0%, #20c997 100%);
            transition: width 0.3s ease;
            border-radius: 3px;
            box-shadow: 0 1px 2px rgba(40, 167, 69, 0.3);
          }

          .assessment-header__save-status-container {
            margin-top: 0.5rem;
            text-align: center;
            padding: 0.25rem;
            background: rgba(248, 249, 250, 0.8);
            border-radius: 4px;
            border: 1px solid rgba(222, 226, 230, 0.5);
          }

          .assessment-header__save-status {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.375rem;
            font-size: 0.8125rem;
            font-weight: 600;
            text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
          }

          .assessment-header__save-status--saving {
            color: #e67e22;
          }

          .assessment-header__save-status--saved {
            color: #27ae60;
          }

          .assessment-header__save-status--unsaved {
            color: #495057;
          }

          .assessment-header__save-icon {
            font-size: 0.875rem;
          }

          .assessment-header__subtitle {
            margin: 0.25rem 0 0 0;
            font-size: 0.875rem;
            color: #6c757d;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          @media (max-width: 768px) {
            .assessment-header__menu-button {
              display: block;
              min-width: 44px;
              min-height: 44px;
            }

            .assessment-header__dashboard-btn {
              min-width: 44px;
              min-height: 44px;
            }

            .assessment-header__dashboard-text {
              display: none;
            }

            .assessment-header__progress {
              min-width: 120px;
            }

            .assessment-header__main-title {
              font-size: 1.125rem;
            }

            .assessment-header__system {
              font-size: 1rem;
            }
          }

          @media (max-width: 480px) {
            .assessment-header__content {
              padding: 0 0.5rem;
              gap: 0.5rem;
            }

            .assessment-header__progress-info {
              flex-direction: column;
              align-items: flex-end;
              gap: 0.125rem;
            }

            .assessment-header__status {
              min-width: 80px;
            }
          }

          /* Reduced motion support */
          @media (prefers-reduced-motion: reduce) {
            .assessment-header__dashboard-btn,
            .assessment-header__menu-button,
            .assessment-header__progress-fill {
              transition: none !important;
              transform: none !important;
            }

            .assessment-header__dashboard-btn:hover,
            .assessment-header__menu-button:hover {
              transform: none !important;
            }
          }
        `}</style>
      </header>
    );
  }
);

export default AssessmentHeader;
