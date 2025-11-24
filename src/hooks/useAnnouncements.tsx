import React, { useCallback, useRef } from 'react';

type AnnouncementPriority = 'polite' | 'assertive';

export const useAnnouncements = () => {
  const politeRegionRef = useRef<HTMLDivElement>(null);
  const assertiveRegionRef = useRef<HTMLDivElement>(null);

  const announce = useCallback((message: string, priority: AnnouncementPriority = 'polite') => {
    const region = priority === 'assertive' ? assertiveRegionRef.current : politeRegionRef.current;

    if (region) {
      // Clear previous message
      region.textContent = '';

      // Add new message after a brief delay to ensure screen readers pick it up
      setTimeout(() => {
        region.textContent = message;
      }, 100);
    }
  }, []);

  const announceProgress = useCallback(
    (completed: number, total: number, currentItem?: string) => {
      const percentage = Math.round((completed / total) * 100);
      let message = `Progress: ${completed} of ${total} items completed (${percentage}%)`;

      if (currentItem) {
        message += `. Currently working on: ${currentItem}`;
      }

      announce(message, 'polite');
    },
    [announce]
  );

  const announceError = useCallback(
    (error: string) => {
      announce(`Error: ${error}`, 'assertive');
    },
    [announce]
  );

  const announceSuccess = useCallback(
    (message: string) => {
      announce(`Success: ${message}`, 'polite');
    },
    [announce]
  );

  const announceStepChange = useCallback(
    (stepName: string, stepNumber: number, totalSteps: number) => {
      announce(`Step ${stepNumber} of ${totalSteps}: ${stepName}`, 'polite');
    },
    [announce]
  );

  // Component to render the live regions
  const LiveRegions = () => (
    <React.Fragment>
      <div
        ref={politeRegionRef}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        role="status"
      ></div>
      <div
        ref={assertiveRegionRef}
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
        role="alert"
      ></div>
    </React.Fragment>
  );

  return {
    announce,
    announceProgress,
    announceError,
    announceSuccess,
    announceStepChange,
    LiveRegions,
  };
};
