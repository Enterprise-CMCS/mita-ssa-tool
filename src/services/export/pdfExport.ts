/**
 * PDF Export Service
 *
 * Generates comprehensive professional PDF reports using jsPDF.
 * Includes cover page, executive summary, domain details, and full assessment data.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ExportAggregateData, ExportData, ExportOptions } from './types';
import type { OrbitDimensionId, OrbitRating, LevelKey } from '../../types';
import {
  getDimension,
  getAspect,
  getMaturityLevelMeta,
  getTechnologySubDimension,
  getOrganizationalAspect,
  getOrganizationalAspects,
  getOrganizationalAssessment,
} from '../orbit';
import { getDomainById, getAreaById } from '../capabilities';
import { calculateAverageScore, calculateDimensionScore } from '../scoring';
import {
  getOrganizationalSections,
  isOrganizationalDimensionId,
  IS_DRAFT,
  DRAFT_NOTICE_LINE,
  DRAFT_NOTICE_SHORT_LINE,
} from '../../constants';
import {
  PAGE,
  MARGIN,
  CONTENT_WIDTH,
  COLORS,
  DIMENSION_NAMES,
  getMaturityLevelName,
} from './pdfStyles';

/** Page dimensions - re-exported for local use */
const PAGE_WIDTH = PAGE.WIDTH;
const PAGE_HEIGHT = PAGE.HEIGHT;
const MARGIN_LEFT = MARGIN.LEFT;
const MARGIN_RIGHT = MARGIN.RIGHT;
const MARGIN_TOP = MARGIN.TOP;
const MARGIN_BOTTOM = MARGIN.BOTTOM;

/** Extended jsPDF type with autoTable */
export type JsPDFWithAutoTable = jsPDF & { lastAutoTable: { finalY: number } };

/**
 * Generates a comprehensive PDF report from export data
 */
export async function generatePdfReport(data: ExportData, options: ExportOptions): Promise<Blob> {
  return buildPdfDocument(data, options).output('blob');
}

/**
 * Builds the report document without serialising it to a `Blob`.
 *
 * This seam exists so the PDF's actual content can be asserted in tests. jsPDF writes
 * uncompressed output by default, so the text of a built document is readable in
 * `doc.output()` as `(...) Tj` operators. Reading the `Blob` that
 * `generatePdfReport` returns is possible but awkward under jsdom, which implements
 * neither `Blob.text()` nor `Blob.arrayBuffer()` — it takes a `FileReader` and an
 * async hop. The bytes are all there; asserting against the document before
 * serialisation is simply the shorter path.
 *
 * Grepping a content stream is a weak assertion — it proves a string is present, not
 * that it is legible, positioned sensibly, or on the right page. It is a floor.
 * Layout is verified by opening a generated file; see the Wave 5 notes in
 * `docs/decisions/PILOT_CLEARANCE_PLAN.md`.
 */
export function buildPdfDocument(data: ExportData, options: ExportOptions): JsPDFWithAutoTable {
  const doc = new jsPDF() as JsPDFWithAutoTable;
  const stateName = options.stateName ?? 'State';

  // Generate cover page
  generateCoverPage(doc, data, stateName);

  // Generate executive summary
  doc.addPage();
  generateExecutiveSummary(doc, data);

  // Generate domain details
  const finalizedAssessments = data.data.assessments.filter((a) => a.status === 'finalized');

  // Group assessments by domain
  const assessmentsByDomain = new Map<string, typeof finalizedAssessments>();
  for (const assessment of finalizedAssessments) {
    const existing = assessmentsByDomain.get(assessment.capabilityDomainId);
    if (existing) {
      existing.push(assessment);
    } else {
      assessmentsByDomain.set(assessment.capabilityDomainId, [assessment]);
    }
  }

  // Generate detailed section for each domain
  for (const [domainId, domainAssessments] of assessmentsByDomain) {
    doc.addPage();
    generateDomainSection(doc, domainId, domainAssessments, data);
  }

  // Add page numbers and footer
  addPageNumbersAndFooter(doc, stateName);

  return doc;
}

/**
 * Generates the cover page
 */
