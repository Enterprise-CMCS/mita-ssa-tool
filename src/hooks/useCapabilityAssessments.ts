/**
 * Hook for managing capability assessments
 *
 * Provides CRUD operations and reactive queries for capability assessments.
 * Each capability area has at most one active assessment (in_progress or finalized).
 */

import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../services/db';
import { getAreaWithDomain } from '../services/capabilities';
import { createHistorySnapshot as createSnapshot } from '../services/history';
import { incrementTagUsage } from '../services/tags';
import { calculateDimensionScore } from '../services/scoring';
import { isEnterpriseDomain, getAggregatedDimensionForDomain } from '../services/orbit';
import { getOrganizationalSections } from '../constants';
import type {
  CapabilityAssessment,
  AssessmentStatus,
  OrbitDimensionId,
  RatingDimensionId,
  AggregateSnapshotData,
} from '../types';

/**
 * Return type for useCapabilityAssessments hook
 */
export interface UseCapabilityAssessmentsReturn {
  assessments: CapabilityAssessment[];
  startAssessment: (capabilityAreaId: string, initialTags?: string[]) => Promise<string>;
  editAssessment: (assessmentId: string) => Promise<void>;
  finalizeAssessment: (assessmentId: string) => Promise<void>;
  updateTags: (assessmentId: string, tags: string[]) => Promise<void>;
  deleteAssessment: (assessmentId: string) => Promise<void>;
  revertEdit: (assessmentId: string) => Promise<void>;
  getAssessmentForArea: (capabilityAreaId: string) => CapabilityAssessment | undefined;
  getStatusForArea: (capabilityAreaId: string) => 'not_started' | AssessmentStatus;
  getAssessmentsByStatus: (status: AssessmentStatus) => CapabilityAssessment[];
  getAssessmentsByTag: (tag: string) => CapabilityAssessment[];
  getStatusCounts: (totalAreas?: number) => {
    notStarted: number;
    inProgress: number;
    finalized: number;
  };
}

/**
 * Hook for managing capability assessments
 */
