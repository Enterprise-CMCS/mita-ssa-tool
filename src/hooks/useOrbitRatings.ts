/**
 * Hook for managing ORBIT ratings within a capability assessment
 *
 * Provides CRUD operations for aspect-level ratings.
 * Each aspect in each dimension has one rating per assessment.
 */

import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../services/db';
import { calculateAverageScore, calculateDimensionScore } from '../services/scoring';
import type {
  OrbitRating,
  RatingDimensionId,
  TechnologySubDimensionId,
  MaturityLevelWithNA,
  QuestionResponse,
  EvidenceResponse,
} from '../types';

/**
 * Return type for useOrbitRatings hook
 */
export interface UseOrbitRatingsReturn {
  ratings: OrbitRating[];
  saveRating: (params: {
    dimensionId: RatingDimensionId;
    subDimensionId?: TechnologySubDimensionId;
    aspectId: string;
    currentLevel: MaturityLevelWithNA;
    targetLevel?: MaturityLevelWithNA;
    questionResponses?: QuestionResponse[];
    evidenceResponses?: EvidenceResponse[];
    notes?: string;
    barriers?: string;
    plans?: string;
  }) => Promise<void>;
  updateLevel: (
    dimensionId: RatingDimensionId,
    aspectId: string,
    currentLevel: MaturityLevelWithNA,
    subDimensionId?: TechnologySubDimensionId
  ) => Promise<void>;
  updateTargetLevel: (
    dimensionId: RatingDimensionId,
    aspectId: string,
    targetLevel: MaturityLevelWithNA | undefined,
    subDimensionId?: TechnologySubDimensionId
  ) => Promise<void>;
  updateNotes: (
    dimensionId: RatingDimensionId,
    aspectId: string,
    notes: string,
    subDimensionId?: TechnologySubDimensionId
  ) => Promise<void>;
  updateBarriers: (
    dimensionId: RatingDimensionId,
    aspectId: string,
    barriers: string,
    subDimensionId?: TechnologySubDimensionId
  ) => Promise<void>;
  updatePlans: (
    dimensionId: RatingDimensionId,
    aspectId: string,
    plans: string,
    subDimensionId?: TechnologySubDimensionId
  ) => Promise<void>;
  getRating: (
    dimensionId: RatingDimensionId,
    aspectId: string,
    subDimensionId?: TechnologySubDimensionId
  ) => OrbitRating | undefined;
  getRatingsForDimension: (dimensionId: RatingDimensionId) => OrbitRating[];
  getRatingsForSubDimension: (subDimensionId: TechnologySubDimensionId) => OrbitRating[];
  getAssessedCount: () => number;
  getAssessedCountForDimension: (dimensionId: RatingDimensionId) => number;
  isDimensionComplete: (dimensionId: RatingDimensionId, totalAspects: number) => boolean;
  getAverageLevelForDimension: (dimensionId: RatingDimensionId) => number | null;
  getOverallAverageLevel: () => number | null;
}

/**
 * Hook for managing ORBIT ratings within an assessment
 */
