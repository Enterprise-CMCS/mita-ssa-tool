/**
 * useOrbitRatings Hook Tests
 *
 * Tests for ORBIT rating management within assessments.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useOrbitRatings } from './useOrbitRatings';
import { db, clearDatabase } from '../services/db';

describe('useOrbitRatings', () => {
  const assessmentId = 'test-assessment';

  beforeEach(async () => {
    await clearDatabase();
    // Create a test assessment
    await db.capabilityAssessments.add({
      id: assessmentId,
      capabilityDomainId: 'member-management',
      capabilityDomainName: 'Member Management',
      capabilityAreaId: 'member-eligibility-determination',
      capabilityAreaName: 'Member Eligibility Determination',
      status: 'in_progress',
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  afterEach(async () => {
    await clearDatabase();
  });

  describe('initial state', () => {
    it('should return empty ratings array initially', async () => {
      const { result } = renderHook(() => useOrbitRatings(assessmentId));

      await waitFor(() => {
        expect(result.current.ratings).toEqual([]);
      });
    });

    it('should return empty array for undefined assessmentId', async () => {
      const { result } = renderHook(() => useOrbitRatings(undefined));

      await waitFor(() => {
        expect(result.current.ratings).toEqual([]);
      });
    });

    it('should load existing ratings from database', async () => {
      await db.orbitRatings.bulkAdd([
        {
          id: 'r1',
          capabilityAssessmentId: assessmentId,
          dimensionId: 'outcomes',
          aspectId: 'value-delivery',
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
          capabilityAssessmentId: assessmentId,
          dimensionId: 'roles',
          aspectId: 'organizational-structure',
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
      ]);

      const { result } = renderHook(() => useOrbitRatings(assessmentId));

      await waitFor(() => {
        expect(result.current.ratings).toHaveLength(2);
      });
    });
  });

  describe('saveRating', () => {
    it('should create a new rating', async () => {
      const { result } = renderHook(() => useOrbitRatings(assessmentId));

      await waitFor(() => {
        expect(result.current.ratings).toBeDefined();
      });

      await act(async () => {
        await result.current.saveRating({
          dimensionId: 'outcomes',
          aspectId: 'value-delivery',
          currentLevel: 3,
          notes: 'Test notes',
          barriers: 'Test barriers',
          plans: 'Test plans',
        });
      });

      const ratings = await db.orbitRatings
        .where('capabilityAssessmentId')
        .equals(assessmentId)
        .toArray();

      expect(ratings).toHaveLength(1);
      expect(ratings[0]!.currentLevel).toBe(3);
      expect(ratings[0]!.notes).toBe('Test notes');
    });

    it('should update existing rating', async () => {
      await db.orbitRatings.add({
        id: 'existing',
        capabilityAssessmentId: assessmentId,
        dimensionId: 'outcomes',
        aspectId: 'value-delivery',
        currentLevel: 2,
        questionResponses: [],
        evidenceResponses: [],
        notes: 'Old notes',
        barriers: '',
        plans: '',
        carriedForward: false,
        attachmentIds: [],
        updatedAt: new Date(),
      });

      const { result } = renderHook(() => useOrbitRatings(assessmentId));

      await waitFor(() => {
        expect(result.current.ratings).toHaveLength(1);
      });

      await act(async () => {
        await result.current.saveRating({
          dimensionId: 'outcomes',
          aspectId: 'value-delivery',
          currentLevel: 4,
          notes: 'Updated notes',
        });
      });

      const rating = await db.orbitRatings.get('existing');
      expect(rating?.currentLevel).toBe(4);
      expect(rating?.notes).toBe('Updated notes');
      expect(rating?.carriedForward).toBe(false);
    });

    it('should handle Technology sub-dimension ratings', async () => {
      const { result } = renderHook(() => useOrbitRatings(assessmentId));

      await waitFor(() => {
        expect(result.current.ratings).toBeDefined();
      });

      await act(async () => {
        await result.current.saveRating({
          dimensionId: 'technology',
          subDimensionId: 'technologyInfrastructureManagement',
          aspectId: 'cloud-adoption',
          currentLevel: 4,
        });
      });

      const ratings = await db.orbitRatings.toArray();
      expect(ratings).toHaveLength(1);
      expect(ratings[0]!.dimensionId).toBe('technology');
      expect(ratings[0]!.subDimensionId).toBe('technologyInfrastructureManagement');
    });

    it('should update assessment timestamp', async () => {
      const originalAssessment = await db.capabilityAssessments.get(assessmentId);
      const originalUpdatedAt = originalAssessment?.updatedAt;

      const { result } = renderHook(() => useOrbitRatings(assessmentId));

      await waitFor(() => {
        expect(result.current.ratings).toBeDefined();
      });

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      await act(async () => {
        await result.current.saveRating({
          dimensionId: 'outcomes',
          aspectId: 'value-delivery',
          currentLevel: 3,
        });
      });

      const updatedAssessment = await db.capabilityAssessments.get(assessmentId);
      expect(updatedAssessment?.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt!.getTime());
    });

    it('should do nothing if assessmentId is undefined', async () => {
      const { result } = renderHook(() => useOrbitRatings(undefined));

      await waitFor(() => {
        expect(result.current.ratings).toBeDefined();
      });

      await act(async () => {
        await result.current.saveRating({
          dimensionId: 'outcomes',
          aspectId: 'value-delivery',
          currentLevel: 3,
        });
      });

      const ratings = await db.orbitRatings.toArray();
      expect(ratings).toHaveLength(0);
    });
  });

  describe('updateLevel', () => {
    it('should update just the maturity level', async () => {
      await db.orbitRatings.add({
        id: 'r1',
        capabilityAssessmentId: assessmentId,
        dimensionId: 'outcomes',
        aspectId: 'value-delivery',
        currentLevel: 2,
        questionResponses: [],
        evidenceResponses: [],
        notes: 'Keep these notes',
        barriers: '',
        plans: '',
        carriedForward: true,
        attachmentIds: [],
        updatedAt: new Date(),
      });

      const { result } = renderHook(() => useOrbitRatings(assessmentId));

      await waitFor(() => {
        expect(result.current.ratings).toHaveLength(1);
      });

      await act(async () => {
        await result.current.updateLevel('outcomes', 'value-delivery', 4);
      });

      const rating = await db.orbitRatings.get('r1');
      expect(rating?.currentLevel).toBe(4);
      expect(rating?.notes).toBe('Keep these notes'); // Notes preserved
      expect(rating?.carriedForward).toBe(false); // Reset on update
    });

    it('should create rating if it does not exist', async () => {
      const { result } = renderHook(() => useOrbitRatings(assessmentId));

      await waitFor(() => {
        expect(result.current.ratings).toBeDefined();
      });

      await act(async () => {
        await result.current.updateLevel('outcomes', 'new-aspect', 3);
      });

      const ratings = await db.orbitRatings.toArray();
      expect(ratings).toHaveLength(1);
      expect(ratings[0]!.currentLevel).toBe(3);
    });
  });

  describe('updateTargetLevel', () => {
    it('should update the target (To Be) level', async () => {
      await db.orbitRatings.add({
        id: 'r1',
        capabilityAssessmentId: assessmentId,
        dimensionId: 'outcomes',
        aspectId: 'value-delivery',
        currentLevel: 2,
        questionResponses: [],
        evidenceResponses: [],
        notes: '',
        barriers: '',
        plans: '',
        carriedForward: false,
        attachmentIds: [],
        updatedAt: new Date(),
      });

      const { result } = renderHook(() => useOrbitRatings(assessmentId));

      await waitFor(() => {
        expect(result.current.ratings).toHaveLength(1);
      });

      await act(async () => {
        await result.current.updateTargetLevel('outcomes', 'value-delivery', 4);
      });

      const rating = await db.orbitRatings.get('r1');
      expect(rating?.targetLevel).toBe(4);
      expect(rating?.currentLevel).toBe(2); // Unchanged
    });

    it('should create rating with just target level if not exists', async () => {
      const { result } = renderHook(() => useOrbitRatings(assessmentId));

      await waitFor(() => {
        expect(result.current.ratings).toBeDefined();
      });

      await act(async () => {
        await result.current.updateTargetLevel('outcomes', 'new-aspect', 5);
      });

      const ratings = await db.orbitRatings.toArray();
      expect(ratings).toHaveLength(1);
      expect(ratings[0]!.targetLevel).toBe(5);
      expect(ratings[0]!.currentLevel).toBe(0); // Not assessed
    });
  });

  describe('updateNotes', () => {
    it('should update notes for existing rating', async () => {
      await db.orbitRatings.add({
        id: 'r1',
        capabilityAssessmentId: assessmentId,
        dimensionId: 'outcomes',
        aspectId: 'value-delivery',
        currentLevel: 3,
        questionResponses: [],
        evidenceResponses: [],
        notes: 'Old notes',
        barriers: '',
        plans: '',
        carriedForward: false,
        attachmentIds: [],
        updatedAt: new Date(),
      });

      const { result } = renderHook(() => useOrbitRatings(assessmentId));

      await waitFor(() => {
        expect(result.current.ratings).toHaveLength(1);
      });

      await act(async () => {
        await result.current.updateNotes('outcomes', 'value-delivery', 'New notes');
      });

      const rating = await db.orbitRatings.get('r1');
      expect(rating?.notes).toBe('New notes');
    });
  });

  /**
   * Regression: OBS-6. The three text updaters previously bailed out when no
   * rating row existed, so text typed before a maturity level was chosen was
   * silently discarded — while the save indicator still reported success.
   */
  describe('text fields with no existing rating (OBS-6)', () => {
    const textFieldCases = [
      { method: 'updateNotes', field: 'notes' },
      { method: 'updateBarriers', field: 'barriers' },
      { method: 'updatePlans', field: 'plans' },
    ] as const;

    it.each(textFieldCases)(
      '$method creates the rating instead of discarding the text',
      async ({ method, field }) => {
        // No need to wait for the live query: the update path resolves the row
        // straight from IndexedDB and never reads `ratings`. Gating on an emission
        // here only made the test sensitive to liveQuery scheduling (see OBS-27).
        const { result } = renderHook(() => useOrbitRatings(assessmentId));

        await act(async () => {
          await result.current[method](
            'businessArchitecture',
            'business-process-performance',
            'Typed before picking a level'
          );
        });

        const stored = await db.orbitRatings
          .where('capabilityAssessmentId')
          .equals(assessmentId)
          .toArray();

        expect(stored).toHaveLength(1);
        expect(stored[0]?.[field]).toBe('Typed before picking a level');
        // Created unassessed, so it cannot affect progress or scores
        expect(stored[0]?.currentLevel).toBe(0);
      }
    );

    it('does not count a notes-only rating as assessed', async () => {
      const { result } = renderHook(() => useOrbitRatings(assessmentId));

      await act(async () => {
        await result.current.updateNotes(
          'businessArchitecture',
          'business-process-performance',
          'Just a note'
        );
      });

      await waitFor(() => {
        expect(result.current.ratings).toHaveLength(1);
      });

      expect(result.current.getAssessedCount()).toBe(0);
      expect(result.current.getAssessedCountForDimension('businessArchitecture')).toBe(0);
      expect(result.current.getAverageLevelForDimension('businessArchitecture')).toBeNull();
    });

    it('preserves the other text fields when creating a rating', async () => {
      const { result } = renderHook(() => useOrbitRatings(assessmentId));

      await act(async () => {
        await result.current.updateBarriers(
          'information',
          'information-quality',
          'Legacy system limits'
        );
      });

      const stored = await db.orbitRatings
        .where('capabilityAssessmentId')
        .equals(assessmentId)
        .first();

      expect(stored?.barriers).toBe('Legacy system limits');
      expect(stored?.notes).toBe('');
      expect(stored?.plans).toBe('');
    });

    it('patches only the target field on an existing rating', async () => {
      await db.orbitRatings.add({
        id: 'r1',
        capabilityAssessmentId: assessmentId,
        dimensionId: 'businessArchitecture',
        aspectId: 'business-process-performance',
        currentLevel: 4,
        questionResponses: [],
        evidenceResponses: [],
        notes: 'Keep me',
        barriers: '',
        plans: 'Keep me too',
        carriedForward: false,
        attachmentIds: [],
        updatedAt: new Date(),
      });

      const { result } = renderHook(() => useOrbitRatings(assessmentId));

      await waitFor(() => {
        expect(result.current.ratings).toHaveLength(1);
      });

      await act(async () => {
        await result.current.updateBarriers(
          'businessArchitecture',
          'business-process-performance',
          'Only this changes'
        );
      });

      const stored = await db.orbitRatings.get('r1');
      expect(stored?.barriers).toBe('Only this changes');
      expect(stored?.notes).toBe('Keep me');
      expect(stored?.plans).toBe('Keep me too');
      expect(stored?.currentLevel).toBe(4);
    });

    it('does not create an empty rating when the value is blank', async () => {
      const { result } = renderHook(() => useOrbitRatings(assessmentId));

      await act(async () => {
        await result.current.updateNotes('information', 'information-quality', '');
      });

      await expect(db.orbitRatings.count()).resolves.toBe(0);
    });

    it('bumps the assessment timestamp so text-only edits affect ordering', async () => {
      const before = await db.capabilityAssessments.get(assessmentId);
      const originalUpdatedAt = before?.updatedAt.getTime() ?? 0;

      const { result } = renderHook(() => useOrbitRatings(assessmentId));

      // Ensure a measurable difference regardless of clock granularity
      await new Promise((resolve) => setTimeout(resolve, 5));

      await act(async () => {
        await result.current.updatePlans('information', 'information-quality', 'Migrate in FY27');
      });

      const after = await db.capabilityAssessments.get(assessmentId);
      expect(after?.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt);
    });

    it('preserves the technology sub-dimension when creating a rating', async () => {
      const { result } = renderHook(() => useOrbitRatings(assessmentId));

      await act(async () => {
        await result.current.updateNotes(
          'technology',
          'modular-architecture',
          'Monolith today',
          'applicationManagement'
        );
      });

      const stored = await db.orbitRatings
        .where('capabilityAssessmentId')
        .equals(assessmentId)
        .first();

      expect(stored?.subDimensionId).toBe('applicationManagement');
      expect(stored?.notes).toBe('Monolith today');
    });
  });

  describe('updateBarriers', () => {
    it('should update barriers for existing rating', async () => {
      await db.orbitRatings.add({
        id: 'r1',
        capabilityAssessmentId: assessmentId,
        dimensionId: 'outcomes',
        aspectId: 'value-delivery',
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

      const { result } = renderHook(() => useOrbitRatings(assessmentId));

      await waitFor(() => {
        expect(result.current.ratings).toHaveLength(1);
      });

      await act(async () => {
        await result.current.updateBarriers('outcomes', 'value-delivery', 'Budget constraints');
      });

      const rating = await db.orbitRatings.get('r1');
      expect(rating?.barriers).toBe('Budget constraints');
    });
  });

  describe('updatePlans', () => {
    it('should update advancement plans for existing rating', async () => {
      await db.orbitRatings.add({
        id: 'r1',
        capabilityAssessmentId: assessmentId,
        dimensionId: 'outcomes',
        aspectId: 'value-delivery',
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

      const { result } = renderHook(() => useOrbitRatings(assessmentId));

      await waitFor(() => {
        expect(result.current.ratings).toHaveLength(1);
      });

      await act(async () => {
        await result.current.updatePlans('outcomes', 'value-delivery', 'Implement by Q3');
      });

      const rating = await db.orbitRatings.get('r1');
      expect(rating?.plans).toBe('Implement by Q3');
    });
  });

  describe('getRating', () => {
    it('should return rating for specific aspect', async () => {
      await db.orbitRatings.add({
        id: 'r1',
        capabilityAssessmentId: assessmentId,
        dimensionId: 'outcomes',
        aspectId: 'value-delivery',
        currentLevel: 3,
        questionResponses: [],
        evidenceResponses: [],
        notes: 'Test',
        barriers: '',
        plans: '',
        carriedForward: false,
        attachmentIds: [],
        updatedAt: new Date(),
      });

      const { result } = renderHook(() => useOrbitRatings(assessmentId));

      await waitFor(() => {
        expect(result.current.ratings).toHaveLength(1);
      });

      const rating = result.current.getRating('outcomes', 'value-delivery');
      expect(rating?.currentLevel).toBe(3);
      expect(rating?.notes).toBe('Test');
    });

    it('should return undefined for non-existent rating', async () => {
      const { result } = renderHook(() => useOrbitRatings(assessmentId));

      await waitFor(() => {
        expect(result.current.ratings).toBeDefined();
      });

      expect(result.current.getRating('outcomes', 'non-existent')).toBeUndefined();
    });

    it('should handle Technology sub-dimension lookup', async () => {
      await db.orbitRatings.add({
        id: 'r1',
        capabilityAssessmentId: assessmentId,
        dimensionId: 'technology',
        subDimensionId: 'technologyInfrastructureManagement',
        aspectId: 'cloud-adoption',
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

      const { result } = renderHook(() => useOrbitRatings(assessmentId));

      await waitFor(() => {
        expect(result.current.ratings).toHaveLength(1);
      });

      const rating = result.current.getRating(
        'technology',
        'cloud-adoption',
        'technologyInfrastructureManagement'
      );
      expect(rating?.currentLevel).toBe(4);
    });
  });

  describe('getRatingsForDimension', () => {
    it('should return all ratings for a dimension', async () => {
      await db.orbitRatings.bulkAdd([
        {
          id: 'r1',
          capabilityAssessmentId: assessmentId,
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
          capabilityAssessmentId: assessmentId,
          dimensionId: 'outcomes',
          aspectId: 'a2',
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
          capabilityAssessmentId: assessmentId,
          dimensionId: 'roles',
          aspectId: 'a3',
          currentLevel: 2,
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

      const { result } = renderHook(() => useOrbitRatings(assessmentId));

      await waitFor(() => {
        expect(result.current.ratings).toHaveLength(3);
      });

      const outcomesRatings = result.current.getRatingsForDimension('outcomes');
      expect(outcomesRatings).toHaveLength(2);
    });
  });

  describe('getRatingsForSubDimension', () => {
    it('should return ratings for Technology sub-dimension', async () => {
      await db.orbitRatings.bulkAdd([
        {
          id: 'r1',
          capabilityAssessmentId: assessmentId,
          dimensionId: 'technology',
          subDimensionId: 'technologyInfrastructureManagement',
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
          capabilityAssessmentId: assessmentId,
          dimensionId: 'technology',
          subDimensionId: 'technologyInfrastructureManagement',
          aspectId: 'a2',
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
          capabilityAssessmentId: assessmentId,
          dimensionId: 'technology',
          subDimensionId: 'applicationManagement',
          aspectId: 'a3',
          currentLevel: 2,
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

      const { result } = renderHook(() => useOrbitRatings(assessmentId));

      await waitFor(() => {
        expect(result.current.ratings).toHaveLength(3);
      });

      const infraRatings = result.current.getRatingsForSubDimension(
        'technologyInfrastructureManagement'
      );
      expect(infraRatings).toHaveLength(2);
    });
  });

  describe('getAssessedCount', () => {
    it('should count assessed aspects (level > 0 or N/A)', async () => {
      await db.orbitRatings.bulkAdd([
        {
          id: 'r1',
          capabilityAssessmentId: assessmentId,
          dimensionId: 'outcomes',
          aspectId: 'a1',
          currentLevel: 3, // Assessed
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
          capabilityAssessmentId: assessmentId,
          dimensionId: 'outcomes',
          aspectId: 'a2',
          currentLevel: 0, // Not assessed
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
          capabilityAssessmentId: assessmentId,
          dimensionId: 'roles',
          aspectId: 'a3',
          currentLevel: -1, // N/A (counts as assessed)
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

      const { result } = renderHook(() => useOrbitRatings(assessmentId));

      await waitFor(() => {
        expect(result.current.ratings).toHaveLength(3);
      });

      expect(result.current.getAssessedCount()).toBe(2); // r1 and r3
    });
  });

  describe('getAssessedCountForDimension', () => {
    it('should count assessed aspects for specific dimension', async () => {
      await db.orbitRatings.bulkAdd([
        {
          id: 'r1',
          capabilityAssessmentId: assessmentId,
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
          capabilityAssessmentId: assessmentId,
          dimensionId: 'outcomes',
          aspectId: 'a2',
          currentLevel: 0,
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
          capabilityAssessmentId: assessmentId,
          dimensionId: 'roles',
          aspectId: 'a3',
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
      ]);

      const { result } = renderHook(() => useOrbitRatings(assessmentId));

      await waitFor(() => {
        expect(result.current.ratings).toHaveLength(3);
      });

      expect(result.current.getAssessedCountForDimension('outcomes')).toBe(1);
      expect(result.current.getAssessedCountForDimension('roles')).toBe(1);
    });
  });

  describe('isDimensionComplete', () => {
    it('should return true when all aspects are assessed', async () => {
      await db.orbitRatings.bulkAdd([
        {
          id: 'r1',
          capabilityAssessmentId: assessmentId,
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
          capabilityAssessmentId: assessmentId,
          dimensionId: 'outcomes',
          aspectId: 'a2',
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
      ]);

      const { result } = renderHook(() => useOrbitRatings(assessmentId));

      await waitFor(() => {
        expect(result.current.ratings).toHaveLength(2);
      });

      expect(result.current.isDimensionComplete('outcomes', 2)).toBe(true);
      expect(result.current.isDimensionComplete('outcomes', 3)).toBe(false);
    });
  });

  describe('getAverageLevelForDimension', () => {
    it('should calculate average excluding N/A and not assessed', async () => {
      await db.orbitRatings.bulkAdd([
        {
          id: 'r1',
          capabilityAssessmentId: assessmentId,
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
          capabilityAssessmentId: assessmentId,
          dimensionId: 'outcomes',
          aspectId: 'a2',
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
        {
          id: 'r3',
          capabilityAssessmentId: assessmentId,
          dimensionId: 'outcomes',
          aspectId: 'a3',
          currentLevel: -1, // N/A - excluded
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

      const { result } = renderHook(() => useOrbitRatings(assessmentId));

      await waitFor(() => {
        expect(result.current.ratings).toHaveLength(3);
      });

      expect(result.current.getAverageLevelForDimension('outcomes')).toBe(4.0); // (3 + 5) / 2
    });

    it('should return null for dimension with no assessed ratings', async () => {
      const { result } = renderHook(() => useOrbitRatings(assessmentId));

      await waitFor(() => {
        expect(result.current.ratings).toBeDefined();
      });

      expect(result.current.getAverageLevelForDimension('outcomes')).toBeNull();
    });
  });

  describe('getOverallAverageLevel', () => {
    it('should calculate overall average across all dimensions', async () => {
      await db.orbitRatings.bulkAdd([
        {
          id: 'r1',
          capabilityAssessmentId: assessmentId,
          dimensionId: 'outcomes',
          aspectId: 'a1',
          currentLevel: 2,
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
          capabilityAssessmentId: assessmentId,
          dimensionId: 'roles',
          aspectId: 'a2',
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
          capabilityAssessmentId: assessmentId,
          dimensionId: 'businessArchitecture',
          aspectId: 'a3',
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
      ]);

      const { result } = renderHook(() => useOrbitRatings(assessmentId));

      await waitFor(() => {
        expect(result.current.ratings).toHaveLength(3);
      });

      expect(result.current.getOverallAverageLevel()).toBe(3.0); // (2 + 4 + 3) / 3
    });

    it('should return null when no ratings exist', async () => {
      const { result } = renderHook(() => useOrbitRatings(assessmentId));

      await waitFor(() => {
        expect(result.current.ratings).toBeDefined();
      });

      expect(result.current.getOverallAverageLevel()).toBeNull();
    });
  });
});
