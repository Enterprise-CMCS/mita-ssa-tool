/**
 * PDF Export Styles and Constants
 *
 * Centralized styling constants for PDF generation.
 * Used by pdfExport.ts for consistent document formatting.
 */

import type { OrbitDimensionId } from '../../types';

/**
 * A4 page dimensions in millimeters
 */
export const PAGE = {
  WIDTH: 210 as number,
  HEIGHT: 297 as number,
};

/**
 * Page margins in millimeters
 */
export const MARGIN = {
  LEFT: 15 as number,
  RIGHT: 15 as number,
  TOP: 20 as number,
  BOTTOM: 25 as number,
};

/**
 * Calculated content width (page width minus margins)
 */
export const CONTENT_WIDTH = PAGE.WIDTH - MARGIN.LEFT - MARGIN.RIGHT;

/**
 * Color palette for PDF documents.
 * RGB tuples for use with jsPDF setFillColor/setTextColor.
 */
export const COLORS = {
  /** CMS Blue - primary brand color */
  primary: [0, 91, 150] as [number, number, number],
  /** Dark gray - secondary text */
  secondary: [51, 51, 51] as [number, number, number],
  /** Green - accent/success color */
  accent: [0, 122, 92] as [number, number, number],
  /** Light gray - backgrounds */
  lightGray: [245, 245, 245] as [number, number, number],
  /** Medium gray - borders */
  mediumGray: [200, 200, 200] as [number, number, number],
  /** Dark gray - muted text */
  darkGray: [100, 100, 100] as [number, number, number],
  /** White */
  white: [255, 255, 255] as [number, number, number],
  /**
   * Draft disclaimer red. Matches the app banner's `theme.palette.error.dark`
   * (`#b0142f`) so the printed notice and the on-screen one are the same colour.
   * Measured 7.03:1 against white, which clears AA and AAA — and contrast is
   * symmetric, so that holds both for white text on the cover band and for the
   * red footer text on the white page.
   */
  draft: [176, 20, 47] as [number, number, number],
} as const;

/**
 * Display names for ORBIT dimensions
 */
export const DIMENSION_NAMES: Record<OrbitDimensionId, string> = {
  businessArchitecture: 'Business Architecture',
  information: 'Information',
  technology: 'Technology',
} as const;

/**
 * Get maturity level name from numeric score
 * @param score - Numeric score (1-5)
 * @returns Human-readable maturity level name
 */
export function getMaturityLevelName(score: number): string {
  if (score >= 4.5) return 'Optimized';
  if (score >= 3.5) return 'Managed';
  if (score >= 2.5) return 'Defined';
  if (score >= 1.5) return 'Developing';
  return 'Initial';
}