export function useOrbitRatings(capabilityAssessmentId: string | undefined): UseOrbitRatingsReturn {
  // Get all ratings for this assessment
  const ratings = useLiveQuery(
    () =>
      capabilityAssessmentId
        ? db.orbitRatings.where('capabilityAssessmentId').equals(capabilityAssessmentId).toArray()
        : [],
    [capabilityAssessmentId]
  );

  /**
   * Save or update a rating for an aspect
   */
  const saveRating = async (params: {
    dimensionId: RatingDimensionId;
    subDimensionId?: TechnologySubDimensionId;
    aspectId: string;
    currentLevel: MaturityLevelWithNA;
    targetLevel?: MaturityLevelWithNA;
    questionResponses?: QuestionResponse[];
    evidenceResponses?: EvidenceResponse[];
    notes?: string;
    barriers?: string;
    plans?: string;
  }): Promise<void> => {
    if (!capabilityAssessmentId) return;

    const {
      dimensionId,
      subDimensionId,
      aspectId,
      currentLevel,
      targetLevel,
      questionResponses = [],
      evidenceResponses = [],
      notes = '',
      barriers = '',
      plans = '',
    } = params;

    const now = new Date();

    // Check if rating exists for this aspect
    const existing = await findExistingRating(
      capabilityAssessmentId,
      dimensionId,
      aspectId,
      subDimensionId
    );

    if (existing) {
      // Update existing rating
      await db.orbitRatings.update(existing.id, {
        currentLevel,
        targetLevel,
        questionResponses,
        evidenceResponses,
        notes,
        barriers,
        plans,
        carriedForward: false,
        updatedAt: now,
      });
    } else {
      // Create new rating
      const rating: OrbitRating = {
        id: uuidv4(),
        capabilityAssessmentId,
        dimensionId,
        subDimensionId,
        aspectId,
        currentLevel,
        targetLevel,
        questionResponses,
        evidenceResponses,
        notes,
        barriers,
        plans,
        carriedForward: false,
        attachmentIds: [],
        updatedAt: now,
      };
      await db.orbitRatings.add(rating);
    }

    // Update assessment timestamp
    await db.capabilityAssessments.update(capabilityAssessmentId, {
      updatedAt: now,
    });
  };

  /**
   * Update just the maturity level for an aspect
   */
  const updateLevel = async (
    dimensionId: RatingDimensionId,
    aspectId: string,
    currentLevel: MaturityLevelWithNA,
    subDimensionId?: TechnologySubDimensionId
  ): Promise<void> => {
    if (!capabilityAssessmentId) return;

    const existing = await findExistingRating(
      capabilityAssessmentId,
      dimensionId,
      aspectId,
      subDimensionId
    );

    const now = new Date();

    if (existing) {
      await db.orbitRatings.update(existing.id, {
        currentLevel,
        carriedForward: false,
        updatedAt: now,
      });
    } else {
      await db.orbitRatings.add({
        id: uuidv4(),
        capabilityAssessmentId,
        dimensionId,
        subDimensionId,
        aspectId,
        currentLevel,
        questionResponses: [],
        evidenceResponses: [],
        notes: '',
        barriers: '',
        plans: '',
        carriedForward: false,
        attachmentIds: [],
        updatedAt: now,
      });
    }

    await db.capabilityAssessments.update(capabilityAssessmentId, {
      updatedAt: now,
    });
  };

  /**
   * Update the target (To Be) maturity level for an aspect
   */
  const updateTargetLevel = async (
    dimensionId: RatingDimensionId,
    aspectId: string,
    targetLevel: MaturityLevelWithNA | undefined,
    subDimensionId?: TechnologySubDimensionId
  ): Promise<void> => {
    if (!capabilityAssessmentId) return;

    const existing = await findExistingRating(
      capabilityAssessmentId,
      dimensionId,
      aspectId,
      subDimensionId
    );

    const now = new Date();

    if (existing) {
      await db.orbitRatings.update(existing.id, {
        targetLevel,
        updatedAt: now,
      });
    } else {
      // Create a new rating with just the target level
      await db.orbitRatings.add({
        id: uuidv4(),
        capabilityAssessmentId,
        dimensionId,
        subDimensionId,
        aspectId,
        currentLevel: 0,
        targetLevel,
        questionResponses: [],
        evidenceResponses: [],
        notes: '',
        barriers: '',
        plans: '',
        carriedForward: false,
        attachmentIds: [],
        updatedAt: now,
      });
    }

    await db.capabilityAssessments.update(capabilityAssessmentId, {
      updatedAt: now,
    });
  };

  /**
   * Update one free-text field on a rating, creating the rating if it does not
   * exist yet.
   *
   * Creating on demand is the point. These three fields were previously dropped
   * silently when no rating row existed (OBS-6), so a user who read the criteria
   * and typed a note *before* choosing a maturity level lost that text — while the
   * indicator still said "Saved". `updateLevel` and `updateTargetLevel` already
   * created rows on demand; this brings text in line with them.
   *
   * A row created here carries `currentLevel: 0`, which every assessed-count
   * filter excludes, so notes cannot inflate progress or scores.
   */
  const updateTextField = async (
    field: 'notes' | 'barriers' | 'plans',
    dimensionId: RatingDimensionId,
    aspectId: string,
    value: string,
    subDimensionId?: TechnologySubDimensionId
  ): Promise<void> => {
    if (!capabilityAssessmentId) return;

    const existing = await findExistingRating(
      capabilityAssessmentId,
      dimensionId,
      aspectId,
      subDimensionId
    );

    // Nothing to record: an empty value with no existing row would only create an
    // entirely blank rating. Not reachable from the UI, but worth not persisting.
    if (!existing && value === '') return;

    const now = new Date();

    if (existing) {
      const patch: Partial<OrbitRating> = { updatedAt: now };
      patch[field] = value;
      await db.orbitRatings.update(existing.id, patch);
    } else {
      const rating: OrbitRating = {
        id: uuidv4(),
        capabilityAssessmentId,
        dimensionId,
        subDimensionId,
        aspectId,
        currentLevel: 0,
        questionResponses: [],
        evidenceResponses: [],
        notes: field === 'notes' ? value : '',
        barriers: field === 'barriers' ? value : '',
        plans: field === 'plans' ? value : '',
        carriedForward: false,
        attachmentIds: [],
        updatedAt: now,
      };
      await db.orbitRatings.add(rating);
    }

    // Keep the assessment timestamp in step with every other write path, so
    // text-only edits still affect the dashboard's recently-updated ordering.
    await db.capabilityAssessments.update(capabilityAssessmentId, { updatedAt: now });
  };

  /**
   * Update notes for an aspect, creating the rating if needed
   */
  const updateNotes = async (
    dimensionId: RatingDimensionId,
    aspectId: string,
    notes: string,
    subDimensionId?: TechnologySubDimensionId
  ): Promise<void> => updateTextField('notes', dimensionId, aspectId, notes, subDimensionId);

  /**
   * Update barriers for an aspect, creating the rating if needed
   */
  const updateBarriers = async (
    dimensionId: RatingDimensionId,
    aspectId: string,
    barriers: string,
    subDimensionId?: TechnologySubDimensionId
  ): Promise<void> => updateTextField('barriers', dimensionId, aspectId, barriers, subDimensionId);

  /**
   * Update advancement plans for an aspect, creating the rating if needed
   */
  const updatePlans = async (
    dimensionId: RatingDimensionId,
    aspectId: string,
    plans: string,
    subDimensionId?: TechnologySubDimensionId
  ): Promise<void> => updateTextField('plans', dimensionId, aspectId, plans, subDimensionId);

  /**
   * Get rating for a specific aspect
   */
  const getRating = (
    dimensionId: RatingDimensionId,
    aspectId: string,
    subDimensionId?: TechnologySubDimensionId
  ): OrbitRating | undefined => {
    return ratings?.find(
      (r) =>
        r.dimensionId === dimensionId &&
        r.aspectId === aspectId &&
        r.subDimensionId === subDimensionId
    );
  };

  /**
   * Get all ratings for a dimension
   */
  const getRatingsForDimension = (dimensionId: RatingDimensionId): OrbitRating[] => {
    return ratings?.filter((r) => r.dimensionId === dimensionId) ?? [];
  };

  /**
   * Get all ratings for a Technology sub-dimension
   */
  const getRatingsForSubDimension = (subDimensionId: TechnologySubDimensionId): OrbitRating[] => {
    return (
      ratings?.filter(
        (r) => r.dimensionId === 'technology' && r.subDimensionId === subDimensionId
      ) ?? []
    );
  };

  /**
   * Get count of assessed aspects (level > 0)
   */
  const getAssessedCount = (): number => {
    return ratings?.filter((r) => r.currentLevel > 0 || r.currentLevel === -1).length ?? 0;
  };

  /**
   * Get count of assessed aspects for a dimension
   */
  const getAssessedCountForDimension = (dimensionId: RatingDimensionId): number => {
    return (
      ratings?.filter(
        (r) => r.dimensionId === dimensionId && (r.currentLevel > 0 || r.currentLevel === -1)
      ).length ?? 0
    );
  };

  /**
   * Check if all aspects in a dimension are assessed
   */
  const isDimensionComplete = (dimensionId: RatingDimensionId, totalAspects: number): boolean => {
    return getAssessedCountForDimension(dimensionId) >= totalAspects;
  };

  /**
   * Calculate average level for a dimension (excluding N/A and not assessed).
   *
   * Delegates to the canonical scorer rather than flat-averaging the dimension's
   * ratings. For every dimension but Technology the two are the same; for Technology
   * a flat mean over all 11 aspects weights the 6-aspect Infrastructure
   * sub-dimension above the 5-aspect Application one, which is the OBS-25 defect.
   *
   * No caller reaches this with `'technology'` today — `buildStandardNavItems` emits
   * Technology either per-sub-dimension or as a rollup handled earlier — so this is
   * closing a latent path, not fixing a visible number. It is worth closing because
   * the rule is meant to live in exactly one place, and this was a fourth copy of it
   * one nav-item shape away from going live.
   */
  const getAverageLevelForDimension = (dimensionId: RatingDimensionId): number | null => {
    return calculateDimensionScore(dimensionId, getRatingsForDimension(dimensionId));
  };

  /**
   * Calculate overall average level (excluding N/A and not assessed)
   */
  const getOverallAverageLevel = (): number | null => {
    const assessed = ratings?.filter((r) => r.currentLevel > 0) ?? [];
    if (assessed.length === 0) return null;
    return calculateAverageScore(assessed.map((r) => r.currentLevel));
  };

  return {
    ratings: ratings ?? [],
    saveRating,
    updateLevel,
    updateTargetLevel,
    updateNotes,
    updateBarriers,
    updatePlans,
    getRating,
    getRatingsForDimension,
    getRatingsForSubDimension,
    getAssessedCount,
    getAssessedCountForDimension,
    isDimensionComplete,
    getAverageLevelForDimension,
    getOverallAverageLevel,
  };
}

/**
 * Find existing rating for an aspect
 */
async function findExistingRating(
  capabilityAssessmentId: string,
  dimensionId: RatingDimensionId,
  aspectId: string,
  subDimensionId?: TechnologySubDimensionId
): Promise<OrbitRating | undefined> {
  if (subDimensionId) {
    return db.orbitRatings
      .where('[capabilityAssessmentId+dimensionId+subDimensionId+aspectId]')
      .equals([capabilityAssessmentId, dimensionId, subDimensionId, aspectId])
      .first();
  }

  // For non-Technology dimensions, use the simpler compound index
  const ratings = await db.orbitRatings
    .where('[capabilityAssessmentId+dimensionId+aspectId]')
    .equals([capabilityAssessmentId, dimensionId, aspectId])
    .toArray();

  return ratings.find((r) => !r.subDimensionId);
}