function generateCoverPage(doc: JsPDFWithAutoTable, data: ExportData, stateName: string): void {
  const centerX = PAGE_WIDTH / 2;

  // Header bar - taller for more presence
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, PAGE_WIDTH, 60, 'F');

  // Draft band, directly below the header bar. Placed here rather than at the foot
  // of the cover so it is unmissable in a thumbnail or a first-page screenshot,
  // which is how a circulated PDF usually gets seen (Decision 4).
  drawCoverDraftBand(doc, 60);

  // Title
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.text('MITA 4.0', centerX, 28, { align: 'center' });
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('Maturity Assessment Report', centerX, 42, { align: 'center' });

  // State name - larger and more prominent
  doc.setTextColor(...COLORS.secondary);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text(stateName, centerX, 90, { align: 'center' });

  // Subtitle
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.darkGray);
  doc.text('State Medicaid Agency Self-Assessment', centerX, 100, { align: 'center' });

  // Divider line
  doc.setDrawColor(...COLORS.mediumGray);
  doc.setLineWidth(0.5);
  doc.line(centerX - 50, 110, centerX + 50, 110);

  // Overall score section
  const finalizedAssessments = data.data.assessments.filter((a) => a.status === 'finalized');
  const scores = finalizedAssessments
    .map((a) => a.overallScore)
    .filter((s): s is number => s !== undefined);

  const yScoreSection = 130;

  if (scores.length > 0) {
    const overallScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const maturityLevel = getMaturityLevelName(overallScore);

    // Score circle/badge
    doc.setFillColor(...COLORS.primary);
    doc.circle(centerX, yScoreSection + 20, 25, 'F');

    doc.setTextColor(...COLORS.white);
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text(overallScore.toFixed(1), centerX, yScoreSection + 25, { align: 'center' });

    // Label below score
    doc.setTextColor(...COLORS.secondary);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Overall Maturity Score', centerX, yScoreSection + 55, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.darkGray);
    doc.text(`Maturity Level: ${maturityLevel}`, centerX, yScoreSection + 63, { align: 'center' });
  } else {
    // No finalized assessments
    doc.setTextColor(...COLORS.darkGray);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'italic');
    doc.text('No finalized assessments', centerX, yScoreSection + 25, { align: 'center' });
  }

  // Stats cards row
  const yStats = 210;
  const cardWidth = 50;
  const cardHeight = 35;
  const cardSpacing = 8;
  const totalWidth = cardWidth * 3 + cardSpacing * 2;
  const startX = centerX - totalWidth / 2;

  const statsData = [
    {
      value: finalizedAssessments.length.toString(),
      label: 'Finalized',
      color: COLORS.accent,
    },
    {
      value: data.data.assessments.filter((a) => a.status === 'in_progress').length.toString(),
      label: 'In Progress',
      color: COLORS.primary,
    },
    {
      value: data.metadata.totalAttachments.toString(),
      label: 'Attachments',
      color: COLORS.darkGray,
    },
  ];

  statsData.forEach((stat, index) => {
    const cardX = startX + index * (cardWidth + cardSpacing);

    // Card background
    doc.setFillColor(...COLORS.lightGray);
    doc.roundedRect(cardX, yStats, cardWidth, cardHeight, 3, 3, 'F');

    // Value
    doc.setTextColor(...stat.color);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(stat.value, cardX + cardWidth / 2, yStats + 15, { align: 'center' });

    // Label
    doc.setTextColor(...COLORS.darkGray);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(stat.label, cardX + cardWidth / 2, yStats + 26, { align: 'center' });
  });

  // Export date at bottom
  const exportDate = new Date(data.exportDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Footer section
  doc.setDrawColor(...COLORS.mediumGray);
  doc.line(MARGIN_LEFT, PAGE_HEIGHT - 35, PAGE_WIDTH - MARGIN_RIGHT, PAGE_HEIGHT - 35);

  doc.setFontSize(9);
  doc.setTextColor(...COLORS.darkGray);
  doc.text(`Report Generated: ${exportDate}`, centerX, PAGE_HEIGHT - 25, { align: 'center' });

  doc.setFontSize(8);
  doc.text('MITA 4.0 State Self-Assessment Tool', centerX, PAGE_HEIGHT - 18, { align: 'center' });
}

/** One row of the executive summary's ORBIT Dimension Summary. */
export interface DimensionSummaryRow {
  dimensionId: OrbitDimensionId;
  /** Mean of the contributing areas' dimension scores, or null if none contribute. */
  score: number | null;
  /**
   * How many contributions the mean is over — the figure's denominator.
   *
   * Strictly this counts finalized *assessments*, not distinct capability areas. The
   * two are the same while an area has at most one finalized assessment, which is
   * what the data model produces today.
   */
  areaCount: number;
}

