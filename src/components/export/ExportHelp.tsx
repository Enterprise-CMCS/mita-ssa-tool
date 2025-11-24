/**
 * Export Help Component
 * Provides user guidance and documentation for export functionality
 */

import { useState } from 'react';

interface ExportHelpProps {
  className?: string;
}

export function ExportHelp({ className = '' }: ExportHelpProps) {
  const [activeTab, setActiveTab] = useState<'formats' | 'troubleshooting' | 'tips'>('formats');

  return (
    <div className={`ds-c-card ${className}`}>
      <div className="ds-c-card__header">
        <h3 className="ds-c-card__title">Export Help & Documentation</h3>
      </div>

      <div className="ds-c-card__body">
        {/* Tab Navigation */}
        <div className="ds-c-tabs" role="tablist">
          <button
            type="button"
            className={`ds-c-tabs__item ${activeTab === 'formats' ? 'ds-c-tabs__item--active' : ''}`}
            role="tab"
            aria-selected={activeTab === 'formats'}
            onClick={() => setActiveTab('formats')}
          >
            Export Formats
          </button>
          <button
            type="button"
            className={`ds-c-tabs__item ${activeTab === 'troubleshooting' ? 'ds-c-tabs__item--active' : ''}`}
            role="tab"
            aria-selected={activeTab === 'troubleshooting'}
            onClick={() => setActiveTab('troubleshooting')}
          >
            Troubleshooting
          </button>
          <button
            type="button"
            className={`ds-c-tabs__item ${activeTab === 'tips' ? 'ds-c-tabs__item--active' : ''}`}
            role="tab"
            aria-selected={activeTab === 'tips'}
            onClick={() => setActiveTab('tips')}
          >
            Tips & Best Practices
          </button>
        </div>

        {/* Tab Content */}
        <div className="ds-c-tabs__panel ds-u-padding-top--3">
          {activeTab === 'formats' && <FormatGuide />}
          {activeTab === 'troubleshooting' && <TroubleshootingGuide />}
          {activeTab === 'tips' && <TipsAndBestPractices />}
        </div>
      </div>
    </div>
  );
}

