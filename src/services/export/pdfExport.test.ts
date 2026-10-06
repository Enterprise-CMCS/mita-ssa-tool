/**
 * PDF Export Tests
 *
 * These assert on the **content of a real generated PDF**, not on mocked jsPDF
 * calls. `buildPdfDocument` returns the document before serialisation and jsPDF
 * writes uncompressed output, so the text lands in the content stream as readable
 * `(...) Tj` operators and `doc.output()` can be searched.
 *
 * What that does and does not prove: it proves a string was written into the
 * document. It does not prove the string is legible, correctly positioned, or on the
 * page a reader expects. Layout is checked by opening a generated file — see the
 * Wave 5 notes in `docs/decisions/PILOT_CLEARANCE_PLAN.md`.
 *
 * The `Blob` from `generatePdfReport` is deliberately not used here. Its bytes are
 * intact — `blob.size` matches `doc.output().length` — but jsdom implements neither
 * `Blob.text()` nor `Blob.arrayBuffer()`, so reading it takes a `FileReader` and an
 * async hop for no gain. Do not conclude from this that the Blob is empty: an
 * earlier version of this comment said so, having measured
 * `String(blob).length`, which is 13 because it is `"[object Blob]"`.
 */

import { describe, it, expect, vi } from 'vitest';

import {
  buildPdfDocument,
  summariseDimensionsAcrossAreas,
  type DimensionSummaryRow,
} from './pdfExport';
import { calculateDimensionScore } from '../scoring';
import { DRAFT_NOTICE_SHORT_LINE } from '../../constants';
import type { ExportData, ExportOptions } from './types';
import type { CapabilityAssessment, OrbitDimensionId, OrbitRating } from '../../types';

const OPTIONS: ExportOptions = { scope: 'full', format: 'pdf', stateName: 'Testlandia' };

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

function makeAssessment(overrides: Partial<CapabilityAssessment> = {}): CapabilityAssessment {
  return {
    id: 'assessment-1',
    capabilityDomainId: 'provider-management',
    capabilityDomainName: 'Provider Management',
    capabilityAreaId: 'provider-enrollment',
    capabilityAreaName: 'Provider Enrollment',
    status: 'finalized',
    tags: [],
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
    finalizedAt: new Date('2026-01-02'),
    overallScore: 3,
    ...overrides,
  };
}

function makeRating(overrides: Partial<OrbitRating> & Pick<OrbitRating, 'aspectId'>): OrbitRating {
  return {
    id: `rating-${overrides.aspectId}-${overrides.subDimensionId ?? 'none'}`,
    capabilityAssessmentId: 'assessment-1',
    dimensionId: 'technology',
    currentLevel: 0,
    questionResponses: [],
    evidenceResponses: [],
    notes: '',
    barriers: '',
    plans: '',
    carriedForward: false,
    attachmentIds: [],
    updatedAt: new Date('2026-01-02'),
    ...overrides,
  };
}

function makeExportData(
  assessments: CapabilityAssessment[],
  ratings: OrbitRating[],
  extra: Partial<ExportData> = {}
): ExportData {
  return {
    exportVersion: '1.0',
    exportDate: '2026-09-10T00:00:00.000Z',
    appVersion: '4.0.0',
    scope: 'full',
    data: { assessments, ratings, history: [], tags: [], attachments: [] },
    metadata: {
      totalAssessments: assessments.length,
      totalRatings: ratings.length,
      totalHistory: 0,
      totalAttachments: 0,
      capabilities: assessments.map((a) => `${a.capabilityDomainId}/${a.capabilityAreaId}`),
    },
    ...extra,
  };
}

/**
 * Returns the document's content stream with PDF string escapes undone.
 *
 * Text is stored in PDF literal strings delimited by parentheses, so an actual
 * parenthesis in the content is written escaped: `(Avg: 3.0)` appears in the file as
 * `\(Avg: 3.0\)`. Without this, every assertion involving a bracketed score silently
 * fails to match while assertions on plain words pass — which reads like a bug in
 * the exporter rather than in the test.
 */
