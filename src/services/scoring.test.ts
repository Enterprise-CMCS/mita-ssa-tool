/**
 * Scoring Service Tests
 *
 * Tests for maturity score calculation functions.
 * These are critical functions used across finalization, aggregation, and export.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateAverage,
  roundScore,
  calculateAverageScore,
  calculateDimensionScore,
} from './scoring';

describe('scoring', () => {
  describe('calculateAverage', () => {
    it('should calculate average of valid numbers', () => {
      expect(calculateAverage([1, 2, 3, 4, 5])).toBe(3);
      expect(calculateAverage([2, 4])).toBe(3);
      expect(calculateAverage([5])).toBe(5);
    });

    it('should exclude null values', () => {
      expect(calculateAverage([1, null, 3])).toBe(2);
      expect(calculateAverage([null, 4, null])).toBe(4);
    });

    it('should exclude undefined values', () => {
      expect(calculateAverage([1, undefined, 3])).toBe(2);
      expect(calculateAverage([undefined, 5, undefined])).toBe(5);
    });

    it('should return null for empty array', () => {
      expect(calculateAverage([])).toBeNull();
    });

    it('should return null when all values are null/undefined', () => {
      expect(calculateAverage([null, null])).toBeNull();
      expect(calculateAverage([undefined, undefined])).toBeNull();
      expect(calculateAverage([null, undefined])).toBeNull();
    });
  });

  describe('roundScore', () => {
    it('should round to one decimal place', () => {
      expect(roundScore(3.14159)).toBe(3.1);
      expect(roundScore(3.15)).toBe(3.2);
      expect(roundScore(3.149)).toBe(3.1);
      expect(roundScore(4.95)).toBe(5.0);
    });

    it('should return null for null input', () => {
      expect(roundScore(null)).toBeNull();
    });

    it('should handle whole numbers', () => {
      expect(roundScore(3)).toBe(3);
      expect(roundScore(5)).toBe(5);
    });
  });

  describe('calculateAverageScore', () => {
    it('should calculate average and round to 1 decimal', () => {
      expect(calculateAverageScore([3, 4, 5])).toBe(4);
      expect(calculateAverageScore([2, 3])).toBe(2.5);
      expect(calculateAverageScore([1, 2, 3, 4])).toBe(2.5);
    });

    it('should return null for empty array', () => {
      expect(calculateAverageScore([])).toBeNull();
    });

    it('should handle single value', () => {
      expect(calculateAverageScore([4])).toBe(4);
      expect(calculateAverageScore([3.7])).toBe(3.7);
    });

    it('should round correctly', () => {
      // 3.33... should round to 3.3
      expect(calculateAverageScore([3, 3, 4])).toBe(3.3);
      // 3.66... should round to 3.7
      expect(calculateAverageScore([3, 4, 4])).toBe(3.7);
    });
  });

  describe('calculateDimensionScore', () => {
    describe('non-Technology dimensions', () => {
      it('should calculate simple average for businessArchitecture', () => {
        const ratings = [
          { currentLevel: 3, subDimensionId: undefined },
          { currentLevel: 4, subDimensionId: undefined },
          { currentLevel: 5, subDimensionId: undefined },
        ];
        expect(calculateDimensionScore('businessArchitecture', ratings)).toBe(4);
      });

      it('should calculate simple average for information', () => {
        const ratings = [
          { currentLevel: 2, subDimensionId: undefined },
          { currentLevel: 3, subDimensionId: undefined },
        ];
        expect(calculateDimensionScore('information', ratings)).toBe(2.5);
      });

      it('should exclude unassessed ratings (currentLevel = 0)', () => {
        const ratings = [
          { currentLevel: 3, subDimensionId: undefined },
          { currentLevel: 0, subDimensionId: undefined }, // Not assessed
          { currentLevel: 5, subDimensionId: undefined },
        ];
        expect(calculateDimensionScore('businessArchitecture', ratings)).toBe(4);
      });

      it('should exclude N/A ratings (currentLevel = -1)', () => {
        const ratings = [
          { currentLevel: 3, subDimensionId: undefined },
          { currentLevel: -1, subDimensionId: undefined }, // N/A
          { currentLevel: 5, subDimensionId: undefined },
        ];
        // Only 3 and 5 count, average = 4
        expect(calculateDimensionScore('information', ratings)).toBe(4);
      });

      it('should return null when no assessed ratings', () => {
        const ratings = [
          { currentLevel: 0, subDimensionId: undefined },
          { currentLevel: -1, subDimensionId: undefined },
        ];
        expect(calculateDimensionScore('businessArchitecture', ratings)).toBeNull();
      });

      it('should return null for empty array', () => {
        expect(calculateDimensionScore('information', [])).toBeNull();
      });
    });

    describe('Technology dimension', () => {
      it('should average sub-dimension scores, then average those', () => {
        const ratings = [
          // Technical Infrastructure Management: avg = 3.5
          { currentLevel: 3, subDimensionId: 'technologyInfrastructureManagement' },
          { currentLevel: 4, subDimensionId: 'technologyInfrastructureManagement' },
          // Application Management: avg = 5
          { currentLevel: 5, subDimensionId: 'applicationManagement' },
        ];
        // Sub-dim averages: 3.5, 5 -> overall = 4.25 -> rounds to 4.3
        expect(calculateDimensionScore('technology', ratings)).toBe(4.3);
      });

      it('should handle single sub-dimension', () => {
        const ratings = [
          { currentLevel: 4, subDimensionId: 'technologyInfrastructureManagement' },
          { currentLevel: 4, subDimensionId: 'technologyInfrastructureManagement' },
        ];
        expect(calculateDimensionScore('technology', ratings)).toBe(4);
      });

      it('should exclude unassessed ratings within sub-dimensions', () => {
        const ratings = [
          { currentLevel: 3, subDimensionId: 'technologyInfrastructureManagement' },
          { currentLevel: 0, subDimensionId: 'technologyInfrastructureManagement' }, // Not assessed
          { currentLevel: 5, subDimensionId: 'applicationManagement' },
        ];
        // Technical Infrastructure Management: only 3 counts -> 3
        // Application Management: 5
        // Average: (3 + 5) / 2 = 4
        expect(calculateDimensionScore('technology', ratings)).toBe(4);
      });

      it('should skip sub-dimensions with no assessed ratings', () => {
        const ratings = [
          { currentLevel: 4, subDimensionId: 'technologyInfrastructureManagement' },
          { currentLevel: 0, subDimensionId: 'applicationManagement' }, // Not assessed
          { currentLevel: -1, subDimensionId: 'applicationManagement' }, // N/A
        ];
        // Only technologyInfrastructureManagement has assessed ratings -> 4
        expect(calculateDimensionScore('technology', ratings)).toBe(4);
      });

      it('should return null when no sub-dimensions have assessed ratings', () => {
        const ratings = [
          { currentLevel: 0, subDimensionId: 'technologyInfrastructureManagement' },
          { currentLevel: 0, subDimensionId: 'applicationManagement' },
        ];
        expect(calculateDimensionScore('technology', ratings)).toBeNull();
      });

      it('should handle both sub-dimensions', () => {
        const ratings = [
          { currentLevel: 3, subDimensionId: 'technologyInfrastructureManagement' },
          { currentLevel: 4, subDimensionId: 'applicationManagement' },
        ];
        // All sub-dims have one rating each: 3, 4 -> avg = 7/2 = 3.5
        expect(calculateDimensionScore('technology', ratings)).toBe(3.5);
      });
    });

    /**
     * The To-Be roll-up goes through the same function as As-Is, via `levelField`,
     * so the two cannot drift apart. Before Wave 5 there was no canonical To-Be
     * scorer at all and each caller flat-averaged `targetLevel` itself.
     */
    describe('levelField: targetLevel', () => {
      it('defaults to currentLevel, leaving every existing caller unchanged', () => {
        const ratings = [
          { currentLevel: 2, targetLevel: 5 },
          { currentLevel: 4, targetLevel: 5 },
        ];

        expect(calculateDimensionScore('information', ratings)).toBe(3);
        expect(calculateDimensionScore('information', ratings, 'currentLevel')).toBe(3);
      });

      it('scores the To-Be column when asked', () => {
        const ratings = [
          { currentLevel: 2, targetLevel: 4 },
          { currentLevel: 2, targetLevel: 5 },
        ];

        expect(calculateDimensionScore('information', ratings, 'targetLevel')).toBe(4.5);
      });

      it('weights Technology To-Be by sub-dimension, not by aspect count', () => {
        // Six Infrastructure targets at 5 and five Application targets at 1.
        // Canonical: mean(5, 1) = 3.0. A flat mean over 11 would give 3.2.
        const ratings = [
          ...Array.from({ length: 6 }, () => ({
            currentLevel: 0,
            targetLevel: 5,
            subDimensionId: 'technologyInfrastructureManagement',
          })),
          ...Array.from({ length: 5 }, () => ({
            currentLevel: 0,
            targetLevel: 1,
            subDimensionId: 'applicationManagement',
          })),
        ];

        expect(calculateDimensionScore('technology', ratings, 'targetLevel')).toBe(3);
      });

      it('treats an absent target as unassessed rather than as zero', () => {
        // The sentinel that matters most: `targetLevel` is optional, so a rating with
        // an As-Is level and no target must be excluded from the To-Be average. Were
        // `undefined` coerced to 0 and counted, this would be 2 rather than 4.
        const ratings = [{ currentLevel: 3, targetLevel: 4 }, { currentLevel: 3 }];

        expect(calculateDimensionScore('information', ratings, 'targetLevel')).toBe(4);
      });

      it('excludes N/A targets', () => {
        const ratings = [
          { currentLevel: 3, targetLevel: 4 },
          { currentLevel: 3, targetLevel: -1 },
        ];

        expect(calculateDimensionScore('information', ratings, 'targetLevel')).toBe(4);
      });

      it('returns null when nothing has a target', () => {
        const ratings = [{ currentLevel: 3 }, { currentLevel: 4 }];

        expect(calculateDimensionScore('information', ratings, 'targetLevel')).toBeNull();
      });

      it('scores As-Is and To-Be independently on the same ratings', () => {
        // Guards against the level selector leaking between the two calls.
        const ratings = [
          { currentLevel: 1, targetLevel: 5 },
          { currentLevel: 1, targetLevel: 5 },
        ];

        expect(calculateDimensionScore('information', ratings)).toBe(1);
        expect(calculateDimensionScore('information', ratings, 'targetLevel')).toBe(5);
      });
    });
  });
});
