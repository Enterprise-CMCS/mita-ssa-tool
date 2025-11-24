import { Component, type ErrorInfo, type ReactNode } from 'react';

import { Alert, Button } from '@cmsgov/design-system';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onRetry?: () => void;
  showRetry?: boolean;
  context?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  retryCount: number;
}

/**
 * Enhanced Error Boundary component to gracefully handle runtime errors
 * Catches JavaScript errors in child component tree and displays fallback UI with recovery options
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });

    // Log additional context for debugging
    const errorDetails = {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      context: this.props.context,
      timestamp: new Date().toISOString(),
      retryCount: this.state.retryCount,
    };

    console.error('Detailed error information:', errorDetails);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    // Reset error state if children change after a retry
    if (this.state.hasError && prevProps.children !== this.props.children) {
      this.setState({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
      });
    }
  }

  handleRetry = (): void => {
    this.setState(prevState => ({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: prevState.retryCount + 1,
    }));

    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  handleRefresh = (): void => {
    window.location.reload();
  };

  getUserFriendlyMessage = (): string => {
    if (!this.state.error) {
      return 'An unexpected error occurred.';
    }

    const message = this.state.error.message.toLowerCase();

    if (message.includes('chunk') || message.includes('loading')) {
      return 'There was a problem loading part of the application. Please refresh the page.';
    }

    if (message.includes('network') || message.includes('fetch')) {
      return 'There was a network connection issue. Please check your internet connection and try again.';
    }

    if (message.includes('storage') || message.includes('quota')) {
      return 'There was a problem with browser storage. Your data may not be saved properly.';
    }

    return 'Something unexpected happened. Please try refreshing the page.';
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const canRetry = this.props.showRetry !== false && this.state.retryCount < 3;
      const userMessage = this.getUserFriendlyMessage();

      return (
        <div className="ds-u-padding--3">
          <Alert variation="error" role="alert">
            <div className="ds-c-alert__body">
              <h2 className="ds-c-alert__heading">
                {this.props.context ? `${this.props.context} Error` : 'Application Error'}
              </h2>
              <p className="ds-c-alert__text">{userMessage}</p>

              {this.state.retryCount > 0 && (
                <p className="ds-u-margin-top--2 ds-u-font-size--sm">
                  Retry attempts: {this.state.retryCount}/3
                </p>
              )}

              <div className="ds-u-margin-top--3">
                {canRetry && (
                  <Button
                    onClick={this.handleRetry}
                    variation="solid"
                    className="ds-u-margin-right--2"
                  >
                    Try Again
                  </Button>
                )}

                <Button
                  onClick={this.handleRefresh}
                  variation={canRetry ? 'ghost' : 'solid'}
                  className="ds-u-margin-right--2"
                >
                  Refresh Page
                </Button>

                <Button onClick={() => (window.location.href = '/')} variation="ghost">
                  Go to Home
                </Button>
              </div>

              <details className="ds-u-margin-top--3">
                <summary className="ds-u-cursor--pointer">Technical Details</summary>
                <div className="ds-u-font-family--mono ds-u-font-size--sm ds-u-margin-top--2">
                  {this.state.error && (
                    <>
                      <div>
                        <strong>Error:</strong> {this.state.error.message}
                      </div>
                      {this.state.error.stack && (
                        <pre className="ds-u-margin-top--1 ds-u-font-size--xs ds-u-overflow--auto">
                          {this.state.error.stack}
                        </pre>
                      )}
                    </>
                  )}
                  {this.state.errorInfo && (
                    <div className="ds-u-margin-top--2">
                      <strong>Component Stack:</strong>
                      <pre className="ds-u-margin-top--1 ds-u-font-size--xs ds-u-overflow--auto">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            </div>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
