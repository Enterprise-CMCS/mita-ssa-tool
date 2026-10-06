/**
 * Row builders for the four computed sheets: `06` through `09`.
 *
 * Separate from `rows.ts` because these rows hold **formulas** rather than values, which makes
 * them a different kind of thing to test: `rows.ts` output can be asserted against the model,
 * while these can only be asserted as strings. Section 5.4's mitigation is layered accordingly —
 * the rule is tested in `scoring-spec.test.ts`, the generated strings are snapshotted here, and
 * the arithmetic is checked by opening the file in Excel.
 *
 * Every formula is criteria-based over the ID columns, never row offsets. Sorting is deliberately
 * left enabled on the input sheets, so a state can reorder 1,625 rows and every formula must
 * still find its data.
 */

import {
  AREA_SCORES_COLUMNS,
  ASSESSMENT_INPUT_COLUMNS,
  FIRST_DATA_ROW,
  MATURITY_PROFILE_COLUMNS,
  ORGANIZATIONAL_INPUT_COLUMNS,
  SCORE_SOURCES,
  SHEET_NAMES,
  type ColumnDefinition,
} from './constants.ts';
import {
  DOMAIN_AGGREGATE_DIMENSIONS,
  ORBIT_DIMENSION_IDS,
  ORGANIZATIONAL_ASSESSMENT_AREA_ID,
  ORGANIZATIONAL_SECTIONS,
  getAllAreasWithDomains,
  getAggregatedDimensionForDomain,
  getAssessableAspectCountForArea,
  getDimensionName,
  getInputDimensionsForArea,
  getOrganizationalSectionName,
  getStandardAreasWithDomains,
  isOrganizationalAssessmentArea,
} from './model.ts';
import {
  completionCountFormula,
  countFormula,
  dataRange,
  filteredMeanFormula,
  letterOf,
  meanOfCellsFormula,
  organizationalSectionMeanFormula,
  organizationalSectionScoreFormula,
  plainDimensionFormula,
  technologyDimensionFormula,
  joinTextFormula,
  unroundedMeanFormula,
  type InputExtents,
} from './scoring-spec.ts';

import { assessmentRowBlock, organizationalRowBlock } from './rows.ts';

import type { FormulaCell, RowBlock, SheetRow } from './rows.ts';

import type { OrbitDimensionId } from '../../src/types/index.ts';

/**
 * A built row on a computed sheet.
 *
 * The same type the value sheets use, so `addTableSheet` places both without branching and every
 * sheet inherits the same styling, protection and 508 treatment.
 */
export type ComputedRow = SheetRow;

/** Marks a value as an Excel formula rather than text that happens to start with `=`. */
function formula(expression: string): FormulaCell {
  return { formula: expression };
}

/** Text placed in a column that does not apply to this row, so no cell is ever empty. */
const NOT_APPLICABLE = 'Not applicable';

/** Arguments for one assessment-input text roll-up, resolved to a contiguous row block. */
function assessmentTextArgs(
  areaId: string,
  dimensionId: string,
  key: 'notes' | 'barriers' | 'plans'
): [string, readonly ColumnDefinition[], 'notes' | 'barriers' | 'plans', RowBlock] {
  return [
    SHEET_NAMES.ASSESSMENT_INPUT,
    ASSESSMENT_INPUT_COLUMNS,
    key,
    assessmentRowBlock(areaId, dimensionId),
  ];
}

/**
 * A cell reference on `06_Maturity_Profile`, for a formula on another sheet.
 *
 * Absolute, because these are referenced from `07`, `08` and `09` where a relative reference
 * would shift per row.
 */
function profileCell(key: string, row: number): string {
  return `'${SHEET_NAMES.MATURITY_PROFILE}'!$${letterOf(MATURITY_PROFILE_COLUMNS, key)}$${row}`;
}

/** A whole-column range over `06_Maturity_Profile`'s data rows. */
function profileRange(key: string, lastRow: number): string {
  return dataRange(SHEET_NAMES.MATURITY_PROFILE, letterOf(MATURITY_PROFILE_COLUMNS, key), lastRow);
}

