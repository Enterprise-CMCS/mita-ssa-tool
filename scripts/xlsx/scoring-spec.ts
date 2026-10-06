/**
 * The scoring rules, expressed twice from one place: as JS functions and as Excel formulas.
 *
 * This is mitigation step 1 from Section 5.4 of the pilot clearance plan, and the one that
 * carries the weight. ExcelJS cannot evaluate a formula, so no test can assert that a cell
 * computes 3.4. What *can* be done is model each rule in JS, test that model against the
 * app's canonical scorer over shared fixtures, and generate the formula string from the same
 * definition — so the formula and the tested model cannot drift apart independently.
 *
 * It is not proof. A JS model that matches `calculateDimensionScore` proves the *rule* is
 * right; it says nothing about whether the Excel expression implements that rule. Only opening
 * the file does that, which is why Wave 7 ends with an arithmetic check in Excel.
 *
 * ## The four rounding points, which are not the same
 *
 * Getting these wrong is how the workbook silently disagrees with the tool, and they are
 * genuinely inconsistent in the app — deliberately, following a display-rounds /
 * scoring-does-not convention:
 *
 * | Roll-up               | Inputs                          | Rounds |
 * | --------------------- | ------------------------------- | ------ |
 * | Non-Technology dim    | aspect levels                   | once   |
 * | Technology dim        | two sub-dimension means, **unrounded** | once at the end |
 * | Standard area         | dimension scores, **already rounded**  | again  |
 * | Organizational area   | section means, **unrounded**    | once at the end |
 *
 * So a standard area averages rounded inputs and the organizational area averages unrounded
 * ones. That is why `06_Maturity_Profile` carries both a rounded score column and an unrounded
 * column: the two roll-ups above it consume different ones.
 *
 * ## Why Excel needs helper cells at all
 *
 * `AVERAGE` ignores text and blanks inside a **cell reference**, but returns `#VALUE!` for text
 * passed as a **direct argument**. The Technology rule is "mean of the two sub-dimension means,
 * dropping a sub-dimension with nothing assessed" — and the drop cannot be written inline,
 * because `AVERAGE(IFERROR(x,""), IFERROR(y,""))` errors the moment one side is empty. Writing
 * the two means into their own columns and then averaging *those cells* gets the drop for free.
 * The same applies to the organizational section means.
 */

import {
  ASSESSMENT_INPUT_COLUMNS,
  ORGANIZATIONAL_INPUT_COLUMNS,
  FIRST_DATA_ROW,
  SHEET_NAMES,
  type ColumnDefinition,
} from './constants.ts';

import type { RowBlock } from './rows.ts';

// =============================================================================
// The JS model
// =============================================================================

/**
 * A level as it appears in a workbook cell: a number, the N/A token, or empty.
 *
 * Deliberately models the *cell* rather than the app's rating. A workbook has no `-1`
 * sentinel — N/A is the text `N/A` and unassessed is an empty cell — so the model has to
 * start from what a state can actually enter or the formulas will be written against the
 * wrong domain.
 */
export type CellLevel = number | 'N/A' | '';

/**
 * Mean of the assessed levels, unrounded, or `null` if none are assessed.
 *
 * The single exclusion rule, in one place: a level counts only if it is a number greater
 * than zero. That drops empty cells (never assessed), the `N/A` token (does not apply), and
 * defensively any `0` or negative a state manages to paste past the dropdown validation.
 *
 * Returning `null` rather than `0` for "nothing assessed" is the whole game — the app *drops*
 * an empty dimension from the average above it rather than counting it as zero, and Excel's
 * `AVERAGEIFS` signals the same thing by erroring, which is why every generated formula wraps
 * in `IFERROR`.
 */
export function meanOfAssessed(levels: readonly CellLevel[]): number | null {
  const assessed = levels.filter(
    (level): level is number => typeof level === 'number' && level > 0
  );
  if (assessed.length === 0) {
    return null;
  }
  return assessed.reduce((sum, level) => sum + level, 0) / assessed.length;
}

