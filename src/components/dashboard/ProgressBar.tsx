/**
 * Progress bar components for displaying assessment status
 * Matches mita-3.0 design with counts inside segments
 */

import { JSX } from 'react';
import { Box } from '@mui/material';

interface StackedProgressBarProps {
  finalized: number;
  inProgress: number;
  notStarted: number;
}

/**
 * Stacked progress bar for domain-level status display
 * Shows counts inside each segment like mita-3.0
 */
export function StackedProgressBar({
  finalized,
  inProgress,
  notStarted,
}: StackedProgressBarProps): JSX.Element {
  const total = finalized + inProgress + notStarted;
  if (total === 0) return <Box sx={{ height: 22 }} aria-hidden="true" />;

  const finalizedPct = (finalized / total) * 100;
  const inProgressPct = (inProgress / total) * 100;
  const notStartedPct = (notStarted / total) * 100;

  // Build accessible description
  const statusDescription = `${finalized} finalized, ${inProgress} in progress, ${notStarted} not started out of ${total} total`;

  return (
    <Box
      role="group"
      aria-label={statusDescription}
      sx={{
        display: 'flex',
        height: 22,
        borderRadius: 1,
        overflow: 'hidden',
        backgroundColor: 'grey.200',
        fontSize: '0.75rem',
        fontWeight: 500,
      }}
    >
      {finalized > 0 && (
        <Box
          aria-hidden="true"
          sx={{
            width: `${finalizedPct}%`,
            backgroundColor: 'success.main',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 20,
          }}
        >
          {finalized}
        </Box>
      )}
      {inProgress > 0 && (
        <Box
          aria-hidden="true"
          sx={{
            width: `${inProgressPct}%`,
            background: `repeating-linear-gradient(
              -45deg,
              #81c784,
              #81c784 4px,
              #a5d6a7 4px,
              #a5d6a7 8px
            )`,
            // The striped fill alternates #81c784 / #a5d6a7, so the text has to
            // clear the DARKER stripe: #1b5e20 measured only 3.91:1 against it.
            color: '#0b3d13',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 20,
          }}
        >
          {inProgress}
        </Box>
      )}
      {notStarted > 0 && (
        <Box
          aria-hidden="true"
          sx={{
            width: `${notStartedPct}%`,
            backgroundColor: 'grey.300',
            color: 'grey.600',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 20,
          }}
        >
          {notStarted}
        </Box>
      )}
    </Box>
  );
}

interface CapabilityProgressBarProps {
  status: 'not_started' | 'in_progress' | 'finalized';
  progress: number;
}

/**
 * Simple progress bar for capability area completion
 */
export function CapabilityProgressBar({
  status,
  progress,
}: CapabilityProgressBarProps): JSX.Element {
  const isFinalized = status === 'finalized';
  const isInProgress = status === 'in_progress';
  const displayProgress = isFinalized ? 100 : progress;

  // Build accessible label
  const statusLabel =
    status === 'not_started'
      ? 'Not started'
      : status === 'finalized'
        ? 'Completed'
        : `${displayProgress}% complete`;

  return (
    <Box
      role="progressbar"
      aria-valuenow={displayProgress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={statusLabel}
      sx={{
        height: 18,
        borderRadius: 1,
        overflow: 'hidden',
        backgroundColor: 'grey.200',
      }}
    >
      {displayProgress > 0 && (
        <Box
          aria-hidden="true"
          sx={{
            width: `${displayProgress}%`,
            height: '100%',
            ...(isFinalized
              ? {
                  backgroundColor: 'success.main',
                }
              : isInProgress
                ? {
                    background: `repeating-linear-gradient(
                  -45deg,
                  #81c784,
                  #81c784 3px,
                  #a5d6a7 3px,
                  #a5d6a7 6px
                )`,
                  }
                : {
                    backgroundColor: 'grey.300',
                  }),
          }}
        />
      )}
    </Box>
  );
}

// Keep SimpleProgressBar for backward compatibility
export { CapabilityProgressBar as SimpleProgressBar };