/** A whole-column range over `07_Area_Scores`'s data rows. */
function areaScoresRange(key: string, lastRow: number): string {
  return dataRange(SHEET_NAMES.AREA_SCORES, letterOf(AREA_SCORES_COLUMNS, key), lastRow);
}

// =============================================================================
// 06_Maturity_Profile
// =============================================================================

/** Where each profile row ended up, so the sheets above can point at it. */
export interface ProfileRowIndex {
  /** `areaId|dimensionId` to its 1-based sheet row. */
  rowByKey: Map<string, number>;
  lastRow: number;
  rows: ComputedRow[];
}

/**
 * Build `06_Maturity_Profile`: 213 standard area-dimension rows plus 3 organizational sections.
 *
 * The standard rows come in model order — every area's Business Architecture, Information and
 * Technology in sequence — so the sheet reads as a profile rather than as a dump. For the two
 * enterprise domains the aggregated dimension still gets a row, but marked `Aggregate` and
 * carrying the domain-wide figure rather than a measurement, which is what makes an area's three
 * dimension scores complete enough to average.
 */
export function buildMaturityProfileRows(extents: InputExtents): ProfileRowIndex {
  const rows: ComputedRow[] = [];
  const rowByKey = new Map<string, number>();

  for (const { domain, area } of getStandardAreasWithDomains()) {
    const collected = getInputDimensionsForArea(area.id, domain.id);
    const aggregated = getAggregatedDimensionForDomain(domain.id);

    for (const dimensionId of ORBIT_DIMENSION_IDS) {
      const sheetRow = FIRST_DATA_ROW + rows.length;
      rowByKey.set(`${area.id}|${dimensionId}`, sheetRow);

      const isAggregate = dimensionId === aggregated;
      if (isAggregate) {
        rows.push(buildAggregateRow(domain.id, domain.name, area.id, area.name, dimensionId));
        continue;
      }

      // Defensive: `collected` and the aggregate mapping are two views of the same rule, and a
      // disagreement would silently produce a row with no data behind it.
      if (!collected.includes(dimensionId)) {
        throw new Error(
          `${area.id}: ${dimensionId} is neither collected nor the aggregate for ${domain.id}`
        );
      }

      rows.push(buildEnteredRow(domain, area, dimensionId, sheetRow, extents));
    }
  }

  for (const sectionId of ORGANIZATIONAL_SECTIONS) {
    const sheetRow = FIRST_DATA_ROW + rows.length;
    rowByKey.set(`${ORGANIZATIONAL_ASSESSMENT_AREA_ID}|${sectionId}`, sheetRow);
    rows.push(buildOrganizationalSectionRow(sectionId, extents));
  }

  return { rows, rowByKey, lastRow: FIRST_DATA_ROW + rows.length - 1 };
}