function pdfText(doc: ReturnType<typeof buildPdfDocument>): string {
  return doc.output().replace(/\\([()\\])/g, '$1');
}

/** Renders the document and returns its searchable content stream. */
function render(data: ExportData, options: ExportOptions = OPTIONS): string {
  return pdfText(buildPdfDocument(data, options));
}

describe('pdfExport', () => {
  describe('Technology dimension weighting (OBS-25)', () => {
    /**
     * Infrastructure (6 aspects) all at 5, Application (5 aspects) all at 1.
     *
     * Canonical: mean(mean(5×6), mean(1×5)) = mean(5, 1) = 3.0
     * Flat mean: (6×5 + 5×1) / 11 = 3.18 → 3.2
     *
     * The two differ by weighting, not rounding, so the gap does not close with more
     * data. This fixture is chosen so the correct and incorrect answers are
     * distinguishable at one decimal place.
     */
    const technologyRatings = [
      ...INFRA_ASPECTS.map((aspectId) =>
        makeRating({
          aspectId,
          subDimensionId: 'technologyInfrastructureManagement',
          currentLevel: 5,
          targetLevel: 5,
        })
      ),
      ...APP_ASPECTS.map((aspectId) =>
        makeRating({
          aspectId,
          subDimensionId: 'applicationManagement',
          currentLevel: 1,
          targetLevel: 1,
        })
      ),
    ];

    it('prints the sub-dimension-weighted score, not a flat mean over 11 aspects', () => {
      const pdf = render(makeExportData([makeAssessment()], technologyRatings));

      expect(pdf).toContain('(Avg: 3.0)');
      expect(pdf).not.toContain('(Avg: 3.2)');
    });

    it('agrees with the canonical scorer rather than hardcoding an expected number', () => {
      const canonical = calculateDimensionScore('technology', technologyRatings);
      const pdf = render(makeExportData([makeAssessment()], technologyRatings));

      // Pinning against `calculateDimensionScore` rather than a literal means a future
      // change to the canonical rule cannot leave export behind, which is the failure
      // OBS-21 and OBS-25 both describe.
      expect(canonical).not.toBeNull();
      expect(pdf).toContain(`(Avg: ${canonical!.toFixed(1)})`);
    });

    it('excludes N/A and unassessed aspects from the dimension average', () => {
      // Two assessed Information aspects at 4 and 2 (mean 3.0), plus one N/A and one
      // untouched. If either sentinel leaked in, the mean would move.
      const ratings = [
        makeRating({
          dimensionId: 'information',
          aspectId: 'information-classification',
          currentLevel: 4,
        }),
        makeRating({
          dimensionId: 'information',
          aspectId: 'information-quality',
          currentLevel: 2,
        }),
        makeRating({
          dimensionId: 'information',
          aspectId: 'information-analysis',
          currentLevel: -1,
        }),
        makeRating({
          dimensionId: 'information',
          aspectId: 'information-exchange',
          currentLevel: 0,
        }),
      ];

      const pdf = render(makeExportData([makeAssessment()], ratings));

      expect(pdf).toContain('(Avg: 3.0)');
    });
  });

  /**
   * The enterprise-wide figure is the mean of the per-area dimension scores, so every
   * area counts once. Asserted through `summariseDimensionsAcrossAreas` rather than by
   * grepping the rendered table, because a bare "2.0" matched against a document full
   * of scores is a test that can pass for the wrong reason.
   */
  describe('ORBIT Dimension Summary (OBS-25 follow-on)', () => {
    const summaryFor = (
      assessments: CapabilityAssessment[],
      ratings: OrbitRating[],
      extra: Partial<ExportData> = {}
    ): Map<OrbitDimensionId, DimensionSummaryRow> => {
      const rows = summariseDimensionsAcrossAreas(makeExportData(assessments, ratings, extra));
      return new Map(rows.map((row) => [row.dimensionId, row] as const));
    };

    it('weights each area equally rather than by how many aspects it filled in', () => {
      // Area 1: Infrastructure 6×5 and Application 5×1 -> per-area Technology 3.0
      // Area 2: a single Infrastructure aspect at 1    -> per-area Technology 1.0
      // Mean of per-area scores: 2.0
      // Old flat mean over all 12 ratings: (30 + 5 + 1) / 12 = 3.0
      const a1 = makeAssessment({ id: 'a1' });
      const a2 = makeAssessment({ id: 'a2', capabilityAreaName: 'Provider Eligibility' });

      const ratings = [
        ...INFRA_ASPECTS.map((aspectId) =>
          makeRating({
            id: `a1-${aspectId}`,
            capabilityAssessmentId: 'a1',
            aspectId,
            subDimensionId: 'technologyInfrastructureManagement',
            currentLevel: 5,
          })
        ),
        ...APP_ASPECTS.map((aspectId) =>
          makeRating({
            id: `a1-${aspectId}`,
            capabilityAssessmentId: 'a1',
            aspectId,
            subDimensionId: 'applicationManagement',
            currentLevel: 1,
          })
        ),
        makeRating({
          id: 'a2-compute',
          capabilityAssessmentId: 'a2',
          aspectId: 'compute-and-storage',
          subDimensionId: 'technologyInfrastructureManagement',
          currentLevel: 1,
        }),
      ];

      const summary = summaryFor([a1, a2], ratings);

      expect(summary.get('technology')?.score).toBe(2);
      expect(summary.get('technology')?.areaCount).toBe(2);
    });

    it('counts only finalized assessments, matching the domain table above it', () => {
      const finalized = makeAssessment({ id: 'a1' });
      const inProgress = makeAssessment({
        id: 'a2',
        status: 'in_progress',
        finalizedAt: undefined,
      });

      const ratings = [
        makeRating({
          id: 'r1',
          capabilityAssessmentId: 'a1',
          dimensionId: 'businessArchitecture',
          aspectId: 'business-process-performance',
          currentLevel: 5,
        }),
        makeRating({
          id: 'r2',
          capabilityAssessmentId: 'a2',
          dimensionId: 'businessArchitecture',
          aspectId: 'business-process-performance',
          currentLevel: 1,
        }),
      ];

      const summary = summaryFor([finalized, inProgress], ratings);

      // Including the in-progress area would give mean(5, 1) = 3.0.
      expect(summary.get('businessArchitecture')?.score).toBe(5);
      expect(summary.get('businessArchitecture')?.areaCount).toBe(1);
    });

    it('does not fold an aggregate dimension into its own average', () => {
      // Data Management aggregates Information from other domains. Counting the
      // aggregate here would count those areas a second time.
      const standard = makeAssessment({ id: 'a1' });
      const enterprise = makeAssessment({
        id: 'a2',
        capabilityDomainId: 'data-management',
        capabilityDomainName: 'Data Management',
        capabilityAreaId: 'data-governance',
        capabilityAreaName: 'Data Governance',
      });

      const ratings = [
        makeRating({
          id: 'r1',
          capabilityAssessmentId: 'a1',
          dimensionId: 'information',
          aspectId: 'information-classification',
          currentLevel: 4,
        }),
      ];

      const summary = summaryFor([standard, enterprise], ratings, {
        enterpriseAggregates: [
          {
            assessmentId: 'a2',
            domainId: 'data-management',
            domainName: 'Data Management',
            aggregateData: {
              dimensionId: 'information',
              score: 4,
              contributingCount: 1,
              contributingAssessmentIds: ['a1'],
            },
          },
        ],
      });

      expect(summary.get('information')?.score).toBe(4);
      expect(summary.get('information')?.areaCount).toBe(1);
    });

    it('omits a dimension no area assessed', () => {
      const ratings = [
        makeRating({
          id: 'r1',
          dimensionId: 'businessArchitecture',
          aspectId: 'business-process-performance',
          currentLevel: 3,
        }),
      ];

      const summary = summaryFor([makeAssessment()], ratings);

      expect(summary.has('businessArchitecture')).toBe(true);
      expect(summary.has('information')).toBe(false);
      expect(summary.has('technology')).toBe(false);
    });

    it('excludes N/A and unassessed aspects from an area score', () => {
      const ratings = [
        makeRating({
          id: 'r1',
          dimensionId: 'information',
          aspectId: 'information-classification',
          currentLevel: 4,
        }),
        makeRating({
          id: 'r2',
          dimensionId: 'information',
          aspectId: 'information-quality',
          currentLevel: -1,
        }),
        makeRating({
          id: 'r3',
          dimensionId: 'information',
          aspectId: 'information-analysis',
          currentLevel: 0,
        }),
      ];

      const summary = summaryFor([makeAssessment()], ratings);

      expect(summary.get('information')?.score).toBe(4);
    });

    it('exposes the area count so the figure has a denominator', () => {
      // Asserted on the computed row, not on the rendered table. The obvious render
      // assertion — searching the PDF for 'Areas' — is vacuous: the Domain Maturity
      // Scores table above already emits that exact header, so it passes with the new
      // column deleted.
      const ratings = [
        makeRating({
          id: 'r1',
          dimensionId: 'businessArchitecture',
          aspectId: 'business-process-performance',
          currentLevel: 3,
        }),
      ];

      const summary = summaryFor([makeAssessment()], ratings);

      expect(summary.get('businessArchitecture')?.areaCount).toBe(1);
    });

    it('renders the summary table with its own header row', () => {
      const ratings = [
        makeRating({
          id: 'r1',
          dimensionId: 'businessArchitecture',
          aspectId: 'business-process-performance',
          currentLevel: 3,
        }),
      ];

      const pdf = render(makeExportData([makeAssessment()], ratings));

      // 'Avg Score' is unique to this table's header — the Domain table's is
      // Domain / Score / Areas / Maturity Level — so it discriminates this table
      // rendering from the heading alone appearing.
      expect(pdf).toContain('Avg Score');

      // The Domain table also emits an 'Areas' header, so a bare `toContain('Areas')`
      // would pass with this column deleted. Anchoring the search past the summary
      // heading is what makes it specific to this table. Content-stream order follows
      // draw order, and the heading is drawn before the table.
      const summaryAt = pdf.indexOf('ORBIT Dimension Summary');
      expect(summaryAt).toBeGreaterThan(-1);
      expect(pdf.indexOf('Areas', summaryAt)).toBeGreaterThan(summaryAt);
    });
  });

  describe('maturity level labelling (OBS-2)', () => {
    it('labels an unassessed aspect "Not Rated" and an N/A aspect "N/A"', () => {
      const ratings = [
        makeRating({
          dimensionId: 'businessArchitecture',
          aspectId: 'business-process-performance',
          currentLevel: 0,
        }),
        makeRating({
          dimensionId: 'businessArchitecture',
          aspectId: 'business-process-documentation',
          currentLevel: -1,
        }),
      ];

      const pdf = render(makeExportData([makeAssessment()], ratings));

      expect(pdf).toContain('Not Rated');
      // `N/A` on its own is a weak needle: several level-1 criteria descriptions in
      // orbit-model.json contain the phrase "N/A - none exists", so any fixture with a
      // level-1 rating would satisfy it regardless of the labelling code. Pinning the
      // N/A row's description text instead, which only the -1 branch emits.
      expect(pdf).toContain('N/A');
      expect(pdf).toContain('Not applicable to this capability area');
    });

    it('does not describe an unassessed aspect as not applicable', () => {
      // The whole of OBS-2: `currentLevel === 0` was matched against the N/A branch,
      // so a merely-unanswered aspect was reported to CMS as a deliberate
      // "not applicable to this capability area" determination.
      const ratings = [
        makeRating({
          dimensionId: 'businessArchitecture',
          aspectId: 'business-process-performance',
          currentLevel: 0,
        }),
      ];

      const pdf = render(makeExportData([makeAssessment()], ratings));

      expect(pdf).toContain('Not Rated');
      expect(pdf).not.toContain('Not applicable to this capability area');
    });
  });

  describe('aggregate dimensions (OBS-3)', () => {
    const enterpriseAssessment = makeAssessment({
      capabilityDomainId: 'data-management',
      capabilityDomainName: 'Data Management',
      capabilityAreaId: 'data-architecture',
      capabilityAreaName: 'Data Architecture',
    });

    // Data Management aggregates Information, so the area itself carries only
    // Business Architecture and Technology ratings.
    const ratings = [
      makeRating({
        dimensionId: 'businessArchitecture',
        aspectId: 'business-process-performance',
        currentLevel: 4,
      }),
    ];

    it('emits the aggregated dimension even though it has no ratings', () => {
      const pdf = render(
        makeExportData([enterpriseAssessment], ratings, {
          enterpriseAggregates: [
            {
              assessmentId: 'assessment-1',
              domainId: 'data-management',
              domainName: 'Data Management',
              aggregateData: {
                dimensionId: 'information',
                score: 3.4,
                contributingCount: 7,
                contributingAssessmentIds: [],
              },
            },
          ],
        })
      );

      // Deliberately NOT `toContain('Information')`: the executive summary hardcodes
      // an intro sentence naming all three ORBIT dimensions, so that assertion is
      // satisfied by every report ever generated and cannot fail. The score and the
      // note are unique to this fixture, and the ordering check below is what proves
      // the dimension was labelled rather than the numbers appearing loose.
      expect(pdf).toContain('(Avg: 3.4)');
      expect(pdf).toContain('(Aggregate from 7 assessments)');

      const dimensionHeadingAt = pdf.lastIndexOf('Information');
      const scoreAt = pdf.indexOf('(Avg: 3.4)');
      expect(dimensionHeadingAt).toBeLessThan(scoreAt);
    });

    it('says so plainly when no assessments contribute yet', () => {
      const pdf = render(
        makeExportData([enterpriseAssessment], ratings, {
          enterpriseAggregates: [
            {
              assessmentId: 'assessment-1',
              domainId: 'data-management',
              domainName: 'Data Management',
              aggregateData: {
                dimensionId: 'information',
                score: null,
                contributingCount: 0,
                contributingAssessmentIds: [],
              },
            },
          ],
        })
      );

      expect(pdf).toContain('Aggregate score not available');
    });

    it('singularises the contributing-assessment count', () => {
      const pdf = render(
        makeExportData([enterpriseAssessment], ratings, {
          enterpriseAggregates: [
            {
              assessmentId: 'assessment-1',
              domainId: 'data-management',
              domainName: 'Data Management',
              aggregateData: {
                dimensionId: 'information',
                score: 2,
                contributingCount: 1,
                contributingAssessmentIds: [],
              },
            },
          ],
        })
      );

      expect(pdf).toContain('(Aggregate from 1 assessment)');
    });

    it('does not duplicate a dimension that was assessed directly', () => {
      // Guard against the aggregate block firing for a dimension that already has
      // ratings, which would print the dimension twice with different scores.
      const withInformation = [
        ...ratings,
        makeRating({
          dimensionId: 'information',
          aspectId: 'information-classification',
          currentLevel: 5,
        }),
      ];

      const pdf = render(
        makeExportData([enterpriseAssessment], withInformation, {
          enterpriseAggregates: [
            {
              assessmentId: 'assessment-1',
              domainId: 'data-management',
              domainName: 'Data Management',
              aggregateData: {
                dimensionId: 'information',
                score: 3.4,
                contributingCount: 7,
                contributingAssessmentIds: [],
              },
            },
          ],
        })
      );

      // Positive anchor first, so a regression that dropped the area section
      // altogether cannot satisfy this test by rendering nothing.
      expect(pdf).toContain('(Avg: 5.0)');
      expect(pdf).not.toContain('(Aggregate from 7 assessments)');
    });
  });

  describe('draft notice (Decision 4)', () => {
    it('prints the notice on content pages', () => {
      const ratings = [
        makeRating({
          dimensionId: 'businessArchitecture',
          aspectId: 'business-process-performance',
          currentLevel: 3,
        }),
      ];

      const pdf = render(makeExportData([makeAssessment()], ratings));

      // The footer carries the SHORT notice and writes it as one line at the current
      // wording, so it appears verbatim. The full PRA statement would wrap to four
      // lines at 7pt and collide with the page number.
      expect(pdf).toContain(DRAFT_NOTICE_SHORT_LINE);
    });

    it('carries the full PRA statement on the cover', () => {
      // The substantive clauses have to reach the artifact most likely to be forwarded
      // outside the pilot. Asserted clause by clause rather than as one string, because
      // the cover text is wrapped by splitTextToSize and so is split across operators.
      const ratings = [
        makeRating({
          dimensionId: 'businessArchitecture',
          aspectId: 'business-process-performance',
          currentLevel: 3,
        }),
      ];

      const pdf = render(makeExportData([makeAssessment()], ratings));

      expect(pdf).toContain('Predecisional Pilot Materials');
      expect(pdf).toContain('final agency');
      expect(pdf).toContain('Paperwork Reduction Act');
      expect(pdf).toContain('OMB approval');
      // And the short footer line must NOT be the only thing present — the PRA words
      // above appear nowhere in it.
      expect(DRAFT_NOTICE_SHORT_LINE).not.toContain('Paperwork Reduction Act');
    });

    it('prints the notice on the cover as well as in the footers', () => {
      // A bare label match cannot distinguish the two surfaces, since the footer line
      // starts with the same label — the band could be deleted with such a test still
      // green. Counting label occurrences against the page count is what actually
      // separates them.
      const ratings = [
        makeRating({
          dimensionId: 'businessArchitecture',
          aspectId: 'business-process-performance',
          currentLevel: 3,
        }),
      ];

      const doc = buildPdfDocument(makeExportData([makeAssessment()], ratings), OPTIONS);
      const pageCount = doc.getNumberOfPages();
      const markerCount = pdfText(doc).split('Predecisional Pilot Materials:').length - 1;

      // One per content page (pageCount - 1, the cover having no footer) plus one for
      // the cover band itself.
      expect(markerCount).toBe(pageCount - 1 + 1);
    });

    it('marks every content page, not just the first', () => {
      // Enough areas to run past one page, so a reader printing any single sheet
      // still sees the marker.
      const assessments = Array.from({ length: 6 }, (_, i) =>
        makeAssessment({
          id: `assessment-${i}`,
          capabilityAreaId: 'provider-enrollment',
          capabilityAreaName: `Area ${i}`,
        })
      );
      const ratings = assessments.map((a) =>
        makeRating({
          id: `r-${a.id}`,
          capabilityAssessmentId: a.id,
          dimensionId: 'businessArchitecture',
          aspectId: 'business-process-performance',
          currentLevel: 3,
        })
      );

      const doc = buildPdfDocument(makeExportData(assessments, ratings), OPTIONS);
      const pageCount = doc.getNumberOfPages();
      const occurrences = pdfText(doc).split(DRAFT_NOTICE_SHORT_LINE).length - 1;

      expect(pageCount).toBeGreaterThan(2);
      // Every page but the cover, which carries the full-text band instead.
      expect(occurrences).toBe(pageCount - 1);
    });

    it('omits the notice entirely at go-live', async () => {
      vi.resetModules();
      vi.stubEnv('VITE_DRAFT_MODE', 'false');
      try {
        const { buildPdfDocument: buildAtGoLive } = await import('./pdfExport');
        const ratings = [
          makeRating({
            dimensionId: 'businessArchitecture',
            aspectId: 'business-process-performance',
            currentLevel: 3,
          }),
        ];

        const pdf = buildAtGoLive(makeExportData([makeAssessment()], ratings), OPTIONS)
          .output()
          .replace(/\\([()\\])/g, '$1');

        expect(pdf).not.toContain('Predecisional');
        expect(pdf).not.toContain('Paperwork Reduction Act');
        expect(pdf).not.toContain('preliminary');
        // Still a real report, not an empty document.
        expect(pdf).toContain('Executive Summary');
        expect(pdf).toContain('Provider Enrollment');
      } finally {
        vi.unstubAllEnvs();
        vi.resetModules();
      }
    });
  });
});
