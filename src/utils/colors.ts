/**
 * Color Utilities
 *
 * Centralized color functions and constants for maturity scores.
 *
 * The values are chosen for WCAG 2.1 AA contrast rather than to match a stock
 * Material Design ramp — the Material 500-level palette this replaced failed AA
 * in every role it was used in. Contrast is enforced by `colors.test.ts`, not by
 * this comment; the previous version of this header asserted compliance while
 * none of the five colours actually met it.
 */

import { MATURITY_THRESHOLDS } from '../constants';

/**
 * Score colours, used in three roles across the app:
 *
 * 1. as a chip/badge **fill** with white text — needs 4.5:1 white-on-fill
 * 2. as **text** on a white surface — needs 4.5:1
 * 3. as Chart.js bar and point fills
 *
 * Every value therefore clears 4.5:1 against **both** white text and a white
 * background, which is the same luminance constraint, so one value serves all
 * three roles.
 *
 * The previous palette (Material 500-level: `#4caf50`, `#ff9800`, `#2196f3`,
 * `#f44336`, `#9e9e9e`) failed in every role — measured 2.16:1 to 3.68:1 — and
 * the docstring claiming AA compliance was simply wrong. See OBS-30.
 *
 * | Token      | Value     | white-on-fill | as text on white |
 * | ---------- | --------- | ------------- | ---------------- |
 * | excellent  | `#2e7d32` | 5.13:1        | 5.13:1           |
 * | good       | `#a15c00` | 5.19:1        | 5.19:1           |
 * | developing | `#0071bc` | 5.14:1        | 5.14:1           |
 * | initial    | `#c62828` | 5.62:1        | 5.62:1           |
 * | none       | `#616161` | 6.19:1        | 6.19:1           |
 *
 * **Known trade-off.** Forcing all five to ~5:1 against white necessarily puts
 * them at similar *luminance*, so the bands differ from each other by at most
 * ~1.21:1, and amber vs red by only 1.08:1. They are separated by hue, not
 * brightness, which also means amber and red are plausibly confusable under
 * protanopia. That is acceptable here only because colour is never the sole
 * carrier of meaning (WCAG 1.4.1): every chip and text site prints the numeric
 * score beside the colour, and the two bar charts encode value as bar length
 * against a labelled axis. The charts do **not** print numbers — there is no
 * datalabels plugin — so do not remove the axis or introduce a colour-only score
 * indicator without revisiting this.
 */
export const SCORE_COLORS = {
  /** Green - score >= 4 (excellent) */
  excellent: '#2e7d32',
  /** Dark amber - score >= 3 (good) */
  good: '#a15c00',
  /** Blue - score >= 2 (developing) */
  developing: '#0071bc',
  /** Red - score < 2 (initial) */
  initial: '#c62828',
  /** Grey - null/not assessed */
  none: '#616161',
} as const;

/**
 * Get the appropriate color for a maturity score.
 *
 * @param score - Maturity score (1-5) or null if not assessed
 * @returns Hex color string
 *
 * @example
 * getScoreColor(4.5) // returns '#2e7d32' (green)
 * getScoreColor(3.2) // returns '#a15c00' (amber)
 * getScoreColor(null) // returns '#616161' (grey)
 */
export function getScoreColor(score: number | null): string {
  if (score === null) return SCORE_COLORS.none;
  if (score >= MATURITY_THRESHOLDS.EXCELLENT) return SCORE_COLORS.excellent;
  if (score >= MATURITY_THRESHOLDS.GOOD) return SCORE_COLORS.good;
  if (score >= MATURITY_THRESHOLDS.DEVELOPING) return SCORE_COLORS.developing;
  return SCORE_COLORS.initial;
}

/**
 * Format a numeric score for display.
 * Returns an em dash (—) for null/undefined values, otherwise formats to 1 decimal place.
 *
 * @param score - Maturity score (1-5) or null/undefined if not assessed
 * @returns Formatted string (e.g., "3.5" or "—")
 *
 * @example
 * formatScore(3.5) // returns '3.5'
 * formatScore(4) // returns '4.0'
 * formatScore(null) // returns '—'
 * formatScore(undefined) // returns '—'
 */
export function formatScore(score: number | null | undefined): string {
  if (score === null || score === undefined) return '—';
  return score.toFixed(1);
}