/** A dimension a state enters directly, scored from `04_Assessment_Input`. */
function buildEnteredRow(
  domain: { id: string; name: string },
  area: { id: string; name: string },
  dimensionId: OrbitDimensionId,
  sheetRow: number,
  extents: InputExtents
): ComputedRow {
  const areaCriteria = [{ key: 'areaId', value: area.id }];
  const dimensionCriteria = [...areaCriteria, { key: 'dimensionId', value: dimensionId }];

  const isTechnology = dimensionId === 'technology';

  // The sub-dimension means live in this row's own cells, and Technology's score averages those
  // cells rather than inlining their formulas. See the note in `technologyDimensionFormula` —
  // referencing cells is what makes an unassessed sub-dimension drop instead of erroring.
  const infrastructureCell = profileCell('infrastructureCurrent', sheetRow);
  const applicationCell = profileCell('applicationCurrent', sheetRow);
  const infrastructureTargetCell = profileCell('infrastructureTarget', sheetRow);
  const applicationTargetCell = profileCell('applicationTarget', sheetRow);

  const subDimensionCriteria = (subDimensionId: string): Array<{ key: string; value: string }> => [
    ...dimensionCriteria,
    { key: 'subDimensionId', value: subDimensionId },
  ];

  return {
    domainName: domain.name,
    areaName: area.name,
    dimensionName: getDimensionName(dimensionId),
    source: SCORE_SOURCES.entered,
    currentScore: formula(
      isTechnology
        ? technologyDimensionFormula(infrastructureCell, applicationCell)
        : plainDimensionFormula('currentLevel', dimensionCriteria, extents)
    ),
    targetScore: formula(
      isTechnology
        ? technologyDimensionFormula(infrastructureTargetCell, applicationTargetCell)
        : plainDimensionFormula('targetLevel', dimensionCriteria, extents)
    ),
    aspectsAssessed: formula(completionCountFormula(dimensionCriteria, extents)),
    currentUnrounded: formula(
      isTechnology
        ? `IFERROR(AVERAGE(${infrastructureCell},${applicationCell}),"")`
        : unroundedMeanFormula('currentLevel', dimensionCriteria, extents)
    ),
    targetUnrounded: formula(
      isTechnology
        ? `IFERROR(AVERAGE(${infrastructureTargetCell},${applicationTargetCell}),"")`
        : unroundedMeanFormula('targetLevel', dimensionCriteria, extents)
    ),
    infrastructureCurrent: isTechnology
      ? formula(
          unroundedMeanFormula(
            'currentLevel',
            subDimensionCriteria('technologyInfrastructureManagement'),
            extents
          )
        )
      : NOT_APPLICABLE,
    applicationCurrent: isTechnology
      ? formula(
          unroundedMeanFormula(
            'currentLevel',
            subDimensionCriteria('applicationManagement'),
            extents
          )
        )
      : NOT_APPLICABLE,
    infrastructureTarget: isTechnology
      ? formula(
          unroundedMeanFormula(
            'targetLevel',
            subDimensionCriteria('technologyInfrastructureManagement'),
            extents
          )
        )
      : NOT_APPLICABLE,
    applicationTarget: isTechnology
      ? formula(
          unroundedMeanFormula(
            'targetLevel',
            subDimensionCriteria('applicationManagement'),
            extents
          )
        )
      : NOT_APPLICABLE,
    // Range-based, unlike every score above. `assessmentRowBlock` throws if the rows for this
    // area and dimension are not contiguous, so a builder reorder fails generation rather than
    // emitting a formula that reads a neighbouring area's text.
    notes: formula(joinTextFormula(...assessmentTextArgs(area.id, dimensionId, 'notes'))),
    barriers: formula(joinTextFormula(...assessmentTextArgs(area.id, dimensionId, 'barriers'))),
    plans: formula(joinTextFormula(...assessmentTextArgs(area.id, dimensionId, 'plans'))),
    domainId: domain.id,
    areaId: area.id,
    dimensionId,
  };
}

/**
 * The aggregate row for an enterprise domain's aggregated dimension (Decision P1).
 *
 * Averages the **per-area dimension scores** on this sheet, not the raw input cells. A flat mean
 * over every Information input cell would weight each area by how many aspects it filled in; the
 * tool weights every area equally. 5.4 is explicit about this and it is the easiest thing here to
 * get quietly wrong.
 *
 * Both enterprise domains are excluded from both aggregates, matching
 * `status === 'finalized' && !isEnterpriseDomain(domain)`. The `finalized` half is unrepresentable
 * in a workbook and is documented on the README as an accepted divergence.
 *
 * **No To-Be.** `generateStandardAreaProfile` sets the aggregate's To-Be to empty and the tool has
 * no target for a derived figure, so computing one here would invent a number the tool does not
 * have.
 */