/**
 * Round to one decimal place, matching the app's `roundScore`.
 *
 * Deliberately the same `Math.round(x * 10) / 10` the app uses, **including its float
 * behaviour**, so this model agrees with the app rather than being independently correct.
 * Excel's `ROUND` is not equivalent on decimal halfway values — `4.05 / 3` is `1.3` here and
 * `1.4` from Excel — and this function cannot detect that, since it shares the JS primitive.
 * `halfway.test.ts` enumerates the divergence instead.
 */
export function roundToOneDecimal(value: number | null): number | null {
  return value === null ? null : Math.round(value * 10) / 10;
}

/**
 * Mean of already-computed scores, dropping nulls, rounded once.
 *
 * The shape every roll-up above the dimension level takes. Dropping nulls rather than
 * treating them as zero is what makes the divisor "however many produced a score" instead of
 * a fixed 3 — the behaviour `finalizeAssessment` gets from a `Map` that a null never enters.
 */
export function meanOfScores(scores: readonly (number | null)[]): number | null {
  const present = scores.filter((score): score is number => score !== null);
  if (present.length === 0) {
    return null;
  }
  return roundToOneDecimal(present.reduce((sum, score) => sum + score, 0) / present.length);
}

/** Levels for one Technology sub-dimension. */
export interface TechnologySubDimensionLevels {
  technologyInfrastructureManagement: readonly CellLevel[];
  applicationManagement: readonly CellLevel[];
}

/**
 * The Technology dimension score: mean of the two sub-dimension means, rounded once.
 *
 * The inner means are **not** rounded before being averaged. Rounding them first makes
 * Technology disagree with the app by 0.1, which is OBS-21 — a defect that took three waves
 * to clear out of five separate call sites, so it is worth being exact about here.
 *
 * A sub-dimension with nothing assessed is dropped, not zeroed, so a state who has filled in
 * only Infrastructure gets Infrastructure's mean as their Technology score.
 */
export function technologyDimensionScore(levels: TechnologySubDimensionLevels): number | null {
  const subDimensionMeans = [
    meanOfAssessed(levels.technologyInfrastructureManagement),
    meanOfAssessed(levels.applicationManagement),
  ].filter((mean): mean is number => mean !== null);

  if (subDimensionMeans.length === 0) {
    return null;
  }
  return roundToOneDecimal(
    subDimensionMeans.reduce((sum, mean) => sum + mean, 0) / subDimensionMeans.length
  );
}

/** A non-Technology dimension score: mean of assessed aspect levels, rounded once. */
export function plainDimensionScore(levels: readonly CellLevel[]): number | null {
  return roundToOneDecimal(meanOfAssessed(levels));
}

/**
 * A standard capability area's score: mean of its dimension scores, **already rounded**.
 *
 * For the two enterprise domains one of these three is the aggregate rather than a manual
 * measurement, and if the aggregate is absent the divisor drops to 2 — `finalizeAssessment`
 * injects it into the same map, so it participates identically. Callers pass whatever the
 * three dimension cells hold.
 */
export function standardAreaScore(dimensionScores: readonly (number | null)[]): number | null {
  return meanOfScores(dimensionScores);
}

/**
 * The organizational area's score: mean of the three section means, **unrounded**.
 *
 * The one roll-up that averages unrounded inputs. Sections with nothing assessed are excluded,
 * so the three sections weigh equally despite having 6, 5 and 4 aspects — a flat mean over all
 * 15 organizational aspects gives a different answer and is the mistake to avoid.
 */
export function organizationalAreaScore(
  sectionLevels: readonly (readonly CellLevel[])[]
): number | null {
  const sectionMeans = sectionLevels
    .map((levels) => meanOfAssessed(levels))
    .filter((mean): mean is number => mean !== null);

  if (sectionMeans.length === 0) {
    return null;
  }
  return roundToOneDecimal(sectionMeans.reduce((sum, mean) => sum + mean, 0) / sectionMeans.length);
}

/**
 * Completion percentage for an area.
 *
 * **N/A counts as assessed here**, which is the opposite of its treatment in every average.
 * `useScores` counts `currentLevel > 0 || currentLevel === -1`, so a state who marks an aspect
 * Not Applicable has completed it. In workbook terms that is "the cell is not empty", which is
 * why the Excel side uses `COUNTA` rather than `COUNTIF(">0")`.
 */