function FormatGuide() {
  return (
    <div>
      <h4 className="ds-h4 ds-u-margin-bottom--3">Export Format Comparison</h4>

      <div className="ds-l-row ds-u-margin-bottom--4">
        <div className="ds-l-col--12 ds-l-md-col--6">
          <div className="ds-c-card ds-u-margin-bottom--3">
            <div className="ds-c-card__body">
              <h5 className="ds-h5 ds-u-color--primary">📄 PDF Format</h5>
              <p className="ds-text--small ds-u-margin-bottom--2">
                Professional reports with visual formatting
              </p>
              <ul className="ds-c-list ds-text--small">
                <li>✓ Professional layout and typography</li>
                <li>✓ Data visualizations and charts</li>
                <li>✓ Page numbers and table of contents</li>
                <li>✓ Print-ready formatting</li>
                <li>✓ Stakeholder-friendly presentation</li>
              </ul>
              <div className="ds-c-alert ds-c-alert--info ds-u-margin-top--2">
                <div className="ds-c-alert__body">
                  <p className="ds-c-alert__text ds-text--small">
                    <strong>Best for:</strong> Executive summaries, official reports, presentations
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="ds-l-col--12 ds-l-md-col--6">
          <div className="ds-c-card ds-u-margin-bottom--3">
            <div className="ds-c-card__body">
              <h5 className="ds-h5 ds-u-color--primary">📊 CSV Format</h5>
              <p className="ds-text--small ds-u-margin-bottom--2">
                Structured data for analysis and processing
              </p>
              <ul className="ds-c-list ds-text--small">
                <li>✓ One row per ORBIT dimension</li>
                <li>✓ All text fields included</li>
                <li>✓ Individual checkbox states</li>
                <li>✓ Excel and database compatible</li>
                <li>✓ Statistical analysis ready</li>
              </ul>
              <div className="ds-c-alert ds-c-alert--info ds-u-margin-top--2">
                <div className="ds-c-alert__body">
                  <p className="ds-c-alert__text ds-text--small">
                    <strong>Best for:</strong> Data analysis, spreadsheet import, statistical
                    processing
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="ds-l-row">
        <div className="ds-l-col--12 ds-l-md-col--6">
          <div className="ds-c-card ds-u-margin-bottom--3">
            <div className="ds-c-card__body">
              <h5 className="ds-h5 ds-u-color--primary">📝 Markdown Format</h5>
              <p className="ds-text--small ds-u-margin-bottom--2">
                Human-readable documentation format
              </p>
              <ul className="ds-c-list ds-text--small">
                <li>✓ YAML front matter with metadata</li>
                <li>✓ Hierarchical content structure</li>
                <li>✓ Version control friendly</li>
                <li>✓ Easy to read and edit</li>
                <li>✓ Platform independent</li>
              </ul>
              <div className="ds-c-alert ds-c-alert--info ds-u-margin-top--2">
                <div className="ds-c-alert__body">
                  <p className="ds-c-alert__text ds-text--small">
                    <strong>Best for:</strong> Documentation, version control, collaborative editing
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="ds-l-col--12 ds-l-md-col--6">
          <div className="ds-c-card ds-u-margin-bottom--3">
            <div className="ds-c-card__body">
              <h5 className="ds-h5 ds-u-color--primary">🔧 JSON Format</h5>
              <p className="ds-text--small ds-u-margin-bottom--2">
                Complete data preservation and backup
              </p>
              <ul className="ds-c-list ds-text--small">
                <li>✓ Complete data structure preservation</li>
                <li>✓ Schema versioning for compatibility</li>
                <li>✓ Machine-readable format</li>
                <li>✓ Future import capability</li>
                <li>✓ API integration ready</li>
              </ul>
              <div className="ds-c-alert ds-c-alert--info ds-u-margin-top--2">
                <div className="ds-c-alert__body">
                  <p className="ds-c-alert__text ds-text--small">
                    <strong>Best for:</strong> Data backup, system integration, future import
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TroubleshootingGuide() {
  return (
    <div>
      <h4 className="ds-h4 ds-u-margin-bottom--3">Common Export Issues</h4>

      <div className="ds-c-accordion">
        <div className="ds-c-accordion__item">
          <h5 className="ds-c-accordion__header">
            <button className="ds-c-accordion__button" aria-expanded="false">
              Export fails or gets stuck
            </button>
          </h5>
          <div className="ds-c-accordion__panel">
            <div className="ds-c-accordion__content">
              <p>
                <strong>Possible causes and solutions:</strong>
              </p>
              <ul className="ds-c-list">
                <li>
                  <strong>Large assessment data:</strong> Try exporting without detailed content
                  first
                </li>
                <li>
                  <strong>Browser memory limits:</strong> Close other tabs and try again
                </li>
                <li>
                  <strong>Network issues:</strong> Check your internet connection
                </li>
                <li>
                  <strong>Browser compatibility:</strong> Try using Chrome or Firefox
                </li>
              </ul>
              <div className="ds-c-alert ds-c-alert--warn ds-u-margin-top--2">
                <div className="ds-c-alert__body">
                  <p className="ds-c-alert__text ds-text--small">
                    If the problem persists, try exporting in CSV format which is more
                    memory-efficient.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="ds-c-accordion__item">
          <h5 className="ds-c-accordion__header">
            <button className="ds-c-accordion__button" aria-expanded="false">
              Download doesn't start automatically
            </button>
          </h5>
          <div className="ds-c-accordion__panel">
            <div className="ds-c-accordion__content">
              <p>
                <strong>Check these settings:</strong>
              </p>
              <ul className="ds-c-list">
                <li>
                  <strong>Pop-up blocker:</strong> Allow pop-ups for this site
                </li>
                <li>
                  <strong>Download settings:</strong> Check browser download permissions
                </li>
                <li>
                  <strong>File location:</strong> Check your default download folder
                </li>
                <li>
                  <strong>Antivirus software:</strong> May be blocking the download
                </li>
              </ul>
              <p className="ds-text--small ds-u-margin-top--2">
                Most browsers will show a download notification or icon when the file is ready.
              </p>
            </div>
          </div>
        </div>

        <div className="ds-c-accordion__item">
          <h5 className="ds-c-accordion__header">
            <button className="ds-c-accordion__button" aria-expanded="false">
              Exported file is corrupted or won't open
            </button>
          </h5>
          <div className="ds-c-accordion__panel">
            <div className="ds-c-accordion__content">
              <p>
                <strong>Try these solutions:</strong>
              </p>
              <ul className="ds-c-list">
                <li>
                  <strong>Re-download:</strong> Export the file again
                </li>
                <li>
                  <strong>Different format:</strong> Try a different export format
                </li>
                <li>
                  <strong>File extension:</strong> Ensure the file has the correct extension
                </li>
                <li>
                  <strong>Software compatibility:</strong> Try opening with different applications
                </li>
              </ul>
              <div className="ds-c-alert ds-c-alert--info ds-u-margin-top--2">
                <div className="ds-c-alert__body">
                  <p className="ds-c-alert__text ds-text--small">
                    JSON and CSV formats are most reliable across different systems.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="ds-c-accordion__item">
          <h5 className="ds-c-accordion__header">
            <button className="ds-c-accordion__button" aria-expanded="false">
              Missing data in exported file
            </button>
          </h5>
          <div className="ds-c-accordion__panel">
            <div className="ds-c-accordion__content">
              <p>
                <strong>Ensure complete data export:</strong>
              </p>
              <ul className="ds-c-list">
                <li>
                  <strong>Include details:</strong> Check "Include detailed text content" option
                </li>
                <li>
                  <strong>Checkbox details:</strong> Check "Include checkbox completion details"
                  option
                </li>
                <li>
                  <strong>Assessment completion:</strong> Complete all required fields before
                  exporting
                </li>
                <li>
                  <strong>Save first:</strong> Save your assessment before exporting
                </li>
              </ul>
              <p className="ds-text--small ds-u-margin-top--2">
                The JSON format includes the most comprehensive data preservation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TipsAndBestPractices() {
  return (
    <div>
      <h4 className="ds-h4 ds-u-margin-bottom--3">Export Tips & Best Practices</h4>

      <div className="ds-l-row">
        <div className="ds-l-col--12 ds-l-md-col--6">
          <div className="ds-c-card ds-u-margin-bottom--3">
            <div className="ds-c-card__body">
              <h5 className="ds-h5">🎯 Before Exporting</h5>
              <ul className="ds-c-list ds-text--small">
                <li>Complete all assessment sections</li>
                <li>Review and save your work</li>
                <li>Add system name in assessment metadata</li>
                <li>Fill in all text fields (evidence, barriers, plans)</li>
                <li>Check checkbox completion for bonus points</li>
              </ul>
            </div>
          </div>

          <div className="ds-c-card ds-u-margin-bottom--3">
            <div className="ds-c-card__body">
              <h5 className="ds-h5">📁 File Management</h5>
              <ul className="ds-c-list ds-text--small">
                <li>Use descriptive custom filenames</li>
                <li>Include dates in filename for versioning</li>
                <li>Export multiple formats for different uses</li>
                <li>Keep JSON exports as complete backups</li>
                <li>Organize exports by assessment date</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="ds-l-col--12 ds-l-md-col--6">
          <div className="ds-c-card ds-u-margin-bottom--3">
            <div className="ds-c-card__body">
              <h5 className="ds-h5">⚡ Performance Tips</h5>
              <ul className="ds-c-list ds-text--small">
                <li>Close unnecessary browser tabs</li>
                <li>Use CSV for large datasets</li>
                <li>Export without details for quick summaries</li>
                <li>Clear browser cache if exports fail</li>
                <li>Use Chrome or Firefox for best compatibility</li>
              </ul>
            </div>
          </div>

          <div className="ds-c-card ds-u-margin-bottom--3">
            <div className="ds-c-card__body">
              <h5 className="ds-h5">🔄 Data Usage</h5>
              <ul className="ds-c-list ds-text--small">
                <li>PDF for stakeholder presentations</li>
                <li>CSV for data analysis and charts</li>
                <li>Markdown for documentation</li>
                <li>JSON for complete data backup</li>
                <li>Export regularly to prevent data loss</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="ds-c-alert ds-c-alert--success ds-u-margin-top--3">
        <div className="ds-c-alert__body">
          <h5 className="ds-c-alert__heading">Pro Tip</h5>
          <p className="ds-c-alert__text">
            Export your assessment in JSON format after each major update. This provides a complete
            backup that can be used for future import functionality and ensures no data is lost.
          </p>
        </div>
      </div>

      <div className="ds-u-margin-top--4">
        <h5 className="ds-h5">Keyboard Shortcuts</h5>
        <div className="ds-c-table-wrapper">
          <table className="ds-c-table">
            <thead>
              <tr>
                <th>Action</th>
                <th>Shortcut</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Open export dialog</td>
                <td>
                  <kbd>Ctrl/Cmd + E</kbd>
                </td>
              </tr>
              <tr>
                <td>Quick PDF export</td>
                <td>
                  <kbd>Ctrl/Cmd + P</kbd>
                </td>
              </tr>
              <tr>
                <td>Close export dialog</td>
                <td>
                  <kbd>Escape</kbd>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
