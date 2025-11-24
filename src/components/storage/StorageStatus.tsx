'use client';

import { useStorage } from '../../hooks/useStorage';

interface StorageStatusProps {
  showDetails?: boolean;
  onStorageError?: (error: Error) => void;
}

/**
 * Component for displaying storage availability status
 */
export function StorageStatus({ showDetails = false, onStorageError }: StorageStatusProps) {
  const {
    isInitialized,
    isStorageAvailable,
    isLocalStorageAvailable,
    isIndexedDBAvailable,
    localStorageUsage,
    localStorageLimit,
    storageUsagePercentage,
    preferredStorage,
    error,
  } = useStorage();

  // Call onStorageError if provided and there's an error
  if (error && onStorageError) {
    onStorageError(error);
  }

  if (!isInitialized) {
    return (
      <div className="storage-status storage-status--loading">Checking storage availability...</div>
    );
  }

  if (error) {
    return (
      <div className="storage-status storage-status--error">
        <div className="storage-status__title">Storage Error</div>
        <div className="storage-status__message">{error.message}</div>
        <div className="storage-status__help">
          Your assessment data may not be saved. Please export your work frequently.
        </div>
      </div>
    );
  }

  if (!isStorageAvailable) {
    return (
      <div className="storage-status storage-status--unavailable">
        <div className="storage-status__title">Storage Unavailable</div>
        <div className="storage-status__message">
          Browser storage is not available. Your assessment data will not be saved.
        </div>
        <div className="storage-status__help">
          Try using a different browser or check your privacy settings.
        </div>
      </div>
    );
  }

  // Show minimal status if details aren't requested
  if (!showDetails) {
    return (
      <div className="storage-status storage-status--available">
        <div className="storage-status__title">Storage Available</div>
      </div>
    );
  }

  // Show detailed status
  return (
    <div className="storage-status storage-status--available">
      <div className="storage-status__title">Storage Status</div>

      <div className="storage-status__details">
        <div className="storage-status__item">
          <span className="storage-status__label">Preferred Storage:</span>
          <span className="storage-status__value">{preferredStorage}</span>
        </div>

        <div className="storage-status__item">
          <span className="storage-status__label">localStorage:</span>
          <span className="storage-status__value">
            {isLocalStorageAvailable ? 'Available' : 'Unavailable'}
          </span>
        </div>

        <div className="storage-status__item">
          <span className="storage-status__label">IndexedDB:</span>
          <span className="storage-status__value">
            {isIndexedDBAvailable ? 'Available' : 'Unavailable'}
          </span>
        </div>

        {isLocalStorageAvailable && (
          <>
            <div className="storage-status__item">
              <span className="storage-status__label">Storage Usage:</span>
              <span className="storage-status__value">
                {Math.round(localStorageUsage / 1024)} KB / {Math.round(localStorageLimit / 1024)}{' '}
                KB
              </span>
            </div>

            <div className="storage-status__item">
              <div className="storage-status__progress">
                <div
                  className="storage-status__progress-bar"
                  style={{ width: `${storageUsagePercentage}%` }}
                />
              </div>
              <span className="storage-status__value">{storageUsagePercentage}%</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default StorageStatus;