export function completionPercentage(
  levels: readonly CellLevel[],
  assessableCount: number
): number {
  if (assessableCount <= 0) {
    return 0;
  }
  const entered = levels.filter((level) => level !== '').length;
  return Math.round((entered / assessableCount) * 100);
}

// =============================================================================
// Column addressing
// =============================================================================

/** Convert a 1-based column index to its spreadsheet letters. */
export function columnLetter(index: number): string {
  let remaining = index;
  let letters = '';
  while (remaining > 0) {
    const modulo = (remaining - 1) % 26;
    letters = String.fromCharCode(65 + modulo) + letters;
    remaining = Math.floor((remaining - modulo) / 26);
  }
  return letters;
}

/**
 * The letter of a named column in a column model.
 *
 * Throws rather than returning a fallback. A formula built against a column that does not
 * exist would silently address the wrong data, and a `#REF!` in a shipped workbook is not
 * something any test in this repo can catch.
 */
export function letterOf(columns: readonly ColumnDefinition[], key: string): string {
  const index = columns.findIndex((column) => column.key === key);
  if (index < 0) {
    throw new Error(`No column named "${key}". Available: ${columns.map((c) => c.key).join(', ')}`);
  }
  return columnLetter(index + 1);
}

/**
 * An absolute range over one column of a sheet's data rows.
 *
 * Absolute, and bounded to the real last row rather than a whole-column reference. A
 * whole-column `$H:$H` would include the notice row and the header, and `AVERAGEIFS` would
 * then have to be defended against the header text — bounding it is simpler to reason about
 * and faster in a 1,625-row workbook.
 *
 * Sheet names are quoted because they begin with digits, which Excel would otherwise read as
 * a malformed reference.
 */
export function dataRange(sheetName: string, letter: string, lastRow: number): string {
  return `'${sheetName}'!$${letter}$${FIRST_DATA_ROW}:$${letter}$${lastRow}`;
}

// =============================================================================
// Formula generation
// =============================================================================

/**
 * How many rows each input sheet holds. Passed in rather than imported so the formula
 * builders stay pure and can be exercised from a test with arbitrary sizes.
 */
export interface InputExtents {
  assessmentLastRow: number;
  organizationalLastRow: number;
}

/** Criteria naming one column of the assessment input sheet and the value to match. */
interface Criterion {
  key: string;
  value: string;
}

function assessmentCriteria(criteria: readonly Criterion[], extents: InputExtents): string {
  return criteria
    .map(
      ({ key, value }) =>
        `${dataRange(SHEET_NAMES.ASSESSMENT_INPUT, letterOf(ASSESSMENT_INPUT_COLUMNS, key), extents.assessmentLastRow)},"${value}"`
    )
    .join(',');
}

/**
 * The unrounded mean of one slice of the assessment input sheet.
 *
 * `AVERAGEIFS` already ignores text and blanks, so the explicit `">0"` on the value range is
 * redundant for anything entered through the dropdown. It is there for what the dropdown does
 * not cover: validation rejects *typed* entries but not every paste path, so a pasted `0` or
 * `-1` would otherwise be averaged in. Cheap insurance on a submission artifact.
 *
 * Criteria address the **ID columns**, never row offsets, because sorting is deliberately left
 * enabled on the input sheets — a state can reorder 1,625 rows and every formula must still
 * find its data.
 */
export function unroundedMeanFormula(
  levelKey: 'currentLevel' | 'targetLevel',
  criteria: readonly Criterion[],
  extents: InputExtents
): string {
  const levels = dataRange(
    SHEET_NAMES.ASSESSMENT_INPUT,
    letterOf(ASSESSMENT_INPUT_COLUMNS, levelKey),
    extents.assessmentLastRow
  );
  return `IFERROR(AVERAGEIFS(${levels},${assessmentCriteria(criteria, extents)},${levels},">0"),"")`;
}