function buildAggregateRow(
  domainId: string,
  domainName: string,
  areaId: string,
  areaName: string,
  dimensionId: OrbitDimensionId
): ComputedRow {
  return {
    domainName,
    areaName,
    dimensionName: getDimensionName(dimensionId),
    source: SCORE_SOURCES.aggregate,
    // Placeholders resolved once the sheet's extent is known — see `resolveAggregateFormulas`.
    currentScore: formula(`{{aggregate:${dimensionId}}}`),
    // "Not applicable" rather than a blank cell, matching the sub-dimension columns below and
    // every other inapplicable cell in the workbook. A blank reads as "nothing here yet" to a
    // screen reader and to a person, which is the wrong meaning: there is no To-Be for a derived
    // figure and there never will be.
    //
    // Safe for the roll-up above, which averages this cell by reference: `AVERAGE` ignores text
    // inside a cell reference exactly as it ignores a blank, so the divisor still drops from 3 to
    // 2. That is the same mechanism the Technology sub-dimension means already rely on.
    targetScore: NOT_APPLICABLE,
    // Zero, not the count of contributing areas.
    //
    // A state enters no aspects for an aggregated dimension, so zero is the honest figure — and it
    // has to be, because `07_Area_Scores` sums these three cells as the numerator of completion %
    // while `getAssessableAspectCountForArea` leaves the aggregated dimension's aspects out of the
    // denominator (26 drops to 16 for Data Management, 15 for Technology Management). Putting the
    // contributing-area count here instead added up to 11 to a numerator over a denominator of 16
    // and reported completion well past 100% on all 21 enterprise-domain areas.
    //
    // The count itself is not lost: it reads in the Notes cell, as "(Aggregate from N
    // assessments)", which is the same place the CSV profile puts it.
    aspectsAssessed: 0,
    currentUnrounded: formula(`{{aggregateUnrounded:${dimensionId}}}`),
    targetUnrounded: NOT_APPLICABLE,
    infrastructureCurrent: NOT_APPLICABLE,
    applicationCurrent: NOT_APPLICABLE,
    infrastructureTarget: NOT_APPLICABLE,
    applicationTarget: NOT_APPLICABLE,
    notes: formula(`{{aggregateNote:${dimensionId}}}`),
    barriers: NOT_APPLICABLE,
    plans: NOT_APPLICABLE,
    domainId,
    areaId,
    dimensionId,
  };
}

/**
 * One of the three Enterprise Governance sections.
 *
 * The score column shows the section mean **rounded**, matching what
 * `getOrganizationalScoresForAssessment` displays. The unrounded column is what the area score on
 * `07` averages, because the organizational roll-up is the one that averages unrounded inputs.
 * Both columns are therefore live, for different consumers.
 */
function buildOrganizationalSectionRow(
  sectionId: (typeof ORGANIZATIONAL_SECTIONS)[number],
  extents: InputExtents
): ComputedRow {
  return {
    domainName: 'Enterprise Architecture',
    areaName: 'Enterprise Governance',
    dimensionName: getOrganizationalSectionName(sectionId),
    source: SCORE_SOURCES.organizational,
    currentScore: formula(organizationalSectionScoreFormula('currentLevel', sectionId, extents)),
    targetScore: formula(organizationalSectionScoreFormula('targetLevel', sectionId, extents)),
    aspectsAssessed: formula(organizationalAssessedCountFormula(sectionId, extents)),
    currentUnrounded: formula(organizationalSectionMeanFormula('currentLevel', sectionId, extents)),
    targetUnrounded: formula(organizationalSectionMeanFormula('targetLevel', sectionId, extents)),
    infrastructureCurrent: NOT_APPLICABLE,
    applicationCurrent: NOT_APPLICABLE,
    infrastructureTarget: NOT_APPLICABLE,
    applicationTarget: NOT_APPLICABLE,
    notes: formula(organizationalTextJoinFormula('notes', sectionId)),
    barriers: formula(organizationalTextJoinFormula('barriers', sectionId)),
    plans: formula(organizationalTextJoinFormula('plans', sectionId)),
    domainId: 'enterprise-architecture-domain',
    areaId: ORGANIZATIONAL_ASSESSMENT_AREA_ID,
    dimensionId: sectionId,
  };
}

/** Count of entered cells in one organizational section, N/A included per 5.4.1. */
function organizationalAssessedCountFormula(sectionId: string, extents: InputExtents): string {
  const levels = organizationalRange('currentLevel', extents);
  const sections = organizationalRange('sectionId', extents);
  return `COUNTIFS(${sections},"${sectionId}",${levels},"<>")`;
}

function organizationalRange(key: string, extents: InputExtents): string {
  return dataRange(
    SHEET_NAMES.ORGANIZATIONAL_INPUT,
    letterOf(ORGANIZATIONAL_INPUT_COLUMNS, key),
    extents.organizationalLastRow
  );
}

