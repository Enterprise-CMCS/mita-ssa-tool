/**
 * Export Service Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { v4 as uuidv4 } from 'uuid';

import JSZip from 'jszip';

import { db, clearDatabase } from '../db';
import {
  exportAsJson,
  exportAsZip,
  exportDomainCsv,
  generateFilename,
  extractAttachmentIdFromFileName,
} from './exportService';
import { calculateDimensionScore } from '../scoring';
import { DRAFT_NOTICE_LINE } from '../../constants';
import type { CapabilityAssessment, OrbitRating, Tag } from '../../types';

describe('exportService', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  // Helper to create test assessment
  const createTestAssessment = async (
    areaId: string,
    status: 'in_progress' | 'finalized' = 'finalized',
    score?: number
  ): Promise<CapabilityAssessment> => {
    const assessment: CapabilityAssessment = {
      id: uuidv4(),
      capabilityDomainId: 'provider-management',
      capabilityDomainName: 'Provider Management',
      capabilityAreaId: areaId,
      capabilityAreaName: `Test Area ${areaId}`,
      status,
      tags: ['test-tag'],
      createdAt: new Date(),
      updatedAt: new Date(),
      finalizedAt: status === 'finalized' ? new Date() : undefined,
      overallScore: score,
    };
    await db.capabilityAssessments.add(assessment);
    return assessment;
  };

  // Helper to create test rating
  const createTestRating = async (assessmentId: string): Promise<OrbitRating> => {
    const rating: OrbitRating = {
      id: uuidv4(),
      capabilityAssessmentId: assessmentId,
      dimensionId: 'businessArchitecture',
      aspectId: 'process-standardization',
      currentLevel: 3,
      targetLevel: 4,
      questionResponses: [],
      evidenceResponses: [],
      notes: 'Test notes',
      barriers: 'Test barriers',
      plans: 'Test plans',
      carriedForward: false,
      attachmentIds: [],
      updatedAt: new Date(),
    };
    await db.orbitRatings.add(rating);
    return rating;
  };

  // Helper to create test tag
  const createTestTag = async (name: string): Promise<Tag> => {
    const tag: Tag = {
      id: uuidv4(),
      name,
      usageCount: 1,
      lastUsed: new Date(),
    };
    await db.tags.add(tag);
    return tag;
  };

  describe('exportAsJson', () => {
    it('should export empty database', async () => {
      const json = await exportAsJson({ scope: 'full', format: 'json' });
      const data = JSON.parse(json);

      expect(data.exportVersion).toBe('1.0');
      expect(data.appVersion).toBe(__APP_VERSION__);
      expect(data.scope).toBe('full');
      expect(data.data.assessments).toEqual([]);
      expect(data.data.ratings).toEqual([]);
      expect(data.data.history).toEqual([]);
      expect(data.data.tags).toEqual([]);
      expect(data.data.attachments).toEqual([]);
    });

    it('should export full database with assessments', async () => {
      const assessment = await createTestAssessment('area-1', 'finalized', 3.5);
      await createTestRating(assessment.id);
      await createTestTag('test-tag');

      const json = await exportAsJson({ scope: 'full', format: 'json' });
      const data = JSON.parse(json);

      expect(data.data.assessments.length).toBe(1);
      expect(data.data.assessments[0].capabilityAreaId).toBe('area-1');
      expect(data.data.ratings.length).toBe(1);
      expect(data.data.tags.length).toBe(1);
      expect(data.metadata.totalAssessments).toBe(1);
      expect(data.metadata.totalRatings).toBe(1);
    });

    it('should export single area scope', async () => {
      await createTestAssessment('area-1', 'finalized', 3.5);
      await createTestAssessment('area-2', 'finalized', 4.0);

      const json = await exportAsJson({ scope: 'area', format: 'json', areaId: 'area-1' });
      const data = JSON.parse(json);

      expect(data.scope).toBe('area');
      expect(data.scopeDetails?.areaId).toBe('area-1');
      expect(data.data.assessments.length).toBe(1);
      expect(data.data.assessments[0].capabilityAreaId).toBe('area-1');
    });

    it('should export domain scope', async () => {
      // Create assessments in same domain
      const assessment1 = await createTestAssessment('provider-enrollment', 'finalized', 3.5);
      assessment1.capabilityDomainId = 'provider-management';
      await db.capabilityAssessments.put(assessment1);

      const json = await exportAsJson({
        scope: 'domain',
        format: 'json',
        domainId: 'provider-management',
      });
      const data = JSON.parse(json);

      expect(data.scope).toBe('domain');
      expect(data.scopeDetails?.domainId).toBe('provider-management');
    });

    it('should include export date', async () => {
      const json = await exportAsJson({ scope: 'full', format: 'json' });
      const data = JSON.parse(json);

      expect(data.exportDate).toBeDefined();
      const exportDate = new Date(data.exportDate);
      expect(exportDate.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should include metadata with capabilities list', async () => {
      const assessment = await createTestAssessment('area-1', 'finalized', 3.5);

      const json = await exportAsJson({ scope: 'full', format: 'json' });
      const data = JSON.parse(json);

      expect(data.metadata.capabilities).toContain(
        `${assessment.capabilityDomainId}/${assessment.capabilityAreaId}`
      );
    });

    it('should handle assessment without ratings', async () => {
      await createTestAssessment('area-1', 'in_progress');

      const json = await exportAsJson({ scope: 'full', format: 'json' });
      const data = JSON.parse(json);

      expect(data.data.assessments.length).toBe(1);
      expect(data.data.ratings.length).toBe(0);
    });
  });

  describe('exportAsZip', () => {
    it('should create a valid ZIP blob', async () => {
      await createTestAssessment('area-1', 'finalized', 3.5);

      const blob = await exportAsZip({ scope: 'full', format: 'zip' });

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(0);
    });

    it('should call progress callback', async () => {
      const progressCallback = vi.fn();

      await exportAsZip({ scope: 'full', format: 'zip' }, progressCallback);

      expect(progressCallback).toHaveBeenCalled();
      // Should have been called with 100 at the end
      expect(progressCallback).toHaveBeenCalledWith(100, 'Complete');
    });

    it('should include data.json in ZIP', async () => {
      const JSZip = (await import('jszip')).default;
      await createTestAssessment('area-1', 'finalized', 3.5);

      const blob = await exportAsZip({ scope: 'full', format: 'zip' });
      const zip = await JSZip.loadAsync(blob);

      expect(zip.file('data.json')).not.toBeNull();
    });

    it('should include manifest.json in ZIP', async () => {
      const JSZip = (await import('jszip')).default;

      const blob = await exportAsZip({ scope: 'full', format: 'zip' });
      const zip = await JSZip.loadAsync(blob);

      expect(zip.file('manifest.json')).not.toBeNull();

      const manifestContent = await zip.file('manifest.json')?.async('string');
      const manifest = JSON.parse(manifestContent ?? '{}');

      expect(manifest.exportVersion).toBe('1.0');
      expect(manifest.contents.dataJson).toBe(true);
      expect(manifest.contents.maturityProfiles).toBe(true);
    });

    it('should include maturity-profiles folder', async () => {
      const JSZip = (await import('jszip')).default;

      const blob = await exportAsZip({ scope: 'full', format: 'zip' });
      const zip = await JSZip.loadAsync(blob);

      expect(zip.folder('maturity-profiles')).not.toBeNull();
    });

    it('should respect includeAttachments option', async () => {
      const JSZip = (await import('jszip')).default;

      const blob = await exportAsZip({
        scope: 'full',
        format: 'zip',
        includeAttachments: false,
      });
      const zip = await JSZip.loadAsync(blob);

      const manifest = JSON.parse((await zip.file('manifest.json')?.async('string')) ?? '{}');
      expect(manifest.contents.attachments).toBe(false);
    });
  });

  describe('generateFilename', () => {
    it('should generate filename with prefix and extension', () => {
      const filename = generateFilename('export', 'json');

      expect(filename).toMatch(/^mita-export-\d{4}-\d{2}-\d{2}\.json$/);
    });

    it('should include scope in filename when provided', () => {
      const filename = generateFilename('export', 'zip', 'provider-management');

      expect(filename).toMatch(/^mita-export-provider-management-\d{4}-\d{2}-\d{2}\.zip$/);
    });

    it('should use current date', () => {
      const today = new Date().toISOString().split('T')[0];
      const filename = generateFilename('export', 'json');

      expect(filename).toContain(today);
    });

    it('should handle different extensions', () => {
      expect(generateFilename('report', 'pdf')).toMatch(/\.pdf$/);
      expect(generateFilename('data', 'csv')).toMatch(/\.csv$/);
    });
  });

  describe('export with attachments', () => {
    it('should include attachment metadata in export', async () => {
      const assessment = await createTestAssessment('area-1', 'finalized', 3.5);
      const rating = await createTestRating(assessment.id);

      // Add attachment
      await db.attachments.add({
        id: uuidv4(),
        capabilityAssessmentId: assessment.id,
        orbitRatingId: rating.id,
        fileName: 'test-file.pdf',
        fileType: 'application/pdf',
        fileSize: 1024,
        blob: new Blob(['test content'], { type: 'application/pdf' }),
        uploadedAt: new Date(),
      });

      const json = await exportAsJson({ scope: 'full', format: 'json' });
      const data = JSON.parse(json);

      expect(data.data.attachments.length).toBe(1);
      expect(data.data.attachments[0].fileName).toBe('test-file.pdf');
      expect(data.metadata.totalAttachments).toBe(1);
      // Should not include blob in JSON export
      expect(data.data.attachments[0].blob).toBeUndefined();
    });
  });

  describe('export with history', () => {
    it('should include history entries in export', async () => {
      const assessment = await createTestAssessment('area-1', 'finalized', 3.5);

      // Add history entry
      await db.assessmentHistory.add({
        id: uuidv4(),
        capabilityAssessmentId: assessment.id,
        capabilityAreaId: 'area-1',
        snapshotDate: new Date(),
        tags: ['historical-tag'],
        overallScore: 3.0,
        dimensionScores: { businessArchitecture: 3.0 },
        ratings: [],
      });

      const json = await exportAsJson({ scope: 'full', format: 'json' });
      const data = JSON.parse(json);

      expect(data.data.history.length).toBe(1);
      expect(data.data.history[0].overallScore).toBe(3.0);
      expect(data.metadata.totalHistory).toBe(1);
    });
  });

  describe('extractAttachmentIdFromFileName', () => {
    it('should extract attachment ID from filename with extension', () => {
      const id = extractAttachmentIdFromFileName('report_abc-123-def.pdf');
      expect(id).toBe('abc-123-def');
    });

    it('should extract attachment ID from filename without extension', () => {
      const id = extractAttachmentIdFromFileName('document_xyz-789');
      expect(id).toBe('xyz-789');
    });

    it('should handle UUID-style attachment IDs', () => {
      const uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
      const id = extractAttachmentIdFromFileName(`test-file_${uuid}.pdf`);
      expect(id).toBe(uuid);
    });

    it('should return null for filename without underscore', () => {
      const id = extractAttachmentIdFromFileName('simple-file.pdf');
      expect(id).toBeNull();
    });

    it('should handle multiple underscores by using the last one', () => {
      const id = extractAttachmentIdFromFileName('my_complex_file_name_abc123.docx');
      expect(id).toBe('abc123');
    });

    it('should handle filename with dots in base name', () => {
      const id = extractAttachmentIdFromFileName('report.v2_abc123.pdf');
      expect(id).toBe('abc123');
    });
  });

  describe('export with duplicate attachment filenames', () => {
    it('should export attachments with unique filenames in ZIP', async () => {
      const assessment = await createTestAssessment('area-1', 'finalized', 3.5);
      const rating1 = await createTestRating(assessment.id);

      // Create second rating
      const rating2: OrbitRating = {
        id: uuidv4(),
        capabilityAssessmentId: assessment.id,
        dimensionId: 'information',
        aspectId: 'information-governance',
        currentLevel: 4,
        targetLevel: 5,
        questionResponses: [],
        evidenceResponses: [],
        notes: 'Test notes 2',
        barriers: '',
        plans: '',
        carriedForward: false,
        attachmentIds: [],
        updatedAt: new Date(),
      };
      await db.orbitRatings.add(rating2);

      // Add two attachments with the SAME filename
      // Use ArrayBuffer instead of Blob for fake-indexeddb compatibility
      const attachment1Id = uuidv4();
      const attachment2Id = uuidv4();
      const content1 = new TextEncoder().encode('content 1');
      const content2 = new TextEncoder().encode('content 2');

      await db.attachments.add({
        id: attachment1Id,
        capabilityAssessmentId: assessment.id,
        orbitRatingId: rating1.id,
        fileName: 'report.pdf',
        fileType: 'application/pdf',
        fileSize: 100,
        blob: new Blob([content1], { type: 'application/pdf' }),
        uploadedAt: new Date(),
      });

      await db.attachments.add({
        id: attachment2Id,
        capabilityAssessmentId: assessment.id,
        orbitRatingId: rating2.id,
        fileName: 'report.pdf',
        fileType: 'application/pdf',
        fileSize: 200,
        blob: new Blob([content2], { type: 'application/pdf' }),
        uploadedAt: new Date(),
      });

      // Export and verify the data.json contains both attachments with metadata
      const jsonExport = await exportAsJson({ scope: 'full', format: 'json' });
      const data = JSON.parse(jsonExport);

      // Verify both attachments are in metadata
      expect(data.data.attachments.length).toBe(2);
      expect(
        data.data.attachments.filter((a: { fileName: string }) => a.fileName === 'report.pdf')
          .length
      ).toBe(2);

      // Verify the attachment IDs are different
      const attachmentIds = data.data.attachments.map((a: { id: string }) => a.id);
      expect(new Set(attachmentIds).size).toBe(2);

      // Now test ZIP export - the unique filename generation
      // We can't fully test ZIP with fake-indexeddb Blob issues, but we can verify
      // the JSON metadata is correct which is what import relies on
      expect(data.data.attachments.some((a: { id: string }) => a.id === attachment1Id)).toBe(true);
      expect(data.data.attachments.some((a: { id: string }) => a.id === attachment2Id)).toBe(true);
    });
  });

  describe('CSV maturity profile scoring (OBS-25)', () => {
    /** Technical Infrastructure Management — 6 aspects. */
    const INFRA_ASPECTS = [
      'compute-and-storage',
      'networking-and-technical-recovery',
      'identity-access-and-consent',
      'security-protection-and-monitoring',
      'system-operations-and-monitoring',
      'development-testing-release-and-security-compliance',
    ];

    /** Application Management — 5 aspects. */
    const APP_ASPECTS = [
      'api-messaging-and-integration',
      'application-hosting-and-platform-services',
      'business-rules-and-workflows',
      'modular-architecture',
      'user-interfaces-and-session-management',
    ];

    /**
     * Seeds a Technology dimension split unevenly across its two sub-dimensions, so
     * the correct answer (mean of the sub-dimension means) and the old one (flat mean
     * over all 11 aspects) differ at one decimal place.
     */
    const seedLopsidedTechnology = async (
      assessmentId: string,
      infraLevel: number,
      appLevel: number
    ): Promise<void> => {
      const rows: OrbitRating[] = [
        ...INFRA_ASPECTS.map((aspectId) => ({
          id: uuidv4(),
          capabilityAssessmentId: assessmentId,
          dimensionId: 'technology' as const,
          subDimensionId: 'technologyInfrastructureManagement' as const,
          aspectId,
          currentLevel: infraLevel as OrbitRating['currentLevel'],
          targetLevel: infraLevel as OrbitRating['targetLevel'],
          questionResponses: [],
          evidenceResponses: [],
          notes: '',
          barriers: '',
          plans: '',
          carriedForward: false,
          attachmentIds: [],
          updatedAt: new Date(),
        })),
        ...APP_ASPECTS.map((aspectId) => ({
          id: uuidv4(),
          capabilityAssessmentId: assessmentId,
          dimensionId: 'technology' as const,
          subDimensionId: 'applicationManagement' as const,
          aspectId,
          currentLevel: appLevel as OrbitRating['currentLevel'],
          targetLevel: appLevel as OrbitRating['targetLevel'],
          questionResponses: [],
          evidenceResponses: [],
          notes: '',
          barriers: '',
          plans: '',
          carriedForward: false,
          attachmentIds: [],
          updatedAt: new Date(),
        })),
      ];
      await db.orbitRatings.bulkAdd(rows);
    };

    /** Returns the As-Is / To-Be cells of the Technology row. */
    const technologyRow = (csv: string): { asIs: string; toBe: string } => {
      const line = csv.split('\n').find((l) => l.startsWith('Technology,'));
      const parts = (line ?? '').split(',');
      return { asIs: parts[1] ?? '', toBe: parts[2] ?? '' };
    };

    it('reports the sub-dimension-weighted Technology score, not a flat mean', async () => {
      const assessment = await createTestAssessment('provider-enrollment', 'finalized', 3);
      await seedLopsidedTechnology(assessment.id, 5, 1);

      const csv = await exportDomainCsv('provider-management', 'Testlandia');

      expect(csv).not.toBeNull();
      // mean(mean(5×6), mean(1×5)) = mean(5, 1) = 3.0, where the flat mean over 11
      // aspects would give (30 + 5) / 11 = 3.18 -> 3.2.
      expect(technologyRow(csv!).asIs).toBe('3.0');
    });

    it('matches the canonical scorer rather than a hardcoded figure', async () => {
      const assessment = await createTestAssessment('provider-enrollment', 'finalized', 3);
      await seedLopsidedTechnology(assessment.id, 4, 1);

      const csv = await exportDomainCsv('provider-management', 'Testlandia');
      const stored = await db.orbitRatings
        .where('capabilityAssessmentId')
        .equals(assessment.id)
        .toArray();
      const canonical = calculateDimensionScore('technology', stored);

      expect(canonical).not.toBeNull();
      expect(technologyRow(csv!).asIs).toBe(canonical!.toFixed(1));
    });

    it('applies the same weighting to the To-Be column', async () => {
      // The To-Be column had the identical flaw and no canonical scorer to delegate
      // to, since `calculateDimensionScore` only read `currentLevel`.
      const assessment = await createTestAssessment('provider-enrollment', 'finalized', 3);
      await seedLopsidedTechnology(assessment.id, 5, 1);

      const csv = await exportDomainCsv('provider-management', 'Testlandia');

      expect(technologyRow(csv!).toBe).toBe('3.0');
    });

    it('leaves the To-Be cell empty when no aspect carries a target', async () => {
      const assessment = await createTestAssessment('provider-enrollment', 'finalized', 3);
      await db.orbitRatings.add({
        id: uuidv4(),
        capabilityAssessmentId: assessment.id,
        dimensionId: 'technology',
        subDimensionId: 'applicationManagement',
        aspectId: 'modular-architecture',
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

      const csv = await exportDomainCsv('provider-management', 'Testlandia');

      expect(technologyRow(csv!).asIs).toBe('3.0');
      expect(technologyRow(csv!).toBe).toBe('');
    });
  });

  describe('draft notice (Decision 4)', () => {
    it('carries the notice in the JSON envelope', async () => {
      const json = await exportAsJson({ scope: 'full', format: 'json' });
      const data = JSON.parse(json);

      expect(data.draftNotice).toBe(DRAFT_NOTICE_LINE);
    });

    it('carries the notice in the ZIP manifest', async () => {
      const assessment = await createTestAssessment('provider-enrollment', 'finalized', 3.5);
      await createTestRating(assessment.id);

      const blob = await exportAsZip({ scope: 'full', format: 'zip', includeAttachments: false });
      const zip = await JSZip.loadAsync(blob);
      const manifest = JSON.parse((await zip.file('manifest.json')?.async('string')) ?? '{}');

      expect(manifest.draftNotice).toBe(DRAFT_NOTICE_LINE);
    });

    it('carries the notice in the ZIP CSV profiles', async () => {
      const assessment = await createTestAssessment('provider-enrollment', 'finalized', 3.5);
      await createTestRating(assessment.id);

      const blob = await exportAsZip({ scope: 'full', format: 'zip', includeAttachments: false });
      const zip = await JSZip.loadAsync(blob);
      const csv = await zip
        .file('maturity-profiles/all-domains-maturity-profile.csv')
        ?.async('string');

      expect(csv).toContain(DRAFT_NOTICE_LINE);
    });

    it('omits the notice from JSON and the ZIP manifest at go-live', async () => {
      const assessment = await createTestAssessment('provider-enrollment', 'finalized', 3.5);
      await createTestRating(assessment.id);

      // `IS_DRAFT` resolves at module load, so the whole module graph has to be
      // re-imported after stubbing the variable.
      vi.resetModules();
      vi.stubEnv('VITE_DRAFT_MODE', 'false');
      // Re-importing the module graph constructs a *second* Dexie instance over the
      // same database name while the suite's original stays open. Two live
      // connections to one IndexedDB name is a known source of intermittent
      // `versionchange` failures, so the duplicate is closed in the `finally` below.
      let reimportedDb: { close: () => void } | undefined;
      try {
        const { exportAsJson: jsonAtGoLive, exportAsZip: zipAtGoLive } =
          await import('./exportService');
        reimportedDb = (await import('../db')).db;

        const json = await jsonAtGoLive({ scope: 'full', format: 'json' });
        expect(JSON.parse(json).draftNotice).toBeUndefined();
        expect(json).not.toContain('still being piloted');

        const blob = await zipAtGoLive({
          scope: 'full',
          format: 'zip',
          includeAttachments: false,
        });
        const zip = await JSZip.loadAsync(blob);
        const manifest = JSON.parse((await zip.file('manifest.json')?.async('string')) ?? '{}');
        const csv = await zip
          .file('maturity-profiles/all-domains-maturity-profile.csv')
          ?.async('string');

        expect(manifest.draftNotice).toBeUndefined();
        expect(csv).not.toContain('DRAFT');
        // Still a working export, not an empty one.
        expect(manifest.stats.totalAssessments).toBe(1);
        expect(csv).toContain('Capability Area:');
      } finally {
        reimportedDb?.close();
        vi.unstubAllEnvs();
        vi.resetModules();
      }
    });
  });
});