/**
 * A non-Technology dimension score: the unrounded mean, rounded once.
 *
 * The `IFERROR` wrapper is the drop semantics. `AVERAGEIFS` returns `#DIV/0!` when nothing
 * matches, where the app's scorer returns `null`; collapsing that to an empty string means the
 * roll-up above sees an empty cell and ignores it, which is what `null` does in JS.
 */
export function plainDimensionFormula(
  levelKey: 'currentLevel' | 'targetLevel',
  criteria: readonly Criterion[],
  extents: InputExtents
): string {
  const levels = dataRange(
    SHEET_NAMES.ASSESSMENT_INPUT,
    letterOf(ASSESSMENT_INPUT_COLUMNS, levelKey),
    extents.assessmentLastRow
  );
  return `IFERROR(ROUND(AVERAGEIFS(${levels},${assessmentCriteria(criteria, extents)},${levels},">0"),1),"")`;
}

/**
 * The Technology dimension score, from its two sub-dimension mean cells.
 *
 * **Averages the two helper cells rather than inlining their formulas**, and that is load
 * bearing rather than tidiness. `AVERAGE` ignores text inside a cell reference but returns
 * `#VALUE!` for text passed directly, so the inline form
 * `AVERAGE(IFERROR(a,""),IFERROR(b,""))` breaks the moment one sub-dimension is unassessed —
 * a very common partial state. Referencing the cells gets the drop for free, and keeps the
 * inner means unrounded as OBS-21 requires.
 */
export function technologyDimensionFormula(
  infrastructureCell: string,
  applicationCell: string
): string {
  return `IFERROR(ROUND(AVERAGE(${infrastructureCell},${applicationCell}),1),"")`;
}

/**
 * A roll-up averaging cells that already hold rounded scores.
 *
 * Used for the standard area score and the domain score. Both average already-rounded inputs
 * and round again, per 5.4 — the double rounding is the app's behaviour, not an oversight.
 */
export function meanOfCellsFormula(cellRefs: readonly string[]): string {
  return `IFERROR(ROUND(AVERAGE(${cellRefs.join(',')}),1),"")`;
}

/**
 * A roll-up averaging a contiguous range of score cells, filtered by a criterion.
 *
 * For the aggregate dimension, the domain score, and the enterprise-wide figure — all of which
 * average a variable number of per-area cells on `06` or `07` rather than a fixed few.
 */
export function filteredMeanFormula(
  valueRange: string,
  criteria: readonly { range: string; value: string }[]
): string {
  const pairs = criteria.map(({ range, value }) => `${range},"${value}"`).join(',');
  return `IFERROR(ROUND(AVERAGEIFS(${valueRange},${pairs}),1),"")`;
}

/** Count of cells matching criteria, for a visible denominator. */
export function countFormula(criteria: readonly { range: string; value: string }[]): string {
  const pairs = criteria.map(({ range, value }) => `${range},"${value}"`).join(',');
  return `COUNTIFS(${pairs})`;
}

/** Separator between concatenated text entries, matching what the CSV profile uses. */
export const TEXT_SEPARATOR = ' | ';

/**
 * Concatenate the non-empty text entries for one contiguous block of input rows.
 *
 * ## Why this is `IF`/`&`/`MID` rather than `TEXTJOIN`
 *
 * `TEXTJOIN` is the obvious function for this and the workbook used it, but it **requires Excel
 * 2019, 2021, 2024 or Microsoft 365 — it does not exist in Excel 2016 or earlier**, where every
 * cell using it reads `#NAME?`. Every other function this generator emits is Excel 2007 or older,
 * so `TEXTJOIN` alone raised the workbook's floor by twelve years for three convenience columns, in
 * front of an audience where a 2016 perpetual install is entirely plausible.
 *
 * So each cell is concatenated explicitly. Every term contributes `" | " & value`, or nothing when
 * the cell is empty, and `MID` then drops the leading separator:
 *
 * ```
 * MID(IF(a="","", " | "&a) & IF(b="","", " | "&b) & …, 4, 32767)
 * ```
 *
 * Verbose in the formula bar and identical in the result. `MID` on an empty string returns an empty
 * string, so a block with nothing entered yields `""` without a special case, and the start offset
 * is derived from the separator rather than hardcoded as `4`.
 *
 * ## Why a row block rather than a criteria-based filter
 *
 * The criteria-based form `TEXTJOIN(...,IF(ids=x,texts,""))` is broken as a normal formula: Excel
 * applies implicit intersection to the `IF` condition and silently reads the wrong rows. See
 * `rowBlockOf` in `rows.ts` for the measurement and for why addressing by row position is safe on a
 * sheet that cannot be sorted.
 *
 * ## Known limit
 *
 * A cell holds at most 32,767 characters, so a state who wrote thousands of characters of notes
 * across all aspects of one dimension could overflow the concatenation. `TEXTJOIN` had the same
 * ceiling. Not defended against, because the input that reaches it is implausible and the failure
 * is a visible Excel error rather than a wrong value.
 */
