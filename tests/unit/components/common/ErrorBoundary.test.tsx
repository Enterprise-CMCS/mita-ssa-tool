import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import ErrorBoundary from '../../../../src/components/common/ErrorBoundary';

// Component that throws an error for testing
const ThrowError: React.FC<{ shouldThrow: boolean; errorMessage?: string }> = ({
  shouldThrow,
  errorMessage = 'Test error',
}) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div>No error</div>;
};

// Mock window.location
const mockReload = jest.fn();
Object.defineProperty(window, 'location', {
  value: {
    reload: mockReload,
    href: '',
  },
  writable: true,
});

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn(); // Suppress console.error in tests
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('renders error UI when child component throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Application Error')).toBeInTheDocument();
    expect(screen.getByText(/Something unexpected happened/)).toBeInTheDocument();
  });

  it('shows context-specific error heading when context is provided', () => {
    render(
      <ErrorBoundary context="Assessment">
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Assessment Error')).toBeInTheDocument();
  });

  it('shows user-friendly message for chunk loading errors', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} errorMessage="ChunkLoadError: Loading chunk failed" />
      </ErrorBoundary>
    );

    expect(
      screen.getByText(/There was a problem loading part of the application/)
    ).toBeInTheDocument();
  });

  it('shows user-friendly message for network errors', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} errorMessage="NetworkError: fetch failed" />
      </ErrorBoundary>
    );

    expect(screen.getByText(/There was a network connection issue/)).toBeInTheDocument();
  });

  it('shows user-friendly message for storage errors', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} errorMessage="QuotaExceededError: storage quota exceeded" />
      </ErrorBoundary>
    );

    expect(screen.getByText(/There was a problem with browser storage/)).toBeInTheDocument();
  });

  it('shows Try Again button by default', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
  });

  it('hides Try Again button when showRetry is false', () => {
    render(
      <ErrorBoundary showRetry={false}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.queryByRole('button', { name: 'Try Again' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh Page' })).toBeInTheDocument();
  });

  it('calls onRetry when Try Again button is clicked', () => {
    const mockOnRetry = jest.fn();

    render(
      <ErrorBoundary onRetry={mockOnRetry}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });

  it('reloads page when Refresh Page button is clicked', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Refresh Page' }));
    expect(mockReload).toHaveBeenCalledTimes(1);
  });

  it('navigates to home when Go to Home button is clicked', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Go to Home' }));
    expect(window.location.href).toBe('/');
  });

  it('shows retry count when retries have been attempted', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Click Try Again to trigger a retry
    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));

    // Re-render with error to simulate retry failure
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Retry attempts: 1/3')).toBeInTheDocument();
  });

  it('disables Try Again button after 3 retries', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Simulate 3 retries
    for (let i = 0; i < 3; i++) {
      fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
    }

    expect(screen.queryByRole('button', { name: 'Try Again' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh Page' })).toBeInTheDocument();
  });

  it('shows technical details when expanded', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} errorMessage="Detailed test error" />
      </ErrorBoundary>
    );

    const detailsElement = screen.getByText('Technical Details');
    fireEvent.click(detailsElement);

    expect(screen.getByText('Detailed test error')).toBeInTheDocument();
  });

  it('renders custom fallback when provided', () => {
    const customFallback = <div>Custom error message</div>;

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
    expect(screen.queryByText('Application Error')).not.toBeInTheDocument();
  });

  it('logs error details for debugging', () => {
    render(
      <ErrorBoundary context="Test Context">
        <ThrowError shouldThrow={true} errorMessage="Test error for logging" />
      </ErrorBoundary>
    );

    expect(console.error).toHaveBeenCalledWith(
      'Detailed error information:',
      expect.objectContaining({
        error: 'Test error for logging',
        context: 'Test Context',
        timestamp: expect.any(String),
        retryCount: 0,
      })
    );
  });

  it('resets error state when Try Again is clicked', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Application Error')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));

    // Re-render without error to simulate successful retry
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
    expect(screen.queryByText('Application Error')).not.toBeInTheDocument();
  });

  it('shows component stack in technical details', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const detailsElement = screen.getByText('Technical Details');
    fireEvent.click(detailsElement);

    expect(screen.getByText('Component Stack:')).toBeInTheDocument();
  });

  it('handles errors without stack trace gracefully', () => {
    // Create an error without stack
    const errorWithoutStack = new Error('Error without stack');
    delete errorWithoutStack.stack;

    const ThrowErrorWithoutStack = () => {
      throw errorWithoutStack;
    };

    render(
      <ErrorBoundary>
        <ThrowErrorWithoutStack />
      </ErrorBoundary>
    );

    expect(screen.getByText('Application Error')).toBeInTheDocument();

    const detailsElement = screen.getByText('Technical Details');
    fireEvent.click(detailsElement);

    expect(screen.getByText('Error without stack')).toBeInTheDocument();
  });
});
