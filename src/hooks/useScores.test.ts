/**
 * useScores Hook Tests
 *
 * Tests for maturity score calculations and access.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useScores } from './useScores';
import { db, clearDatabase } from '../services/db';
import { calculateDimensionScore } from '../services/scoring';
import { getAspectsForSubDimension } from '../services/orbit';
import type { MaturityLevelWithNA, OrbitRating, TechnologySubDimensionId } from '../types';

describe('useScores', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  describe('initial state', () => {
    it('should return empty scoresByArea map initially', async () => {
      const { result } = renderHook(() => useScores());

      await waitFor(() => {
        expect(result.current.scoresByArea.size).toBe(0);
      });
    });
  });

  describe('getCapabilityScoreData', () => {
    it('should return score data for assessed capability', async () => {
      await db.capabilityAssessments.add({
        id: 'a1',
        capabilityDomainId: 'member-management',
        capabilityDomainName: 'Member Management',
        capabilityAreaId: 'area-1',
        capabilityAreaName: 'Area 1',
        status: 'finalized',
        tags: ['phase1'],
        createdAt: new Date(),
        updatedAt: new Date(),
        finalizedAt: new Date(),
        overallScore: 3.5,
      });

      const { result } = renderHook(() => useScores());

      await waitFor(() => {
        expect(result.current.scoresByArea.size).toBe(1);
      });

      const scoreData = result.current.getCapabilityScoreData('area-1');
      expect(scoreData).toBeDefined();
      expect(scoreData?.score).toBe(3.5);
      expect(scoreData?.status).toBe('finalized');
      expect(scoreData?.tags).toContain('phase1');
    });

    it('should return undefined for non-assessed capability', async () => {
      const { result } = renderHook(() => useScores());

      await waitFor(() => {
        expect(result.current.scoresByArea).toBeDefined();
      });

      expect(result.current.getCapabilityScoreData('non-existent')).toBeUndefined();
    });
  });

  describe('getCapabilityScore', () => {
    it('should return score for capability area', async () => {
      await db.capabilityAssessments.add({
        id: 'a1',
        capabilityDomainId: 'd1',
        capabilityDomainName: 'Domain',
        capabilityAreaId: 'area-1',
        capabilityAreaName: 'Area 1',
        status: 'finalized',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        overallScore: 4.2,
      });

      const { result } = renderHook(() => useScores());

      await waitFor(() => {
        expect(result.current.scoresByArea.size).toBe(1);
      });

      expect(result.current.getCapabilityScore('area-1')).toBe(4.2);
    });

    it('should return null for non-assessed capability', async () => {
      const { result } = renderHook(() => useScores());

      await waitFor(() => {
        expect(result.current.scoresByArea).toBeDefined();
      });

      expect(result.current.getCapabilityScore('non-existent')).toBeNull();
    });
  });

  describe('getDomainScore', () => {
    it('should calculate average score for domain from finalized assessments', async () => {
      await db.capabilityAssessments.bulkAdd([
        {
          id: 'a1',
          capabilityDomainId: 'domain-1',
          capabilityDomainName: 'Domain 1',
          capabilityAreaId: 'area-1',
          capabilityAreaName: 'Area 1',
          status: 'finalized',
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          overallScore: 3.0,
        },
        {
          id: 'a2',
          capabilityDomainId: 'domain-1',
          capabilityDomainName: 'Domain 1',
          capabilityAreaId: 'area-2',
          capabilityAreaName: 'Area 2',
          status: 'finalized',
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          overallScore: 5.0,
        },
        {
          id: 'a3',
          capabilityDomainId: 'domain-1',
          capabilityDomainName: 'Domain 1',
          capabilityAreaId: 'area-3',
          capabilityAreaName: 'Area 3',
          status: 'in_progress', // Not finalized - excluded
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          overallScore: 1.0,
        },
      ]);

      const { result } = renderHook(() => useScores());

      await waitFor(() => {
        expect(result.current.scoresByArea.size).toBe(3);
      });

      expect(result.current.getDomainScore('domain-1')).toBe(4.0); // (3 + 5) / 2
    });

    it('should return null for domain with no finalized assessments', async () => {
      await db.capabilityAssessments.add({
        id: 'a1',
        capabilityDomainId: 'domain-1',
        capabilityDomainName: 'Domain 1',
        capabilityAreaId: 'area-1',
        capabilityAreaName: 'Area 1',
        status: 'in_progress',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const { result } = renderHook(() => useScores());

      await waitFor(() => {
        expect(result.current.scoresByArea.size).toBe(1);
      });

      expect(result.current.getDomainScore('domain-1')).toBeNull();
    });
  });

  describe('getOverallScore', () => {
    it('should calculate average across all finalized assessments', async () => {
      await db.capabilityAssessments.bulkAdd([
        {
          id: 'a1',
          capabilityDomainId: 'd1',
          capabilityDomainName: 'D1',
          capabilityAreaId: 'area-1',
          capabilityAreaName: 'Area 1',
          status: 'finalized',
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          overallScore: 2.0,
        },
        {
          id: 'a2',
          capabilityDomainId: 'd2',
          capabilityDomainName: 'D2',
          capabilityAreaId: 'area-2',
          capabilityAreaName: 'Area 2',
          status: 'finalized',
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          overallScore: 4.0,
        },
        {
          id: 'a3',
          capabilityDomainId: 'd3',
          capabilityDomainName: 'D3',
          capabilityAreaId: 'area-3',
          capabilityAreaName: 'Area 3',
          status: 'finalized',
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          overallScore: 3.0,
        },
      ]);

      const { result } = renderHook(() => useScores());

      await waitFor(() => {
        expect(result.current.scoresByArea.size).toBe(3);
      });

      expect(result.current.getOverallScore()).toBe(3.0); // (2 + 4 + 3) / 3
    });

    it('should return null when no finalized assessments exist', async () => {
      const { result } = renderHook(() => useScores());

      await waitFor(() => {
        expect(result.current.scoresByArea).toBeDefined();
      });

      expect(result.current.getOverallScore()).toBeNull();
    });
  });

  describe('getCapabilityStatus', () => {
    it('should return not_started for non-assessed capability', async () => {
      const { result } = renderHook(() => useScores());

      await waitFor(() => {
        expect(result.current.scoresByArea).toBeDefined();
      });

      expect(result.current.getCapabilityStatus('non-existent')).toBe('not_started');
    });

    it('should return correct status for assessed capability', async () => {
      await db.capabilityAssessments.add({
        id: 'a1',
        capabilityDomainId: 'd1',
        capabilityDomainName: 'D1',
        capabilityAreaId: 'area-1',
        capabilityAreaName: 'Area 1',
        status: 'in_progress',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const { result } = renderHook(() => useScores());

      await waitFor(() => {
        expect(result.current.scoresByArea.size).toBe(1);
      });

      expect(result.current.getCapabilityStatus('area-1')).toBe('in_progress');
    });
  });

  describe('getCapabilityCompletion', () => {
    it('should return completion percentage', async () => {
      await db.capabilityAssessments.add({
        id: 'a1',
        capabilityDomainId: 'd1',
        capabilityDomainName: 'D1',
        capabilityAreaId: 'area-1',
        capabilityAreaName: 'Area 1',
        status: 'in_progress',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Add some ratings
      await db.orbitRatings.bulkAdd([
        {
          id: 'r1',
          capabilityAssessmentId: 'a1',
          dimensionId: 'outcomes',
          aspectId: 'a1',
          currentLevel: 3,
          questionResponses: [],
          evidenceResponses: [],
          notes: '',
          barriers: '',
          plans: '',
          carriedForward: false,
          attachmentIds: [],
          updatedAt: new Date(),
        },
        {
          id: 'r2',
          capabilityAssessmentId: 'a1',
          dimensionId: 'roles',
          aspectId: 'a2',
          currentLevel: -1, // N/A counts as assessed
          questionResponses: [],
          evidenceResponses: [],
          notes: '',
          barriers: '',
          plans: '',
          carriedForward: false,
          attachmentIds: [],
          updatedAt: new Date(),
        },
      ]);

      const { result } = renderHook(() => useScores());

      await waitFor(() => {
        expect(result.current.scoresByArea.size).toBe(1);
      });

      const completion = result.current.getCapabilityCompletion('area-1');
      expect(completion).toBeGreaterThan(0);
    });

    it('should return 0 for non-assessed capability', async () => {
      const { result } = renderHook(() => useScores());

      await waitFor(() => {
        expect(result.current.scoresByArea).toBeDefined();
      });

      expect(result.current.getCapabilityCompletion('non-existent')).toBe(0);
    });

    /** Minimal rating fixture for completion-denominator tests */
    const completionRating = (
      id: string,
      assessmentId: string,
      dimensionId: 'outcomes' | 'businessArchitecture',
      aspectId: string
    ): Parameters<typeof db.orbitRatings.add>[0] => ({
      id,
      capabilityAssessmentId: assessmentId,
      dimensionId,
      aspectId,
      currentLevel: 3,
      questionResponses: [],
      evidenceResponses: [],
      notes: '',
      barriers: '',
      plans: '',
      carriedForward: false,
      attachmentIds: [],
      updatedAt: new Date(),
    });

    it('should use the 15-aspect denominator for the combined organizational area', async () => {
      await db.capabilityAssessments.add({
        id: 'org1',
        capabilityDomainId: 'enterprise-architecture-domain',
        capabilityDomainName: 'Enterprise Architecture',
        capabilityAreaId: 'enterprise-governance',
        capabilityAreaName: 'Enterprise Governance',
        status: 'in_progress',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // 3 of 15 organizational aspects assessed -> 20%
      await db.orbitRatings.bulkAdd([
        completionRating('r1', 'org1', 'outcomes', 'culture-mindset'),
        completionRating('r2', 'org1', 'outcomes', 'capability'),
        completionRating('r3', 'org1', 'outcomes', 'quality-consistency'),
      ]);

      const { result } = renderHook(() => useScores());

      await waitFor(() => {
        expect(result.current.scoresByArea.size).toBe(1);
      });

      expect(result.current.getCapabilityCompletion('enterprise-governance')).toBe(20);
    });

    it('should exclude the aggregated dimension from enterprise-domain denominators', async () => {
      // data-management aggregates Information (10 aspects): denominator 26 - 10 = 16
      await db.capabilityAssessments.add({
        id: 'ent1',
        capabilityDomainId: 'data-management',
        capabilityDomainName: 'Data Management',
        capabilityAreaId: 'data-governance',
        capabilityAreaName: 'Data Governance',
        status: 'in_progress',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // 4 of 16 assessable aspects assessed -> 25%
      await db.orbitRatings.bulkAdd([
        completionRating('r1', 'ent1', 'businessArchitecture', 'business-process-performance'),
        completionRating('r2', 'ent1', 'businessArchitecture', 'business-process-documentation'),
        completionRating('r3', 'ent1', 'businessArchitecture', 'business-process-governance'),
        completionRating('r4', 'ent1', 'businessArchitecture', 'business-process-automation'),
      ]);

      const { result } = renderHook(() => useScores());

      await waitFor(() => {
        expect(result.current.scoresByArea.size).toBe(1);
      });

      expect(result.current.getCapabilityCompletion('data-governance')).toBe(25);
    });
  });

  describe('getCapabilityTags', () => {
    it('should return tags for finalized assessment', async () => {
      await db.capabilityAssessments.add({
        id: 'a1',
        capabilityDomainId: 'd1',
        capabilityDomainName: 'D1',
        capabilityAreaId: 'area-1',
        capabilityAreaName: 'Area 1',
        status: 'finalized',
        tags: ['phase1', 'priority'],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const { result } = renderHook(() => useScores());

      await waitFor(() => {
        expect(result.current.scoresByArea.size).toBe(1);
      });

      const tags = result.current.getCapabilityTags('area-1');
      expect(tags).toContain('phase1');
      expect(tags).toContain('priority');
    });

    it('should return empty array for in_progress assessment', async () => {
      await db.capabilityAssessments.add({
        id: 'a1',
        capabilityDomainId: 'd1',
        capabilityDomainName: 'D1',
        capabilityAreaId: 'area-1',
        capabilityAreaName: 'Area 1',
        status: 'in_progress',
        tags: ['draft-tag'],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const { result } = renderHook(() => useScores());

      await waitFor(() => {
        expect(result.current.scoresByArea.size).toBe(1);
      });

      expect(result.current.getCapabilityTags('area-1')).toEqual([]);
    });
  });

  describe('getAllTagsInUse', () => {
    it('should return unique tags from finalized assessments', async () => {
      await db.capabilityAssessments.bulkAdd([
        {
          id: 'a1',
          capabilityDomainId: 'd1',
          capabilityDomainName: 'D1',
          capabilityAreaId: 'area-1',
          capabilityAreaName: 'Area 1',
          status: 'finalized',
          tags: ['phase1', 'priority'],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'a2',
          capabilityDomainId: 'd1',
          capabilityDomainName: 'D1',
          capabilityAreaId: 'area-2',
          capabilityAreaName: 'Area 2',
          status: 'finalized',
          tags: ['phase1', 'review'],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const { result } = renderHook(() => useScores());

      await waitFor(() => {
        expect(result.current.scoresByArea.size).toBe(2);
      });

      const tags = result.current.getAllTagsInUse();
      expect(tags).toHaveLength(3);
      expect(tags).toContain('phase1');
      expect(tags).toContain('priority');
      expect(tags).toContain('review');
    });
  });

  describe('getCapabilitiesByTag', () => {
    it('should return capability area IDs with specific tag', async () => {
      await db.capabilityAssessments.bulkAdd([
        {
          id: 'a1',
          capabilityDomainId: 'd1',
          capabilityDomainName: 'D1',
          capabilityAreaId: 'area-1',
          capabilityAreaName: 'Area 1',
          status: 'finalized',
          tags: ['target-tag'],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'a2',
          capabilityDomainId: 'd1',
          capabilityDomainName: 'D1',
          capabilityAreaId: 'area-2',
          capabilityAreaName: 'Area 2',
          status: 'finalized',
          tags: ['other-tag'],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'a3',
          capabilityDomainId: 'd1',
          capabilityDomainName: 'D1',
          capabilityAreaId: 'area-3',
          capabilityAreaName: 'Area 3',
          status: 'finalized',
          tags: ['target-tag'],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const { result } = renderHook(() => useScores());

      await waitFor(() => {
        expect(result.current.scoresByArea.size).toBe(3);
      });

      const capabilities = result.current.getCapabilitiesByTag('target-tag');
      expect(capabilities).toHaveLength(2);
      expect(capabilities).toContain('area-1');
      expect(capabilities).toContain('area-3');
    });
  });

  describe('getStatusCounts', () => {
    it('should return correct counts by status', async () => {
      await db.capabilityAssessments.bulkAdd([
        {
          id: 'a1',
          capabilityDomainId: 'd1',
          capabilityDomainName: 'D1',
          capabilityAreaId: 'area-1',
          capabilityAreaName: 'Area 1',
          status: 'in_progress',
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'a2',
          capabilityDomainId: 'd1',
          capabilityDomainName: 'D1',
          capabilityAreaId: 'area-2',
          capabilityAreaName: 'Area 2',
          status: 'finalized',
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'a3',
          capabilityDomainId: 'd1',
          capabilityDomainName: 'D1',
          capabilityAreaId: 'area-3',
          capabilityAreaName: 'Area 3',
          status: 'finalized',
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const { result } = renderHook(() => useScores());

      await waitFor(() => {
        expect(result.current.scoresByArea.size).toBe(3);
      });

      const counts = result.current.getStatusCounts();
      expect(counts.inProgress).toBe(1);
      expect(counts.finalized).toBe(2);
      expect(counts.total).toBe(72); // Total capability areas
    });
  });

  describe('getDomainStatusCounts', () => {
    it('should return status counts for specific domain', async () => {
      // Using actual domain ID from capabilities.json
      await db.capabilityAssessments.bulkAdd([
        {
          id: 'a1',
          capabilityDomainId: 'provider-management',
          capabilityDomainName: 'Provider Management',
          capabilityAreaId: 'provider-enrollment',
          capabilityAreaName: 'Provider Enrollment',
          status: 'finalized',
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'a2',
          capabilityDomainId: 'provider-management',
          capabilityDomainName: 'Provider Management',
          capabilityAreaId: 'provider-eligibility',
          capabilityAreaName: 'Provider Eligibility',
          status: 'in_progress',
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const { result } = renderHook(() => useScores());

      await waitFor(() => {
        expect(result.current.scoresByArea.size).toBe(2);
      });

      const counts = result.current.getDomainStatusCounts('provider-management');
      expect(counts.finalized).toBe(1);
      expect(counts.inProgress).toBe(1);
      expect(counts.total).toBeGreaterThan(0);
    });

    it('should return zeros for non-existent domain', async () => {
      const { result } = renderHook(() => useScores());

      await waitFor(() => {
        expect(result.current.scoresByArea).toBeDefined();
      });

      const counts = result.current.getDomainStatusCounts('non-existent');
      expect(counts.total).toBe(0);
      expect(counts.finalized).toBe(0);
      expect(counts.inProgress).toBe(0);
      expect(counts.notStarted).toBe(0);
    });
  });

  describe('getDimensionScoresForAssessment', () => {
    it('should return dimension scores for assessment', async () => {
      await db.capabilityAssessments.add({
        id: 'a1',
        capabilityDomainId: 'd1',
        capabilityDomainName: 'D1',
        capabilityAreaId: 'area-1',
        capabilityAreaName: 'Area 1',
        status: 'finalized',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        overallScore: 3.5,
      });

      // Use real aspect IDs from the ORBIT model (B-EA-I-T dimensions only)
      await db.orbitRatings.bulkAdd([
        {
          id: 'r1',
          capabilityAssessmentId: 'a1',
          dimensionId: 'businessArchitecture',
          aspectId: 'business-process-performance',
          currentLevel: 3,
          questionResponses: [],
          evidenceResponses: [],
          notes: '',
          barriers: '',
          plans: '',
          carriedForward: false,
          attachmentIds: [],
          updatedAt: new Date(),
        },
        {
          id: 'r2',
          capabilityAssessmentId: 'a1',
          dimensionId: 'businessArchitecture',
          aspectId: 'business-process-documentation',
          currentLevel: 4,
          questionResponses: [],
          evidenceResponses: [],
          notes: '',
          barriers: '',
          plans: '',
          carriedForward: false,
          attachmentIds: [],
          updatedAt: new Date(),
        },
        {
          id: 'r3',
          capabilityAssessmentId: 'a1',
          dimensionId: 'information',
          aspectId: 'information-quality',
          currentLevel: 5,
          questionResponses: [],
          evidenceResponses: [],
          notes: '',
          barriers: '',
          plans: '',
          carriedForward: false,
          attachmentIds: [],
          updatedAt: new Date(),
        },
      ]);

      const { result } = renderHook(() => useScores());

      await waitFor(() => {
        expect(result.current.scoresByArea.size).toBe(1);
      });

      const dimensionScores = result.current.getDimensionScoresForAssessment('a1');
      expect(dimensionScores).toBeDefined();
      expect(dimensionScores).toHaveLength(3); // B-I-T dimensions only

      const businessScore = dimensionScores?.find((d) => d.dimensionId === 'businessArchitecture');
      expect(businessScore?.averageLevel).toBe(3.5); // (3 + 4) / 2

      const infoScore = dimensionScores?.find((d) => d.dimensionId === 'information');
      expect(infoScore?.averageLevel).toBe(5.0);
    });

    it('should return undefined for non-existent assessment', async () => {
      const { result } = renderHook(() => useScores());

      await waitFor(() => {
        expect(result.current.scoresByArea).toBeDefined();
      });

      expect(result.current.getDimensionScoresForAssessment('non-existent')).toBeUndefined();
    });

    /**
     * Regression: OBS-21. The Technology dimension roll-up must average the
     * sub-dimension means at full precision, matching `calculateDimensionScore`
     * (the scorer finalize stores from). Rounding each sub-dimension mean before
     * averaging produced 1.4 here against 1.3 stored.
     */
    it('should match calculateDimensionScore for Technology, not double-round sub-dimensions', async () => {
      await db.capabilityAssessments.add({
        id: 'a1',
        capabilityDomainId: 'd1',
        capabilityDomainName: 'D1',
        capabilityAreaId: 'area-1',
        capabilityAreaName: 'Area 1',
        status: 'finalized',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Infrastructure: 2,2,2,2,1,1 -> mean 1.6667 (rounds to 1.7)
      // Application:    1,1,1,1,1   -> mean 1.0
      // Canonical: mean(1.6667, 1.0) = 1.3333 -> 1.3
      // Double-rounded: mean(1.7, 1.0) = 1.35 -> 1.4  (the bug)
      const infraLevels: Record<string, MaturityLevelWithNA> = {
        'compute-and-storage': 2,
        'networking-and-technical-recovery': 2,
        'identity-access-and-consent': 2,
        'security-protection-and-monitoring': 2,
        'system-operations-and-monitoring': 1,
        'development-testing-release-and-security-compliance': 1,
      };
      const appLevels: Record<string, MaturityLevelWithNA> = {
        'api-messaging-and-integration': 1,
        'application-hosting-and-platform-services': 1,
        'business-rules-and-workflows': 1,
        'modular-architecture': 1,
        'user-interfaces-and-session-management': 1,
      };

      const makeRating = (
        aspectId: string,
        currentLevel: MaturityLevelWithNA,
        subDimensionId: TechnologySubDimensionId
      ): OrbitRating => ({
        id: `r-${aspectId}`,
        capabilityAssessmentId: 'a1',
        dimensionId: 'technology',
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
        updatedAt: new Date(),
      });

      // Sanity-check the fixture against the live ORBIT model, so a model rename
      // fails here as a fixture problem rather than looking like a scoring regression.
      expect(Object.keys(infraLevels)).toEqual(
        getAspectsForSubDimension('technologyInfrastructureManagement').map((a) => a.id)
      );
      expect(Object.keys(appLevels)).toEqual(
        getAspectsForSubDimension('applicationManagement').map((a) => a.id)
      );

      const ratings: OrbitRating[] = [
        ...Object.entries(infraLevels).map(([aspectId, level]) =>
          makeRating(aspectId, level, 'technologyInfrastructureManagement')
        ),
        ...Object.entries(appLevels).map(([aspectId, level]) =>
          makeRating(aspectId, level, 'applicationManagement')
        ),
      ];
      await db.orbitRatings.bulkAdd(ratings);

      const { result } = renderHook(() => useScores());
      await waitFor(() => {
        expect(result.current.scoresByArea.size).toBe(1);
      });

      const techScore = result.current
        .getDimensionScoresForAssessment('a1')
        ?.find((d) => d.dimensionId === 'technology');

      // The hook and the canonical scorer must agree
      expect(techScore?.averageLevel).toBe(calculateDimensionScore('technology', ratings));
      expect(techScore?.averageLevel).toBe(1.3);

      // Sub-dimension means stay rounded for display
      expect(
        techScore?.subDimensionScores?.find(
          (s) => s.subDimensionId === 'technologyInfrastructureManagement'
        )?.averageLevel
      ).toBe(1.7);
      expect(
        techScore?.subDimensionScores?.find((s) => s.subDimensionId === 'applicationManagement')
          ?.averageLevel
      ).toBe(1.0);
    });

    it('should score Technology from one sub-dimension when the other is unassessed', async () => {
      await db.capabilityAssessments.add({
        id: 'a1',
        capabilityDomainId: 'd1',
        capabilityDomainName: 'D1',
        capabilityAreaId: 'area-1',
        capabilityAreaName: 'Area 1',
        status: 'in_progress',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await db.orbitRatings.add({
        id: 'r1',
        capabilityAssessmentId: 'a1',
        dimensionId: 'technology',
        subDimensionId: 'applicationManagement',
        aspectId: 'modular-architecture',
        currentLevel: 4,
        questionResponses: [],
        evidenceResponses: [],
        notes: '',
        barriers: '',
        plans: '',
        carriedForward: false,
        attachmentIds: [],
        updatedAt: new Date(),
      });

      const { result } = renderHook(() => useScores());
      await waitFor(() => {
        expect(result.current.scoresByArea.size).toBe(1);
      });

      const techScore = result.current
        .getDimensionScoresForAssessment('a1')
        ?.find((d) => d.dimensionId === 'technology');

      // Sub-dimensions with nothing assessed are excluded, not counted as zero
      expect(techScore?.averageLevel).toBe(4);
      expect(
        techScore?.subDimensionScores?.find(
          (s) => s.subDimensionId === 'technologyInfrastructureManagement'
        )?.averageLevel
      ).toBeNull();
    });

    it('should return a null dimension score when every aspect is N/A', async () => {
      await db.capabilityAssessments.add({
        id: 'a1',
        capabilityDomainId: 'd1',
        capabilityDomainName: 'D1',
        capabilityAreaId: 'area-1',
        capabilityAreaName: 'Area 1',
        status: 'in_progress',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await db.orbitRatings.add({
        id: 'r1',
        capabilityAssessmentId: 'a1',
        dimensionId: 'businessArchitecture',
        aspectId: 'business-process-performance',
        currentLevel: -1, // N/A
        questionResponses: [],
        evidenceResponses: [],
        notes: '',
        barriers: '',
        plans: '',
        carriedForward: false,
        attachmentIds: [],
        updatedAt: new Date(),
      });

      const { result } = renderHook(() => useScores());
      await waitFor(() => {
        expect(result.current.scoresByArea.size).toBe(1);
      });

      const baScore = result.current
        .getDimensionScoresForAssessment('a1')
        ?.find((d) => d.dimensionId === 'businessArchitecture');

      // N/A is excluded from the average but still counts as assessed
      expect(baScore?.averageLevel).toBeNull();
      expect(
        baScore?.aspectScores.find((a) => a.aspectId === 'business-process-performance')
      ).toMatchObject({ currentLevel: -1, isAssessed: true });
    });
  });
});
