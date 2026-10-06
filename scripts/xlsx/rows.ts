/**
 * Pure row builders for the workbook's sheets.
 *
 * Every function here returns plain objects keyed by the column `key` values in
 * `constants.ts` and touches no ExcelJS API. That split is what makes the content
 * testable: content fidelity (all 14 domains, 205 criteria rows, the right IDs) is
 * asserted against these functions directly, while `workbook.ts` is only
 * responsible for placing them on a sheet. A bug in either layer then fails a
 * different test.
 */

import {
  getAllAreasWithDomains,
  getAllOrganizationalAspectLocations,
  getAspectLocationsForDimension,
  getDimensionName,
  getInputDimensionsForArea,
  getMaturityLevels,
  getStandardAreasWithDomains,
  LEVEL_KEYS,
  ORBIT_DIMENSION_IDS,
  ORGANIZATIONAL_ASSESSMENT_AREA_ID,
} from './model.ts';
import { FIRST_DATA_ROW, NA_TOKEN } from './constants.ts';

import type { LevelKey } from '../../src/types/index.ts';

/**
 * A formula cell, in ExcelJS's own shape.
 *
 * Passing `{ formula }` straight through means the computed sheets need no separate write path
 * in `addTableSheet` — the same function places literal values and formulas, so every sheet gets
 * the same styling, protection and 508 treatment without that having to be remembered twice.
 */
export interface FormulaCell {
  formula: string;
}

/** Anything a cell can hold. */
export type SheetCellValue = string | number | FormulaCell;

/** A built row: column key to cell value. */
export type SheetRow = Record<string, SheetCellValue>;

/**
 * How a boolean flag renders in a cell.
 *
 * Spelled out rather than left blank for false, because an empty cell in a flag
 * column is ambiguous between "no" and "not filled in" — and a blank cell in a
 * column that is otherwise populated is what 5.3's no-empty-cells intent is about.
 */
const YES = 'Yes';
const NO = 'No';

/**
 * Join a list into one cell.
 *
 * Semicolons rather than newlines: a newline inside a cell renders as a wrapped
 * line in Excel but is read as a single run by a screen reader, and it also breaks
 * naive CSV round-tripping. Semicolon-space is unambiguous in both.
 */
function joinList(values: readonly string[]): string {
  return values.join('; ');
}

// =============================================================================
// 01_Maturity_Levels
// =============================================================================

/**
 * Six rows: levels 1-5 and Not Applicable.
 *
 * `entryValue` is what a state literally types into a level cell, which is why N/A
 * appears as the text token rather than the tool's internal `-1`. "Not assessed" is
 * deliberately absent as a row: it is the absence of an entry, not a value, and
 * offering it as something to type would invite states to write "0" into cells that
 * Wave 7's `AVERAGEIF(">0")` would then have to defend against.
 */
export function buildMaturityLevelRows(): SheetRow[] {
  const levels = getMaturityLevels();
  const rows: SheetRow[] = LEVEL_KEYS.map((levelKey: LevelKey, index) => ({
    entryValue: index + 1,
    name: levels[levelKey].name,
    description: levels[levelKey].description,
    levelKey,
  }));

  rows.push({
    entryValue: NA_TOKEN,
    name: levels.notApplicable.name,
    description: levels.notApplicable.description,
    levelKey: 'notApplicable',
  });

  return rows;
}

// =============================================================================
// 02_Capability_Reference
// =============================================================================

/**
 * One row per capability area, all 72 including the organizational one.
 *
 * `assessedDimensions` states which dimensions the area actually collects, so a
 * reader can see why an area has 16 or 15 input rows on sheet `04` instead of 26
 * without having to infer it from row counts. For an aggregate domain it names the
 * omitted dimension explicitly rather than just leaving it out — the omission is a
 * modelling decision, and a reviewer who does not know that reads it as missing data.
 */
export function buildCapabilityReferenceRows(): SheetRow[] {
  return getAllAreasWithDomains().map(({ domain, area }) => ({
    layer: capitalise(domain.layer),
    domainName: domain.name,
    domainDescription: domain.description,
    areaName: area.name,
    areaDescription: area.description,
    topics: area.topics.length > 0 ? joinList(area.topics) : 'None listed',
    informationManagement: area.informationManagement ? YES : NO,
    assessedDimensions: describeAssessedDimensions(area.id, domain.id),
    domainId: domain.id,
    areaId: area.id,
  }));
}

