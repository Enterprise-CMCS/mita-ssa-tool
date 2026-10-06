/**
 * Application Constants
 *
 * Centralized constants to eliminate magic numbers and strings throughout the codebase.
 * Organized by category for easy discovery and maintenance.
 */

import type { OrbitDimensionId, OrganizationalAssessmentId } from '../types';
import { WORKBOOK_FILENAME } from './workbook';

// =============================================================================
// External Links
// =============================================================================

/**
 * GitHub repository URL.
 *
 * In deployed builds this is injected via `VITE_GITHUB_REPO_URL` in the deploy
 * workflow, which points to the repository the app was deployed from. When the
 * env var is not set (local development, or a build that omits it), it falls
 * back to the canonical upstream repository so GitHub links always work.
 */
const DEFAULT_GITHUB_REPO_URL = 'https://github.com/Enterprise-CMCS/mita-ssa-tool';
export const GITHUB_REPO_URL = import.meta.env.VITE_GITHUB_REPO_URL || DEFAULT_GITHUB_REPO_URL;

// =============================================================================
// Draft Mode
// =============================================================================

/**
 * Whether the tool presents itself as a draft still being piloted.
 *
 * Drives the site-wide banner. Wave 5 extends it to the exports, so the marker
 * cannot be present in the app and missing from a PDF a state emails onward.
 *
 * Removing the disclaimer at go-live is one build variable, not a code change:
 * set `VITE_DRAFT_MODE=false` in the deploy workflow. It defaults to draft-on so
 * that forgetting to set it fails toward showing the notice rather than hiding it.
 * Because the value resolves at build time, that also tree-shakes the banner and
 * its copy out of the bundle rather than merely hiding them.
 */
export const IS_DRAFT = import.meta.env.VITE_DRAFT_MODE !== 'false';

// The copy itself lives in ./draftNotice, which must stay free of `import.meta`
// so Node-based build tooling can import the same strings. Re-exported here so
// application code has a single import site.
export {
  DRAFT_NOTICE_LABEL,
  DRAFT_NOTICE_BODY,
  DRAFT_NOTICE_FULL_BODY,
  DRAFT_NOTICE_LINE,
  DRAFT_NOTICE_SHORT_LINE,
  DRAFT_TITLE_MARKER,
} from './draftNotice';

// =============================================================================
// Offline Excel workbook
// =============================================================================

// Same split as the draft notice above, and for the same reason: the filename lives in
// ./workbook, which stays free of `import.meta` so `scripts/xlsx/paths.ts` can import it and build
// the generator's output path from the same string the download link uses.
export { WORKBOOK_APPROX_SIZE, WORKBOOK_FILE_TYPE, WORKBOOK_FILENAME } from './workbook';

/**
 * DOM id of the workbook section on the Import & Export page.
 *
 * Named here rather than written as a literal because it is referenced three times — the pointer
 * link's `href`, the section's own `id`, and the `getElementById` in the effect that makes
 * `…/import-export#offline-workbook-section` work as a URL — and a mismatch between any two of them
 * fails silently. The link would still look and behave like a link, and do nothing.
 *
 * In this file rather than in `./workbook` because a DOM id has no build-time consumer. `./workbook`
 * exists to be importable from plain Node, and only what `scripts/` actually needs belongs there.
 */
export const OFFLINE_WORKBOOK_SECTION_ID = 'offline-workbook-section';

/**
 * URL the in-app download links point at.
 *
 * Built from `import.meta.env.BASE_URL`, which Vite sets from `base` and which always ends in a
 * slash. A root-absolute `/mita-4.0-...xlsx` would resolve to the Pages *origin* rather than the
 * repository subpath and 404 — the same defect OBS-28 recorded for the favicon.
 *
 * The workbook is a static file in `public/`, not generated in the browser, so this is a plain
 * anchor `href`. It deliberately does not use `downloadBlob` from the export service: that helper
 * builds an object URL from a `Blob`, which is the wrong tool for a file that already exists on
 * the server and would mean fetching 217 KB into memory to hand it straight back.
 */
export const WORKBOOK_DOWNLOAD_URL = `${import.meta.env.BASE_URL}${WORKBOOK_FILENAME}`;

// =============================================================================
// Enterprise Domain Configuration
// =============================================================================