/**
 * Computes the enterprise-wide figure for each ORBIT dimension as the **mean of the
 * per-area dimension scores**, so every capability area counts once regardless of
 * its aspect count or how many aspects the state filled in.
 *
 * This replaced a flat average over every rating in the export, which was weighted
 * by aspect count *and* by how many areas had been assessed. The visible symptom was
 * a report that disagreed with itself: the summary printed Technology 3.2 while the
 * per-area sections a page later printed 3.0 for the same data, because a flat mean
 * over 11 Technology aspects over-weights the 6-aspect Infrastructure sub-dimension
 * against the 5-aspect Application one.
 *
 * Three deliberate choices:
 *
 * - **Finalized only**, matching the Domain Maturity Scores table it sits beneath.
 *   The old loop read every rating regardless of status, so one page carried two
 *   tables silently counting different populations.
 * - **Aggregate dimensions are not folded in.** An enterprise domain's aggregated
 *   dimension is itself derived from these same per-area scores, so counting it
 *   would count those areas twice.
 * - **Rounding follows the aggregate-dimension convention** in the scoring spec:
 *   per-area scores arrive already rounded, then the mean is rounded once.
 *
 * Extracted from `generateExecutiveSummary` so the semantics can be asserted
 * directly. Reading one cell out of a rendered `autoTable` means matching a bare
 * number against a document full of them, which is a test that passes for the wrong
 * reasons.
 *
 * @param data - The export payload
 * @returns One row per dimension that at least one area contributed to
 */
export function summariseDimensionsAcrossAreas(data: ExportData): DimensionSummaryRow[] {
  const perAreaScores: Record<OrbitDimensionId, number[]> = {
    businessArchitecture: [],
    information: [],
    technology: [],
  };
  const dimensionIds = Object.keys(perAreaScores) as OrbitDimensionId[];

  const finalized = data.data.assessments.filter((a) => a.status === 'finalized');

  for (const assessment of finalized) {
    const areaRatings = data.data.ratings.filter((r) => r.capabilityAssessmentId === assessment.id);

    for (const dimensionId of dimensionIds) {
      const dimRatings = areaRatings.filter((r) => r.dimensionId === dimensionId);
      const areaScore = calculateDimensionScore(dimensionId, dimRatings);
      if (areaScore !== null) {
        perAreaScores[dimensionId].push(areaScore);
      }
    }
  }

  return dimensionIds
    .filter((dimensionId) => perAreaScores[dimensionId].length > 0)
    .map((dimensionId) => ({
      dimensionId,
      score: calculateAverageScore(perAreaScores[dimensionId]),
      areaCount: perAreaScores[dimensionId].length,
    }));
}

/**
 * Draws the full-width draft band on the cover page.
 *
 * No-op when the tool is built for go-live, so removing the disclaimer everywhere
 * — app, PDF, CSV, JSON, ZIP — stays one build variable (Decision 13).
 *
 * The band grows to fit its wrapped text, so a longer wording cannot clip the notice
 * itself. Note that the cover's remaining elements sit at fixed y coordinates and do
 * **not** reflow: the band occupies roughly y 60-74 at the current wording against a
 * state name at y 90, so there are about three spare lines. A substantially longer
 * notice would need the cover laid out from this function's return value.
 *
 * @param doc - The PDF document
 * @param yTop - Top edge of the band, in mm
 * @returns The y coordinate just below the band
 */
function drawCoverDraftBand(doc: JsPDFWithAutoTable, yTop: number): number {
  if (!IS_DRAFT) return yTop;

  // The cover carries the FULL notice, PRA statement included: a PDF is the artifact
  // most likely to be forwarded outside the pilot, so it is the one place the complete
  // statement has to appear. Set a step smaller than before because the text is now
  // roughly three times longer.
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  const lines = wrapNotice(doc, DRAFT_NOTICE_LINE, CONTENT_WIDTH - 8);
  const bandHeight = lines.length * 3.6 + 5;

  doc.setFillColor(...COLORS.draft);
  doc.rect(0, yTop, PAGE_WIDTH, bandHeight, 'F');

  doc.setTextColor(...COLORS.white);
  doc.text(lines, PAGE_WIDTH / 2, yTop + 4.5, { align: 'center' });

  return yTop + bandHeight;
}

/**
 * Wraps a notice to a width, at whatever font size is currently set.
 *
 * Shared by the cover band and the page footer so neither can overflow the page. The
 * footer previously passed its whole line to a single `text` call without measuring it,
 * which happened to fit and would have silently run into the margins if the wording
 * grew — which it then did.
 *
 * @param doc - The PDF document, with the intended font size already set
 * @param notice - The notice text
 * @param maxWidth - Wrap width in mm
 * @returns The notice as one or more lines
 */
function wrapNotice(doc: JsPDFWithAutoTable, notice: string, maxWidth: number): string[] {
  return doc.splitTextToSize(notice, maxWidth) as string[];
}

/**
 * Generates the executive summary section
 */
