/**
 * Scoring service for calculating maturity scores.
 * Uses simple averaging across all dimensions (no weighting per stakeholder decision).
 */

import { getTechnologySubDimensions } from './orbit';
import type { RatingDimensionId } from '../types';

/**
 * Minimal rating interface for dimension score calculation.
 * Allows reuse across different contexts (OrbitRating, imported data, etc.)
 * Uses string for subDimensionId to be compatible with various rating sources.
 */
export interface RatingForScoring {
  currentLevel: number;
  /**
   * To-Be level. Optional because a rating may carry an As-Is level and no
   * target; absent is treated exactly like unassessed, so it is excluded from
   * averages rather than counted as zero.
   */
  targetLevel?: number;
  subDimensionId?: string;
}

/**
 * Calculates the average of an array of numbers, excluding null/undefined values.
 *
 * @param values - Array of numbers (may include null/undefined)
 * @returns Average value or null if no valid values
 */
export function calculateAverage(values: (number | null | undefined)[]): number | null {
  const validValues = values.filter((v): v is number => v !== null && v !== undefined);

  if (validValues.length === 0) {
    return null;
  }

  const sum = validValues.reduce((acc, val) => acc + val, 0);
  return sum / validValues.length;
}

/**
 * Rounds a score to one decimal place.
 *
 * @param score - The score to round
 * @returns Rounded score or null if input is null
 */
export function roundScore(score: number | null): number | null {
  if (score === null) {
    return null;
  }
  return Math.round(score * 10) / 10;
}

/**
 * Calculate average score from an array of numeric values, rounded to 1 decimal place.
 * This is the standard scoring function used throughout the application.
 *
 * @param values - Array of numeric scores (1-5)
 * @returns Average rounded to 1 decimal, or null if empty array
 *
 * @example
 * calculateAverageScore([3, 4, 5]) // returns 4.0
 * calculateAverageScore([2.5, 3.5]) // returns 3.0
 * calculateAverageScore([]) // returns null
 */
export function calculateAverageScore(values: number[]): number | null {
  if (values.length === 0) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  const avg = sum / values.length;
  return Math.round(avg * 10) / 10;
}

/**
 * Calculate dimension score from ratings.
 * For Technology dimension, calculates sub-dimension averages first, then averages those.
 * For other dimensions, calculates a simple average of all ratings.
 *
 * This is the canonical implementation used throughout the application to ensure
 * consistent scoring across finalization, aggregation, and export.
 *
 * Sub-dimension means are deliberately left **unrounded** before being averaged;
 * rounding happens once, at the end. Rounding them first makes Technology disagree
 * with this function by 0.1 (see OBS-21).
 *
 * `levelField` exists so the To-Be roll-up follows the same rule as As-Is rather
 * than getting its own. Reading `targetLevel` here — instead of having each caller
 * remap ratings into `currentLevel` — keeps one definition of "a Technology score
 * is the mean of its two sub-dimension means" and one definition of which sentinel
 * values are excluded. Three call sites re-deriving that is how OBS-21 and OBS-25
 * happened in the first place.
 *
 * `dimensionId` accepts an organizational section as well as a B-I-T dimension,
 * because that is what the function already does: `technology` is the only branch,
 * so every other id — including `outcomes`, `roles` and `enterprise-architecture`,
 * which are stored in the same `dimensionId` field — takes the plain-mean path.
 * That lets a caller holding a `RatingDimensionId` pass it straight through instead
 * of asserting it is narrower than it is; a cast of that shape is what produced
 * OBS-1. Callers whose id genuinely arrives as a broad `string` — from
 * `Object.entries`, say — still narrow it themselves, and that is fine.
 *
 * @param dimensionId - The dimension or organizational section to score
 * @param ratings - Array of ratings for this dimension (already filtered by dimension)
 * @param levelField - Which level to score: As-Is (default) or To-Be
 * @returns Score rounded to 1 decimal, or null if no valid ratings
 *
 * @example
 * // For non-Technology dimensions
 * calculateDimensionScore('information', [{currentLevel: 3}, {currentLevel: 4}])
 * // returns 3.5
 *
 * // For Technology dimension (averages sub-dimensions first)
 * calculateDimensionScore('technology', [
 *   {currentLevel: 3, subDimensionId: 'technologyInfrastructureManagement'},
 *   {currentLevel: 4, subDimensionId: 'technologyInfrastructureManagement'},
 *   {currentLevel: 5, subDimensionId: 'applicationManagement'},
 * ])
 * // returns 4.3 (avg of 3.5 and 5.0)
 *
 * // Scoring the To-Be column instead
 * calculateDimensionScore('information', [{currentLevel: 2, targetLevel: 4}], 'targetLevel')
 * // returns 4
 */
export function calculateDimensionScore(
  dimensionId: RatingDimensionId,
  ratings: RatingForScoring[],
  levelField: 'currentLevel' | 'targetLevel' = 'currentLevel'
): number | null {
  // Absent To-Be is indistinguishable from unassessed, and both are excluded.
  const levelOf = (rating: RatingForScoring): number => rating[levelField] ?? 0;

  // Filter to only assessed ratings. This drops both unassessed (0) and N/A (-1).
  const assessedRatings = ratings.filter((r) => levelOf(r) > 0);

  if (assessedRatings.length === 0) {
    return null;
  }

  if (dimensionId === 'technology') {
    // For Technology: calculate sub-dimension averages, then average those
    const techSubDims = getTechnologySubDimensions();
    const subDimScores: number[] = [];

    for (const subDim of techSubDims) {
      const subDimRatings = assessedRatings.filter((r) => r.subDimensionId === subDim.id);
      if (subDimRatings.length > 0) {
        const avg = subDimRatings.reduce((sum, r) => sum + levelOf(r), 0) / subDimRatings.length;
        subDimScores.push(avg);
      }
    }

    if (subDimScores.length === 0) {
      return null;
    }

    const techScore = subDimScores.reduce((sum, s) => sum + s, 0) / subDimScores.length;
    return Math.round(techScore * 10) / 10;
  }

  // For non-Technology dimensions: simple average
  const avg = assessedRatings.reduce((sum, r) => sum + levelOf(r), 0) / assessedRatings.length;
  return Math.round(avg * 10) / 10;
}
