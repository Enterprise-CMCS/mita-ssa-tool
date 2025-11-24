/**
 * Clean Export Dialog Component
 * Modern, simplified export interface following UX best practices
 */

import { useEffect, useState } from 'react';

import type { ExportFormatInfo, ExportOptions, ExportResult } from '../../services/export/types';

interface CleanExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => Promise<ExportResult>;
  availableFormats: ExportFormatInfo[];
  assessmentName?: string;
}

export function CleanExportDialog({
  isOpen,
  onClose,
  onExport,
  availableFormats,
  assessmentName = 'Assessment',
}: CleanExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportOptions['format']>('pdf');
  const [includeDetails, setIncludeDetails] = useState(true);
  const [includeCheckboxDetails, setIncludeCheckboxDetails] = useState(true);
  const [customFilename, setCustomFilename] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedFormat('pdf');
      setIncludeDetails(true);
      setIncludeCheckboxDetails(true);
      setCustomFilename('');
      setIsExporting(false);
      setExportResult(null);
    }
  }, [isOpen]);

  // Handle export
  const handleExport = async () => {
    setIsExporting(true);
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
        }, 1500);
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
      <div className="ds-c-dialog" style={{ maxWidth: '600px' }}>
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
              {/* Format Selection - Clean Card Layout */}
              <div className="ds-u-margin-bottom--4">
                <h3 className="ds-h3 ds-u-margin-bottom--3">Choose Format</h3>
                <div className="ds-l-row">
                  {availableFormats.map(format => (
                    <div key={format.format} className="ds-l-col--6 ds-u-margin-bottom--2">
                      <button
                        type="button"
                        className={`ds-u-width--full ds-u-text-align--left ds-u-padding--3 ds-u-border-radius--md ds-u-border--1 ${
                          selectedFormat === format.format
                            ? 'ds-u-border-color--primary ds-u-bg-color--white'
                            : 'ds-u-border-color--gray ds-u-bg-color--white'
                        }`}
                        onClick={() => setSelectedFormat(format.format)}
                        style={{
                          cursor: 'pointer',
                          boxShadow:
                            selectedFormat === format.format ? '0 0 0 2px #0071bc' : 'none',
                        }}
                      >
                        <div className="ds-u-display--flex ds-u-align-items--center ds-u-margin-bottom--1">
                          <div
                            className={`ds-u-border-radius--circle ds-u-width--3 ds-u-height--3 ds-u-margin-right--2 ds-u-display--flex ds-u-align-items--center ds-u-justify-content--center ${
                              selectedFormat === format.format
                                ? 'ds-u-bg-color--primary'
                                : 'ds-u-border--1 ds-u-border-color--gray ds-u-bg-color--white'
                            }`}
                          >
                            {selectedFormat === format.format && (
                              <span
                                style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}
                              >
                                ✓
                              </span>
                            )}
                          </div>
                          <strong className="ds-u-color--base">{format.name}</strong>
                          <span className="ds-text--small ds-u-color--base ds-u-margin-left--1">
                            .{format.extension}
                          </span>
                        </div>
                        <p className="ds-text--small ds-u-color--base ds-u-margin--0">
                          {format.recommendedFor[0]}
                        </p>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Export Options - Simplified */}
              <div className="ds-u-margin-bottom--4">
                <h3 className="ds-h3 ds-u-margin-bottom--2">Options</h3>
                <div className="ds-u-padding--3 ds-u-bg-color--gray-lightest ds-u-border-radius--md ds-u-border--1 ds-u-border-color--gray-light">
                  <div className="ds-u-margin-bottom--2">
                    <label className="ds-u-display--flex ds-u-align-items--center ds-u-cursor--pointer">
                      <input
                        type="checkbox"
                        checked={includeDetails}
                        onChange={e => setIncludeDetails(e.target.checked)}
                        className="ds-u-margin-right--2"
                      />
                      <span className="ds-u-color--base">Include detailed text content</span>
                    </label>
                  </div>
                  <div>
                    <label className="ds-u-display--flex ds-u-align-items--center ds-u-cursor--pointer">
                      <input
                        type="checkbox"
                        checked={includeCheckboxDetails}
                        onChange={e => setIncludeCheckboxDetails(e.target.checked)}
                        className="ds-u-margin-right--2"
                      />
                      <span className="ds-u-color--base">Include checkbox completion details</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Custom Filename - Simplified */}
              <div className="ds-u-margin-bottom--4">
                <label htmlFor="custom-filename" className="ds-c-label ds-u-margin-bottom--1">
                  Custom filename (optional)
                </label>
                <input
                  type="text"
                  id="custom-filename"
                  value={customFilename}
                  onChange={e => setCustomFilename(e.target.value)}
                  className="ds-c-field"
                  placeholder={`${assessmentName.toLowerCase().replace(/\s+/g, '-')}-export`}
                />
              </div>
            </>
          )}

          {/* Export Progress */}
          {isExporting && (
            <div className="ds-u-text-align--center ds-u-padding--4">
              <div className="ds-c-spinner" role="status" aria-label="Exporting">
                <span className="ds-u-visibility--screen-reader">Exporting...</span>
              </div>
              <h3 className="ds-u-margin-top--2">Preparing your export...</h3>
              <p className="ds-text--small ds-u-color--muted">
                This may take a moment for large assessments
              </p>
            </div>
          )}

          {/* Export Result */}
          {exportResult && (
            <div
              className={`ds-c-alert ${exportResult.success ? 'ds-c-alert--success' : 'ds-c-alert--error'}`}
            >
              <div className="ds-c-alert__body">
                <h3 className="ds-c-alert__heading">
                  {exportResult.success ? 'Export Complete' : 'Export Failed'}
                </h3>
                <p className="ds-c-alert__text">
                  {exportResult.success ? (
                    <>
                      Your export <strong>{exportResult.filename}</strong> has been downloaded
                      {exportResult.size && <> ({Math.round(exportResult.size / 1024)} KB)</>}
                    </>
                  ) : (
                    exportResult.error
                  )}
                </p>
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
                Export {availableFormats.find(f => f.format === selectedFormat)?.name}
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
