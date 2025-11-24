/**
 * Export Button Component
 * Reusable export trigger component
 */

import React, { useState } from 'react';

import { ExportService } from '../../services/export/ExportService';
import { CSVExportHandler } from '../../services/export/handlers/CSVExportHandler';
import { JSONExportHandler } from '../../services/export/handlers/JSONExportHandler';
import { MarkdownExportHandler } from '../../services/export/handlers/MarkdownExportHandler';
import { PDFExportHandler } from '../../services/export/handlers/PDFExportHandler';

import { CleanExportDialog } from './CleanExportDialog';

import type { ExportOptions, ExportResult } from '../../services/export/types';
import type { Assessment } from '../../types';

interface ExportButtonProps {
  assessment: Assessment;
  variant?: 'primary' | 'secondary' | 'transparent';
  size?: 'small' | 'medium' | 'large';
  children?: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function ExportButton({
  assessment,
  variant = 'primary',
  size = 'medium',
  children = 'Export Assessment',
  className = '',
  disabled = false,
}: ExportButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [exportService] = useState(() => {
    const service = new ExportService();

    // Register all format handlers
    service.registerHandler('json', new JSONExportHandler());
    service.registerHandler('markdown', new MarkdownExportHandler());
    service.registerHandler('pdf', new PDFExportHandler());
    service.registerHandler('csv', new CSVExportHandler());

    return service;
  });

  const handleExport = async (options: ExportOptions): Promise<ExportResult> => {
    return await exportService.exportAssessment(assessment, options);
  };

  const buttonClasses = [
    'ds-c-button',
    `ds-c-button--${variant}`,
    size === 'small' ? 'ds-c-button--small' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <button
        type="button"
        className={buttonClasses}
        onClick={() => setIsDialogOpen(true)}
        disabled={disabled}
        aria-label={`Export ${assessment.stateName} assessment`}
      >
        {children}
      </button>

      <CleanExportDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onExport={handleExport}
        availableFormats={exportService.getAvailableFormats()}
        assessmentName={assessment.stateName}
      />
    </>
  );
}
