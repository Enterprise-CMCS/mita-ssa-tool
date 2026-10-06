/**
 * useCapabilityAssessments Hook Tests
 *
 * Tests for capability assessment CRUD operations.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCapabilityAssessments, useCapabilityAssessment } from './useCapabilityAssessments';
import { db, clearDatabase } from '../services/db';
import type { CapabilityAssessment } from '../types';

describe('useCapabilityAssessments', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  const createAssessment = (
    overrides: Partial<CapabilityAssessment> = {}
  ): CapabilityAssessment => ({
    id: `assessment-${Date.now()}-${Math.random()}`,
    capabilityDomainId: 'provider-management',
    capabilityDomainName: 'Provider Management',
    capabilityAreaId: 'provider-enrollment',
    capabilityAreaName: 'Provider Enrollment',
    status: 'in_progress',
    tags: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  describe('initial state', () => {
    it('should return empty assessments array initially', async () => {
      const { result } = renderHook(() => useCapabilityAssessments());

      await waitFor(() => {
        expect(result.current.assessments).toEqual([]);
      });
    });

    it('should load existing assessments from database', async () => {
      await db.capabilityAssessments.bulkAdd([
        createAssessment({ id: 'a1' }),
        createAssessment({ id: 'a2' }),
      ]);

      const { result } = renderHook(() => useCapabilityAssessments());

      await waitFor(() => {
        expect(result.current.assessments).toHaveLength(2);
      });
    });
  });

  describe('startAssessment', () => {
    it('should create a new assessment for a capability area', async () => {
      const { result } = renderHook(() => useCapabilityAssessments());

      await waitFor(() => {
        expect(result.current.assessments).toBeDefined();
      });

      let assessmentId: string;
      await act(async () => {
        assessmentId = await result.current.startAssessment('provider-enrollment');
      });

      expect(assessmentId!).toBeDefined();

      // Verify in database
      const assessment = await db.capabilityAssessments.get(assessmentId!);
      expect(assessment).toBeDefined();
      expect(assessment?.capabilityAreaId).toBe('provider-enrollment');
      expect(assessment?.status).toBe('in_progress');
    });

    it('should set initial tags if provided', async () => {
      const { result } = renderHook(() => useCapabilityAssessments());

      await waitFor(() => {
        expect(result.current.assessments).toBeDefined();
      });

      let assessmentId: string;
      await act(async () => {
        assessmentId = await result.current.startAssessment('provider-enrollment', [
          'phase1',
          'priority',
        ]);
      });

      const assessment = await db.capabilityAssessments.get(assessmentId!);
      expect(assessment?.tags).toContain('phase1');
      expect(assessment?.tags).toContain('priority');
    });

    it('should throw error for invalid capability area', async () => {
      const { result } = renderHook(() => useCapabilityAssessments());

      await waitFor(() => {
        expect(result.current.assessments).toBeDefined();
      });

      await expect(
        act(async () => {
          await result.current.startAssessment('non-existent-area');
        })
      ).rejects.toThrow('Capability area not found');
    });

    it('should create tag records for initial tags', async () => {
      const { result } = renderHook(() => useCapabilityAssessments());

      await waitFor(() => {
        expect(result.current.assessments).toBeDefined();
      });

      await act(async () => {
        await result.current.startAssessment('provider-enrollment', ['new-tag']);
      });

      const tag = await db.tags.where('name').equals('new-tag').first();
      expect(tag).toBeDefined();
      expect(tag?.usageCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('finalizeAssessment', () => {
    it('should change status to finalized', async () => {
      const assessment = createAssessment({ id: 'to-finalize', status: 'in_progress' });
      await db.capabilityAssessments.add(assessment);

      const { result } = renderHook(() => useCapabilityAssessments());

      await waitFor(() => {
        expect(result.current.assessments).toHaveLength(1);
      });

      await act(async () => {
        await result.current.finalizeAssessment('to-finalize');
      });

      const finalized = await db.capabilityAssessments.get('to-finalize');
      expect(finalized?.status).toBe('finalized');
      expect(finalized?.finalizedAt).toBeDefined();
    });

    it('should calculate overall score from ratings', async () => {
      await db.capabilityAssessments.add(
        createAssessment({ id: 'with-ratings', status: 'in_progress' })
      );

      // Add some ratings (using B-I-T dimensions)
      await db.orbitRatings.bulkAdd([
        {
          id: 'r1',
          capabilityAssessmentId: 'with-ratings',
          dimensionId: 'businessArchitecture',
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
          capabilityAssessmentId: 'with-ratings',
          dimensionId: 'information',
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
      ]);

      const { result } = renderHook(() => useCapabilityAssessments());

      await waitFor(() => {
        expect(result.current.assessments).toHaveLength(1);
      });

      await act(async () => {
        await result.current.finalizeAssessment('with-ratings');
      });

      const finalized = await db.capabilityAssessments.get('with-ratings');
      expect(finalized?.overallScore).toBe(4.0); // (3 + 5) / 2
    });

    it('should exclude N/A ratings from score calculation', async () => {
      await db.capabilityAssessments.add(
        createAssessment({ id: 'with-na', status: 'in_progress' })
      );

      await db.orbitRatings.bulkAdd([
        {
          id: 'r1',
          capabilityAssessmentId: 'with-na',
          dimensionId: 'businessArchitecture',
          aspectId: 'a1',
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
          id: 'r2',
          capabilityAssessmentId: 'with-na',
          dimensionId: 'information',
          aspectId: 'a2',
          currentLevel: -1, // N/A
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

      const { result } = renderHook(() => useCapabilityAssessments());

      await waitFor(() => {
        expect(result.current.assessments).toHaveLength(1);
      });

      await act(async () => {
        await result.current.finalizeAssessment('with-na');
      });

      const finalized = await db.capabilityAssessments.get('with-na');
      expect(finalized?.overallScore).toBe(4.0); // Only the non-N/A rating
    });

    /**
     * Helper to build a minimal organizational rating for the combined area.
     */
    const orgRating = (
      id: string,
      dimensionId: 'outcomes' | 'roles' | 'enterprise-architecture',
      aspectId: string,
      currentLevel: number
    ): Parameters<typeof db.orbitRatings.add>[0] => ({
      id,
      capabilityAssessmentId: 'org-combined',
      dimensionId,
      aspectId,
      currentLevel: currentLevel as -1 | 0 | 1 | 2 | 3 | 4 | 5,
      questionResponses: [],
      evidenceResponses: [],
      notes: '',
      barriers: '',
      plans: '',
      carriedForward: false,
      attachmentIds: [],
      updatedAt: new Date(),
    });

    const createOrgAssessment = (): CapabilityAssessment =>
      createAssessment({
        id: 'org-combined',
        capabilityDomainId: 'enterprise-architecture-domain',
        capabilityDomainName: 'Enterprise Architecture',
        capabilityAreaId: 'enterprise-governance',
        capabilityAreaName: 'Enterprise Governance',
        status: 'in_progress',
      });

    it('should score the combined organizational area as the average of section averages', async () => {
      await db.capabilityAssessments.add(createOrgAssessment());

      await db.orbitRatings.bulkAdd([
        // Outcomes section: (3 + 5) / 2 = 4.0
        orgRating('o1', 'outcomes', 'culture-mindset', 3),
        orgRating('o2', 'outcomes', 'capability', 5),
        // Roles section: 2.0
        orgRating('ro1', 'roles', 'communication', 2),
        // Enterprise Architecture section: (5 + 4) / 2 = 4.5
        orgRating('ea1', 'enterprise-architecture', 'business-capability', 5),
        orgRating('ea2', 'enterprise-architecture', 'policy-management', 4),
      ]);

      const { result } = renderHook(() => useCapabilityAssessments());

      await waitFor(() => {
        expect(result.current.assessments).toHaveLength(1);
      });

      await act(async () => {
        await result.current.finalizeAssessment('org-combined');
      });

      const finalized = await db.capabilityAssessments.get('org-combined');
      // (4.0 + 2.0 + 4.5) / 3 = 3.5
      expect(finalized?.overallScore).toBe(3.5);
    });

    it('should exclude organizational sections with no assessed aspects', async () => {
      await db.capabilityAssessments.add(createOrgAssessment());

      await db.orbitRatings.bulkAdd([
        // Only Outcomes assessed: (3 + 4) / 2 = 3.5; Roles and EA excluded
        orgRating('o1', 'outcomes', 'culture-mindset', 3),
        orgRating('o2', 'outcomes', 'capability', 4),
        // N/A and unassessed ratings in other sections are excluded
        orgRating('ro1', 'roles', 'communication', -1),
        orgRating('ea1', 'enterprise-architecture', 'business-capability', 0),
      ]);

      const { result } = renderHook(() => useCapabilityAssessments());

      await waitFor(() => {
        expect(result.current.assessments).toHaveLength(1);
      });

      await act(async () => {
        await result.current.finalizeAssessment('org-combined');
      });

      const finalized = await db.capabilityAssessments.get('org-combined');
      expect(finalized?.overallScore).toBe(3.5);
    });

    it('should weight organizational sections equally regardless of aspect counts', async () => {
      await db.capabilityAssessments.add(createOrgAssessment());

      await db.orbitRatings.bulkAdd([
        // Outcomes: six aspects all at 5 -> section average 5.0
        orgRating('o1', 'outcomes', 'culture-mindset', 5),
        orgRating('o2', 'outcomes', 'capability', 5),
        orgRating('o3', 'outcomes', 'quality-consistency', 5),
        orgRating('o4', 'outcomes', 'alignment-goals-priorities', 5),
        orgRating('o5', 'outcomes', 'use-of-metrics', 5),
        orgRating('o6', 'outcomes', 'reusability-integration', 5),
        // Roles: one aspect at 2 -> section average 2.0
        orgRating('ro1', 'roles', 'communication', 2),
      ]);

      const { result } = renderHook(() => useCapabilityAssessments());

      await waitFor(() => {
        expect(result.current.assessments).toHaveLength(1);
      });

      await act(async () => {
        await result.current.finalizeAssessment('org-combined');
      });

      const finalized = await db.capabilityAssessments.get('org-combined');
      // Section averages (5.0 + 2.0) / 2 = 3.5, NOT the flat mean of 7 ratings (~4.6)
      expect(finalized?.overallScore).toBe(3.5);
    });

    it('should throw error for non-existent assessment', async () => {
      const { result } = renderHook(() => useCapabilityAssessments());

      await waitFor(() => {
        expect(result.current.assessments).toBeDefined();
      });

      await expect(
        act(async () => {
          await result.current.finalizeAssessment('non-existent');
        })
      ).rejects.toThrow('Assessment not found');
    });
  });

  describe('editAssessment', () => {
    it('should change finalized assessment back to in_progress', async () => {
      await db.capabilityAssessments.add(
        createAssessment({
          id: 'to-edit',
          status: 'finalized',
          finalizedAt: new Date(),
          overallScore: 3.5,
        })
      );

      const { result } = renderHook(() => useCapabilityAssessments());

      await waitFor(() => {
        expect(result.current.assessments).toHaveLength(1);
      });

      await act(async () => {
        await result.current.editAssessment('to-edit');
      });

      const edited = await db.capabilityAssessments.get('to-edit');
      expect(edited?.status).toBe('in_progress');
    });

    it('should create history snapshot before editing', async () => {
      await db.capabilityAssessments.add(
        createAssessment({
          id: 'to-edit',
          status: 'finalized',
          finalizedAt: new Date(),
          overallScore: 3.5,
          tags: ['phase1'],
        })
      );

      await db.orbitRatings.add({
        id: 'r1',
        capabilityAssessmentId: 'to-edit',
        dimensionId: 'businessArchitecture',
        aspectId: 'a1',
        currentLevel: 3,
        questionResponses: [],
        evidenceResponses: [],
        notes: 'Test notes',
        barriers: '',
        plans: '',
        carriedForward: false,
        attachmentIds: [],
        updatedAt: new Date(),
      });

      const { result } = renderHook(() => useCapabilityAssessments());

      await waitFor(() => {
        expect(result.current.assessments).toHaveLength(1);
      });

      await act(async () => {
        await result.current.editAssessment('to-edit');
      });

      const history = await db.assessmentHistory.toArray();
      expect(history).toHaveLength(1);
      expect(history[0]!.overallScore).toBe(3.5);
    });

    it('should set previousLevel and carriedForward on ratings', async () => {
      await db.capabilityAssessments.add(
        createAssessment({
          id: 'to-edit',
          status: 'finalized',
          finalizedAt: new Date(),
          overallScore: 3.0,
        })
      );

      await db.orbitRatings.add({
        id: 'r1',
        capabilityAssessmentId: 'to-edit',
        dimensionId: 'businessArchitecture',
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
      });

      const { result } = renderHook(() => useCapabilityAssessments());

      await waitFor(() => {
        expect(result.current.assessments).toHaveLength(1);
      });

      await act(async () => {
        await result.current.editAssessment('to-edit');
      });

      const rating = await db.orbitRatings.get('r1');
      expect(rating?.previousLevel).toBe(3);
      expect(rating?.carriedForward).toBe(true);
    });

    it('should do nothing if assessment is already in_progress', async () => {
      await db.capabilityAssessments.add(
        createAssessment({ id: 'already-in-progress', status: 'in_progress' })
      );

      const { result } = renderHook(() => useCapabilityAssessments());

      await waitFor(() => {
        expect(result.current.assessments).toHaveLength(1);
      });

      await act(async () => {
        await result.current.editAssessment('already-in-progress');
      });

      // Should not create history
      const history = await db.assessmentHistory.toArray();
      expect(history).toHaveLength(0);
    });
  });

  describe('updateTags', () => {
    it('should update assessment tags', async () => {
      await db.capabilityAssessments.add(createAssessment({ id: 'tag-test', tags: ['old-tag'] }));

      const { result } = renderHook(() => useCapabilityAssessments());

      await waitFor(() => {
        expect(result.current.assessments).toHaveLength(1);
      });

      await act(async () => {
        await result.current.updateTags('tag-test', ['new-tag1', 'new-tag2']);
      });

      const updated = await db.capabilityAssessments.get('tag-test');
      expect(updated?.tags).toEqual(['new-tag1', 'new-tag2']);
    });
  });

  describe('deleteAssessment', () => {
    it('should delete assessment and related data', async () => {
      await db.capabilityAssessments.add(createAssessment({ id: 'to-delete' }));

      await db.orbitRatings.add({
        id: 'r1',
        capabilityAssessmentId: 'to-delete',
        dimensionId: 'businessArchitecture',
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
      });

      await db.attachments.add({
        id: 'att1',
        capabilityAssessmentId: 'to-delete',
        orbitRatingId: 'r1',
        fileName: 'test.txt',
        fileType: 'text/plain',
        fileSize: 100,
        blob: new Blob(['test']),
        uploadedAt: new Date(),
      });

      const { result } = renderHook(() => useCapabilityAssessments());

      await waitFor(() => {
        expect(result.current.assessments).toHaveLength(1);
      });

      await act(async () => {
        await result.current.deleteAssessment('to-delete');
      });

      // Verify all related data is deleted
      expect(await db.capabilityAssessments.get('to-delete')).toBeUndefined();
      expect(await db.orbitRatings.get('r1')).toBeUndefined();
      expect(await db.attachments.get('att1')).toBeUndefined();
    });
  });

  describe('revertEdit', () => {
    it('should restore assessment from history', async () => {
      // Set up assessment with history
      await db.capabilityAssessments.add(
        createAssessment({
          id: 'to-revert',
          capabilityAreaId: 'member-eligibility-determination',
          status: 'in_progress',
          tags: ['modified'],
        })
      );

      await db.assessmentHistory.add({
        id: 'h1',
        capabilityAssessmentId: 'to-revert',
        capabilityAreaId: 'member-eligibility-determination',
        snapshotDate: new Date('2025-01-15'),
        tags: ['original'],
        overallScore: 3.0,
        dimensionScores: {},
        ratings: [
          {
            dimensionId: 'businessArchitecture',
            aspectId: 'a1',
            currentLevel: 3,
            questionResponses: [],
            evidenceResponses: [],
            notes: 'Original notes',
            barriers: '',
            plans: '',
          },
        ],
      });

      const { result } = renderHook(() => useCapabilityAssessments());

      await waitFor(() => {
        expect(result.current.assessments).toHaveLength(1);
      });

      await act(async () => {
        await result.current.revertEdit('to-revert');
      });

      const reverted = await db.capabilityAssessments.get('to-revert');
      expect(reverted?.status).toBe('finalized');
      expect(reverted?.tags).toEqual(['original']);
      expect(reverted?.overallScore).toBe(3.0);

      // Check ratings were restored
      const ratings = await db.orbitRatings
        .where('capabilityAssessmentId')
        .equals('to-revert')
        .toArray();
      expect(ratings).toHaveLength(1);
      expect(ratings[0]!.notes).toBe('Original notes');

      // History entry should be removed
      const history = await db.assessmentHistory.toArray();
      expect(history).toHaveLength(0);
    });
  });

  describe('getAssessmentForArea', () => {
    it('should return assessment for capability area', async () => {
      await db.capabilityAssessments.add(
        createAssessment({
          id: 'area-assessment',
          capabilityAreaId: 'member-eligibility-determination',
        })
      );

      const { result } = renderHook(() => useCapabilityAssessments());

      await waitFor(() => {
        expect(result.current.assessments).toHaveLength(1);
      });

      const assessment = result.current.getAssessmentForArea('member-eligibility-determination');
      expect(assessment?.id).toBe('area-assessment');
    });

    it('should return undefined for area without assessment', async () => {
      const { result } = renderHook(() => useCapabilityAssessments());

      await waitFor(() => {
        expect(result.current.assessments).toBeDefined();
      });

      expect(result.current.getAssessmentForArea('no-assessment')).toBeUndefined();
    });
  });

  describe('getStatusForArea', () => {
    it('should return not_started for area without assessment', async () => {
      const { result } = renderHook(() => useCapabilityAssessments());

      await waitFor(() => {
        expect(result.current.assessments).toBeDefined();
      });

      expect(result.current.getStatusForArea('no-assessment')).toBe('not_started');
    });

    it('should return assessment status for area with assessment', async () => {
      await db.capabilityAssessments.add(
        createAssessment({
          id: 'a1',
          capabilityAreaId: 'area-1',
          status: 'finalized',
        })
      );

      const { result } = renderHook(() => useCapabilityAssessments());

      await waitFor(() => {
        expect(result.current.assessments).toHaveLength(1);
      });

      expect(result.current.getStatusForArea('area-1')).toBe('finalized');
    });
  });

  describe('getAssessmentsByStatus', () => {
    it('should filter assessments by status', async () => {
      await db.capabilityAssessments.bulkAdd([
        createAssessment({ id: 'a1', capabilityAreaId: 'area-1', status: 'in_progress' }),
        createAssessment({ id: 'a2', capabilityAreaId: 'area-2', status: 'finalized' }),
        createAssessment({ id: 'a3', capabilityAreaId: 'area-3', status: 'finalized' }),
      ]);

      const { result } = renderHook(() => useCapabilityAssessments());

      await waitFor(() => {
        expect(result.current.assessments).toHaveLength(3);
      });

      const finalized = result.current.getAssessmentsByStatus('finalized');
      expect(finalized).toHaveLength(2);

      const inProgress = result.current.getAssessmentsByStatus('in_progress');
      expect(inProgress).toHaveLength(1);
    });
  });

  describe('getAssessmentsByTag', () => {
    it('should filter assessments by tag', async () => {
      await db.capabilityAssessments.bulkAdd([
        createAssessment({ id: 'a1', capabilityAreaId: 'area-1', tags: ['phase1', 'priority'] }),
        createAssessment({ id: 'a2', capabilityAreaId: 'area-2', tags: ['phase1'] }),
        createAssessment({ id: 'a3', capabilityAreaId: 'area-3', tags: ['phase2'] }),
      ]);

      const { result } = renderHook(() => useCapabilityAssessments());

      await waitFor(() => {
        expect(result.current.assessments).toHaveLength(3);
      });

      const phase1 = result.current.getAssessmentsByTag('phase1');
      expect(phase1).toHaveLength(2);

      const priority = result.current.getAssessmentsByTag('priority');
      expect(priority).toHaveLength(1);
    });
  });

  describe('getStatusCounts', () => {
    it('should return correct counts by status', async () => {
      await db.capabilityAssessments.bulkAdd([
        createAssessment({ id: 'a1', capabilityAreaId: 'area-1', status: 'in_progress' }),
        createAssessment({ id: 'a2', capabilityAreaId: 'area-2', status: 'finalized' }),
        createAssessment({ id: 'a3', capabilityAreaId: 'area-3', status: 'finalized' }),
      ]);

      const { result } = renderHook(() => useCapabilityAssessments());

      await waitFor(() => {
        expect(result.current.assessments).toHaveLength(3);
      });

      const counts = result.current.getStatusCounts();
      expect(counts.inProgress).toBe(1);
      expect(counts.finalized).toBe(2);
    });
  });
});

describe('useCapabilityAssessment', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  it('should return undefined for undefined assessmentId', async () => {
    const { result } = renderHook(() => useCapabilityAssessment(undefined));

    await waitFor(() => {
      expect(result.current.assessment).toBeUndefined();
    });
  });

  it('should return assessment for valid ID', async () => {
    await db.capabilityAssessments.add({
      id: 'specific-assessment',
      capabilityDomainId: 'd1',
      capabilityDomainName: 'Domain',
      capabilityAreaId: 'area-1',
      capabilityAreaName: 'Area 1',
      status: 'in_progress',
      tags: ['test'],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const { result } = renderHook(() => useCapabilityAssessment('specific-assessment'));

    await waitFor(() => {
      expect(result.current.assessment).toBeDefined();
    });

    expect(result.current.assessment?.id).toBe('specific-assessment');
    expect(result.current.assessment?.tags).toContain('test');
  });

  it('should return undefined for non-existent ID', async () => {
    const { result } = renderHook(() => useCapabilityAssessment('non-existent'));

    await waitFor(() => {
      expect(result.current.assessment).toBeUndefined();
    });
  });
});