function generateExecutiveSummary(doc: JsPDFWithAutoTable, data: ExportData): number {
  let yPos = MARGIN_TOP;

  // Section header
  yPos = addSectionHeader(doc, 'Executive Summary', yPos);

  // Introduction text
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.secondary);

  const introText =
    'This report presents the results of the MITA 4.0 maturity self-assessment. ' +
    'Each capability area has been evaluated across the ORBIT dimensions: ' +
    'Business Architecture, Information, and Technology.';

  const splitIntro = doc.splitTextToSize(introText, CONTENT_WIDTH);
  doc.text(splitIntro, MARGIN_LEFT, yPos);
  yPos += splitIntro.length * 5 + 10;

  // Domain scores table
  const finalizedAssessments = data.data.assessments.filter((a) => a.status === 'finalized');

  // Group by domain
  const domainScores = new Map<string, { name: string; scores: number[]; areas: string[] }>();
  for (const assessment of finalizedAssessments) {
    if (assessment.overallScore !== undefined) {
      const existing = domainScores.get(assessment.capabilityDomainId);
      if (existing) {
        existing.scores.push(assessment.overallScore);
        existing.areas.push(assessment.capabilityAreaName);
      } else {
        domainScores.set(assessment.capabilityDomainId, {
          name: assessment.capabilityDomainName,
          scores: [assessment.overallScore],
          areas: [assessment.capabilityAreaName],
        });
      }
    }
  }

  if (domainScores.size > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Domain Maturity Scores', MARGIN_LEFT, yPos);
    yPos += 8;

    const domainTableData = Array.from(domainScores.entries()).map(([, domainData]) => {
      const avg = domainData.scores.reduce((a, b) => a + b, 0) / domainData.scores.length;
      return [
        domainData.name,
        avg.toFixed(1),
        domainData.scores.length.toString(),
        getMaturityLevelName(avg),
      ];
    });

    autoTable(doc, {
      startY: yPos,
      head: [['Domain', 'Score', 'Areas', 'Maturity Level']],
      body: domainTableData,
      theme: 'striped',
      headStyles: { fillColor: COLORS.primary, fontSize: 10 },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 50 },
      },
      margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT },
    });

    yPos = doc.lastAutoTable.finalY + 15;
  }

  // Dimension scores summary
  if (finalizedAssessments.length > 0) {
    yPos = checkPageBreak(doc, yPos, 60);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('ORBIT Dimension Summary', MARGIN_LEFT, yPos);
    yPos += 8;

    const dimensionTableData = summariseDimensionsAcrossAreas(data).map((row) => {
      const dimension = getDimension(row.dimensionId);
      return [
        DIMENSION_NAMES[row.dimensionId],
        row.score !== null ? row.score.toFixed(1) : '',
        row.areaCount.toString(),
        dimension?.required ? 'Required' : 'Optional',
      ];
    });

    if (dimensionTableData.length > 0) {
      autoTable(doc, {
        // The Areas column is what makes this figure readable: without the
        // denominator a reader cannot tell a 3.0 drawn from two areas from one drawn
        // from sixty. Note it counts a different population from the Areas column in
        // the Domain table above — there, areas finalized in a domain; here, areas
        // that contributed to *this dimension*. An area that left a dimension
        // entirely unassessed appears in the first count and not the second.
        startY: yPos,
        head: [['Dimension', 'Avg Score', 'Areas', 'Status']],
        body: dimensionTableData,
        theme: 'striped',
        headStyles: { fillColor: COLORS.primary, fontSize: 10 },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
          1: { halign: 'center' },
          2: { halign: 'center' },
        },
        margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT },
      });

      yPos = doc.lastAutoTable.finalY + 10;
    }
  }

  return yPos;
}

/**
 * Generates a detailed section for a domain
 */
function generateDomainSection(
  doc: JsPDFWithAutoTable,
  domainId: string,
  assessments: ExportData['data']['assessments'],
  data: ExportData
): number {
  let yPos = MARGIN_TOP;

  const domain = getDomainById(domainId);
  if (!domain) return yPos;

  // Domain header
  yPos = addSectionHeader(doc, domain.name, yPos);

  // Domain description
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.secondary);
  const descLines = doc.splitTextToSize(domain.description, CONTENT_WIDTH);
  doc.text(descLines, MARGIN_LEFT, yPos);
  yPos += descLines.length * 5 + 10;

  // Domain score summary
  const scores = assessments.map((a) => a.overallScore).filter((s): s is number => s !== undefined);

  if (scores.length > 0) {
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    doc.setFillColor(...COLORS.lightGray);
    doc.roundedRect(MARGIN_LEFT, yPos, CONTENT_WIDTH, 20, 3, 3, 'F');

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text(`Domain Average: ${avgScore.toFixed(1)} / 5.0`, MARGIN_LEFT + 5, yPos + 8);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.darkGray);
    doc.text(
      `${assessments.length} capability area${assessments.length > 1 ? 's' : ''} assessed`,
      MARGIN_LEFT + 5,
      yPos + 15
    );

    yPos += 28;
  }

  // Each capability area
  for (const assessment of assessments) {
    yPos = checkPageBreak(doc, yPos, 80);
    yPos = generateCapabilityAreaSection(doc, assessment, data, yPos);
  }

  return yPos;
}

