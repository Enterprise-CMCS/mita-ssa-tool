/**
 * Export Error Handler
 * Categorized error handling with recovery strategies
 */

import type { ExportError } from '../types';

export class ExportErrorHandler {
  /**
   * Handle data collection errors
   */
  static handleDataCollectionError(error: Error, context?: Record<string, unknown>): ExportError {
    let message = 'Failed to collect assessment data for export';
    let recoverable = true;

    // Categorize specific data collection errors
    if (error.message.includes('assessment') && error.message.includes('not found')) {
      message = 'Assessment data not found. Please ensure the assessment exists and try again.';
      recoverable = false;
    } else if (error.message.includes('capability') && error.message.includes('definition')) {
      message =
        'Some capability definitions could not be loaded. Export will continue with available data.';
      recoverable = true;
    } else if (error.message.includes('scoring')) {
      message = 'Error calculating assessment scores. Using fallback scoring method.';
      recoverable = true;
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
      message =
        'Network error while loading assessment data. Please check your connection and try again.';
      recoverable = true;
    }

    return {
      type: 'data_collection',
      message,
      originalError: error,
      context,
      recoverable,
    };
  }

  /**
   * Handle format generation errors
   */
  static handleFormatGenerationError(
    error: Error,
    format: string,
    context?: Record<string, unknown>
  ): ExportError {
    let message = `Failed to generate ${format.toUpperCase()} export`;
    let recoverable = true;

    // Format-specific error handling
    switch (format.toLowerCase()) {
      case 'pdf':
        if (error.message.includes('jsPDF') || error.message.includes('autoTable')) {
          message =
            'PDF generation failed due to formatting issues. Try reducing the amount of content or use a different format.';
        } else if (error.message.includes('memory') || error.message.includes('size')) {
          message =
            'PDF generation failed due to large data size. Try exporting without detailed content or use CSV format.';
        }
        break;

      case 'csv':
        if (error.message.includes('encoding') || error.message.includes('character')) {
          message =
            'CSV generation failed due to character encoding issues. Some special characters may not be supported.';
        }
        break;

      case 'json':
        if (error.message.includes('circular') || error.message.includes('stringify')) {
          message = 'JSON generation failed due to data structure issues. Please contact support.';
          recoverable = false;
        }
        break;

      case 'markdown':
        if (error.message.includes('template') || error.message.includes('format')) {
          message =
            'Markdown generation failed due to formatting issues. Try with different export options.';
        }
        break;
    }

    return {
      type: 'format_generation',
      message,
      originalError: error,
      context: { format, ...context },
      recoverable,
    };
  }

  /**
   * Handle browser limitation errors
   */
  static handleBrowserLimitationError(
    error: Error,
    context?: Record<string, unknown>
  ): ExportError {
    let message = 'Browser limitation prevented file download';
    let recoverable = false;

    if (error.message.includes('download') || error.message.includes('blob')) {
      message =
        'Your browser blocked the file download. Please check your browser settings and allow downloads from this site.';
      recoverable = true;
    } else if (error.message.includes('memory') || error.message.includes('quota')) {
      message =
        'Export file is too large for your browser to handle. Try exporting with fewer details or use a different format.';
      recoverable = true;
    } else if (error.message.includes('popup') || error.message.includes('blocked')) {
      message =
        'Pop-up blocker prevented the download. Please allow pop-ups for this site and try again.';
      recoverable = true;
    }

    return {
      type: 'browser_limitation',
      message,
      originalError: error,
      context,
      recoverable,
    };
  }

  /**
   * Handle unknown errors
   */
  static handleUnknownError(error: Error, context?: Record<string, unknown>): ExportError {
    return {
      type: 'unknown',
      message: error.message || 'An unexpected error occurred during export',
      originalError: error,
      context,
      recoverable: false,
    };
  }

