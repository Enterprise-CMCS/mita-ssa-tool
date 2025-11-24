import React, { useState } from 'react';

import { Alert, Button } from '@cmsgov/design-system';

import enhancedStorageService from '../../services/EnhancedStorageService';

import type { Assessment } from '../../types';

interface StorageErrorHandlerProps {
  error: Error;
  assessment?: Assessment;
  onRetry?: () => void;
  onContinueOffline?: () => void;
  className?: string;
}

/**
 * Component for handling storage-specific errors with recovery options
 */
const StorageErrorHandler: React.FC<StorageErrorHandlerProps> = ({
  error,
  assessment,
  onRetry,
  onContinueOffline,
  className,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [storageInfo, setStorageInfo] = useState<{
    isLocalStorageAvailable: boolean;
    isIndexedDBAvailable: boolean;
  } | null>(null);

  // Check storage availability
  React.useEffect(() => {
    const checkStorage = async () => {
      try {
        const info = await enhancedStorageService.getStorageInfo();
        setStorageInfo({
          isLocalStorageAvailable: info.isLocalStorageAvailable,
          isIndexedDBAvailable: info.isIndexedDBAvailable,
        });
      } catch (err) {
        console.error('Failed to check storage info:', err);
      }
    };

    checkStorage();
  }, []);

  const handleExportAssessment = async () => {
    if (!assessment) {
      return;
    }

    setIsExporting(true);
    try {
      // Create export data
      const exportData = {
        assessment,
        exportedAt: new Date().toISOString(),
        version: '1.0',
      };

      // Create and download the file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `assessment-backup-${assessment.id}-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportSuccess(true);
    } catch (exportError) {
      console.error('Failed to export assessment:', exportError);
      // Show raw data as fallback
      showRawDataFallback();
    } finally {
      setIsExporting(false);
    }
  };

  const showRawDataFallback = () => {
    if (!assessment) {
      return;
    }

    const dataText = JSON.stringify(assessment, null, 2);
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(`
        <html>
          <head>
            <title>Assessment Data - Manual Backup</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              textarea { width: 100%; height: 400px; font-family: monospace; }
              .instructions { background: #f5f5f5; padding: 15px; margin-bottom: 20px; border-radius: 4px; }
            </style>
          </head>
          <body>
            <h1>Assessment Data - Manual Backup</h1>
            <div class="instructions">
              <h3>Instructions:</h3>
              <ol>
                <li>Select all the text in the box below (Ctrl+A or Cmd+A)</li>
                <li>Copy it (Ctrl+C or Cmd+C)</li>
                <li>Save it to a text file with a .json extension</li>
                <li>You can import this file later to restore your assessment</li>
              </ol>
            </div>
            <textarea readonly>${dataText}</textarea>
          </body>
        </html>
      `);
    }
  };

  const getErrorMessage = () => {
    const message = error.message.toLowerCase();

    if (message.includes('quota') || message.includes('storage')) {
      return 'Your browser storage is full. Please free up space or export your data.';
    }

    if (message.includes('unavailable') || message.includes('not supported')) {
      return "Browser storage is not available. You can continue working, but your progress won't be saved automatically.";
    }

    if (message.includes('network') || message.includes('connection')) {
      return 'Network connection issue detected. Your data will be saved locally when connection is restored.';
    }

    return 'There was a problem saving your assessment data. Your work may not be preserved.';
  };

  const getRecoveryOptions = () => {
    const options = [];

    if (storageInfo?.isLocalStorageAvailable || storageInfo?.isIndexedDBAvailable) {
      options.push({
        label: 'Try Again',
        action: onRetry,
        primary: true,
      });
    }

    if (assessment) {
      options.push({
        label: isExporting ? 'Exporting...' : 'Export Data',
        action: handleExportAssessment,
        disabled: isExporting,
      });
    }

    options.push({
      label: 'Continue Without Saving',
      action: onContinueOffline,
    });

    return options;
  };

  return (
    <div className={className}>
      <Alert variation="error" role="alert">
        <div className="ds-c-alert__body">
          <h3 className="ds-c-alert__heading">Storage Error</h3>
          <p className="ds-c-alert__text">{getErrorMessage()}</p>

          {storageInfo && (
            <div className="ds-u-margin-top--2">
              <h4>Storage Status:</h4>
              <ul className="ds-c-list">
                <li>
                  Local Storage:{' '}
                  {storageInfo.isLocalStorageAvailable ? '✓ Available' : '✗ Unavailable'}
                </li>
                <li>
                  IndexedDB: {storageInfo.isIndexedDBAvailable ? '✓ Available' : '✗ Unavailable'}
                </li>
              </ul>
            </div>
          )}

          <div className="ds-u-margin-top--3">
            {getRecoveryOptions().map((option, index) => (
              <Button
                key={index}
                onClick={option.action}
                variation={option.primary ? 'solid' : 'ghost'}
                disabled={option.disabled}
                className="ds-u-margin-right--2 ds-u-margin-bottom--1"
              >
                {option.label}
              </Button>
            ))}
          </div>

          {exportSuccess && (
            <Alert variation="success" className="ds-u-margin-top--2">
              <div className="ds-c-alert__body">
                <p className="ds-c-alert__text">
                  Your assessment data has been exported successfully. Keep this file safe - you can
                  import it later to restore your progress.
                </p>
              </div>
            </Alert>
          )}

          <details className="ds-u-margin-top--2">
            <summary>Technical Details</summary>
            <div className="ds-u-font-family--mono ds-u-font-size--sm ds-u-margin-top--1">
              <strong>Error:</strong> {error.message}
              {error.stack && (
                <pre className="ds-u-margin-top--1 ds-u-font-size--xs">{error.stack}</pre>
              )}
            </div>
          </details>
        </div>
      </Alert>
    </div>
  );
};

export default StorageErrorHandler;