/**
 * Generates a section for a single capability area
 */
function generateCapabilityAreaSection(
  doc: JsPDFWithAutoTable,
  assessment: ExportData['data']['assessments'][0],
  data: ExportData,
  startY: number
): number {
  let yPos = startY;

  const area = getAreaById(assessment.capabilityAreaId);

  // Capability area header
  doc.setFillColor(...COLORS.primary);
  doc.rect(MARGIN_LEFT, yPos, CONTENT_WIDTH, 8, 'F');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.white);
  doc.text(assessment.capabilityAreaName, MARGIN_LEFT + 3, yPos + 5.5);

  // Score badge
  if (assessment.overallScore !== undefined) {
    const scoreText = assessment.overallScore.toFixed(1);
    doc.setFillColor(...COLORS.accent);
    doc.roundedRect(PAGE_WIDTH - MARGIN_RIGHT - 20, yPos + 1, 17, 6, 2, 2, 'F');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.white);
    doc.text(scoreText, PAGE_WIDTH - MARGIN_RIGHT - 11.5, yPos + 5, { align: 'center' });
  }

  yPos += 12;

  // Area description
  if (area) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.secondary);
    const areaDescLines = doc.splitTextToSize(area.description, CONTENT_WIDTH);
    doc.text(areaDescLines, MARGIN_LEFT, yPos);
    yPos += areaDescLines.length * 4 + 4;

    // Topics
    if (area.topics && area.topics.length > 0) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...COLORS.darkGray);
      const topicsText = `Topics: ${area.topics.join(', ')}`;
      const topicLines = doc.splitTextToSize(topicsText, CONTENT_WIDTH);
      doc.text(topicLines, MARGIN_LEFT, yPos);
      yPos += topicLines.length * 3.5 + 6;
    }
  }

  // Get ratings for this assessment
  const ratings = data.data.ratings.filter((r) => r.capabilityAssessmentId === assessment.id);

  // Check if this is an organizational assessment
  const sections = getOrganizationalSections(assessment.capabilityAreaId);

  if (sections) {
    // Organizational assessment: render each section's aspects directly
    for (const section of sections) {
      yPos = checkPageBreak(doc, yPos, 40);
      yPos = generateOrganizationalDetails(doc, section, ratings, yPos);
    }
  } else {
    // Standard assessment: group ratings by B-I-T dimension
    const ratingsByDimension = new Map<OrbitDimensionId, OrbitRating[]>();
    for (const rating of ratings) {
      // Skip organizational assessment ratings
      if (isOrganizationalDimensionId(rating.dimensionId)) {
        continue;
      }
      const dimId = rating.dimensionId as OrbitDimensionId;
      const existing = ratingsByDimension.get(dimId);
      if (existing) {
        existing.push(rating);
      } else {
        ratingsByDimension.set(dimId, [rating]);
      }
    }

    // Generate dimension details
    for (const [dimensionId, dimRatings] of ratingsByDimension) {
      yPos = checkPageBreak(doc, yPos, 40);
      yPos = generateDimensionDetails(doc, dimensionId, dimRatings, yPos);
    }

    // Aggregate dimensions have no ratings by design — Data Management's
    // Information and Technology Management's Technology are computed from the
    // other domains rather than assessed here. Because the loop above is driven by
    // actual ratings, the aggregated dimension was silently missing from the
    // report entirely (OBS-3): a Data Management area printed Business
    // Architecture and Technology and simply no Information. CSV and the results
    // UI both surface it, so the PDF matches their shape.
    const aggregate = data.enterpriseAggregates?.find(
      (e) => e.assessmentId === assessment.id
    )?.aggregateData;

    if (aggregate && !ratingsByDimension.has(aggregate.dimensionId)) {
      yPos = checkPageBreak(doc, yPos, 24);
      yPos = generateAggregateDimensionDetails(doc, aggregate, yPos);
    }
  }

  // Attachments for this assessment
  const attachments = data.data.attachments.filter(
    (a) => a.capabilityAssessmentId === assessment.id
  );

  if (attachments.length > 0) {
    yPos = checkPageBreak(doc, yPos, 30);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.secondary);
    doc.text('Attachments:', MARGIN_LEFT, yPos);
    yPos += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    for (const attachment of attachments) {
      const attachText = `• ${attachment.fileName}`;
      doc.text(attachText, MARGIN_LEFT + 3, yPos);
      yPos += 4;
    }
    yPos += 4;
  }

  // Add spacing between capability areas
  yPos += 8;

  return yPos;
}

/**
 * Generates details for a dimension's ratings
 */