/** Human-readable summary of which dimensions an area collects input for. */
function describeAssessedDimensions(areaId: string, domainId: string): string {
  if (areaId === ORGANIZATIONAL_ASSESSMENT_AREA_ID) {
    return 'Organizational sections only — see 05_Organizational_Input';
  }

  const collected = getInputDimensionsForArea(areaId, domainId);
  const names = collected.map((dimensionId) => getDimensionName(dimensionId));

  const omitted = ORBIT_DIMENSION_IDS.filter((dimensionId) => !collected.includes(dimensionId));
  if (omitted.length === 0) {
    return joinList(names);
  }

  const omittedNames = omitted.map((dimensionId) => getDimensionName(dimensionId));
  return `${joinList(names)} (${joinList(omittedNames)} is an aggregate for this domain, not entered here)`;
}

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

// =============================================================================
// 03_ORBIT_Criteria_Reference
// =============================================================================

/**
 * 205 rows: every one of the 41 aspects at each of the 5 levels.
 *
 * Covers the organizational aspects as well as the 26 standard ones, so this sheet
 * is the complete criteria reference for everything either input sheet asks for. The
 * `Sub-Dimension` column is filled with a dash rather than left blank for the 30
 * non-Technology aspects: a blank would read as missing data and would put an empty
 * stretch inside a table column.
 */
export function buildCriteriaReferenceRows(): SheetRow[] {
  const levels = getMaturityLevels();
  const rows: SheetRow[] = [];

  for (const dimensionId of ORBIT_DIMENSION_IDS) {
    for (const location of getAspectLocationsForDimension(dimensionId)) {
      for (const [index, levelKey] of LEVEL_KEYS.entries()) {
        rows.push({
          dimensionName: location.dimensionName,
          subDimensionName: location.subDimensionName ?? 'Not applicable',
          aspectName: location.aspect.name,
          aspectQuestion: location.aspect.description,
          level: index + 1,
          levelName: levels[levelKey].name,
          criteria: location.aspect.levels[levelKey].description,
          suggestedDocumentation: documentationFor(location.aspect.levels[levelKey].evidence),
          dimensionId: location.dimensionId,
          subDimensionId: location.subDimensionId ?? 'Not applicable',
          aspectId: location.aspect.id,
        });
      }
    }
  }

  for (const location of getAllOrganizationalAspectLocations()) {
    for (const [index, levelKey] of LEVEL_KEYS.entries()) {
      rows.push({
        dimensionName: location.sectionName,
        subDimensionName: 'Not applicable',
        aspectName: location.aspect.name,
        aspectQuestion: location.aspect.description,
        level: index + 1,
        levelName: levels[levelKey].name,
        criteria: location.aspect.levels[levelKey].description,
        suggestedDocumentation: documentationFor(location.aspect.levels[levelKey].evidence),
        dimensionId: location.sectionId,
        subDimensionId: 'Not applicable',
        aspectId: location.aspect.id,
      });
    }
  }

  return rows;
}

/**
 * Render an evidence list.
 *
 * 56 of the 205 level entries have no evidence listed, so this column would
 * otherwise be blank on a quarter of its rows. Saying so explicitly keeps the column
 * populated and distinguishes "the model suggests nothing here" from "we failed to
 * copy it across".
 */
function documentationFor(evidence: readonly string[]): string {
  return evidence.length > 0 ? joinList(evidence) : 'None suggested at this level';
}

// =============================================================================
// 04_Assessment_Input
// =============================================================================

/**
 * 1,625 rows: one per assessable aspect per standard capability area.
 *
 * Not 71 x 26 = 1,846. Under Decision P1(a) the aggregate dimension's rows are
 * omitted, matching the tool exactly: Data Management's 10 areas skip the 10
 * Information aspects and Technology Management's 11 areas skip the 11 Technology
 * aspects, which is 100 + 121 = 221 rows fewer. Asking a state for values the tool
 * never collects would produce workbook input that cannot be reconciled with a
 * tool-based assessment of the same state.
 *
 * Level, notes, barriers and plans cells are left empty — Decision 6 makes this a
 * blank workbook. Empty *editable* cells are the point of the sheet and are not what
 * 5.3's no-blank-columns rule is about; that rule targets reference columns that
 * carry no information.
 */
export function buildAssessmentInputRows(): SheetRow[] {
  const rows: SheetRow[] = [];

  for (const { domain, area } of getStandardAreasWithDomains()) {
    for (const dimensionId of getInputDimensionsForArea(area.id, domain.id)) {
      for (const location of getAspectLocationsForDimension(dimensionId)) {
        rows.push({
          domainName: domain.name,
          areaName: area.name,
          informationManagement: area.informationManagement ? YES : NO,
          dimensionName: location.dimensionName,
          subDimensionName: location.subDimensionName ?? 'Not applicable',
          aspectName: location.aspect.name,
          aspectQuestion: location.aspect.description,
          currentLevel: '',
          targetLevel: '',
          notes: '',
          barriers: '',
          plans: '',
          domainId: domain.id,
          areaId: area.id,
          dimensionId: location.dimensionId,
          subDimensionId: location.subDimensionId ?? 'Not applicable',
          aspectId: location.aspect.id,
        });
      }
    }
  }

  return rows;
}

