import { Component, type ErrorInfo, type ReactNode } from 'react';

import { Button } from '@cmsgov/design-system';

import enhancedStorageService from '../../services/EnhancedStorageService';

interface AssessmentErrorBoundaryProps {
  children: ReactNode;
  assessmentId?: string;
  onRetry?: () => void;
  onExportData?: () => void;
  fallback?: ReactNode;
}

interface AssessmentErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  isExporting: boolean;
  exportSuccess: boolean;
}

/**
 * Specialized error boundary for assessment workflow components
 * Provides recovery options including data export and retry functionality
 */
class AssessmentErrorBoundary extends Component<
  AssessmentErrorBoundaryProps,
  AssessmentErrorBoundaryState
> {
  constructor(props: AssessmentErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      isExporting: false,
      exportSuccess: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<AssessmentErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Assessment Error Boundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });

    // Log error details for debugging
    const errorDetails = {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      assessmentId: this.props.assessmentId,
      timestamp: new Date().toISOString(),
    };

    console.error('Detailed error information:', errorDetails);
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      isExporting: false,
      exportSuccess: false,
    });

    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  handleExportData = async (): Promise<void> => {
    if (!this.props.assessmentId) {
      return;
    }

    this.setState({ isExporting: true });

    try {
      const exportData = await enhancedStorageService.exportAssessment(this.props.assessmentId);

      // Create and download the export file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `assessment-backup-${this.props.assessmentId}-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      this.setState({ exportSuccess: true });

      if (this.props.onExportData) {
        this.props.onExportData();
      }
    } catch (exportError) {
      console.error('Failed to export assessment data:', exportError);
      // Even if export fails, we should still show the raw data
      this.showRawDataFallback();
    } finally {
      this.setState({ isExporting: false });
    }
  };

  private showRawDataFallback = async (): Promise<void> => {
    if (!this.props.assessmentId) {
      return;
    }

    try {
      const assessment = await enhancedStorageService.loadAssessment(this.props.assessmentId);
      if (assessment) {
        const dataText = JSON.stringify(assessment, null, 2);
        const newWindow = window.open('', '_blank');
        if (newWindow) {
          newWindow.document.write(`
            <html>
              <head><title>Assessment Data Backup</title></head>
              <body>
                <h1>Assessment Data Backup</h1>
                <p>Copy the data below and save it to a file:</p>
                <textarea style="width: 100%; height: 400px; font-family: monospace;">${dataText}</textarea>
              </body>
            </html>
          `);
        }
      }
    } catch (error) {
      console.error('Failed to show raw data fallback:', error);
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="ds-c-alert ds-c-alert--error" role="alert">
          <div className="ds-c-alert__body">
            <h2 className="ds-c-alert__heading">Assessment Error</h2>
            <p className="ds-c-alert__text">
              Something went wrong while processing your assessment. Your data may still be saved.
            </p>

            {this.state.error && (
              <details className="ds-u-margin-top--2">
                <summary>Technical Details</summary>
                <div className="ds-u-font-family--mono ds-u-font-size--sm ds-u-margin-top--1">
                  <strong>Error:</strong> {this.state.error.message}
                  {this.state.error.stack && (
                    <pre className="ds-u-margin-top--1 ds-u-font-size--xs">
                      {this.state.error.stack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            <div className="ds-u-margin-top--3">
              <Button onClick={this.handleRetry} variation="solid" className="ds-u-margin-right--2">
                Try Again
              </Button>

              {this.props.assessmentId && (
                <Button
                  onClick={this.handleExportData}
                  variation="ghost"
                  disabled={this.state.isExporting}
                  className="ds-u-margin-right--2"
                >
                  {this.state.isExporting ? 'Exporting...' : 'Export Data'}
                </Button>
              )}

              <Button onClick={() => (window.location.href = '/dashboard')} variation="ghost">
                Return to Dashboard
              </Button>
            </div>

            {this.state.exportSuccess && (
              <div className="ds-c-alert ds-c-alert--success ds-u-margin-top--2">
                <div className="ds-c-alert__body">
                  <p className="ds-c-alert__text">
                    Your assessment data has been exported successfully. The file has been
                    downloaded to your computer.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AssessmentErrorBoundary;