function generateDimensionDetails(
  doc: JsPDFWithAutoTable,
  dimensionId: OrbitDimensionId,
  ratings: OrbitRating[],
  startY: number
): number {
  let yPos = startY;

  const dimension = getDimension(dimensionId);
  if (!dimension) return yPos;

  // Dimension subheader
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text(DIMENSION_NAMES[dimensionId], MARGIN_LEFT, yPos);

  // Dimension average, from the canonical scorer. A flat mean over the ratings
  // was OBS-25: for Technology it weights the 6-aspect Infrastructure
  // sub-dimension above the 5-aspect Application one, so the stakeholder report
  // printed 3.2 where the tool's UI showed 3.0.
  const dimensionScore = calculateDimensionScore(dimensionId, ratings);
  if (dimensionScore !== null) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.darkGray);
    doc.text(`(Avg: ${dimensionScore.toFixed(1)})`, MARGIN_LEFT + 50, yPos);
  }

  yPos += 6;

  // Build table data for aspects
  const tableData: string[][] = [];

  for (const rating of ratings) {
    const aspect = getAspect(dimensionId, rating.aspectId, rating.subDimensionId);

    if (!aspect) continue;

    // Get level info
    let levelName = 'Not Rated';
    let levelDesc = '';

    if (rating.currentLevel > 0) {
      const levelKey = `level${rating.currentLevel}` as LevelKey;
      const levelMeta = getMaturityLevelMeta(levelKey);
      levelName = `${rating.currentLevel} - ${levelMeta.name}`;

      // Get aspect-specific level description
      const aspectLevel = aspect.levels[levelKey];
      if (aspectLevel) {
        levelDesc = aspectLevel.description;
      }
    } else if (rating.currentLevel === -1) {
      // -1 is N/A; 0 means not assessed and falls through to "Not Rated". This
      // branch previously tested 0, so every unrated aspect was reported to
      // stakeholders as a deliberate not-applicable determination (OBS-2). Rows
      // carrying only notes make that a common case, not a corner one.
      levelName = 'N/A';
      levelDesc = 'Not applicable to this capability area';
    }

    // Sub-dimension prefix for Technology
    let aspectName = aspect.name;
    if (dimensionId === 'technology' && rating.subDimensionId) {
      const subDim = getTechnologySubDimension(rating.subDimensionId);
      if (subDim) {
        aspectName = `${subDim.name}: ${aspect.name}`;
      }
    }

    tableData.push([aspectName, levelName, levelDesc]);
  }

  if (tableData.length > 0) {
    autoTable(doc, {
      startY: yPos,
      head: [['Aspect', 'Level', 'Description']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: COLORS.lightGray,
        textColor: COLORS.secondary,
        fontSize: 8,
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 8,
        cellPadding: 2,
        overflow: 'linebreak',
        cellWidth: 'wrap',
      },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 28 },
        2: { cellWidth: 'auto' },
      },
      margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT },
      tableWidth: CONTENT_WIDTH,
    });

    yPos = doc.lastAutoTable.finalY + 4;
  }

  // Add notes, barriers, and plans if any rating has them
  const ratingsWithText = ratings.filter(
    (r) =>
      (r.notes && r.notes.trim()) ||
      (r.barriers && r.barriers.trim()) ||
      (r.plans && r.plans.trim())
  );

  if (ratingsWithText.length > 0) {
    yPos = checkPageBreak(doc, yPos, 25);

    doc.setFontSize(8);
    doc.setTextColor(...COLORS.darkGray);

    for (const rating of ratingsWithText) {
      const aspect = getAspect(dimensionId, rating.aspectId, rating.subDimensionId);
      if (!aspect) continue;

      // Notes
      if (rating.notes && rating.notes.trim()) {
        yPos = checkPageBreak(doc, yPos, 12);
        doc.setFont('helvetica', 'bold');
        doc.text(`${aspect.name} - Notes:`, MARGIN_LEFT + 3, yPos);
        yPos += 4;
        doc.setFont('helvetica', 'normal');
        const noteLines = doc.splitTextToSize(rating.notes, CONTENT_WIDTH - 10);
        doc.text(noteLines, MARGIN_LEFT + 5, yPos);
        yPos += noteLines.length * 3.5 + 2;
      }

      // Barriers & Challenges
      if (rating.barriers && rating.barriers.trim()) {
        yPos = checkPageBreak(doc, yPos, 12);
        doc.setFont('helvetica', 'bold');
        doc.text(`${aspect.name} - Barriers & Challenges:`, MARGIN_LEFT + 3, yPos);
        yPos += 4;
        doc.setFont('helvetica', 'normal');
        const barrierLines = doc.splitTextToSize(rating.barriers, CONTENT_WIDTH - 10);
        doc.text(barrierLines, MARGIN_LEFT + 5, yPos);
        yPos += barrierLines.length * 3.5 + 2;
      }

      // Advancement Plans
      if (rating.plans && rating.plans.trim()) {
        yPos = checkPageBreak(doc, yPos, 12);
        doc.setFont('helvetica', 'bold');
        doc.text(`${aspect.name} - Advancement Plans:`, MARGIN_LEFT + 3, yPos);
        yPos += 4;
        doc.setFont('helvetica', 'normal');
        const planLines = doc.splitTextToSize(rating.plans, CONTENT_WIDTH - 10);
        doc.text(planLines, MARGIN_LEFT + 5, yPos);
        yPos += planLines.length * 3.5 + 2;
      }
    }
  }

  yPos += 4;
  return yPos;
}

