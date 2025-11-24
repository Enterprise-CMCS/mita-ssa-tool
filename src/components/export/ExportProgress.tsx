/**
 * Export Progress Component
 * Progress indicator for large export operations
 */

import type { ExportProgress as ExportProgressType } from '../../services/export/types';

interface ExportProgressProps {
  progress: ExportProgressType;
  onCancel?: () => void;
}

export function ExportProgress({ progress, onCancel }: ExportProgressProps) {
  const getStageIcon = (stage: ExportProgressType['stage']) => {
    switch (stage) {
      case 'collecting':
        return '📊';
      case 'processing':
        return '⚙️';
      case 'generating':
        return '📄';
      case 'complete':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '⏳';
    }
  };

  const getStageDescription = (stage: ExportProgressType['stage']) => {
    switch (stage) {
      case 'collecting':
        return 'Gathering assessment data and capability definitions...';
      case 'processing':
        return 'Calculating enhanced scores and validating data...';
      case 'generating':
        return 'Creating export file with selected format...';
      case 'complete':
        return 'Export completed successfully!';
      case 'error':
        return 'An error occurred during export.';
      default:
        return 'Processing...';
    }
  };

  return (
    <div className="ds-c-card ds-u-padding--3">
      <div className="ds-u-text-align--center">
        {/* Stage Icon */}
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>{getStageIcon(progress.stage)}</div>

        {/* Progress Message */}
        <h3 className="ds-h3 ds-u-margin-bottom--2">{progress.message}</h3>

        {/* Stage Description */}
        <p className="ds-text--small ds-u-color--muted ds-u-margin-bottom--3">
          {getStageDescription(progress.stage)}
        </p>

        {/* Progress Bar */}
        {progress.stage !== 'complete' && progress.stage !== 'error' && (
          <div className="ds-u-margin-bottom--3">
            <div
              className="ds-c-progress"
              role="progressbar"
              aria-valuenow={progress.percentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Export progress: ${progress.percentage}%`}
            >
              <div className="ds-c-progress__bar" style={{ width: `${progress.percentage}%` }} />
            </div>
            <p className="ds-text--small ds-u-margin-top--1">{progress.percentage}% complete</p>
          </div>
        )}

        {/* Loading Spinner for Active Stages */}
        {progress.stage !== 'complete' && progress.stage !== 'error' && (
          <div className="ds-c-spinner ds-u-margin-bottom--3" role="status">
            <span className="ds-u-visibility--screen-reader">{progress.message}</span>
          </div>
        )}

        {/* Cancel Button */}
        {progress.canCancel && onCancel && (
          <button type="button" className="ds-c-button ds-c-button--transparent" onClick={onCancel}>
            Cancel Export
          </button>
        )}

        {/* Success Message */}
        {progress.stage === 'complete' && (
          <div className="ds-c-alert ds-c-alert--success">
            <div className="ds-c-alert__body">
              <p className="ds-c-alert__text">
                Your export has been generated and should download automatically.
              </p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {progress.stage === 'error' && (
          <div className="ds-c-alert ds-c-alert--error">
            <div className="ds-c-alert__body">
              <h4 className="ds-c-alert__heading">Export Failed</h4>
              <p className="ds-c-alert__text">{progress.message}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