// =============================================================================
// 05_Organizational_Input
// =============================================================================

/**
 * 15 rows: the aspects of the three Enterprise Governance sections.
 *
 * Separate from sheet `04` because these are not B-I-T aspects and are assessed once
 * for the organization rather than per capability area. Combining them would put two
 * different row shapes in one table.
 */
export function buildOrganizationalInputRows(): SheetRow[] {
  return getAllOrganizationalAspectLocations().map((location) => ({
    sectionName: location.sectionName,
    aspectName: location.aspect.name,
    aspectQuestion: location.aspect.description,
    currentLevel: '',
    targetLevel: '',
    notes: '',
    barriers: '',
    plans: '',
    areaId: ORGANIZATIONAL_ASSESSMENT_AREA_ID,
    sectionId: location.sectionId,
    aspectId: location.aspect.id,
  }));
}

// =============================================================================
// Row blocks, for the text roll-ups
// =============================================================================

/** The contiguous sheet rows one group of input rows occupies. */
export interface RowBlock {
  firstRow: number;
  lastRow: number;
}

/**
 * The contiguous row span matching a group of input rows, or a thrown error if it is not
 * contiguous.
 *
 * ## Why the text roll-ups address rows instead of criteria
 *
 * Every *score* on the computed sheets uses `AVERAGEIFS`/`COUNTIFS` over the ID columns, which is
 * criteria-based and robust. The text roll-ups cannot: `TEXTJOIN` has no `IFS` variant, so the
 * only criteria-based form is `TEXTJOIN(...,IF(ids=x,texts,""))` — and **that does not work as a
 * normal formula**. Excel applies implicit intersection to the `IF` condition, collapsing it to
 * the single row matching the formula's own row number. Measured on the real artifact: Health Plan
 * Administration's notes cell returned `HPA note | CLAIMS note`, having swallowed a note belonging
 * to a different capability area, while that area's own cell read empty. It is a silent
 * mis-attribution, not an error.
 *
 * Making it a true CSE array formula does fix attribution, but ExcelJS cannot write
 * `<f t="array">`, so it would mean post-processing the generated archive — and the array form then
 * needs `&""` guards because an empty input cell coerces to `0` and `TEXTJOIN` does not skip zeros.
 *
 * A plain contiguous range needs none of that. `TEXTJOIN(" | ",TRUE,'04'!$J$393:$J$397)` skips
 * empty cells natively, and there is no array semantics to get wrong.
 *
 * ## Why addressing by row is safe here
 *
 * Because the rows cannot move. Both input sheets are protected with `sort="0"`, so Excel refuses
 * to reorder them, and the reference columns are locked as well. Filtering is a different
 * operation — it hides rows without moving them, and `TEXTJOIN` over a range includes hidden rows,
 * so a filtered view does not change any computed value.
 *
 * This function throws rather than returning a best guess, because the blocks are only contiguous
 * as a consequence of the loop order in the builders above. If that order ever changes, generation
 * fails here instead of emitting a formula that quietly reads a neighbouring area's text.
 */
export function rowBlockOf(
  rows: readonly SheetRow[],
  matches: (row: SheetRow) => boolean,
  describe: string
): RowBlock {
  const matched: number[] = [];
  for (const [index, row] of rows.entries()) {
    if (matches(row)) {
      matched.push(FIRST_DATA_ROW + index);
    }
  }

  const firstRow = matched[0];
  const lastRow = matched[matched.length - 1];
  if (firstRow === undefined || lastRow === undefined) {
    throw new Error(`No input rows match ${describe}`);
  }
  if (lastRow - firstRow + 1 !== matched.length) {
    throw new Error(
      `Input rows for ${describe} are not contiguous: ${matched.length} rows spanning ` +
        `${firstRow}-${lastRow}. The text roll-ups address rows by position, so a gap here would ` +
        `make them read a neighbouring group's text.`
    );
  }
  return { firstRow, lastRow };
}

/** The contiguous block on `04_Assessment_Input` for one area and dimension. */
export function assessmentRowBlock(
  areaId: string,
  dimensionId: string,
  subDimensionId?: string
): RowBlock {
  return rowBlockOf(
    buildAssessmentInputRows(),
    (row) =>
      row.areaId === areaId &&
      row.dimensionId === dimensionId &&
      (subDimensionId === undefined || row.subDimensionId === subDimensionId),
    `${areaId} / ${dimensionId}${subDimensionId === undefined ? '' : ` / ${subDimensionId}`}`
  );
}

/** The contiguous block on `05_Organizational_Input` for one section. */
export function organizationalRowBlock(sectionId: string): RowBlock {
  return rowBlockOf(
    buildOrganizationalInputRows(),
    (row) => row.sectionId === sectionId,
    `organizational section ${sectionId}`
  );
}
