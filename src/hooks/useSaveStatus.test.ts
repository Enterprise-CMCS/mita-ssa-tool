/**
 * useSaveStatus Hook Tests
 *
 * The behaviour under test is what OBS-7 was about: the indicator must follow the
 * real outcome of a save, not a timer. A test that only checks the happy path
 * would have passed against the broken implementation, so the failure and
 * out-of-order cases carry the weight here.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSaveStatus } from './useSaveStatus';

describe('useSaveStatus', () => {
  beforeEach(() => {
    // The hook logs failures; keep expected errors out of the test output.
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  /** A promise plus the handles to settle it later. */
  function deferred(): {
    promise: Promise<void>;
    resolve: () => void;
    reject: (error: Error) => void;
  } {
    let resolve!: () => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<void>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  }

  it('starts idle with no recorded save', () => {
    const { result } = renderHook(() => useSaveStatus());

    expect(result.current.status).toBe('idle');
    expect(result.current.lastSaved).toBeUndefined();
  });

  it('reports saving while in flight, then saved', async () => {
    const { promise, resolve } = deferred();
    const { result } = renderHook(() => useSaveStatus());

    let saveResult: Promise<boolean>;
    act(() => {
      saveResult = result.current.runSave(() => promise);
    });

    expect(result.current.status).toBe('saving');
    expect(result.current.lastSaved).toBeUndefined();

    await act(async () => {
      resolve();
      await saveResult;
    });

    expect(result.current.status).toBe('saved');
    expect(result.current.lastSaved).toBeInstanceOf(Date);
  });

  it('reports error and returns false when the operation rejects', async () => {
    const { result } = renderHook(() => useSaveStatus());

    let returned: boolean | undefined;
    await act(async () => {
      returned = await result.current.runSave(() => Promise.reject(new Error('IndexedDB full')));
    });

    expect(returned).toBe(false);
    expect(result.current.status).toBe('error');
    // A failed write must not be recorded as a successful save time
    expect(result.current.lastSaved).toBeUndefined();
  });

  it('returns true on success', async () => {
    const { result } = renderHook(() => useSaveStatus());

    let returned: boolean | undefined;
    await act(async () => {
      returned = await result.current.runSave(() => Promise.resolve());
    });

    expect(returned).toBe(true);
  });

  it('does not swallow the rejection reason', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useSaveStatus());
    const failure = new Error('quota exceeded');

    await act(async () => {
      await result.current.runSave(() => Promise.reject(failure));
    });

    expect(spy).toHaveBeenCalledWith('Save failed:', failure);
  });

  it('reverts to idle after the saved confirmation window', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useSaveStatus(50));

    await act(async () => {
      await result.current.runSave(() => Promise.resolve());
    });
    expect(result.current.status).toBe('saved');

    await act(async () => {
      vi.advanceTimersByTime(50);
    });
    expect(result.current.status).toBe('idle');

    // lastSaved survives the revert so the bar can show "last saved at ..."
    expect(result.current.lastSaved).toBeInstanceOf(Date);
  });

  it('keeps a failure visible when an older save fails after a newer one succeeded', async () => {
    const older = deferred();
    const newer = deferred();
    const { result } = renderHook(() => useSaveStatus());

    let olderCall: Promise<boolean>;
    let newerCall: Promise<boolean>;

    act(() => {
      olderCall = result.current.runSave(() => older.promise);
      newerCall = result.current.runSave(() => newer.promise);
    });

    // Newer save succeeds first
    await act(async () => {
      newer.resolve();
      await newerCall;
    });
    expect(result.current.status).toBe('saved');

    // The older write then turns out to have failed. Freshness does not outrank a
    // lost write: that change is gone and the user has to be told.
    await act(async () => {
      older.reject(new Error('stale write'));
      await olderCall;
    });
    expect(result.current.status).toBe('error');
  });

  it('keeps a failure visible even when a newer save then succeeds', async () => {
    const failing = deferred();
    const succeeding = deferred();
    const { result } = renderHook(() => useSaveStatus());

    let failingCall: Promise<boolean>;
    let succeedingCall: Promise<boolean>;

    act(() => {
      failingCall = result.current.runSave(() => failing.promise);
      succeedingCall = result.current.runSave(() => succeeding.promise);
    });

    // The older write fails first
    await act(async () => {
      failing.reject(new Error('write failed'));
      await failingCall;
    });
    expect(result.current.status).toBe('error');

    // A newer success must not paper over it — the earlier change is still lost,
    // and there is no server copy to reconcile against.
    await act(async () => {
      succeeding.resolve();
      await succeedingCall;
    });
    expect(result.current.status).toBe('error');
  });

  it('clears a previous error when a new save starts', async () => {
    const { result } = renderHook(() => useSaveStatus());

    await act(async () => {
      await result.current.runSave(() => Promise.reject(new Error('first failed')));
    });
    expect(result.current.status).toBe('error');

    await act(async () => {
      await result.current.runSave(() => Promise.resolve());
    });
    expect(result.current.status).toBe('saved');
  });

  it('surfaces a failure from the newest save even if an older one succeeded', async () => {
    const first = deferred();
    const second = deferred();
    const { result } = renderHook(() => useSaveStatus());

    let firstCall: Promise<boolean>;
    let secondCall: Promise<boolean>;

    act(() => {
      firstCall = result.current.runSave(() => first.promise);
      secondCall = result.current.runSave(() => second.promise);
    });

    await act(async () => {
      first.resolve();
      await firstCall;
    });
    // Older success is ignored: a newer save is still in flight
    expect(result.current.status).toBe('saving');

    await act(async () => {
      second.reject(new Error('write failed'));
      await secondCall;
    });
    expect(result.current.status).toBe('error');
  });

  it('does not update state after unmount', async () => {
    const { promise, resolve } = deferred();
    const { result, unmount } = renderHook(() => useSaveStatus());

    let saveResult: Promise<boolean>;
    act(() => {
      saveResult = result.current.runSave(() => promise);
    });
    expect(result.current.status).toBe('saving');

    unmount();

    await act(async () => {
      resolve();
      await saveResult;
    });

    // The last rendered value must be untouched by the post-unmount resolution.
    // Without the mounted guard this would have advanced to 'saved'.
    expect(result.current.status).toBe('saving');
    expect(result.current.lastSaved).toBeUndefined();
  });

  it('clears a pending idle timer when a new save starts', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useSaveStatus(100));

    await act(async () => {
      await result.current.runSave(() => Promise.resolve());
    });
    expect(result.current.status).toBe('saved');

    // Second save starts before the first revert fires
    await act(async () => {
      vi.advanceTimersByTime(60);
      await result.current.runSave(() => Promise.resolve());
    });
    expect(result.current.status).toBe('saved');

    // The first timer must not drag us to idle early
    await act(async () => {
      vi.advanceTimersByTime(60);
    });
    expect(result.current.status).toBe('saved');

    await act(async () => {
      vi.advanceTimersByTime(40);
    });
    expect(result.current.status).toBe('idle');
  });
});