export function useCapabilityAssessments(): UseCapabilityAssessmentsReturn {
  // Get all capability assessments, ordered by most recently updated
  const assessments = useLiveQuery(
    () => db.capabilityAssessments.orderBy('updatedAt').reverse().toArray(),
    []
  );

  /**
   * Start a new assessment for a capability area
   * @param capabilityAreaId - The capability area to assess
   * @param initialTags - Optional initial tags
   * @returns The new assessment ID
   */
  const startAssessment = async (
    capabilityAreaId: string,
    initialTags: string[] = []
  ): Promise<string> => {
    const areaInfo = getAreaWithDomain(capabilityAreaId);
    if (!areaInfo) {
      throw new Error(`Capability area not found: ${capabilityAreaId}`);
    }

    const { area, domain } = areaInfo;
    const now = new Date();
    const assessmentId = uuidv4();

    const assessment: CapabilityAssessment = {
      id: assessmentId,
      capabilityDomainId: domain.id,
      capabilityDomainName: domain.name,
      capabilityAreaId: area.id,
      capabilityAreaName: area.name,
      status: 'in_progress',
      tags: initialTags,
      createdAt: now,
      updatedAt: now,
    };

    await db.capabilityAssessments.add(assessment);

    // Update tag usage via shared service
    for (const tag of initialTags) {
      await incrementTagUsage(tag);
    }

    return assessmentId;
  };

  /**
   * Edit an existing finalized assessment
   * Creates a history snapshot and converts to in_progress
   */
  const editAssessment = async (assessmentId: string): Promise<void> => {
    const assessment = await db.capabilityAssessments.get(assessmentId);
    if (!assessment) {
      throw new Error(`Assessment not found: ${assessmentId}`);
    }

    if (assessment.status !== 'finalized') {
      return; // Already in progress
    }

    // Create history snapshot before editing
    const ratings = await db.orbitRatings
      .where('capabilityAssessmentId')
      .equals(assessmentId)
      .toArray();

    if (assessment.overallScore !== undefined) {
      // Check if this is an enterprise domain - capture aggregate data for snapshot
      let aggregateData: AggregateSnapshotData | undefined;
      const aggregatedDimension = getAggregatedDimensionForDomain(assessment.capabilityDomainId);

      if (aggregatedDimension) {
        const aggregateResult =
          await calculateAggregateDimensionScoreForFinalization(aggregatedDimension);
        aggregateData = {
          dimensionId: aggregatedDimension,
          score: aggregateResult.score,
          contributingCount: aggregateResult.contributingCount,
          contributingAssessmentIds: aggregateResult.assessmentIds,
        };
      }

      const snapshot = createSnapshot(assessment, ratings, assessment.overallScore, aggregateData);
      await db.assessmentHistory.add(snapshot);
    }

    // Convert ratings to carry-forward mode (set previousLevel)
    const now = new Date();
    for (const rating of ratings) {
      if (rating.currentLevel !== 0) {
        await db.orbitRatings.update(rating.id, {
          previousLevel: rating.currentLevel,
          carriedForward: true,
          updatedAt: now,
        });
      }
    }

    // Update assessment status
    await db.capabilityAssessments.update(assessmentId, {
      status: 'in_progress',
      updatedAt: now,
    });
  };

  /**
   * Finalize an assessment
   * Calculates scores and marks as finalized
   * For enterprise domains, includes aggregate dimension score in overall calculation
   */
  const finalizeAssessment = async (assessmentId: string): Promise<void> => {
    const assessment = await db.capabilityAssessments.get(assessmentId);
    if (!assessment) {
      throw new Error(`Assessment not found: ${assessmentId}`);
    }

    // Calculate overall score from ratings
    const ratings = await db.orbitRatings
      .where('capabilityAssessmentId')
      .equals(assessmentId)
      .toArray();

    // Check if this is the combined organizational assessment
    const sections = getOrganizationalSections(assessment.capabilityAreaId);

    let overallScore: number | undefined;

    if (sections) {
      // Combined organizational assessment: average of section averages.
      // Each section (Outcomes, Roles, Enterprise Architecture) scores as the
      // mean of its assessed aspects; sections with no assessed aspects are
      // excluded (mirrors how B-I-T averages only dimensions with scores).
      const sectionScores: number[] = [];
      for (const section of sections) {
        const assessedRatings = ratings.filter(
          (r) => r.dimensionId === section && r.currentLevel > 0
        );
        if (assessedRatings.length > 0) {
          const sectionAvg =
            assessedRatings.reduce((sum, r) => sum + r.currentLevel, 0) / assessedRatings.length;
          sectionScores.push(sectionAvg);
        }
      }
      if (sectionScores.length > 0) {
        const avg = sectionScores.reduce((sum, s) => sum + s, 0) / sectionScores.length;
        overallScore = Math.round(avg * 10) / 10;
      }
    } else {
      // Standard assessments: average of dimension scores (B-I-T)

      // Check if this is an enterprise domain with an aggregate dimension
      const aggregatedDimension = getAggregatedDimensionForDomain(assessment.capabilityDomainId);
      let aggregateScore: number | null = null;

      if (aggregatedDimension) {
        const aggregateResult =
          await calculateAggregateDimensionScoreForFinalization(aggregatedDimension);
        aggregateScore = aggregateResult.score;
      }

      // Calculate dimension scores from manual ratings
      const dimensionScores = calculateDimensionScoresFromRatings(ratings);

      // For enterprise domains, add the aggregate score to dimension scores
      if (aggregatedDimension && aggregateScore !== null) {
        dimensionScores.set(aggregatedDimension, aggregateScore);
      }

      // Calculate overall score as average of all dimension scores
      const allDimensionScores = Array.from(dimensionScores.values());
      if (allDimensionScores.length > 0) {
        const avg = allDimensionScores.reduce((sum, s) => sum + s, 0) / allDimensionScores.length;
        overallScore = Math.round(avg * 10) / 10;
      }
    }

    const now = new Date();

    await db.capabilityAssessments.update(assessmentId, {
      status: 'finalized',
      finalizedAt: now,
      updatedAt: now,
      overallScore: overallScore ? Math.round(overallScore * 10) / 10 : undefined,
    });

    // Update tag usage via shared service
    for (const tag of assessment.tags) {
      await incrementTagUsage(tag);
    }
  };

  /**
   * Calculate dimension scores from ratings.
   * Groups by dimension and uses the shared calculateDimensionScore function.
   * Filters out organizational assessment ratings (all three sections).
   */
  function calculateDimensionScoresFromRatings(
    ratings: { dimensionId: RatingDimensionId; subDimensionId?: string; currentLevel: number }[]
  ): Map<OrbitDimensionId, number> {
    const dimensionScores = new Map<OrbitDimensionId, number>();

    // Filter to only B-I-T dimensions (exclude organizational assessments)
    const standardRatings = ratings.filter(
      (r): r is typeof r & { dimensionId: OrbitDimensionId } =>
        r.dimensionId === 'businessArchitecture' ||
        r.dimensionId === 'information' ||
        r.dimensionId === 'technology'
    );

    // Group ratings by dimension
    const ratingsByDimension = new Map<OrbitDimensionId, typeof standardRatings>();
    for (const rating of standardRatings) {
      const existing = ratingsByDimension.get(rating.dimensionId) ?? [];
      existing.push(rating);
      ratingsByDimension.set(rating.dimensionId, existing);
    }

    // Calculate scores for each dimension using shared function
    for (const [dimId, dimRatings] of ratingsByDimension) {
      const score = calculateDimensionScore(dimId, dimRatings);
      if (score !== null) {
        dimensionScores.set(dimId, score);
      }
    }

    return dimensionScores;
  }

  /**
   * Calculate aggregate dimension score for finalization.
   * Used when finalizing enterprise domain assessments.
   */
  async function calculateAggregateDimensionScoreForFinalization(
    dimensionId: OrbitDimensionId
  ): Promise<{ score: number | null; contributingCount: number; assessmentIds: string[] }> {
    // Get all finalized assessments from non-enterprise domains
    const allAssessments = await db.capabilityAssessments.toArray();
    const qualifyingAssessments = allAssessments.filter(
      (a) => a.status === 'finalized' && !isEnterpriseDomain(a.capabilityDomainId)
    );

    if (qualifyingAssessments.length === 0) {
      return { score: null, contributingCount: 0, assessmentIds: [] };
    }

    // Get all ratings for qualifying assessments
    const assessmentIds = qualifyingAssessments.map((a) => a.id);
    const allRatings = await db.orbitRatings
      .where('capabilityAssessmentId')
      .anyOf(assessmentIds)
      .toArray();

    // Group ratings by assessment
    const ratingsByAssessment = new Map<string, typeof allRatings>();
    for (const rating of allRatings) {
      const existing = ratingsByAssessment.get(rating.capabilityAssessmentId) ?? [];
      existing.push(rating);
      ratingsByAssessment.set(rating.capabilityAssessmentId, existing);
    }

    // Calculate dimension score for each qualifying assessment
    const scoresWithIds: { id: string; score: number }[] = [];

    for (const assessment of qualifyingAssessments) {
      const ratings = ratingsByAssessment.get(assessment.id) ?? [];
      const dimRatings = ratings.filter((r) => r.dimensionId === dimensionId);

      const dimScore = calculateDimensionScore(dimensionId, dimRatings);
      if (dimScore !== null) {
        scoresWithIds.push({ id: assessment.id, score: dimScore });
      }
    }

    if (scoresWithIds.length === 0) {
      return { score: null, contributingCount: 0, assessmentIds: [] };
    }

    const avgScore = scoresWithIds.reduce((sum, s) => sum + s.score, 0) / scoresWithIds.length;
    return {
      score: Math.round(avgScore * 10) / 10,
      contributingCount: scoresWithIds.length,
      assessmentIds: scoresWithIds.map((s) => s.id),
    };
  }

  /**
   * Update tags on an assessment
   */
  const updateTags = async (assessmentId: string, tags: string[]): Promise<void> => {
    await db.capabilityAssessments.update(assessmentId, {
      tags,
      updatedAt: new Date(),
    });

    // Update tag usage via shared service
    for (const tag of tags) {
      await incrementTagUsage(tag);
    }
  };

  /**
   * Delete an assessment and all related data
   */
  const deleteAssessment = async (assessmentId: string): Promise<void> => {
    await db.transaction(
      'rw',
      [db.capabilityAssessments, db.orbitRatings, db.attachments],
      async () => {
        // Delete attachments
        await db.attachments.where('capabilityAssessmentId').equals(assessmentId).delete();
        // Delete ratings
        await db.orbitRatings.where('capabilityAssessmentId').equals(assessmentId).delete();
        // Delete assessment
        await db.capabilityAssessments.delete(assessmentId);
      }
    );
  };

  /**
   * Revert an edit session, restoring from history
   */
  const revertEdit = async (assessmentId: string): Promise<void> => {
    const assessment = await db.capabilityAssessments.get(assessmentId);
    if (!assessment) {
      throw new Error(`Assessment not found: ${assessmentId}`);
    }

    // Get most recent history entry
    const latestHistory = await db.assessmentHistory
      .where('capabilityAssessmentId')
      .equals(assessmentId)
      .reverse()
      .sortBy('snapshotDate')
      .then((entries) => entries[0]);

    if (!latestHistory) {
      // No history - just set back to finalized if it was
      await db.capabilityAssessments.update(assessmentId, {
        status: 'finalized',
        updatedAt: new Date(),
      });
      return;
    }

    await db.transaction(
      'rw',
      [db.capabilityAssessments, db.orbitRatings, db.assessmentHistory],
      async () => {
        // Delete current ratings
        await db.orbitRatings.where('capabilityAssessmentId').equals(assessmentId).delete();

        // Restore ratings from history
        const now = new Date();
        for (const hr of latestHistory.ratings) {
          await db.orbitRatings.add({
            id: uuidv4(),
            capabilityAssessmentId: assessmentId,
            dimensionId: hr.dimensionId,
            subDimensionId: hr.subDimensionId,
            aspectId: hr.aspectId,
            currentLevel: hr.currentLevel,
            questionResponses: hr.questionResponses,
            evidenceResponses: hr.evidenceResponses,
            notes: hr.notes,
            barriers: hr.barriers,
            plans: hr.plans,
            carriedForward: false,
            attachmentIds: [],
            updatedAt: now,
          });
        }

        // Restore assessment state
        await db.capabilityAssessments.update(assessmentId, {
          status: 'finalized',
          tags: latestHistory.tags,
          overallScore: latestHistory.overallScore,
          finalizedAt: latestHistory.snapshotDate,
          updatedAt: now,
        });

        // Remove the history entry we restored from
        await db.assessmentHistory.delete(latestHistory.id);
      }
    );
  };

  /**
   * Get assessment for a specific capability area
   */
  const getAssessmentForArea = (capabilityAreaId: string): CapabilityAssessment | undefined => {
    return assessments?.find((a) => a.capabilityAreaId === capabilityAreaId);
  };

  /**
   * Get assessment status for a capability area
   */
  const getStatusForArea = (capabilityAreaId: string): 'not_started' | AssessmentStatus => {
    const assessment = getAssessmentForArea(capabilityAreaId);
    return assessment?.status ?? 'not_started';
  };

  /**
   * Get assessments by status
   */
  const getAssessmentsByStatus = (status: AssessmentStatus): CapabilityAssessment[] => {
    return assessments?.filter((a) => a.status === status) ?? [];
  };

  /**
   * Get assessments by tag
   */
  const getAssessmentsByTag = (tag: string): CapabilityAssessment[] => {
    return assessments?.filter((a) => a.tags.includes(tag)) ?? [];
  };

  /**
   * Get assessment counts by status.
   * Note: notStarted requires knowing total capability areas, which is passed as a parameter.
   * @param totalAreas - Total number of capability areas (optional, defaults to 0 for notStarted)
   */
  const getStatusCounts = (
    totalAreas?: number
  ): {
    notStarted: number;
    inProgress: number;
    finalized: number;
  } => {
    const inProgress = assessments?.filter((a) => a.status === 'in_progress').length ?? 0;
    const finalized = assessments?.filter((a) => a.status === 'finalized').length ?? 0;
    const notStarted = totalAreas !== undefined ? totalAreas - inProgress - finalized : 0;
    return { notStarted: Math.max(0, notStarted), inProgress, finalized };
  };

  return {
    assessments: assessments ?? [],
    startAssessment,
    editAssessment,
    finalizeAssessment,
    updateTags,
    deleteAssessment,
    revertEdit,
    getAssessmentForArea,
    getStatusForArea,
    getAssessmentsByStatus,
    getAssessmentsByTag,
    getStatusCounts,
  };
}

/**
 * Return type for useCapabilityAssessment hook
 */
export interface UseCapabilityAssessmentReturn {
  assessment: CapabilityAssessment | undefined;
}

/**
 * Hook for a single capability assessment
 */
export function useCapabilityAssessment(
  assessmentId: string | undefined
): UseCapabilityAssessmentReturn {
  const assessment = useLiveQuery(
    () => (assessmentId ? db.capabilityAssessments.get(assessmentId) : undefined),
    [assessmentId]
  );

  return { assessment };
}