/**
 * Concatenate one text field across an organizational section.
 *
 * Same range-based shape as the assessment-input roll-up, for the same reason — see `rowBlockOf`.
 */
function organizationalTextJoinFormula(
  key: 'notes' | 'barriers' | 'plans',
  sectionId: string
): string {
  return joinTextFormula(
    SHEET_NAMES.ORGANIZATIONAL_INPUT,
    ORGANIZATIONAL_INPUT_COLUMNS,
    key,
    organizationalRowBlock(sectionId)
  );
}

// =============================================================================
// Aggregate formula resolution
// =============================================================================

/**
 * Fill in the aggregate formulas once the profile sheet's extent is known.
 *
 * The aggregate averages cells on the very sheet it sits on, so its ranges cannot be written
 * until the row count is settled. Rather than guess the extent up front — which would have to be
 * kept in step with the row builder by hand — the rows are emitted with placeholders and resolved
 * here from the actual last row.
 */
export function resolveAggregateFormulas(index: ProfileRowIndex): void {
  const { lastRow } = index;
  const dimensionIdRange = profileRange('dimensionId', lastRow);
  const sourceRange = profileRange('source', lastRow);
  const domainIdRange = profileRange('domainId', lastRow);
  const scoreRange = profileRange('currentScore', lastRow);

  for (const row of index.rows) {
    for (const [key, value] of Object.entries(row)) {
      if (typeof value !== 'object' || !('formula' in value)) {
        continue;
      }
      const match = /^\{\{(aggregate|aggregateUnrounded|aggregateNote):(.+)\}\}$/.exec(
        value.formula
      );
      if (!match) {
        continue;
      }

      const [, kind, dimensionId] = match;
      const criteria = [
        { range: dimensionIdRange, value: dimensionId as string },
        { range: sourceRange, value: SCORE_SOURCES.entered },
        ...Object.keys(DOMAIN_AGGREGATE_DIMENSIONS).map((enterpriseDomainId) => ({
          range: domainIdRange,
          value: `<>${enterpriseDomainId}`,
        })),
      ];

      /**
       * The count needs a criterion the mean does not: the score cell must actually hold a score.
       *
       * `AVERAGEIFS` gets this free — it ignores non-numeric cells in its average range — but
       * `COUNTIFS` counts every row matching the criteria whether or not it produced a number. Since
       * all 216 rows exist at generation time, reusing the mean's criteria made the count a
       * *constant*: every aggregate note read "(Aggregate from 50 assessments)" on a blank workbook,
       * beside a blank score. It also made the zero and singular branches below unreachable.
       *
       * Added to the count only. `scoreRange` is column E and this formula lands in the Notes
       * column, so referencing E as a criteria range is not circular — but adding it to
       * `filteredMeanFormula` would be, because that formula sits *in* column E. Excel tolerates a
       * self-reference in `AVERAGEIFS`'s average range and not in a criteria range.
       */
      const count = countFormula([...criteria, { range: scoreRange, value: '>0' }]);

      row[key] = formula(
        kind === 'aggregate'
          ? filteredMeanFormula(scoreRange, criteria)
          : kind === 'aggregateUnrounded'
            ? `IFERROR(AVERAGEIFS(${scoreRange},${criteria.map((c) => `${c.range},"${c.value}"`).join(',')}),"")`
            : // The note the CSV writes on an aggregate row, with the same singular/plural
              // handling, so the two artifacts read the same. This is also the only place the
              // contributing-area count appears, now that `aspectsAssessed` holds zero.
              `IF(${count}=0,"No contributing capability areas yet",` +
              `"(Aggregate from "&${count}&" assessment"&IF(${count}=1,"","s")&")")`
      );
    }
  }
}

// =============================================================================
// 07_Area_Scores
// =============================================================================

/**
 * One row per capability area, 72 rows.
 *
 * A standard area's score averages its three **rounded** dimension cells on `06`; the
 * organizational area averages its three **unrounded** section cells. Same shape, different
 * column, because 5.4 puts the rounding point in a different place for each — and this is the one
 * spot where getting it wrong would be invisible without reading the spec.
 */
