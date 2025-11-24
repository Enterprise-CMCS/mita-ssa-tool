/**
 * Simple Export Section Component
 * Direct export buttons with icons for each format
 */

import { useState } from 'react';

import { ExportService } from '../../services/export/ExportService';
import { CSVExportHandler } from '../../services/export/handlers/CSVExportHandler';
import { JSONExportHandler } from '../../services/export/handlers/JSONExportHandler';
import { MarkdownExportHandler } from '../../services/export/handlers/MarkdownExportHandler';
import { PDFExportHandler } from '../../services/export/handlers/PDFExportHandler';

import type { ExportOptions } from '../../services/export/types';
import type { Assessment } from '../../types';

interface EnhancedExportSectionProps {
  assessment: Assessment;
}

export function EnhancedExportSection({ assessment }: EnhancedExportSectionProps) {
  const [exportingFormat, setExportingFormat] = useState<string | null>(null);

  const [exportService] = useState(() => {
    const service = new ExportService();
    service.registerHandler('json', new JSONExportHandler());
    service.registerHandler('markdown', new MarkdownExportHandler());
    service.registerHandler('pdf', new PDFExportHandler());
    service.registerHandler('csv', new CSVExportHandler());
    return service;
  });

  const handleDirectExport = async (format: ExportOptions['format']) => {
    setExportingFormat(format);

    const options: ExportOptions = {
      format,
      includeDetails: true,
      includeCheckboxDetails: true,
    };

    try {
      await exportService.exportAssessment(assessment, options);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExportingFormat(null);
    }
  };

  const exportFormats = [
    {
      format: 'pdf' as const,
      name: 'PDF',
      description: 'Professional report',
      icon: '📄',
      color: 'ds-c-button--transparent',
    },
    {
      format: 'csv' as const,
      name: 'CSV',
      description: 'Data analysis',
      icon: '📊',
      color: 'ds-c-button--transparent',
    },
    {
      format: 'markdown' as const,
      name: 'Markdown',
      description: 'Documentation',
      icon: '📝',
      color: 'ds-c-button--transparent',
    },
    {
      format: 'json' as const,
      name: 'JSON',
      description: 'Data backup',
      icon: '🔧',
      color: 'ds-c-button--transparent',
    },
  ];

  return (
    <div className="ds-u-margin-bottom--4">
      <div className="ds-u-border-top--1 ds-u-padding-top--4">
        <h2 className="ds-h2 ds-u-margin-bottom--3">Export</h2>

        <div className="ds-l-row">
          {exportFormats.map(format => (
            <div key={format.format} className="ds-l-col--6 ds-l-md-col--3 ds-u-margin-bottom--2">
              <button
                type="button"
                className={`ds-c-button ${format.color} ds-u-width--full ds-u-padding--2`}
                onClick={() => handleDirectExport(format.format)}
                disabled={exportingFormat === format.format}
                style={{
                  minHeight: '60px',
                  height: '60px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div className="ds-u-text-align--center">
                  <div style={{ fontSize: '18px', marginBottom: '4px' }}>{format.icon}</div>
                  <div className="ds-u-font-weight--bold ds-text--small ds-u-margin-bottom--0">
                    {exportingFormat === format.format ? 'Exporting...' : format.name}
                  </div>
                </div>
              </button>
            </div>
          ))}
        </div>

        <p className="ds-text--small ds-u-color--muted ds-u-margin-top--2">
          All exports include complete assessment data with enhanced scoring and metadata.
        </p>
      </div>
    </div>
  );
}