/**
 * Renders an aggregate dimension for an enterprise-domain area.
 *
 * Aggregate dimensions carry no ratings, so there is no aspect table to print —
 * just the dimension name, its computed score, and where that score came from.
 * The `(Aggregate from N assessments)` wording matches the CSV maturity profile so
 * the two artifacts read the same way.
 */
function generateAggregateDimensionDetails(
  doc: JsPDFWithAutoTable,
  aggregate: ExportAggregateData,
  startY: number
): number {
  let yPos = startY;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text(DIMENSION_NAMES[aggregate.dimensionId], MARGIN_LEFT, yPos);

  if (aggregate.score !== null) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.darkGray);
    doc.text(`(Avg: ${aggregate.score.toFixed(1)})`, MARGIN_LEFT + 50, yPos);
  }

  yPos += 5;

  const note =
    aggregate.score !== null
      ? `(Aggregate from ${aggregate.contributingCount} assessment${
          aggregate.contributingCount === 1 ? '' : 's'
        }). This dimension is computed from finalized assessments in other domains ` +
        'rather than assessed directly in this area.'
      : 'Aggregate score not available. No finalized assessments in other domains ' +
        'contribute to this dimension yet.';

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.darkGray);
  const noteLines = doc.splitTextToSize(note, CONTENT_WIDTH - 6);
  doc.text(noteLines, MARGIN_LEFT + 3, yPos);
  yPos += noteLines.length * 3.5 + 6;

  return yPos;
}

/**
 * Generates details for one organizational assessment section's aspect ratings.
 * Shows aspects directly in a table (same pattern as dimension details but
 * without dimension grouping), preceded by the section name.
 */
function generateOrganizationalDetails(
  doc: JsPDFWithAutoTable,
  orgType: Parameters<typeof getOrganizationalAspects>[0],
  ratings: OrbitRating[],
  startY: number
): number {
  let yPos = startY;

  // Section subheader (e.g., "Organizational Outcomes")
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text(getOrganizationalAssessment(orgType).name, MARGIN_LEFT, yPos);
  yPos += 6;

  // Get all aspects for this organizational assessment section
  const aspects = getOrganizationalAspects(orgType);
  const orgRatings = ratings.filter((r) => r.dimensionId === orgType);

  // Build table data
  const tableData: string[][] = [];

  for (const aspect of aspects) {
    const rating = orgRatings.find((r) => r.aspectId === aspect.id);

    let levelName = 'Not Rated';
    let levelDesc = '';

    if (rating && rating.currentLevel > 0) {
      const levelKey = `level${rating.currentLevel}` as LevelKey;
      const levelMeta = getMaturityLevelMeta(levelKey);
      levelName = `${rating.currentLevel} - ${levelMeta.name}`;

      const aspectLevel = aspect.levels[levelKey];
      if (aspectLevel) {
        levelDesc = aspectLevel.description;
      }
    } else if (rating && rating.currentLevel === -1) {
      levelName = 'N/A';
      levelDesc = 'Not applicable';
    }

    tableData.push([aspect.name, levelName, levelDesc]);
  }

  if (tableData.length > 0) {
    autoTable(doc, {
      startY: yPos,
      head: [['Aspect', 'Level', 'Description']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: COLORS.lightGray,
        textColor: COLORS.secondary,
        fontSize: 8,
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 8,
        cellPadding: 2,
        overflow: 'linebreak',
        cellWidth: 'wrap',
      },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 28 },
        2: { cellWidth: 'auto' },
      },
      margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT },
      tableWidth: CONTENT_WIDTH,
    });

    yPos = doc.lastAutoTable.finalY + 4;
  }

  // Add notes, barriers, and plans
  const ratingsWithText = orgRatings.filter(
    (r) =>
      (r.notes && r.notes.trim()) ||
      (r.barriers && r.barriers.trim()) ||
      (r.plans && r.plans.trim())
  );

  if (ratingsWithText.length > 0) {
    yPos = checkPageBreak(doc, yPos, 25);

    doc.setFontSize(8);
    doc.setTextColor(...COLORS.darkGray);

    for (const rating of ratingsWithText) {
      const aspect = getOrganizationalAspect(
        orgType as Parameters<typeof getOrganizationalAspect>[0],
        rating.aspectId
      );
      if (!aspect) continue;

      if (rating.notes && rating.notes.trim()) {
        yPos = checkPageBreak(doc, yPos, 12);
        doc.setFont('helvetica', 'bold');
        doc.text(`${aspect.name} - Notes:`, MARGIN_LEFT + 3, yPos);
        yPos += 4;
        doc.setFont('helvetica', 'normal');
        const noteLines = doc.splitTextToSize(rating.notes, CONTENT_WIDTH - 10);
        doc.text(noteLines, MARGIN_LEFT + 5, yPos);
        yPos += noteLines.length * 3.5 + 2;
      }

      if (rating.barriers && rating.barriers.trim()) {
        yPos = checkPageBreak(doc, yPos, 12);
        doc.setFont('helvetica', 'bold');
        doc.text(`${aspect.name} - Barriers & Challenges:`, MARGIN_LEFT + 3, yPos);
        yPos += 4;
        doc.setFont('helvetica', 'normal');
        const barrierLines = doc.splitTextToSize(rating.barriers, CONTENT_WIDTH - 10);
        doc.text(barrierLines, MARGIN_LEFT + 5, yPos);
        yPos += barrierLines.length * 3.5 + 2;
      }

      if (rating.plans && rating.plans.trim()) {
        yPos = checkPageBreak(doc, yPos, 12);
        doc.setFont('helvetica', 'bold');
        doc.text(`${aspect.name} - Advancement Plans:`, MARGIN_LEFT + 3, yPos);
        yPos += 4;
        doc.setFont('helvetica', 'normal');
        const planLines = doc.splitTextToSize(rating.plans, CONTENT_WIDTH - 10);
        doc.text(planLines, MARGIN_LEFT + 5, yPos);
        yPos += planLines.length * 3.5 + 2;
      }
    }
  }

  yPos += 4;
  return yPos;
}