  /**
   * Categorize and handle any export error
   */
  static categorizeError(error: Error, context?: Record<string, unknown>): ExportError {
    const errorMessage = error.message.toLowerCase();

    // Data collection errors
    if (
      errorMessage.includes('data') ||
      errorMessage.includes('collect') ||
      errorMessage.includes('assessment') ||
      errorMessage.includes('capability') ||
      errorMessage.includes('scoring')
    ) {
      return this.handleDataCollectionError(error, context);
    }

    // Format generation errors
    if (
      errorMessage.includes('generate') ||
      errorMessage.includes('format') ||
      errorMessage.includes('pdf') ||
      errorMessage.includes('csv') ||
      errorMessage.includes('json') ||
      errorMessage.includes('markdown')
    ) {
      const format = (context?.format as string) || 'unknown';
      return this.handleFormatGenerationError(error, format, context);
    }

    // Browser limitation errors
    if (
      errorMessage.includes('download') ||
      errorMessage.includes('browser') ||
      errorMessage.includes('blob') ||
      errorMessage.includes('memory') ||
      errorMessage.includes('quota') ||
      errorMessage.includes('popup')
    ) {
      return this.handleBrowserLimitationError(error, context);
    }

    // Unknown errors
    return this.handleUnknownError(error, context);
  }

  /**
   * Get recovery suggestions for an error
   */
  static getRecoverySuggestions(exportError: ExportError): string[] {
    const suggestions: string[] = [];

    switch (exportError.type) {
      case 'data_collection':
        suggestions.push('Refresh the page and try again');
        suggestions.push('Check your internet connection');
        if (exportError.recoverable) {
          suggestions.push('Try exporting with basic options only');
        }
        break;

      case 'format_generation':
        suggestions.push('Try a different export format (e.g., CSV instead of PDF)');
        suggestions.push('Reduce export options (uncheck detailed content)');
        suggestions.push('Export individual sections instead of the full assessment');
        break;

      case 'browser_limitation':
        suggestions.push('Check browser download settings');
        suggestions.push('Disable pop-up blockers for this site');
        suggestions.push('Try using a different browser');
        suggestions.push('Clear browser cache and cookies');
        break;

      case 'unknown':
        suggestions.push('Refresh the page and try again');
        suggestions.push('Try a different export format');
        suggestions.push('Contact support if the problem persists');
        break;
    }

    return suggestions;
  }

  /**
   * Get user-friendly error message
   */
  static getUserFriendlyMessage(exportError: ExportError): string {
    const baseMessage = exportError.message;
    const suggestions = this.getRecoverySuggestions(exportError);

    if (suggestions.length === 0) {
      return baseMessage;
    }

    return `${baseMessage}\n\nSuggestions:\n${suggestions.map(s => `• ${s}`).join('\n')}`;
  }

  /**
   * Log error for debugging while maintaining user privacy
   */
  static logError(exportError: ExportError, _userId?: string): void {
    const logData = {
      type: exportError.type,
      message: exportError.message,
      recoverable: exportError.recoverable,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      context: this.sanitizeContext(exportError.context),
      // Don't log the full original error to avoid sensitive data
      errorType: exportError.originalError?.constructor.name,
      errorMessage: exportError.originalError?.message,
    };

    // In a real application, this would send to a logging service
    console.error('Export Error:', logData);

    // Store in session storage for debugging (without sensitive data)
    if (typeof sessionStorage !== 'undefined') {
      try {
        const existingLogs = JSON.parse(sessionStorage.getItem('export_error_logs') || '[]');
        existingLogs.push(logData);

        // Keep only last 10 errors
        const recentLogs = existingLogs.slice(-10);
        sessionStorage.setItem('export_error_logs', JSON.stringify(recentLogs));
      } catch {
        // Ignore storage errors
      }
    }
  }

  /**
   * Sanitize context data to remove sensitive information
   */
  private static sanitizeContext(context?: Record<string, unknown>): Record<string, unknown> {
    if (!context) {
      return {};
    }

    const sanitized: Record<string, unknown> = {};
    const sensitiveKeys = ['password', 'token', 'key', 'secret', 'auth'];

    for (const [key, value] of Object.entries(context)) {
      const keyLower = key.toLowerCase();
      const isSensitive = sensitiveKeys.some(sensitive => keyLower.includes(sensitive));

      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'string' && value.length > 100) {
        sanitized[key] = `${value.substring(0, 100)}... [TRUNCATED]`;
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Create retry function for recoverable errors
   */
  static createRetryFunction(
    originalFunction: () => Promise<any>,
    maxRetries: number = 3,
    delayMs: number = 1000
  ): () => Promise<any> {
    return async () => {
      let lastError: Error;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          return await originalFunction();
        } catch (error) {
          lastError = error as Error;

          if (attempt < maxRetries) {
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
          }
        }
      }

      throw lastError || new Error('Unknown error occurred during retry');
    };
  }
}
