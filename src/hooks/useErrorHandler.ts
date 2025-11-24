import { useCallback, useRef, useState } from 'react';

export interface ErrorInfo {
  type: 'storage' | 'network' | 'validation' | 'content' | 'unknown';
  message: string;
  originalError: Error;
  timestamp: Date;
  context?: Record<string, unknown>;
  recoverable: boolean;
}

export interface ErrorHandlerState {
  error: ErrorInfo | null;
  isRetrying: boolean;
  retryCount: number;
}

export interface ErrorHandlerActions {
  setError: (error: Error, context?: Record<string, unknown>) => void;
  clearError: () => void;
  retry: (retryFn: () => Promise<void> | void) => Promise<void>;
  isStorageError: boolean;
  isNetworkError: boolean;
  isValidationError: boolean;
  isContentError: boolean;
}

/**
 * Hook for consistent error handling across assessment components
 */
export function useErrorHandler(): ErrorHandlerState & ErrorHandlerActions {
  const [state, setState] = useState<ErrorHandlerState>({
    error: null,
    isRetrying: false,
    retryCount: 0,
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  const categorizeError = useCallback((error: Error): ErrorInfo['type'] => {
    const message = error.message.toLowerCase();

    if (
      message.includes('storage') ||
      message.includes('quota') ||
      message.includes('indexeddb') ||
      message.includes('localstorage')
    ) {
      return 'storage';
    }

    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('connection')
    ) {
      return 'network';
    }

    if (
      message.includes('validation') ||
      message.includes('required') ||
      message.includes('invalid')
    ) {
      return 'validation';
    }

    if (
      message.includes('content') ||
      message.includes('parse') ||
      message.includes('yaml') ||
      message.includes('markdown')
    ) {
      return 'content';
    }

    return 'unknown';
  }, []);

  const isRecoverable = useCallback((type: ErrorInfo['type'], _error: Error): boolean => {
    switch (type) {
      case 'storage':
        // Storage errors are often recoverable with fallbacks
        return true;
      case 'network':
        // Network errors can be retried
        return true;
      case 'content':
        // Content errors might be recoverable if content is reloaded
        return true;
      case 'validation':
        // Validation errors require user action
        return false;
      case 'unknown':
        // Unknown errors might be recoverable
        return true;
      default:
        return false;
    }
  }, []);

  const setError = useCallback(
    (error: Error, context?: Record<string, unknown>) => {
      const type = categorizeError(error);
      const errorInfo: ErrorInfo = {
        type,
        message: error.message,
        originalError: error,
        timestamp: new Date(),
        context,
        recoverable: isRecoverable(type, error),
      };

      setState(prev => ({
        ...prev,
        error: errorInfo,
      }));

      // Log error for debugging
      console.error('Error handled by useErrorHandler:', {
        type,
        message: error.message,
        context,
        stack: error.stack,
      });
    },
    [categorizeError, isRecoverable]
  );

  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null,
      retryCount: 0,
    }));
  }, []);

  const retry = useCallback(
    async (retryFn: () => Promise<void> | void) => {
      // Check current state using ref for synchronous access
      if (!stateRef.current.error?.recoverable) {
        console.warn('Attempted to retry non-recoverable error');
        return;
      }

      // Set isRetrying to true
      setState(prev => ({
        ...prev,
        isRetrying: true,
      }));

      try {
        await retryFn();
        // If retry succeeds, clear the error
        setState(prev => ({
          ...prev,
          error: null,
          isRetrying: false,
          retryCount: 0,
        }));
      } catch (retryError) {
        // If retry fails, update the error and increment retry count
        setState(prev => {
          const newRetryCount = prev.retryCount + 1;
          const type = categorizeError(retryError as Error);

          return {
            ...prev,
            error: {
              type,
              message: (retryError as Error).message,
              originalError: retryError as Error,
              timestamp: new Date(),
              context: prev.error?.context,
              recoverable: isRecoverable(type, retryError as Error) && newRetryCount < 3, // Max 3 retries
            },
            isRetrying: false,
            retryCount: newRetryCount,
          };
        });

        console.error('Retry failed:', retryError);
      }
    },
    [categorizeError, isRecoverable]
  );

  return {
    ...state,
    setError,
    clearError,
    retry,
    isStorageError: state.error?.type === 'storage',
    isNetworkError: state.error?.type === 'network',
    isValidationError: state.error?.type === 'validation',
    isContentError: state.error?.type === 'content',
  };
}