export function buildAreaScoreRows(index: ProfileRowIndex): ComputedRow[] {
  return getAllAreasWithDomains().map(({ domain, area }) => {
    const organizational = isOrganizationalAssessmentArea(area.id);

    const scoreKey = organizational ? 'currentUnrounded' : 'currentScore';
    const targetKey = organizational ? 'targetUnrounded' : 'targetScore';
    const dimensionIds: readonly string[] = organizational
      ? ORGANIZATIONAL_SECTIONS
      : ORBIT_DIMENSION_IDS;

    const cellFor = (key: string, dimensionId: string): string => {
      const sheetRow = index.rowByKey.get(`${area.id}|${dimensionId}`);
      if (sheetRow === undefined) {
        throw new Error(`No profile row for ${area.id}|${dimensionId}`);
      }
      return profileCell(key, sheetRow);
    };

    const currentCells = dimensionIds.map((dimensionId) => cellFor(scoreKey, dimensionId));
    const targetCells = dimensionIds.map((dimensionId) => cellFor(targetKey, dimensionId));
    const assessedCells = dimensionIds.map((dimensionId) =>
      cellFor('aspectsAssessed', dimensionId)
    );
    const assessable = getAssessableAspectCountForArea(area.id, domain.id);

    // How many level cells this area has filled in, over its collected dimensions only — the
    // aggregate row contributes a literal zero. See `enteredGuard`.
    const enteredCount = `SUM(${assessedCells.join(',')})`;

    /**
     * Blank unless the state has entered something for *this* area.
     *
     * Without this, seeding a single Information level in any ordinary area gives all ten Data
     * Management areas a score — their aggregated dimension is computed domain-wide from other
     * domains' areas, so it is non-empty while the area itself is untouched. Twenty-one areas the
     * state never opened then join the domain and overall averages. Measured: one seeded area
     * plus one other pulled 21 phantom areas into the overall figure and moved it from 2.8 to 3.6.
     *
     * The tool has no such behaviour because an area with no ratings has no assessment record and
     * so contributes no score. "Has entered at least one level" is the closest the workbook can get
     * to that, and it is a strictly smaller divergence than the alternative.
     *
     * Applied to As-Is only. To-Be needs no guard: an aggregate row's To-Be is the text "Not
     * applicable" rather than a number, so it never props up an otherwise-empty area.
     */
    const enteredGuard = (expression: string): string => `IF(${enteredCount}=0,"",${expression})`;

    return {
      layer: capitalise(domain.layer),
      domainName: domain.name,
      areaName: area.name,
      currentScore: formula(enteredGuard(meanOfCellsFormula(currentCells))),
      targetScore: formula(meanOfCellsFormula(targetCells)),
      // Completion counts entered cells, N/A included, over the area's assessable count — the one
      // place N/A counts toward a figure while contributing to no average (5.4.1).
      completion: formula(`ROUND(${enteredCount}/${assessable}*100,0)`),
      aspectsAssessed: formula(enteredCount),
      aspectsAssessable: assessable,
      // The divisor of the score above, made visible: a dimension with nothing assessed is
      // dropped, so this is how many of the three actually contributed. Guarded alongside the
      // score, so an untouched enterprise-domain area does not report one scored dimension next to
      // a blank score.
      dimensionsScored: formula(enteredGuard(`COUNT(${currentCells.join(',')})`)),
      domainId: domain.id,
      areaId: area.id,
    };
  });
}

// =============================================================================
// 08_Domain_Scores
// =============================================================================

/**
 * 14 domain rows plus one overall row.
 *
 * The overall row averages the **area** scores on `07`, not the 14 domain scores above it.
 * `getOverallScore` pools every area equally, so averaging domain scores would weight a 3-area
 * domain the same as an 11-area one and produce a different number (5.4.1).
 */