/**
 * Domain IDs that have aggregate dimensions (enterprise domains).
 * These domains should not contribute to each other's aggregates.
 */
export const ENTERPRISE_DOMAIN_IDS = ['data-management', 'technical'] as const;

/**
 * Maps domain IDs to their aggregated dimension.
 * These domains show an aggregate score for the specified dimension
 * instead of allowing manual assessment.
 *
 * - Data Management (data-management): Information is aggregated from other domains
 * - Technology Management (technical): Technology is aggregated from other domains
 */
export const DOMAIN_AGGREGATE_DIMENSIONS: Partial<Record<string, OrbitDimensionId>> = {
  'data-management': 'information', // Data Management: BT (aggregate I)
  technical: 'technology', // Technology Management: BI (aggregate T)
};

// =============================================================================
// Organizational Assessment Configuration
// =============================================================================

/**
 * The single capability area that uses organizational assessment mode.
 * The Enterprise Governance area (under the Enterprise Architecture domain)
 * hosts all 15 organizational aspects in three sections.
 */
export const ORGANIZATIONAL_ASSESSMENT_AREA_ID = 'enterprise-governance';

/**
 * The organizational assessment sections, in display order.
 * Each section is one organizational assessment type whose aspects are
 * assessed within the combined Enterprise Governance area.
 */
export const ORGANIZATIONAL_SECTIONS: OrganizationalAssessmentId[] = [
  'outcomes',
  'roles',
  'enterprise-architecture',
];

/**
 * Check if a capability area uses organizational assessment mode.
 * @param areaId - The capability area ID to check
 * @returns True if this area uses organizational assessment mode
 */
export function isOrganizationalAssessmentArea(areaId: string): boolean {
  return areaId === ORGANIZATIONAL_ASSESSMENT_AREA_ID;
}

/**
 * Get the organizational assessment sections for a capability area.
 * @param areaId - The capability area ID
 * @returns The section types (in display order), or null if the area is not
 *          an organizational assessment
 */
export function getOrganizationalSections(areaId: string): OrganizationalAssessmentId[] | null {
  return isOrganizationalAssessmentArea(areaId) ? ORGANIZATIONAL_SECTIONS : null;
}

/**
 * Type guard for a rating's `dimensionId` holding an organizational section
 * rather than a standard ORBIT dimension.
 *
 * Prefer this over inline comparisons against section literals. Hand-written
 * unions have drifted before: both dimension score tables checked only
 * 'outcomes' and 'roles', so 'enterprise-architecture' ratings fell through to
 * the standard-dimension lookup, resolved to `undefined`, and rendered raw
 * aspect IDs in the results tables.
 *
 * @param dimensionId - The `dimensionId` from an OrbitRating or DimensionScore
 * @returns True if the ID is one of the organizational sections
 */
export function isOrganizationalDimensionId(
  dimensionId: string
): dimensionId is OrganizationalAssessmentId {
  return (ORGANIZATIONAL_SECTIONS as readonly string[]).includes(dimensionId);
}

// =============================================================================
// Maturity Score Thresholds
// =============================================================================

/**
 * Thresholds for categorizing maturity scores into quality levels.
 * Used by getScoreColor and other score-related utilities.
 */
export const MATURITY_THRESHOLDS = {
  /** Score >= 4 is considered excellent */
  EXCELLENT: 4,
  /** Score >= 3 is considered good */
  GOOD: 3,
  /** Score >= 2 is considered developing */
  DEVELOPING: 2,
} as const;

// =============================================================================
// Import/Export Constants
// =============================================================================

/**
 * Tolerance in milliseconds for comparing timestamps during import.
 * Two timestamps within this tolerance are considered "the same time".
 * Used to detect duplicate imports and avoid creating redundant history entries.
 */
export const TIMESTAMP_TOLERANCE_MS = 1000;

// =============================================================================
// UI Constants
// =============================================================================

/**
 * User interface constants for consistent behavior across components.
 */
export const UI = {
  /** Maximum number of tags to display before showing "+N more" */
  TAGS_MAX_VISIBLE: 3,
  /** Debounce delay in milliseconds for text input auto-save */
  DEBOUNCE_MS: 300,
  /** Stripe pattern dimensions for progress bars */
  STRIPE_PATTERN: {
    ANGLE: -45,
    WIDTH: 4,
    TOTAL: 8,
  },
} as const;
