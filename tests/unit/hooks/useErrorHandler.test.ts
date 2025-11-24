import { act, renderHook } from '@testing-library/react';

import { useErrorHandler } from '../../../src/hooks/useErrorHandler';

describe('useErrorHandler', () => {
  beforeEach(() => {
    console.error = jest.fn(); // Suppress console.error in tests
    console.warn = jest.fn(); // Suppress console.warn in tests
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('initializes with no error', () => {
    const { result } = renderHook(() => useErrorHandler());

    expect(result.current.error).toBeNull();
    expect(result.current.isRetrying).toBe(false);
    expect(result.current.retryCount).toBe(0);
    expect(result.current.isStorageError).toBe(false);
    expect(result.current.isNetworkError).toBe(false);
    expect(result.current.isValidationError).toBe(false);
    expect(result.current.isContentError).toBe(false);
  });

  it('categorizes storage errors correctly', () => {
    const { result } = renderHook(() => useErrorHandler());

    act(() => {
      result.current.setError(new Error('Storage quota exceeded'));
    });

    expect(result.current.error?.type).toBe('storage');
    expect(result.current.isStorageError).toBe(true);
    expect(result.current.error?.recoverable).toBe(true);
  });

  it('categorizes network errors correctly', () => {
    const { result } = renderHook(() => useErrorHandler());

    act(() => {
      result.current.setError(new Error('Network connection failed'));
    });

    expect(result.current.error?.type).toBe('network');
    expect(result.current.isNetworkError).toBe(true);
    expect(result.current.error?.recoverable).toBe(true);
  });

  it('categorizes validation errors correctly', () => {
    const { result } = renderHook(() => useErrorHandler());

    act(() => {
      result.current.setError(new Error('Validation failed: required field missing'));
    });

    expect(result.current.error?.type).toBe('validation');
    expect(result.current.isValidationError).toBe(true);
    expect(result.current.error?.recoverable).toBe(false);
  });

  it('categorizes content errors correctly', () => {
    const { result } = renderHook(() => useErrorHandler());

    act(() => {
      result.current.setError(new Error('Content parse error'));
    });

    expect(result.current.error?.type).toBe('content');
    expect(result.current.isContentError).toBe(true);
    expect(result.current.error?.recoverable).toBe(true);
  });

  it('categorizes unknown errors correctly', () => {
    const { result } = renderHook(() => useErrorHandler());

    act(() => {
      result.current.setError(new Error('Some unknown error'));
    });

    expect(result.current.error?.type).toBe('unknown');
    expect(result.current.error?.recoverable).toBe(true);
  });

  it('includes context when setting error', () => {
    const { result } = renderHook(() => useErrorHandler());
    const context = { operation: 'save', assessmentId: 'test-123' };

    act(() => {
      result.current.setError(new Error('Test error'), context);
    });

    expect(result.current.error?.context).toEqual(context);
    expect(result.current.error?.timestamp).toBeInstanceOf(Date);
  });

  it('clears error state', () => {
    const { result } = renderHook(() => useErrorHandler());

    act(() => {
      result.current.setError(new Error('Test error'));
    });

    expect(result.current.error).not.toBeNull();

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.retryCount).toBe(0);
  });

  it('successfully retries and clears error', async () => {
    const { result } = renderHook(() => useErrorHandler());
    const mockRetryFn = jest.fn().mockResolvedValue(undefined);

    act(() => {
      result.current.setError(new Error('Recoverable error'));
    });

    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.recoverable).toBe(true);

    await act(async () => {
      await result.current.retry(mockRetryFn);
    });

    expect(mockRetryFn).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeNull();
    expect(result.current.isRetrying).toBe(false);
    expect(result.current.retryCount).toBe(0);
  });

  it('handles retry failure and updates error', async () => {
    const { result } = renderHook(() => useErrorHandler());
    const mockRetryFn = jest.fn().mockRejectedValue(new Error('Retry failed'));

    act(() => {
      result.current.setError(new Error('Initial error'));
    });

    expect(result.current.error?.recoverable).toBe(true);

    await act(async () => {
      await result.current.retry(mockRetryFn);
    });

    expect(mockRetryFn).toHaveBeenCalledTimes(1);
    expect(result.current.error?.message).toBe('Retry failed');
    expect(result.current.retryCount).toBe(1);
    expect(result.current.isRetrying).toBe(false);
  });

  it('prevents retry of non-recoverable errors', async () => {
    const { result } = renderHook(() => useErrorHandler());
    const mockRetryFn = jest.fn();

    act(() => {
      result.current.setError(new Error('Validation error: required field'));
    });

    expect(result.current.error?.recoverable).toBe(false);

    await act(async () => {
      await result.current.retry(mockRetryFn);
    });

    expect(mockRetryFn).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith('Attempted to retry non-recoverable error');
  });

  it('limits retry attempts to 3', async () => {
    const { result } = renderHook(() => useErrorHandler());
    const mockRetryFn = jest.fn().mockRejectedValue(new Error('Retry failed'));

    act(() => {
      result.current.setError(new Error('Recoverable error'));
    });

    expect(result.current.error?.recoverable).toBe(true);

    // First retry
    await act(async () => {
      await result.current.retry(mockRetryFn);
    });
    expect(result.current.retryCount).toBe(1);
    expect(result.current.error?.recoverable).toBe(true);

    // Second retry
    await act(async () => {
      await result.current.retry(mockRetryFn);
    });
    expect(result.current.retryCount).toBe(2);
    expect(result.current.error?.recoverable).toBe(true);

    // Third retry
    await act(async () => {
      await result.current.retry(mockRetryFn);
    });
    expect(result.current.retryCount).toBe(3);
    expect(result.current.error?.recoverable).toBe(false); // Should be false after 3 retries
  });

  it('sets isRetrying flag during retry', async () => {
    const { result } = renderHook(() => useErrorHandler());
    let resolveRetry: (() => void) | undefined;
    const mockRetryFn = jest.fn(
      () =>
        new Promise<void>(resolve => {
          resolveRetry = resolve;
        })
    );

    act(() => {
      result.current.setError(new Error('Recoverable error'));
    });

    expect(result.current.error?.recoverable).toBe(true);

    // Start the retry but don't await it yet
    const retryPromise = result.current.retry(mockRetryFn);

    // Check that isRetrying is set to true
    await act(async () => {
      // Give the state update a chance to process
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.isRetrying).toBe(true);

    // Resolve the retry
    act(() => {
      if (resolveRetry) {
        resolveRetry();
      }
    });

    await act(async () => {
      await retryPromise;
    });

    expect(result.current.isRetrying).toBe(false);
  });

  it('handles synchronous retry functions', async () => {
    const { result } = renderHook(() => useErrorHandler());
    const mockRetryFn = jest.fn();

    act(() => {
      result.current.setError(new Error('Recoverable error'));
    });

    expect(result.current.error?.recoverable).toBe(true);

    await act(async () => {
      await result.current.retry(mockRetryFn);
    });

    expect(mockRetryFn).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeNull();
  });

  it('preserves original context during retry failures', async () => {
    const { result } = renderHook(() => useErrorHandler());
    const originalContext = { operation: 'save', assessmentId: 'test-123' };
    const mockRetryFn = jest.fn().mockRejectedValue(new Error('Retry failed'));

    act(() => {
      result.current.setError(new Error('Initial error'), originalContext);
    });

    expect(result.current.error?.recoverable).toBe(true);

    await act(async () => {
      await result.current.retry(mockRetryFn);
    });

    expect(result.current.error?.context).toEqual(originalContext);
  });

  it('logs errors for debugging', () => {
    const { result } = renderHook(() => useErrorHandler());
    const error = new Error('Test error');
    const context = { operation: 'test' };

    act(() => {
      result.current.setError(error, context);
    });

    expect(console.error).toHaveBeenCalledWith('Error handled by useErrorHandler:', {
      type: 'unknown',
      message: 'Test error',
      context,
      stack: error.stack,
    });
  });
});