export function buildDomainScoreRows(areaScoresLastRow: number): ComputedRow[] {
  const domainIdRange = areaScoresRange('domainId', areaScoresLastRow);
  const scoreRange = areaScoresRange('currentScore', areaScoresLastRow);
  const targetRange = areaScoresRange('targetScore', areaScoresLastRow);

  const rows: ComputedRow[] = [];
  const areasByDomain = new Map<string, number>();
  for (const { domain } of getAllAreasWithDomains()) {
    areasByDomain.set(domain.id, (areasByDomain.get(domain.id) ?? 0) + 1);
  }

  for (const { domain } of dedupeDomains()) {
    const criteria = [{ range: domainIdRange, value: domain.id }];
    rows.push({
      layer: capitalise(domain.layer),
      domainName: domain.name,
      currentScore: formula(filteredMeanFormula(scoreRange, criteria)),
      targetScore: formula(filteredMeanFormula(targetRange, criteria)),
      areasScored: formula(`COUNTIFS(${domainIdRange},"${domain.id}",${scoreRange},">0")`),
      areasInDomain: areasByDomain.get(domain.id) ?? 0,
      domainId: domain.id,
    });
  }

  rows.push({
    layer: 'All layers',
    domainName: 'Overall — all capability areas',
    currentScore: formula(`IFERROR(ROUND(AVERAGE(${scoreRange}),1),"")`),
    targetScore: formula(`IFERROR(ROUND(AVERAGE(${targetRange}),1),"")`),
    areasScored: formula(`COUNT(${scoreRange})`),
    areasInDomain: getAllAreasWithDomains().length,
    domainId: 'overall',
  });

  return rows;
}

function dedupeDomains(): Array<{ domain: { id: string; name: string; layer: string } }> {
  const seen = new Set<string>();
  const result: Array<{ domain: { id: string; name: string; layer: string } }> = [];
  for (const { domain } of getAllAreasWithDomains()) {
    if (!seen.has(domain.id)) {
      seen.add(domain.id);
      result.push({ domain });
    }
  }
  return result;
}

// =============================================================================
// 09_Dimension_Scores
// =============================================================================

/**
 * The enterprise-wide ORBIT figure, three rows (Decision 17).
 *
 * Mirrors `summariseDimensionsAcrossAreas`: the mean of per-area dimension scores with every area
 * counting once, and a visible `Areas` denominator so the figure can be read rather than trusted.
 *
 * Filters to `Entered` rows only. An aggregate is derived from these same per-area scores, so
 * including the 21 aggregate rows would count those areas twice — the tool avoids this by accident
 * (an enterprise area has no ratings for its aggregated dimension) and the workbook has to do it
 * on purpose, because the aggregate value really is in that cell.
 */
export function buildDimensionScoreRows(profileLastRow: number): ComputedRow[] {
  const dimensionIdRange = profileRange('dimensionId', profileLastRow);
  const sourceRange = profileRange('source', profileLastRow);
  const scoreRange = profileRange('currentScore', profileLastRow);
  const targetRange = profileRange('targetScore', profileLastRow);

  return ORBIT_DIMENSION_IDS.map((dimensionId) => {
    const criteria = [
      { range: dimensionIdRange, value: dimensionId },
      { range: sourceRange, value: SCORE_SOURCES.entered },
    ];
    return {
      dimensionName: getDimensionName(dimensionId),
      currentScore: formula(filteredMeanFormula(scoreRange, criteria)),
      targetScore: formula(filteredMeanFormula(targetRange, criteria)),
      areaCount: formula(
        `COUNTIFS(${dimensionIdRange},"${dimensionId}",${sourceRange},"${SCORE_SOURCES.entered}",${scoreRange},">0")`
      ),
      dimensionId,
    };
  });
}

// =============================================================================
// Shared
// =============================================================================

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Expected row counts, derived rather than written down, for the assertions to compare against. */
export function expectedComputedRowCounts(): Record<string, number> {
  const standardAreas = getStandardAreasWithDomains().length;
  return {
    [SHEET_NAMES.MATURITY_PROFILE]:
      standardAreas * ORBIT_DIMENSION_IDS.length + ORGANIZATIONAL_SECTIONS.length,
    [SHEET_NAMES.AREA_SCORES]: getAllAreasWithDomains().length,
    [SHEET_NAMES.DOMAIN_SCORES]: dedupeDomains().length + 1,
    [SHEET_NAMES.DIMENSION_SCORES]: ORBIT_DIMENSION_IDS.length,
  };
}