export function joinTextFormula(
  sheetName: string,
  columns: readonly ColumnDefinition[],
  textKey: 'notes' | 'barriers' | 'plans',
  block: RowBlock
): string {
  const letter = letterOf(columns, textKey);
  const terms: string[] = [];
  for (let row = block.firstRow; row <= block.lastRow; row += 1) {
    const cell = `'${sheetName}'!$${letter}$${row}`;
    terms.push(`IF(${cell}="","","${TEXT_SEPARATOR}"&${cell})`);
  }
  return `MID(${terms.join('&')},${TEXT_SEPARATOR.length + 1},32767)`;
}

/**
 * The organizational section mean, over `05_Organizational_Input`.
 *
 * Unrounded, because the organizational area score averages unrounded section means — the one
 * roll-up in the model that does.
 */
export function organizationalSectionMean(
  levelKey: 'currentLevel' | 'targetLevel',
  sectionId: string,
  extents: InputExtents
): string {
  const levels = dataRange(
    SHEET_NAMES.ORGANIZATIONAL_INPUT,
    letterOf(ORGANIZATIONAL_INPUT_COLUMNS, levelKey),
    extents.organizationalLastRow
  );
  const sections = dataRange(
    SHEET_NAMES.ORGANIZATIONAL_INPUT,
    letterOf(ORGANIZATIONAL_INPUT_COLUMNS, 'sectionId'),
    extents.organizationalLastRow
  );
  return `AVERAGEIFS(${levels},${sections},"${sectionId}",${levels},">0")`;
}

/**
 * The section mean, guarded, for the unrounded column a roll-up consumes.
 *
 * Returned bare from `organizationalSectionMean` so the rounded and unrounded forms can each wrap
 * it once. Wrapping twice — `IFERROR(ROUND(IFERROR(x,""),1),"")` — works but reads as though
 * someone was unsure, and `ROUND("")` raising a fresh error that a second `IFERROR` catches is a
 * confusing way to get the right answer.
 */
export function organizationalSectionMeanFormula(
  levelKey: 'currentLevel' | 'targetLevel',
  sectionId: string,
  extents: InputExtents
): string {
  return `IFERROR(${organizationalSectionMean(levelKey, sectionId, extents)},"")`;
}

/** The section mean rounded for display, matching what the tool shows per section. */
export function organizationalSectionScoreFormula(
  levelKey: 'currentLevel' | 'targetLevel',
  sectionId: string,
  extents: InputExtents
): string {
  return `IFERROR(ROUND(${organizationalSectionMean(levelKey, sectionId, extents)},1),"")`;
}

/**
 * Completion count for an area: how many of its level cells hold anything at all.
 *
 * `COUNTIFS` with `"<>"` counts non-empty cells, so the `N/A` token counts toward completion
 * while contributing to no average — matching `useScores`, which counts
 * `currentLevel > 0 || currentLevel === -1`. Using `">0"` here instead would quietly report a
 * state who marked aspects Not Applicable as less complete than they are.
 */
export function completionCountFormula(
  criteria: readonly Criterion[],
  extents: InputExtents
): string {
  const levels = dataRange(
    SHEET_NAMES.ASSESSMENT_INPUT,
    letterOf(ASSESSMENT_INPUT_COLUMNS, 'currentLevel'),
    extents.assessmentLastRow
  );
  return `COUNTIFS(${assessmentCriteria(criteria, extents)},${levels},"<>")`;
}