/**
 * Adds a section header with styling
 */
function addSectionHeader(doc: JsPDFWithAutoTable, title: string, yPos: number): number {
  doc.setFillColor(...COLORS.primary);
  doc.rect(MARGIN_LEFT, yPos, 4, 10, 'F');

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.secondary);
  doc.text(title, MARGIN_LEFT + 8, yPos + 7);

  return yPos + 15;
}

/**
 * Checks if we need a page break and adds one if necessary
 */
function checkPageBreak(doc: JsPDFWithAutoTable, yPos: number, requiredSpace: number): number {
  if (yPos + requiredSpace > PAGE_HEIGHT - MARGIN_BOTTOM) {
    doc.addPage();
    return MARGIN_TOP;
  }
  return yPos;
}

/**
 * Adds page numbers and footer to all pages
 */
function addPageNumbersAndFooter(doc: JsPDFWithAutoTable, stateName: string): void {
  const pageCount = doc.getNumberOfPages();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Skip cover page for page numbers
    if (i === 1) continue;

    // Footer line
    doc.setDrawColor(...COLORS.mediumGray);
    doc.line(MARGIN_LEFT, PAGE_HEIGHT - 18, PAGE_WIDTH - MARGIN_RIGHT, PAGE_HEIGHT - 18);

    // Page number
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.darkGray);
    doc.text(`Page ${i - 1} of ${pageCount - 1}`, PAGE_WIDTH / 2, PAGE_HEIGHT - 12, {
      align: 'center',
    });

    // Footer text
    doc.setFontSize(8);
    doc.text(`${stateName} - MITA 4.0 Maturity Assessment`, MARGIN_LEFT, PAGE_HEIGHT - 12);

    // Draft marker on every content page. The cover carries the band instead, so
    // between the two no page of a circulated report is unmarked — a single page
    // printed or screenshotted out of context still says it came from a draft.
    if (IS_DRAFT) {
      // 6.5pt, not 7pt, and the half point is load-bearing: measured, the short notice
      // is 172.0mm wide at 6.5pt against a 180mm content width, and 185.3mm at 7pt.
      // At 7pt it wraps to a second line whose ascenders crowd the page number 3mm
      // above it. One legible line beats two cramped ones, and the cover carries the
      // full statement at a larger size.
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.draft);
      // The footer carries the SHORT notice. The full PRA statement wraps to four
      // lines at this size and would collide with the page number; the cover carries
      // it in full, so every report still contains the complete statement. Wrapped
      // rather than passed as one string, and drawn upward from the page edge so an
      // extra line does not overlap the footer text above it.
      const noticeLines = wrapNotice(doc, DRAFT_NOTICE_SHORT_LINE, CONTENT_WIDTH);
      const firstLineY = PAGE_HEIGHT - 6 - (noticeLines.length - 1) * 3;
      doc.text(noticeLines, PAGE_WIDTH / 2, firstLineY, { align: 'center' });
      doc.setFont('helvetica', 'normal');
    }
  }
}
