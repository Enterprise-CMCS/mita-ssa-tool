/**
 * Hook for accessing and calculating maturity scores
 *
 * Provides score calculations at aspect, dimension, capability area, and domain levels.
 * Scores are simple averages (no weighting) as per PROJECT_FOUNDATION.md.
 */

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import { getTotalAreaCount, getAreasByDomainId, getAreaWithDomain } from '../services/capabilities';
import { calculateAverageScore, calculateDimensionScore } from '../services/scoring';
import {
  getAllDimensionIds,
  getAssessableAspectCountForArea,
  getTechnologySubDimensions,
  getAspectsForDimension,
  getAspectsForSubDimension,
  isEnterpriseDomain,
  getOrganizationalAspects,
  getOrganizationalAssessment,
} from '../services/orbit';
import { getOrganizationalSections } from '../constants';
import type { OrbitRating, OrbitDimensionId, DimensionScore, SubDimensionScore } from '../types';

/**
 * Score data for a capability area
 */
export interface CapabilityScoreData {
  capabilityAreaId: string;
  capabilityDomainId: string;
  score: number | null;
  assessmentId: string | null;
  assessmentDate: Date | null;
  tags: string[];
  status: 'not_started' | 'in_progress' | 'finalized';
  completionPercentage: number;
}

/**
 * Aggregate dimension score details
 */
export interface AggregateDimensionScore {
  score: number | null;
  contributingCount: number;
  assessmentIds: string[];
  breakdown: Array<{
    assessmentId: string;
    capabilityAreaId: string;
    capabilityAreaName: string;
    capabilityDomainId: string;
    capabilityDomainName: string;
    dimensionScore: number;
  }>;
}

/**
 * Return type for useScores hook
 */
export interface UseScoresReturn {
  scoresByArea: Map<string, CapabilityScoreData>;
  getCapabilityScoreData: (capabilityAreaId: string) => CapabilityScoreData | undefined;
  getCapabilityScore: (capabilityAreaId: string) => number | null;
  getDomainScore: (domainId: string) => number | null;
  getOverallScore: () => number | null;
  getCapabilityStatus: (capabilityAreaId: string) => 'not_started' | 'in_progress' | 'finalized';
  getCapabilityCompletion: (capabilityAreaId: string) => number;
  getCapabilityTags: (capabilityAreaId: string) => string[];
  getAllTagsInUse: () => string[];
  getCapabilitiesByTag: (tag: string) => string[];
  getDomainTags: (domainId: string) => string[];
  getStatusCounts: () => {
    notStarted: number;
    inProgress: number;
    finalized: number;
    total: number;
  };
  getDomainStatusCounts: (domainId: string) => {
    notStarted: number;
    inProgress: number;
    finalized: number;
    total: number;
  };
  getDimensionScoresForAssessment: (assessmentId: string) => DimensionScore[] | undefined;
  getOrganizationalScoresForAssessment: (
    assessmentId: string,
    areaId: string
  ) => DimensionScore[] | undefined;
  getAggregateDimensionScore: (dimensionId: OrbitDimensionId) => AggregateDimensionScore;
}

/**
 * Hook for accessing maturity scores
 */
