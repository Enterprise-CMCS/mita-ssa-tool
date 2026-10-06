/**
 * Hook for tracking the outcome of auto-save operations.
 *
 * Exists because the assessment page previously reported success on a timer
 * without ever observing the save promise (OBS-6/OBS-7): a failed write still
 * displayed "Saved". That matters more here than in a typical app — every byte
 * of assessment data lives only in the user's browser, so there is no server
 * copy to fall back on and no later reconciliation. A save indicator that cannot
 * report failure is worse than none.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

/** Display states for the save indicator. */
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/** How long the "Saved" confirmation stays visible before returning to idle. */
const SAVED_DISPLAY_MS = 2000;

export interface UseSaveStatusReturn {
  /** Current indicator state. */
  status: SaveStatus;
  /** When the last successful save completed, or undefined if none yet. */
  lastSaved: Date | undefined;
  /**
   * Run a save operation and reflect its real outcome in `status`.
   *
   * @param operation - The async write to perform
   * @returns True if the operation resolved, false if it threw
   */
  runSave: (operation: () => Promise<void>) => Promise<boolean>;
}

/**
 * Track save state for auto-saving forms.
 *
 * @param savedDisplayMs - How long to show "Saved" before reverting to idle
 * @returns The current status, the last successful save time, and a runner
 */
export function useSaveStatus(savedDisplayMs: number = SAVED_DISPLAY_MS): UseSaveStatusReturn {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | undefined>(undefined);

  /**
   * Sequence number of the most recently started save. A slow earlier write must
   * not report *success* over a newer one — debounced text saves and level clicks
   * do overlap in practice. Failures are exempt; see `runSave`.
   */
  const latestSaveRef = useRef(0);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isMountedRef = useRef(true);

  /** Mirrors `status` so `runSave` can read it without re-creating the callback. */
  const statusRef = useRef<SaveStatus>('idle');

  const applyStatus = useCallback((next: SaveStatus): void => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  useEffect(() => {
    // Re-set on mount because StrictMode runs effects mount/unmount/mount.
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (idleTimerRef.current !== undefined) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, []);

  const runSave = useCallback(
    async (operation: () => Promise<void>): Promise<boolean> => {
      const saveId = ++latestSaveRef.current;

      // Cancel a pending revert-to-idle so a rapid second save is not cut short.
      if (idleTimerRef.current !== undefined) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = undefined;
      }
      // Starting a save clears any previous error: this attempt's outcome governs.
      if (isMountedRef.current) {
        applyStatus('saving');
      }

      try {
        await operation();
      } catch (error) {
        console.error('Save failed:', error);
        // Failures report unconditionally, without the newest-save check. A write
        // that did not land is never stale news, and with only a browser-local
        // copy of the data there is no later reconciliation to catch it. A newer
        // save succeeding must not paper over an older one that failed.
        if (isMountedRef.current) {
          applyStatus('error');
        }
        return false;
      }

      // Success reports only if this is still the newest save and nothing has
      // failed since it started.
      if (
        isMountedRef.current &&
        saveId === latestSaveRef.current &&
        statusRef.current !== 'error'
      ) {
        applyStatus('saved');
        setLastSaved(new Date());
        idleTimerRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            applyStatus('idle');
          }
        }, savedDisplayMs);
      }
      return true;
    },
    [savedDisplayMs, applyStatus]
  );

  return { status, lastSaved, runSave };
}
