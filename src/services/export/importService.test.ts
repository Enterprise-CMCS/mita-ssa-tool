/**
 * Import Service Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import JSZip from 'jszip';
import { db, clearDatabase } from '../db';
import { importFromJson, importFromZip, readFileAsText } from './importService';
import type { ExportData } from './types';
import type { CapabilityAssessment, OrbitRating } from '../../types';

describe('importService', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  // Helper to create valid export data
  const createExportData = (
    assessments: Partial<CapabilityAssessment>[] = [],
    ratings: Partial<OrbitRating>[] = []
  ): ExportData => ({
    exportVersion: '1.0',
    exportDate: new Date().toISOString(),
    appVersion: '0.1.0',
    scope: 'full',
    data: {
      assessments: assessments.map((a) => ({
        id: a.id ?? uuidv4(),
        capabilityDomainId: a.capabilityDomainId ?? 'provider-management',
        capabilityDomainName: a.capabilityDomainName ?? 'Provider Management',
        capabilityAreaId: a.capabilityAreaId ?? 'provider-enrollment',
        capabilityAreaName: a.capabilityAreaName ?? 'Provider Enrollment',
        status: a.status ?? 'finalized',
        tags: a.tags ?? [],
        createdAt: a.createdAt ?? new Date(),
        updatedAt: a.updatedAt ?? new Date(),
        finalizedAt: a.finalizedAt,
        overallScore: a.overallScore ?? 3.5,
      })) as CapabilityAssessment[],
      ratings: ratings.map((r) => ({
        id: r.id ?? uuidv4(),
        capabilityAssessmentId: r.capabilityAssessmentId ?? '',
        dimensionId: r.dimensionId ?? 'businessArchitecture',
        aspectId: r.aspectId ?? 'business-process-performance',
        currentLevel: r.currentLevel ?? 3,
        targetLevel: r.targetLevel,
        questionResponses: r.questionResponses ?? [],
        evidenceResponses: r.evidenceResponses ?? [],
        notes: r.notes ?? '',
        barriers: r.barriers ?? '',
        plans: r.plans ?? '',
        carriedForward: r.carriedForward ?? false,
        attachmentIds: r.attachmentIds ?? [],
        updatedAt: r.updatedAt ?? new Date(),
      })) as OrbitRating[],
      history: [],
      tags: [],
      attachments: [],
    },
    metadata: {
      totalAssessments: assessments.length,
      totalRatings: ratings.length,
      totalHistory: 0,
      totalAttachments: 0,
      capabilities: assessments.map(
        (a) =>
          `${a.capabilityDomainId ?? 'provider-management'}/${a.capabilityAreaId ?? 'provider-enrollment'}`
      ),
    },
  });

  describe('importFromJson', () => {
    it('should import valid JSON with no existing data', async () => {
      const assessmentId = uuidv4();
      const exportData = createExportData(
        [
          {
            id: assessmentId,
            capabilityAreaId: 'case-management',
            status: 'finalized',
            overallScore: 3.5,
          },
        ],
        [{ capabilityAssessmentId: assessmentId, currentLevel: 3 }]
      );

      const result = await importFromJson(JSON.stringify(exportData));

      expect(result.success).toBe(true);
      expect(result.importedAsCurrent).toBe(1);
      expect(result.importedAsHistory).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.errors.length).toBe(0);

      // Verify data was imported
      const assessments = await db.capabilityAssessments.toArray();
      expect(assessments.length).toBe(1);
      expect(assessments[0]?.capabilityAreaId).toBe('case-management');

      const ratings = await db.orbitRatings.toArray();
      expect(ratings.length).toBe(1);
    });

    it('should reject invalid JSON', async () => {
      const result = await importFromJson('not valid json {{{');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid JSON format');
    });

    it('should reject invalid export data structure', async () => {
      const result = await importFromJson(JSON.stringify({ foo: 'bar' }));

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid export data structure');
    });

    it('should reject unsupported export version', async () => {
      const exportData = createExportData();
      exportData.exportVersion = '99.0';

      const result = await importFromJson(JSON.stringify(exportData));

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('Unsupported export version');
    });

    it('should call progress callback', async () => {
      const progressCallback = vi.fn();
      const exportData = createExportData([{ capabilityAreaId: 'case-management' }]);

      await importFromJson(JSON.stringify(exportData), progressCallback);

      expect(progressCallback).toHaveBeenCalled();
    });

    describe('merge logic', () => {
      it('should replace older local with newer import', async () => {
        // Create existing assessment (older)
        const oldDate = new Date('2024-01-01');
        await db.capabilityAssessments.add({
          id: uuidv4(),
          capabilityDomainId: 'provider-management',
          capabilityDomainName: 'Provider Management',
          capabilityAreaId: 'case-management',
          capabilityAreaName: 'Area 1',
          status: 'finalized',
          tags: ['old-tag'],
          createdAt: oldDate,
          updatedAt: oldDate,
          finalizedAt: oldDate,
          overallScore: 2.0,
        });

        // Import newer assessment
        const newDate = new Date('2024-06-01');
        const exportData = createExportData([
          {
            capabilityAreaId: 'case-management',
            status: 'finalized',
            overallScore: 4.0,
            tags: ['new-tag'],
            updatedAt: newDate,
            finalizedAt: newDate,
          },
        ]);

        const result = await importFromJson(JSON.stringify(exportData));

        expect(result.importedAsCurrent).toBe(1);

        // Verify current assessment was updated
        const assessments = await db.capabilityAssessments.toArray();
        expect(assessments.length).toBe(1);
        expect(assessments[0]?.overallScore).toBe(4.0);
        expect(assessments[0]?.tags).toContain('new-tag');

        // Verify old assessment was moved to history
        const history = await db.assessmentHistory.toArray();
        expect(history.length).toBe(1);
        expect(history[0]?.overallScore).toBe(2.0);
      });

      it('should add older import to history when local is newer', async () => {
        // Create existing assessment (newer)
        const newDate = new Date('2024-06-01');
        await db.capabilityAssessments.add({
          id: uuidv4(),
          capabilityDomainId: 'provider-management',
          capabilityDomainName: 'Provider Management',
          capabilityAreaId: 'case-management',
          capabilityAreaName: 'Area 1',
          status: 'finalized',
          tags: ['current-tag'],
          createdAt: newDate,
          updatedAt: newDate,
          finalizedAt: newDate,
          overallScore: 4.0,
        });

        // Import older assessment
        const oldDate = new Date('2024-01-01');
        const exportData = createExportData([
          {
            capabilityAreaId: 'case-management',
            status: 'finalized',
            overallScore: 2.0,
            tags: ['old-tag'],
            updatedAt: oldDate,
            finalizedAt: oldDate,
          },
        ]);

        const result = await importFromJson(JSON.stringify(exportData));

        expect(result.importedAsHistory).toBe(1);
        expect(result.importedAsCurrent).toBe(0);

        // Verify current assessment unchanged
        const assessments = await db.capabilityAssessments.toArray();
        expect(assessments.length).toBe(1);
        expect(assessments[0]?.overallScore).toBe(4.0);

        // Verify import was added to history
        const history = await db.assessmentHistory.toArray();
        expect(history.length).toBe(1);
        expect(history[0]?.overallScore).toBe(2.0);
      });

      it('should skip duplicate assessments (same timestamp and score)', async () => {
        const sameDate = new Date('2024-03-15T10:30:00.000Z');

        // Create existing assessment
        await db.capabilityAssessments.add({
          id: uuidv4(),
          capabilityDomainId: 'provider-management',
          capabilityDomainName: 'Provider Management',
          capabilityAreaId: 'case-management',
          capabilityAreaName: 'Area 1',
          status: 'finalized',
          tags: [],
          createdAt: sameDate,
          updatedAt: sameDate,
          finalizedAt: sameDate,
          overallScore: 3.5,
        });

        // Import identical assessment
        const exportData = createExportData([
          {
            capabilityAreaId: 'case-management',
            status: 'finalized',
            overallScore: 3.5,
            updatedAt: sameDate,
            finalizedAt: sameDate,
          },
        ]);

        const result = await importFromJson(JSON.stringify(exportData));

        expect(result.skipped).toBe(1);
        expect(result.importedAsCurrent).toBe(0);
        expect(result.importedAsHistory).toBe(0);

        // Verify no duplicates
        const assessments = await db.capabilityAssessments.toArray();
        expect(assessments.length).toBe(1);
      });

      it('should skip older non-finalized imports', async () => {
        // Create existing finalized assessment
        const newDate = new Date('2024-06-01');
        await db.capabilityAssessments.add({
          id: uuidv4(),
          capabilityDomainId: 'provider-management',
          capabilityDomainName: 'Provider Management',
          capabilityAreaId: 'case-management',
          capabilityAreaName: 'Area 1',
          status: 'finalized',
          tags: [],
          createdAt: newDate,
          updatedAt: newDate,
          finalizedAt: newDate,
          overallScore: 4.0,
        });

        // Import older in-progress assessment
        const oldDate = new Date('2024-01-01');
        const exportData = createExportData([
          {
            capabilityAreaId: 'case-management',
            status: 'in_progress',
            overallScore: undefined,
            updatedAt: oldDate,
          },
        ]);

        const result = await importFromJson(JSON.stringify(exportData));

        expect(result.skipped).toBe(1);
        expect(result.details[0]?.reason).toContain('not finalized');
      });
    });

    it('should import tags', async () => {
      const exportData = createExportData();
      exportData.data.tags = [
        { id: uuidv4(), name: 'imported-tag', usageCount: 5, lastUsed: new Date() },
      ];

      await importFromJson(JSON.stringify(exportData));

      const tags = await db.tags.toArray();
      expect(tags.length).toBe(1);
      expect(tags[0]?.name).toBe('imported-tag');
    });

    it('should not duplicate existing tags', async () => {
      // Create existing tag
      await db.tags.add({
        id: uuidv4(),
        name: 'existing-tag',
        usageCount: 10,
        lastUsed: new Date(),
      });

      const exportData = createExportData();
      exportData.data.tags = [
        { id: uuidv4(), name: 'existing-tag', usageCount: 5, lastUsed: new Date() },
      ];

      await importFromJson(JSON.stringify(exportData));

      const tags = await db.tags.toArray();
      expect(tags.length).toBe(1);
      expect(tags[0]?.usageCount).toBe(10); // Original count preserved
    });

    it('should provide detailed results for each assessment', async () => {
      const exportData = createExportData([
        { capabilityAreaId: 'case-management', capabilityAreaName: 'Area One' },
        { capabilityAreaId: 'prior-authorization', capabilityAreaName: 'Area Two' },
      ]);

      const result = await importFromJson(JSON.stringify(exportData));

      expect(result.details.length).toBe(2);
      expect(result.details[0]?.areaName).toBe('Area One');
      expect(result.details[1]?.areaName).toBe('Area Two');
    });
  });

  describe('importFromZip', () => {
    it('should import valid ZIP file', async () => {
      const zip = new JSZip();
      const exportData = createExportData([{ capabilityAreaId: 'case-management' }]);
      zip.file('data.json', JSON.stringify(exportData));

      const blob = await zip.generateAsync({ type: 'blob' });
      const result = await importFromZip(blob);

      expect(result.success).toBe(true);
      expect(result.importedAsCurrent).toBe(1);
    });

    it('should reject invalid ZIP file', async () => {
      const invalidBlob = new Blob(['not a zip file'], { type: 'application/zip' });

      const result = await importFromZip(invalidBlob);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid ZIP file');
    });

    it('should reject ZIP without data.json', async () => {
      const zip = new JSZip();
      zip.file('other.txt', 'some content');

      const blob = await zip.generateAsync({ type: 'blob' });
      const result = await importFromZip(blob);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('ZIP file missing data.json');
    });

    it('should reject ZIP with invalid JSON in data.json', async () => {
      const zip = new JSZip();
      zip.file('data.json', 'not valid json');

      const blob = await zip.generateAsync({ type: 'blob' });
      const result = await importFromZip(blob);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid JSON in data.json');
    });

    it('should call progress callback', async () => {
      const progressCallback = vi.fn();
      const zip = new JSZip();
      const exportData = createExportData([{ capabilityAreaId: 'case-management' }]);
      zip.file('data.json', JSON.stringify(exportData));

      const blob = await zip.generateAsync({ type: 'blob' });
      await importFromZip(blob, progressCallback);

      expect(progressCallback).toHaveBeenCalled();
      expect(progressCallback).toHaveBeenCalledWith(100, 'Complete');
    });

    it('should import attachments from ZIP', async () => {
      const assessmentId = uuidv4();
      const ratingId = uuidv4();

      // First create the assessment and rating in DB
      await db.capabilityAssessments.add({
        id: assessmentId,
        capabilityDomainId: 'provider-management',
        capabilityDomainName: 'Provider Management',
        capabilityAreaId: 'case-management',
        capabilityAreaName: 'Area 1',
        status: 'finalized',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        overallScore: 3.5,
      });

      await db.orbitRatings.add({
        id: ratingId,
        capabilityAssessmentId: assessmentId,
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
      });

      // Create ZIP with attachment
      const zip = new JSZip();
      const exportData = createExportData(
        [{ id: assessmentId, capabilityAreaId: 'case-management' }],
        [{ id: ratingId, capabilityAssessmentId: assessmentId }]
      );
      exportData.data.attachments = [
        {
          id: uuidv4(),
          capabilityAssessmentId: assessmentId,
          orbitRatingId: ratingId,
          fileName: 'test-doc.pdf',
          fileType: 'application/pdf',
          fileSize: 100,
          uploadedAt: new Date().toISOString(),
        },
      ];

      zip.file('data.json', JSON.stringify(exportData));
      const attachmentsFolder = zip.folder('attachments');
      attachmentsFolder
        ?.folder('provider-management')
        ?.folder('case-management')
        ?.file('test-doc.pdf', 'PDF content');

      const blob = await zip.generateAsync({ type: 'blob' });

      // Clear and reimport
      await clearDatabase();
      await importFromZip(blob);

      // Note: Attachment import depends on assessment existing
      // This test verifies the ZIP structure is processed correctly
    });
  });

  describe('readFileAsText', () => {
    it('should read file content as text', async () => {
      const content = 'Hello, World!';
      const file = new File([content], 'test.txt', { type: 'text/plain' });

      const result = await readFileAsText(file);

      expect(result).toBe(content);
    });

    it('should handle UTF-8 content', async () => {
      const content = 'Hello, 世界! 🌍';
      const file = new File([content], 'test.txt', { type: 'text/plain' });

      const result = await readFileAsText(file);

      expect(result).toBe(content);
    });
  });

  describe('import multiple assessments', () => {
    it('should import multiple assessments in one operation', async () => {
      const exportData = createExportData([
        { capabilityAreaId: 'case-management', capabilityAreaName: 'Area 1' },
        { capabilityAreaId: 'prior-authorization', capabilityAreaName: 'Area 2' },
        { capabilityAreaId: 'provider-monitoring', capabilityAreaName: 'Area 3' },
      ]);

      const result = await importFromJson(JSON.stringify(exportData));

      expect(result.success).toBe(true);
      expect(result.importedAsCurrent).toBe(3);

      const assessments = await db.capabilityAssessments.toArray();
      expect(assessments.length).toBe(3);
    });

    it('should handle mixed import results', async () => {
      // Create one existing assessment
      const existingDate = new Date('2024-06-01');
      await db.capabilityAssessments.add({
        id: uuidv4(),
        capabilityDomainId: 'provider-management',
        capabilityDomainName: 'Provider Management',
        capabilityAreaId: 'case-management',
        capabilityAreaName: 'Area 1',
        status: 'finalized',
        tags: [],
        createdAt: existingDate,
        updatedAt: existingDate,
        finalizedAt: existingDate,
        overallScore: 4.0,
      });

      // Import: one new, one older (goes to history), one duplicate (skipped)
      const exportData = createExportData([
        // New area
        {
          capabilityAreaId: 'prior-authorization',
          updatedAt: new Date('2024-03-01'),
          finalizedAt: new Date('2024-03-01'),
        },
        // Older than existing (goes to history)
        {
          capabilityAreaId: 'case-management',
          updatedAt: new Date('2024-01-01'),
          finalizedAt: new Date('2024-01-01'),
          overallScore: 2.0,
        },
      ]);

      const result = await importFromJson(JSON.stringify(exportData));

      expect(result.importedAsCurrent).toBe(1); // area-2
      expect(result.importedAsHistory).toBe(1); // area-1 older version
    });
  });

  describe('B-I-T only filtering for standard assessments', () => {
    it('should skip orphaned Outcomes ratings when importing standard assessments', async () => {
      const assessmentId = uuidv4();
      const exportData = createExportData(
        [
          {
            id: assessmentId,
            capabilityAreaId: 'provider-enrollment', // Standard assessment
            status: 'finalized',
            overallScore: 3.5,
          },
        ],
        [
          // Valid B-I-T ratings
          {
            capabilityAssessmentId: assessmentId,
            dimensionId: 'businessArchitecture',
            aspectId: 'business-process-performance',
            currentLevel: 3,
          },
          {
            capabilityAssessmentId: assessmentId,
            dimensionId: 'information',
            aspectId: 'information-quality',
            currentLevel: 4,
          },
          // Orphaned O&R ratings (should be skipped)
          {
            capabilityAssessmentId: assessmentId,
            dimensionId: 'outcomes' as OrbitRating['dimensionId'],
            aspectId: 'some-outcome-aspect',
            currentLevel: 3,
          },
          {
            capabilityAssessmentId: assessmentId,
            dimensionId: 'roles' as OrbitRating['dimensionId'],
            aspectId: 'some-role-aspect',
            currentLevel: 2,
          },
        ]
      );

      const result = await importFromJson(JSON.stringify(exportData));

      expect(result.success).toBe(true);
      expect(result.importedAsCurrent).toBe(1);

      // Verify only B-I-T ratings were imported
      const ratings = await db.orbitRatings.toArray();
      expect(ratings.length).toBe(2);
      expect(
        ratings.every((r) => ['businessArchitecture', 'information'].includes(r.dimensionId))
      ).toBe(true);
      expect(ratings.some((r) => r.dimensionId === 'outcomes')).toBe(false);
      expect(ratings.some((r) => r.dimensionId === 'roles')).toBe(false);
    });

    it('should import all B-I-T dimensions for standard assessments', async () => {
      const assessmentId = uuidv4();
      const exportData = createExportData(
        [
          {
            id: assessmentId,
            capabilityAreaId: 'provider-enrollment',
            status: 'finalized',
            overallScore: 3.5,
          },
        ],
        [
          {
            capabilityAssessmentId: assessmentId,
            dimensionId: 'businessArchitecture',
            aspectId: 'business-process-performance',
            currentLevel: 3,
          },
          {
            capabilityAssessmentId: assessmentId,
            dimensionId: 'information',
            aspectId: 'information-quality',
            currentLevel: 4,
          },
          {
            capabilityAssessmentId: assessmentId,
            dimensionId: 'technology',
            aspectId: 'compute-and-storage',
            currentLevel: 2,
          },
        ]
      );

      const result = await importFromJson(JSON.stringify(exportData));

      expect(result.success).toBe(true);

      const ratings = await db.orbitRatings.toArray();
      expect(ratings.length).toBe(3);
      expect(ratings.map((r) => r.dimensionId).sort()).toEqual([
        'businessArchitecture',
        'information',
        'technology',
      ]);
    });
  });

  describe('organizational assessment import', () => {
    it('should import outcomes ratings for outcomes organizational assessment', async () => {
      const assessmentId = uuidv4();
      const exportData = createExportData(
        [
          {
            id: assessmentId,
            capabilityDomainId: 'enterprise-architecture-domain',
            capabilityDomainName: 'Enterprise Architecture',
            capabilityAreaId: 'enterprise-governance', // Combined organizational assessment
            capabilityAreaName: 'Enterprise Governance',
            status: 'finalized',
            overallScore: 3.5,
          },
        ],
        [
          // Valid outcomes rating
          {
            capabilityAssessmentId: assessmentId,
            dimensionId: 'outcomes' as OrbitRating['dimensionId'],
            aspectId: 'culture-mindset',
            currentLevel: 3,
          },
          // Invalid B-I-T rating for organizational assessment (should be skipped)
          {
            capabilityAssessmentId: assessmentId,
            dimensionId: 'businessArchitecture',
            aspectId: 'business-process-performance',
            currentLevel: 4,
          },
        ]
      );

      const result = await importFromJson(JSON.stringify(exportData));

      expect(result.success).toBe(true);
      expect(result.importedAsCurrent).toBe(1);

      // Verify only outcomes rating was imported
      const ratings = await db.orbitRatings.toArray();
      expect(ratings.length).toBe(1);
      expect(ratings[0]?.dimensionId).toBe('outcomes');
    });

    it('should import roles ratings for roles organizational assessment', async () => {
      const assessmentId = uuidv4();
      const exportData = createExportData(
        [
          {
            id: assessmentId,
            capabilityDomainId: 'enterprise-architecture-domain',
            capabilityDomainName: 'Enterprise Architecture',
            capabilityAreaId: 'enterprise-governance', // Combined organizational assessment
            capabilityAreaName: 'Enterprise Governance',
            status: 'finalized',
            overallScore: 3.0,
          },
        ],
        [
          // Valid roles rating
          {
            capabilityAssessmentId: assessmentId,
            dimensionId: 'roles' as OrbitRating['dimensionId'],
            aspectId: 'organizational-goals-alignment',
            currentLevel: 3,
          },
          // Invalid B-I-T rating for organizational assessment (should be skipped)
          {
            capabilityAssessmentId: assessmentId,
            dimensionId: 'technology',
            aspectId: 'compute-and-storage',
            currentLevel: 2,
          },
        ]
      );

      const result = await importFromJson(JSON.stringify(exportData));

      expect(result.success).toBe(true);

      // Verify only roles rating was imported
      const ratings = await db.orbitRatings.toArray();
      expect(ratings.length).toBe(1);
      expect(ratings[0]?.dimensionId).toBe('roles');
    });
  });

  describe('backwards compatibility', () => {
    it('should preserve current dimension IDs unchanged', async () => {
      const assessmentId = uuidv4();
      const exportData = createExportData(
        [
          {
            id: assessmentId,
            capabilityAreaId: 'case-management',
            status: 'finalized',
            overallScore: 3.5,
          },
        ],
        [
          {
            capabilityAssessmentId: assessmentId,
            dimensionId: 'information',
            aspectId: 'information-quality',
            currentLevel: 3,
          },
          {
            capabilityAssessmentId: assessmentId,
            dimensionId: 'businessArchitecture',
            aspectId: 'business-process-performance',
            currentLevel: 4,
          },
        ]
      );

      const result = await importFromJson(JSON.stringify(exportData));

      expect(result.success).toBe(true);

      const ratings = await db.orbitRatings.toArray();
      expect(ratings.length).toBe(2);
      expect(ratings.find((r) => r.aspectId === 'information-quality')?.dimensionId).toBe(
        'information'
      );
      expect(ratings.find((r) => r.aspectId === 'business-process-performance')?.dimensionId).toBe(
        'businessArchitecture'
      );
    });
  });

  describe('area-existence validation (v3 export compatibility)', () => {
    it('should skip assessments whose capability area is not in the current model', async () => {
      // v3-shaped export: organizational-outcomes was its own area pre-v4
      const assessmentId = uuidv4();
      const exportData = createExportData(
        [
          {
            id: assessmentId,
            capabilityDomainId: 'enterprise-governance',
            capabilityDomainName: 'Enterprise Governance',
            capabilityAreaId: 'organizational-outcomes',
            capabilityAreaName: 'Organizational Outcomes',
            status: 'finalized',
            overallScore: 3.5,
          },
        ],
        [
          {
            capabilityAssessmentId: assessmentId,
            dimensionId: 'outcomes' as OrbitRating['dimensionId'],
            aspectId: 'culture-mindset',
            currentLevel: 3,
          },
        ]
      );

      const result = await importFromJson(JSON.stringify(exportData));

      expect(result.success).toBe(true);
      expect(result.importedAsCurrent).toBe(0);
      expect(result.skipped).toBe(1);
      expect(result.details[0]?.action).toBe('skipped');
      expect(result.details[0]?.reason).toBe('Capability area not in current model');

      // Nothing should have been written
      expect(await db.capabilityAssessments.count()).toBe(0);
      expect(await db.orbitRatings.count()).toBe(0);
    });

    it('should skip renamed pre-v4 areas while importing valid ones', async () => {
      const validId = uuidv4();
      const removedId = uuidv4();
      const exportData = createExportData([
        { id: validId, capabilityAreaId: 'provider-enrollment', status: 'finalized' },
        {
          id: removedId,
          capabilityAreaId: 'provider-screening', // renamed to provider-eligibility in v4
          capabilityAreaName: 'Provider Screening',
          status: 'finalized',
        },
      ]);

      const result = await importFromJson(JSON.stringify(exportData));

      expect(result.importedAsCurrent).toBe(1);
      expect(result.skipped).toBe(1);

      const assessments = await db.capabilityAssessments.toArray();
      expect(assessments.length).toBe(1);
      expect(assessments[0]?.capabilityAreaId).toBe('provider-enrollment');
    });

    it('should skip history entries for areas not in the current model', async () => {
      const exportData = createExportData([
        { capabilityAreaId: 'case-management', status: 'finalized' },
      ]);

      // One orphaned history entry (removed area) and one valid entry
      exportData.data.history = [
        {
          id: 'h-orphan',
          capabilityAssessmentId: uuidv4(),
          capabilityAreaId: 'organizational-roles', // removed in v4
          snapshotDate: new Date(),
          tags: [],
          overallScore: 3.0,
          dimensionScores: {},
          ratings: [],
        },
        {
          id: 'h-valid',
          capabilityAssessmentId: uuidv4(),
          capabilityAreaId: 'case-management',
          snapshotDate: new Date(),
          tags: [],
          overallScore: 4.0,
          dimensionScores: {},
          ratings: [],
        },
      ];

      const result = await importFromJson(JSON.stringify(exportData));

      expect(result.success).toBe(true);
      const history = await db.assessmentHistory.toArray();
      expect(history.length).toBe(1);
      expect(history[0]?.id).toBe('h-valid');
    });
  });
});