export function useScores(): UseScoresReturn {
  // Get all assessments and ratings
  const data = useLiveQuery(async () => {
    const assessments = await db.capabilityAssessments.toArray();
    const ratings = await db.orbitRatings.toArray();

    // Group ratings by assessment
    const ratingsByAssessment = new Map<string, OrbitRating[]>();
    for (const rating of ratings) {
      const existing = ratingsByAssessment.get(rating.capabilityAssessmentId) ?? [];
      existing.push(rating);
      ratingsByAssessment.set(rating.capabilityAssessmentId, existing);
    }

    // Build score data for each capability area
    const scoresByArea = new Map<string, CapabilityScoreData>();

    for (const assessment of assessments) {
      const assessmentRatings = ratingsByAssessment.get(assessment.id) ?? [];
      const assessedCount = assessmentRatings.filter(
        (r) => r.currentLevel > 0 || r.currentLevel === -1
      ).length;

      // Per-area denominator: 26 standard, 15 organizational, and standard
      // minus the aggregated dimension for enterprise-domain areas
      const totalAspects = getAssessableAspectCountForArea(
        assessment.capabilityAreaId,
        assessment.capabilityDomainId
      );

      scoresByArea.set(assessment.capabilityAreaId, {
        capabilityAreaId: assessment.capabilityAreaId,
        capabilityDomainId: assessment.capabilityDomainId,
        score: assessment.overallScore ?? null,
        assessmentId: assessment.id,
        assessmentDate: assessment.finalizedAt ?? assessment.updatedAt,
        tags: assessment.tags,
        status: assessment.status,
        completionPercentage:
          totalAspects > 0 ? Math.round((assessedCount / totalAspects) * 100) : 0,
      });
    }

    return { assessments, ratingsByAssessment, scoresByArea };
  }, []);

  /**
   * Get score data for a specific capability area
   */
  const getCapabilityScoreData = (capabilityAreaId: string): CapabilityScoreData | undefined => {
    return data?.scoresByArea.get(capabilityAreaId);
  };

  /**
   * Get just the score for a capability area
   */
  const getCapabilityScore = (capabilityAreaId: string): number | null => {
    return data?.scoresByArea.get(capabilityAreaId)?.score ?? null;
  };

  /**
   * Get average score for a domain (from finalized assessments only)
   */
  const getDomainScore = (domainId: string): number | null => {
    if (!data) return null;

    const domainScores: number[] = [];
    for (const scoreData of data.scoresByArea.values()) {
      if (
        scoreData.capabilityDomainId === domainId &&
        scoreData.status === 'finalized' &&
        scoreData.score !== null
      ) {
        domainScores.push(scoreData.score);
      }
    }

    return calculateAverageScore(domainScores);
  };

  /**
   * Get overall average score across all finalized assessments
   */
  const getOverallScore = (): number | null => {
    if (!data) return null;

    const scores: number[] = [];
    for (const scoreData of data.scoresByArea.values()) {
      if (scoreData.status === 'finalized' && scoreData.score !== null) {
        scores.push(scoreData.score);
      }
    }

    return calculateAverageScore(scores);
  };

  /**
   * Get status for a capability area
   */
  const getCapabilityStatus = (
    capabilityAreaId: string
  ): 'not_started' | 'in_progress' | 'finalized' => {
    return data?.scoresByArea.get(capabilityAreaId)?.status ?? 'not_started';
  };

  /**
   * Get completion percentage for a capability area
   */
  const getCapabilityCompletion = (capabilityAreaId: string): number => {
    return data?.scoresByArea.get(capabilityAreaId)?.completionPercentage ?? 0;
  };

  /**
   * Get tags for a capability area (from finalized assessment)
   */
  const getCapabilityTags = (capabilityAreaId: string): string[] => {
    const scoreData = data?.scoresByArea.get(capabilityAreaId);
    if (scoreData?.status === 'finalized') {
      return scoreData.tags;
    }
    return [];
  };

  /**
   * Get all unique tags in use across finalized assessments
   */
  const getAllTagsInUse = (): string[] => {
    if (!data) return [];

    const tagSet = new Set<string>();
    for (const scoreData of data.scoresByArea.values()) {
      if (scoreData.status === 'finalized') {
        for (const tag of scoreData.tags) {
          tagSet.add(tag);
        }
      }
    }

    return Array.from(tagSet).sort();
  };

  /**
   * Get capability areas that have a specific tag
   */
  const getCapabilitiesByTag = (tag: string): string[] => {
    if (!data) return [];

    const capabilities: string[] = [];
    for (const [areaId, scoreData] of data.scoresByArea) {
      if (scoreData.status === 'finalized' && scoreData.tags.includes(tag)) {
        capabilities.push(areaId);
      }
    }

    return capabilities;
  };

  /**
   * Get aggregated tags for a domain (unique tags from all finalized capability areas)
   */
  const getDomainTags = (domainId: string): string[] => {
    if (!data) return [];

    const tagSet = new Set<string>();
    for (const scoreData of data.scoresByArea.values()) {
      if (scoreData.capabilityDomainId === domainId && scoreData.status === 'finalized') {
        for (const tag of scoreData.tags) {
          tagSet.add(tag);
        }
      }
    }

    return Array.from(tagSet).sort();
  };

  /**
   * Get assessment counts by status
   */
  const getStatusCounts = (): {
    notStarted: number;
    inProgress: number;
    finalized: number;
    total: number;
  } => {
    const total = getTotalAreaCount();
    const inProgress = data?.assessments.filter((a) => a.status === 'in_progress').length ?? 0;
    const finalized = data?.assessments.filter((a) => a.status === 'finalized').length ?? 0;
    const notStarted = total - inProgress - finalized;

    return { notStarted, inProgress, finalized, total };
  };

  /**
   * Get domain-level status counts
   */
  const getDomainStatusCounts = (
    domainId: string
  ): {
    notStarted: number;
    inProgress: number;
    finalized: number;
    total: number;
  } => {
    const areas = getAreasByDomainId(domainId);
    if (areas.length === 0) return { notStarted: 0, inProgress: 0, finalized: 0, total: 0 };

    const total = areas.length;
    let inProgress = 0;
    let finalized = 0;

    for (const area of areas) {
      const status = getCapabilityStatus(area.id);
      if (status === 'in_progress') inProgress++;
      else if (status === 'finalized') finalized++;
    }

    return { notStarted: total - inProgress - finalized, inProgress, finalized, total };
  };

  /**
   * Get dimension scores for an assessment.
   *
   * Dimension roll-ups delegate to `calculateDimensionScore`, which is the
   * canonical scorer: `finalizeAssessment` builds `overallScore` from it, and
   * the aggregate calculations use it too. For Technology it averages the two
   * sub-dimension means at full precision.
   *
   * The per-sub-dimension `averageLevel` values are rounded for display and must
   * not be fed back into the dimension roll-up. Rounding twice made this function
   * disagree with the canonical scorer by 0.1 — Infrastructure 2,2,2,2,1,1 plus
   * Application 1,1,1,1,1 reported 1.4 here against 1.3 from finalize. Display
   * rounds; scoring does not.
   *
   * Aspect scores are built from the ORBIT model rather than from ratings, so
   * unassessed aspects appear at level 0 and ratings orphaned by a model change
   * are excluded from both the listing and the score. `finalizeAssessment` feeds
   * raw ratings instead, so the two can still differ if orphaned ratings exist.
   *
   * PDF and CSV export now delegate to the same canonical scorer — not to this
   * function — so the Technology weighting agrees everywhere it is reported
   * (OBS-25, fixed in Wave 5). The model-versus-ratings caveat in the paragraph
   * above still applies: orphaned ratings can still make this function and the
   * export paths differ, because they are fed different inputs.
   */
  const getDimensionScoresForAssessment = (assessmentId: string): DimensionScore[] | undefined => {
    if (!data) return undefined;

    const ratings = data.ratingsByAssessment.get(assessmentId);
    if (!ratings) return undefined;

    const techSubDims = getTechnologySubDimensions();

    return getAllDimensionIds().map((dimId) => {
      const dimRatings = ratings.filter((r) => r.dimensionId === dimId);

      // Get all aspects from ORBIT model for this dimension
      const orbitAspects = getAspectsForDimension(dimId);

      // Build aspect scores from ORBIT model, checking if each has a rating
      const aspectScores = orbitAspects.map((aspect) => {
        const rating = dimRatings.find((r) => r.aspectId === aspect.id);
        return {
          aspectId: aspect.id,
          aspectName: aspect.name,
          dimensionId: dimId,
          subDimensionId: rating?.subDimensionId,
          currentLevel: rating?.currentLevel ?? 0,
          isAssessed: rating ? rating.currentLevel !== 0 : false,
        };
      });

      let avgLevel: number | null = null;
      let subDimensionScores: SubDimensionScore[] | undefined;

      if (dimId === 'technology') {
        // For Technology: calculate each sub-dimension average, then average those
        subDimensionScores = techSubDims.map((subDim) => {
          // Get all aspects from ORBIT model for this sub-dimension
          const subDimOrbitAspects = getAspectsForSubDimension(subDim.id);
          const subDimRatings = dimRatings.filter((r) => r.subDimensionId === subDim.id);

          // Build aspect scores from ORBIT model
          const subDimAspectScores = subDimOrbitAspects.map((aspect) => {
            const rating = subDimRatings.find((r) => r.aspectId === aspect.id);
            return {
              aspectId: aspect.id,
              aspectName: aspect.name,
              dimensionId: dimId,
              subDimensionId: subDim.id,
              currentLevel: rating?.currentLevel ?? 0,
              isAssessed: rating ? rating.currentLevel !== 0 : false,
            };
          });

          const assessed = subDimAspectScores.filter((a) => a.currentLevel > 0);
          const subAvg = calculateAverageScore(assessed.map((a) => a.currentLevel));

          return {
            subDimensionId: subDim.id,
            subDimensionName: subDim.name,
            averageLevel: subAvg,
            aspectScores: subDimAspectScores,
          };
        });

        // Delegate to the canonical scorer, feeding it the model-matched aspect
        // levels tagged with their sub-dimension. It averages the sub-dimension
        // means at full precision, unlike the rounded values displayed above.
        avgLevel = calculateDimensionScore(
          dimId,
          subDimensionScores.flatMap((sub) =>
            sub.aspectScores
              .filter((a) => a.currentLevel > 0)
              .map((a) => ({
                currentLevel: a.currentLevel,
                subDimensionId: sub.subDimensionId,
              }))
          )
        );
      } else {
        avgLevel = calculateDimensionScore(
          dimId,
          aspectScores
            .filter((a) => a.currentLevel > 0)
            .map((a) => ({ currentLevel: a.currentLevel }))
        );
      }

      return {
        dimensionId: dimId,
        dimensionName: getDimensionDisplayName(dimId),
        required: isDimensionRequired(dimId),
        averageLevel: avgLevel,
        aspectScores,
        subDimensionScores,
      };
    });
  };

  /**
   * Calculate aggregate score for a dimension across all qualifying finalized assessments.
   * Used for enterprise domains (Data Management, Technology Management).
   * Excludes enterprise domains from the calculation to prevent circular dependencies.
   *
   * @param dimensionId - The dimension to aggregate (e.g., 'information' or 'technology')
   * @returns Aggregate score details including breakdown by contributing assessment
   */
  const getAggregateDimensionScore = (dimensionId: OrbitDimensionId): AggregateDimensionScore => {
    if (!data) {
      return { score: null, contributingCount: 0, assessmentIds: [], breakdown: [] };
    }

    // Filter to finalized, non-enterprise domain assessments
    const qualifyingAssessments = data.assessments.filter(
      (a) => a.status === 'finalized' && !isEnterpriseDomain(a.capabilityDomainId)
    );

    const breakdown: AggregateDimensionScore['breakdown'] = [];

    for (const assessment of qualifyingAssessments) {
      const ratings = data.ratingsByAssessment.get(assessment.id) ?? [];
      const dimRatings = ratings.filter((r) => r.dimensionId === dimensionId);

      // Calculate dimension score using shared function
      const dimScore = calculateDimensionScore(dimensionId, dimRatings);

      if (dimScore !== null) {
        // Get area info for breakdown
        const areaInfo = getAreaWithDomain(assessment.capabilityAreaId);
        breakdown.push({
          assessmentId: assessment.id,
          capabilityAreaId: assessment.capabilityAreaId,
          capabilityAreaName: areaInfo?.area.name ?? assessment.capabilityAreaName,
          capabilityDomainId: assessment.capabilityDomainId,
          capabilityDomainName: areaInfo?.domain.name ?? assessment.capabilityDomainName,
          dimensionScore: dimScore,
        });
      }
    }

    if (breakdown.length === 0) {
      return { score: null, contributingCount: 0, assessmentIds: [], breakdown: [] };
    }

    const avgScore =
      Math.round(
        (breakdown.reduce((sum, b) => sum + b.dimensionScore, 0) / breakdown.length) * 10
      ) / 10;

    return {
      score: avgScore,
      contributingCount: breakdown.length,
      assessmentIds: breakdown.map((b) => b.assessmentId),
      breakdown,
    };
  };

  /**
   * Get section scores for the combined organizational assessment.
   * Returns one "dimension" score per section (Outcomes, Roles,
   * Enterprise Architecture), in display order.
   */
  const getOrganizationalScoresForAssessment = (
    assessmentId: string,
    areaId: string
  ): DimensionScore[] | undefined => {
    if (!data) return undefined;

    const ratings = data.ratingsByAssessment.get(assessmentId);
    if (!ratings) return undefined;

    // Get the organizational assessment sections for this area
    const sections = getOrganizationalSections(areaId);
    if (!sections) return undefined;

    return sections.map((section) => {
      const orgAssessment = getOrganizationalAssessment(section);
      const orgAspects = getOrganizationalAspects(section);

      // Filter ratings to only those for this section
      const sectionRatings = ratings.filter((r) => r.dimensionId === section);

      // Build aspect scores
      const aspectScores = orgAspects.map((aspect) => {
        const rating = sectionRatings.find((r) => r.aspectId === aspect.id);
        return {
          aspectId: aspect.id,
          aspectName: aspect.name,
          dimensionId: section,
          subDimensionId: undefined,
          currentLevel: rating?.currentLevel ?? 0,
          isAssessed: rating ? rating.currentLevel !== 0 : false,
        };
      });

      // Calculate section average
      const assessed = aspectScores.filter((a) => a.currentLevel > 0);
      const avgLevel = calculateAverageScore(assessed.map((a) => a.currentLevel));

      return {
        dimensionId: section,
        dimensionName: orgAssessment.name,
        required: true,
        averageLevel: avgLevel,
        aspectScores,
        subDimensionScores: undefined,
      };
    });
  };

  return {
    scoresByArea: data?.scoresByArea ?? new Map(),
    getCapabilityScoreData,
    getCapabilityScore,
    getDomainScore,
    getOverallScore,
    getCapabilityStatus,
    getCapabilityCompletion,
    getCapabilityTags,
    getAllTagsInUse,
    getCapabilitiesByTag,
    getDomainTags,
    getStatusCounts,
    getDomainStatusCounts,
    getDimensionScoresForAssessment,
    getOrganizationalScoresForAssessment,
    getAggregateDimensionScore,
  };
}

/**
 * Helper: Get dimension display name
 */
function getDimensionDisplayName(dimensionId: OrbitDimensionId): string {
  const names: Record<OrbitDimensionId, string> = {
    businessArchitecture: 'Business Architecture',
    information: 'Information',
    technology: 'Technology',
  };
  return names[dimensionId];
}

/**
 * Helper: Check if dimension is required
 */
function isDimensionRequired(dimensionId: OrbitDimensionId): boolean {
  return (
    dimensionId === 'businessArchitecture' ||
    dimensionId === 'information' ||
    dimensionId === 'technology'
  );
}
