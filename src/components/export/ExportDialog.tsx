/**
 * Export Dialog Component
 * Modal for format selection and export options
 */

import { useEffect, useState } from 'react';

import type {
  ExportFormatInfo,
  ExportOptions,
  ExportProgress,
  ExportResult,
} from '../../services/export/types';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => Promise<ExportResult>;
  availableFormats: ExportFormatInfo[];
  assessmentName?: string;
}

export function ExportDialog({
  isOpen,
  onClose,
  onExport,
  availableFormats,
  assessmentName = 'Assessment',
}: ExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportOptions['format']>('pdf');
  const [includeDetails, setIncludeDetails] = useState(true);
  const [includeCheckboxDetails, setIncludeCheckboxDetails] = useState(true);
  const [customFilename, setCustomFilename] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedFormat('pdf');
      setIncludeDetails(true);
      setIncludeCheckboxDetails(true);
      setCustomFilename('');
      setIsExporting(false);
      setProgress(null);
      setExportResult(null);
    }
  }, [isOpen]);

  // Handle export
  const handleExport = async () => {
    setIsExporting(true);
    setProgress(null);
    setExportResult(null);

    const options: ExportOptions = {
      format: selectedFormat,
      includeDetails,
      includeCheckboxDetails,
      customFilename: customFilename.trim() || undefined,
    };

    try {
      const result = await onExport(options);
      setExportResult(result);

      if (result.success) {
        // Auto-close dialog after successful export
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    } catch (error) {
      setExportResult({
        success: false,
        filename: '',
        error: error instanceof Error ? error.message : 'Export failed',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Get selected format info
  const selectedFormatInfo = availableFormats.find(f => f.format === selectedFormat);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="ds-c-dialog-wrap"
      role="dialog"
      aria-labelledby="export-dialog-title"
      aria-modal="true"
    >
      <div className="ds-c-dialog ds-c-dialog--full-screen">
        <div className="ds-c-dialog__header">
          <h1 id="export-dialog-title" className="ds-c-dialog__title">
            Export {assessmentName}
          </h1>
          <button
            type="button"
            className="ds-c-button ds-c-button--transparent ds-c-dialog__close"
            onClick={onClose}
            aria-label="Close export dialog"
            disabled={isExporting}
          >
            ×
          </button>
        </div>

        <div className="ds-c-dialog__body">
          {!isExporting && !exportResult && (
            <>
              {/* Format Selection */}
              <div className="ds-u-margin-bottom--4">
                <fieldset className="ds-c-fieldset">
                  <legend className="ds-c-label">Export Format</legend>
                  <div className="ds-l-row">
                    {availableFormats.map(format => (
                      <div
                        key={format.format}
                        className="ds-l-col--12 ds-l-md-col--6 ds-u-margin-bottom--2"
                      >
                        <div className="ds-c-choice-wrapper">
                          <input
                            type="radio"
                            id={`format-${format.format}`}
                            name="export-format"
                            value={format.format}
                            checked={selectedFormat === format.format}
                            onChange={e =>
                              setSelectedFormat(e.target.value as ExportOptions['format'])
                            }
                            className="ds-c-choice"
                          />
                          <label htmlFor={`format-${format.format}`} className="ds-c-label">
                            <strong>{format.name}</strong> (.{format.extension})
                            <div className="ds-text--small ds-u-color--muted ds-u-margin-top--1">
                              {format.description}
                            </div>
                            <div className="ds-text--small ds-u-color--primary ds-u-margin-top--1">
                              Recommended for: {format.recommendedFor.join(', ')}
                            </div>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </fieldset>
              </div>

              {/* Export Options */}
              <div className="ds-u-margin-bottom--4">
                <fieldset className="ds-c-fieldset">
                  <legend className="ds-c-label">Export Options</legend>

                  <div className="ds-c-choice-wrapper">
                    <input
                      type="checkbox"
                      id="include-details"
                      checked={includeDetails}
                      onChange={e => setIncludeDetails(e.target.checked)}
                      className="ds-c-choice"
                    />
                    <label htmlFor="include-details" className="ds-c-label">
                      Include detailed text content
                      <div className="ds-text--small ds-u-color--muted">
                        Supporting attestation, barriers, plans, and notes for each dimension
                      </div>
                    </label>
                  </div>

                  <div className="ds-c-choice-wrapper">
                    <input
                      type="checkbox"
                      id="include-checkbox-details"
                      checked={includeCheckboxDetails}
                      onChange={e => setIncludeCheckboxDetails(e.target.checked)}
                      className="ds-c-choice"
                    />
                    <label htmlFor="include-checkbox-details" className="ds-c-label">
                      Include checkbox completion details
                      <div className="ds-text--small ds-u-color--muted">
                        Individual checkbox states and completion percentages
                      </div>
                    </label>
                  </div>
                </fieldset>
              </div>

              {/* Custom Filename */}
              <div className="ds-u-margin-bottom--4">
                <label htmlFor="custom-filename" className="ds-c-label">
                  Custom filename (optional)
                </label>
                <input
                  type="text"
                  id="custom-filename"
                  value={customFilename}
                  onChange={e => setCustomFilename(e.target.value)}
                  className="ds-c-field"
                  placeholder="Leave blank for automatic naming"
                />
                <div className="ds-text--small ds-u-color--muted ds-u-margin-top--1">
                  File will be saved as:{' '}
                  {customFilename.trim() ||
                    `${assessmentName.toLowerCase().replace(/\s+/g, '-')}-export`}
                  -YYYY-MM-DD.{selectedFormatInfo?.extension}
                </div>
              </div>

              {/* Format-specific information */}
              {selectedFormatInfo && (
                <div className="ds-c-alert ds-c-alert--info ds-u-margin-bottom--4">
                  <div className="ds-c-alert__body">
                    <h3 className="ds-c-alert__heading">{selectedFormatInfo.name} Export</h3>
                    <p className="ds-c-alert__text">{selectedFormatInfo.description}</p>
                    {selectedFormatInfo.supportsCharts && (
                      <p className="ds-text--small">✓ Includes data visualizations and charts</p>
                    )}
                    {selectedFormatInfo.supportsDetails && (
                      <p className="ds-text--small">✓ Supports detailed text content</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Export Progress */}
          {isExporting && progress && (
            <div className="ds-u-text-align--center ds-u-padding--4">
              <div className="ds-c-spinner" role="status" aria-label="Exporting">
                <span className="ds-u-visibility--screen-reader">Exporting...</span>
              </div>
              <h3 className="ds-u-margin-top--2">{progress.message}</h3>
              <div className="ds-c-progress ds-u-margin-top--2">
                <div
                  className="ds-c-progress__bar"
                  style={{ width: `${progress.percentage}%` }}
                  role="progressbar"
                  aria-valuenow={progress.percentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
              <p className="ds-text--small ds-u-margin-top--1">{progress.percentage}% complete</p>
            </div>
          )}

          {/* Export Result */}
          {exportResult && (
            <div
              className={`ds-c-alert ${exportResult.success ? 'ds-c-alert--success' : 'ds-c-alert--error'}`}
            >
              <div className="ds-c-alert__body">
                <h3 className="ds-c-alert__heading">
                  {exportResult.success ? 'Export Successful' : 'Export Failed'}
                </h3>
                <p className="ds-c-alert__text">
                  {exportResult.success ? (
                    <>
                      Your export has been generated and downloaded as{' '}
                      <strong>{exportResult.filename}</strong>
                      {exportResult.size && <> ({Math.round(exportResult.size / 1024)} KB)</>}
                    </>
                  ) : (
                    exportResult.error
                  )}
                </p>
                {exportResult.success && (
                  <p className="ds-text--small ds-u-margin-top--2">
                    This dialog will close automatically in a few seconds.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="ds-c-dialog__actions">
          {!isExporting && !exportResult && (
            <>
              <button
                type="button"
                className="ds-c-button ds-c-button--primary"
                onClick={handleExport}
              >
                Export {selectedFormatInfo?.name}
              </button>
              <button
                type="button"
                className="ds-c-button ds-c-button--transparent"
                onClick={onClose}
              >
                Cancel
              </button>
            </>
          )}

          {exportResult && !exportResult.success && (
            <button type="button" className="ds-c-button ds-c-button--primary" onClick={onClose}>
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
