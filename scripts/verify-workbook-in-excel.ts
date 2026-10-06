/**
 * Verify the workbook's arithmetic by making Excel compute it.
 *
 * ## Why this exists
 *
 * Every other check on the computed sheets asserts a **string**. `scoring-spec.test.ts` proves the
 * rule matches `calculateDimensionScore`; `profile-rows.test.ts` snapshots the generated formulas.
 * Neither can evaluate anything, because ExcelJS has no formula engine — so
 * `AVERAGEIFS('04'!$H$3:$H$1627, ...)` could be shaped perfectly, point at the right columns, and
 * still return a number the tool disagrees with. Section 5.4 of the pilot clearance plan names this
 * as the gap that closes only by opening the file.
 *
 * This closes it by opening the file *automatically*: seed input cells, let Excel recalculate, read
 * the score cells back, and compare against the same JS model the unit tests use. A wrong formula
 * becomes a failed assertion rather than something a reviewer might not think to check.
 *
 * ## Why it is not in CI, and what that costs
 *
 * It needs macOS and a licensed Microsoft Excel, driven over AppleScript. CI has neither, so this
 * is a **manual gate** run before shipping a workbook change — `npm run verify:workbook-excel`.
 * The cost is that it can rot: nothing forces it to run. It is written to fail loudly and to
 * derive every cell address from the generator's own builders, so a stale address is an error
 * rather than a silently wrong reading.
 *
 * ## Safety
 *
 * Works on a **temp copy**. Excel autosaves, and Wave 6 lost an afternoon to inspecting a file
 * Excel had rewritten under it — so the shipped artifact is never opened. The copy is deleted on
 * every exit path.
 *
 * Run: `npm run verify:workbook-excel`
 */

import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';

import ExcelJS from 'exceljs';

import {
  ASSESSMENT_INPUT_COLUMNS,
  AREA_SCORES_COLUMNS,
  DIMENSION_SCORES_COLUMNS,
  DOMAIN_SCORES_COLUMNS,
  FIRST_DATA_ROW,
  HEADER_ROW,
  MATURITY_PROFILE_COLUMNS,
  ORGANIZATIONAL_INPUT_COLUMNS,
  SHEET_NAMES,
  type ColumnDefinition,
} from './xlsx/constants.ts';
import { EXCEL_CHECK_FIXTURES } from './xlsx/excel-rounding.ts';
import {
  ORGANIZATIONAL_ASSESSMENT_AREA_ID,
  ORGANIZATIONAL_SECTIONS,
  getAllAreasWithDomains,
} from './xlsx/model.ts';
import { WORKBOOK_OUTPUT_PATH } from './xlsx/paths.ts';
import {
  buildAreaScoreRows,
  buildDimensionScoreRows,
  buildDomainScoreRows,
  buildMaturityProfileRows,
  resolveAggregateFormulas,
} from './xlsx/profile-rows.ts';
import { buildAssessmentInputRows, buildOrganizationalInputRows } from './xlsx/rows.ts';
import {
  completionPercentage,
  letterOf,
  organizationalAreaScore,
  plainDimensionScore,
  standardAreaScore,
  technologyDimensionScore,
  meanOfScores,
  type CellLevel,
} from './xlsx/scoring-spec.ts';

// =============================================================================
// Addressing, derived from the generator rather than written down
// =============================================================================

const assessmentRows = buildAssessmentInputRows();
const organizationalRows = buildOrganizationalInputRows();
const profile = buildMaturityProfileRows({
  assessmentLastRow: HEADER_ROW + assessmentRows.length,
  organizationalLastRow: HEADER_ROW + organizationalRows.length,
});
resolveAggregateFormulas(profile);
const areaScoreRows = buildAreaScoreRows(profile);
const domainScoreRows = buildDomainScoreRows(HEADER_ROW + areaScoreRows.length);
const dimensionScoreRows = buildDimensionScoreRows(profile.lastRow);

/** A cell to write or read: sheet, address, and what it means. */
interface CellRef {
  sheet: string;
  address: string;
}

function cellOn(
  sheet: string,
  columns: readonly ColumnDefinition[],
  key: string,
  row: number
): CellRef {
  return { sheet, address: `${letterOf(columns, key)}${row}` };
}

/** Every `04_Assessment_Input` row for one area and dimension, in sheet order. */
function inputRowsFor(areaId: string, dimensionId: string, subDimensionId?: string): number[] {
  const matches: number[] = [];
  for (const [index, row] of assessmentRows.entries()) {
    if (row.areaId !== areaId || row.dimensionId !== dimensionId) {
      continue;
    }
    if (subDimensionId !== undefined && row.subDimensionId !== subDimensionId) {
      continue;
    }
    matches.push(FIRST_DATA_ROW + index);
  }
  if (matches.length === 0) {
    throw new Error(`No input rows for ${areaId} / ${dimensionId} / ${subDimensionId ?? '-'}`);
  }
  return matches;
}

/** Every `05_Organizational_Input` row for one section. */
function organizationalRowsFor(sectionId: string): number[] {
  const matches: number[] = [];
  for (const [index, row] of organizationalRows.entries()) {
    if (row.sectionId === sectionId) {
      matches.push(FIRST_DATA_ROW + index);
    }
  }
  if (matches.length === 0) {
    throw new Error(`No organizational rows for ${sectionId}`);
  }
  return matches;
}

/** The `06_Maturity_Profile` row holding one area's dimension score. */
function profileRowFor(areaId: string, dimensionId: string): number {
  const row = profile.rowByKey.get(`${areaId}|${dimensionId}`);
  if (row === undefined) {
    throw new Error(`No profile row for ${areaId}|${dimensionId}`);
  }
  return row;
}

function indexOfAreaRow(areaId: string): number {
  const index = areaScoreRows.findIndex((row) => row.areaId === areaId);
  if (index < 0) {
    throw new Error(`No area-score row for ${areaId}`);
  }
  return FIRST_DATA_ROW + index;
}

function indexOfDomainRow(domainId: string): number {
  const index = domainScoreRows.findIndex((row) => row.domainId === domainId);
  if (index < 0) {
    throw new Error(`No domain-score row for ${domainId}`);
  }
  return FIRST_DATA_ROW + index;
}

function indexOfDimensionRow(dimensionId: string): number {
  const index = dimensionScoreRows.findIndex((row) => row.dimensionId === dimensionId);
  if (index < 0) {
    throw new Error(`No dimension-score row for ${dimensionId}`);
  }
  return FIRST_DATA_ROW + index;
}

// =============================================================================
// Picking areas to exercise
// =============================================================================

/**
 * Areas chosen from the model, not named literally, so a capability-model change reshapes the
 * scenarios instead of breaking them.
 */
const ALL_AREAS = getAllAreasWithDomains();

function firstAreaInOrdinaryDomain(skip = 0): { domainId: string; areaId: string } {
  const ordinary = ALL_AREAS.filter(
    ({ domain, area }) =>
      domain.id !== 'data-management' &&
      domain.id !== 'technical' &&
      area.id !== ORGANIZATIONAL_ASSESSMENT_AREA_ID
  );
  const picked = ordinary[skip];
  if (picked === undefined) {
    throw new Error(`Fewer than ${skip + 1} ordinary areas in the model`);
  }
  return { domainId: picked.domain.id, areaId: picked.area.id };
}

/** Two areas in the same ordinary domain, so a domain roll-up has something to average. */
function twoAreasInOneOrdinaryDomain(): { domainId: string; areaIds: [string, string] } {
  const byDomain = new Map<string, string[]>();
  for (const { domain, area } of ALL_AREAS) {
    if (domain.id === 'data-management' || domain.id === 'technical') {
      continue;
    }
    byDomain.set(domain.id, [...(byDomain.get(domain.id) ?? []), area.id]);
  }
  for (const [domainId, areaIds] of byDomain) {
    if (areaIds.length >= 2 && areaIds[0] !== undefined && areaIds[1] !== undefined) {
      return { domainId, areaIds: [areaIds[0], areaIds[1]] };
    }
  }
  throw new Error('No ordinary domain has two capability areas');
}

function firstAreaInDomain(domainId: string): string {
  const match = ALL_AREAS.find(({ domain }) => domain.id === domainId);
  if (match === undefined) {
    throw new Error(`No areas in domain ${domainId}`);
  }
  return match.area.id;
}

// =============================================================================
// Scenarios
// =============================================================================

/** A value written into an input cell before recalculation. */
interface Seed {
  cell: CellRef;
  value: number | string;
}

/** A cell read after recalculation, with what the JS model says it should hold. */
interface Expectation {
  label: string;
  cell: CellRef;
  expected: number | string;
}

interface Scenario {
  name: string;
  /** What this scenario would catch that the string snapshots cannot. */
  rationale: string;
  seeds: Seed[];
  expectations: Expectation[];
}

const levelCell = (row: number): CellRef =>
  cellOn(SHEET_NAMES.ASSESSMENT_INPUT, ASSESSMENT_INPUT_COLUMNS, 'currentLevel', row);
const targetCell = (row: number): CellRef =>
  cellOn(SHEET_NAMES.ASSESSMENT_INPUT, ASSESSMENT_INPUT_COLUMNS, 'targetLevel', row);
const organizationalLevelCell = (row: number): CellRef =>
  cellOn(SHEET_NAMES.ORGANIZATIONAL_INPUT, ORGANIZATIONAL_INPUT_COLUMNS, 'currentLevel', row);
const profileScoreCell = (areaId: string, dimensionId: string): CellRef =>
  cellOn(
    SHEET_NAMES.MATURITY_PROFILE,
    MATURITY_PROFILE_COLUMNS,
    'currentScore',
    profileRowFor(areaId, dimensionId)
  );
const areaScoreCell = (areaId: string, key = 'currentScore'): CellRef =>
  cellOn(SHEET_NAMES.AREA_SCORES, AREA_SCORES_COLUMNS, key, indexOfAreaRow(areaId));

/**
 * Seed a run of level cells with a repeating pattern, and report the levels used so the
 * expectation is computed from the same list Excel received.
 */
function seedLevels(
  rows: readonly number[],
  pattern: readonly CellLevel[]
): {
  seeds: Seed[];
  levels: CellLevel[];
} {
  const seeds: Seed[] = [];
  const levels: CellLevel[] = [];
  for (const [index, row] of rows.entries()) {
    const value = pattern[index % pattern.length];
    if (value === undefined || value === '') {
      levels.push('');
      continue;
    }
    seeds.push({ cell: levelCell(row), value });
    levels.push(value);
  }
  return { seeds, levels };
}

function buildScenarios(): Scenario[] {
  const scenarios: Scenario[] = [];

  // ---------------------------------------------------------------------------
  // 0. The empty workbook shows no figures at all.
  //
  // Twice this wave a cell reported something on untouched input: an aggregate note frozen at
  // "50 assessments", and 21 enterprise-domain areas scoring from a domain-wide aggregate. Both
  // are invisible to a suite that only ever checks populated cases, so the blank state gets its
  // own scenario.
  // ---------------------------------------------------------------------------
  {
    const enterpriseArea = firstAreaInDomain('data-management');
    scenarios.push({
      name: 'a blank workbook reports nothing',
      rationale:
        'Every score, count and note must be empty or zero before a state enters anything. A ' +
        'figure that appears on an untouched workbook is a figure computed from the wrong cells.',
      seeds: [],
      expectations: [
        {
          label: 'aggregate note says there are no contributors yet',
          cell: cellOn(
            SHEET_NAMES.MATURITY_PROFILE,
            MATURITY_PROFILE_COLUMNS,
            'notes',
            profileRowFor(enterpriseArea, 'information')
          ),
          expected: 'No contributing capability areas yet',
        },
        {
          label: 'aggregate score is blank',
          cell: profileScoreCell(enterpriseArea, 'information'),
          expected: '',
        },
        { label: 'no area scores', cell: areaScoreCell(enterpriseArea), expected: '' },
        {
          label: 'no organizational area score',
          cell: areaScoreCell(ORGANIZATIONAL_ASSESSMENT_AREA_ID),
          expected: '',
        },
        {
          label: 'no domain score',
          cell: cellOn(
            SHEET_NAMES.DOMAIN_SCORES,
            DOMAIN_SCORES_COLUMNS,
            'currentScore',
            indexOfDomainRow('data-management')
          ),
          expected: '',
        },
        {
          label: 'no overall score',
          cell: cellOn(
            SHEET_NAMES.DOMAIN_SCORES,
            DOMAIN_SCORES_COLUMNS,
            'currentScore',
            indexOfDomainRow('overall')
          ),
          expected: '',
        },
        {
          label: 'no enterprise-wide dimension score',
          cell: cellOn(
            SHEET_NAMES.DIMENSION_SCORES,
            DIMENSION_SCORES_COLUMNS,
            'currentScore',
            indexOfDimensionRow('information')
          ),
          expected: '',
        },
        {
          label: 'zero areas counted toward it',
          cell: cellOn(
            SHEET_NAMES.DIMENSION_SCORES,
            DIMENSION_SCORES_COLUMNS,
            'areaCount',
            indexOfDimensionRow('information')
          ),
          expected: 0,
        },
      ],
    });
  }

  // ---------------------------------------------------------------------------
  // 1. A plain dimension, and the area/domain/overall chain above it.
  // ---------------------------------------------------------------------------
  {
    const { domainId, areaIds } = twoAreasInOneOrdinaryDomain();
    const [areaA, areaB] = areaIds;

    // Deliberately fractional means, so a rounding-point error shows up as a different number
    // rather than coinciding.
    const ba = seedLevels(inputRowsFor(areaA, 'businessArchitecture'), [3, 3, 3, 4]);
    const info = seedLevels(inputRowsFor(areaA, 'information'), [4, 4, 4, 3]);
    const infra = seedLevels(
      inputRowsFor(areaA, 'technology', 'technologyInfrastructureManagement'),
      [5]
    );
    const app = seedLevels(inputRowsFor(areaA, 'technology', 'applicationManagement'), [2]);
    const baB = seedLevels(inputRowsFor(areaB, 'businessArchitecture'), [2]);

    const baScore = plainDimensionScore(ba.levels);
    const infoScore = plainDimensionScore(info.levels);
    const techScore = technologyDimensionScore({
      technologyInfrastructureManagement: infra.levels,
      applicationManagement: app.levels,
    });
    const areaAScore = standardAreaScore([baScore, infoScore, techScore]);
    const areaBScore = standardAreaScore([plainDimensionScore(baB.levels), null, null]);
    const domainScore = meanOfScores([areaAScore, areaBScore]);

    scenarios.push({
      name: 'plain dimension, then area, domain and overall',
      rationale:
        'The whole chain in one shot. Each link averages the link below, so a wrong range on any ' +
        'of the four sheets moves a number here.',
      seeds: [...ba.seeds, ...info.seeds, ...infra.seeds, ...app.seeds, ...baB.seeds],
      expectations: [
        {
          label: 'Business Architecture dimension score',
          cell: profileScoreCell(areaA, 'businessArchitecture'),
          expected: expectNumber(baScore),
        },
        {
          label: 'Information dimension score',
          cell: profileScoreCell(areaA, 'information'),
          expected: expectNumber(infoScore),
        },
        {
          label: 'Technology dimension score (mean of two sub-dimension means)',
          cell: profileScoreCell(areaA, 'technology'),
          expected: expectNumber(techScore),
        },
        {
          label: 'area score, three dimensions',
          cell: areaScoreCell(areaA),
          expected: expectNumber(areaAScore),
        },
        {
          label: 'area score, one dimension only (divisor shrinks to 1)',
          cell: areaScoreCell(areaB),
          expected: expectNumber(areaBScore),
        },
        {
          // The regression this scenario exists to catch. Seeding areaA's Information level makes
          // the Data Management aggregate non-empty, which used to give all ten of that domain's
          // untouched areas a score and drag them into the domain and overall averages.
          label: 'an untouched enterprise-domain area stays blank despite a live aggregate',
          cell: areaScoreCell(firstAreaInDomain('data-management')),
          expected: '',
        },
        {
          label: 'and its domain score stays blank too',
          cell: cellOn(
            SHEET_NAMES.DOMAIN_SCORES,
            DOMAIN_SCORES_COLUMNS,
            'currentScore',
            indexOfDomainRow('data-management')
          ),
          expected: '',
        },
        {
          label: 'domain score, mean of its two scored areas',
          cell: cellOn(
            SHEET_NAMES.DOMAIN_SCORES,
            DOMAIN_SCORES_COLUMNS,
            'currentScore',
            indexOfDomainRow(domainId)
          ),
          expected: expectNumber(domainScore),
        },
        {
          label: 'overall row, mean of every scored area',
          cell: cellOn(
            SHEET_NAMES.DOMAIN_SCORES,
            DOMAIN_SCORES_COLUMNS,
            'currentScore',
            indexOfDomainRow('overall')
          ),
          expected: expectNumber(meanOfScores([areaAScore, areaBScore])),
        },
        {
          label: 'dimensions scored on the three-dimension area',
          cell: areaScoreCell(areaA, 'dimensionsScored'),
          expected: 3,
        },
        {
          label: 'dimensions scored on the one-dimension area',
          cell: areaScoreCell(areaB, 'dimensionsScored'),
          expected: 1,
        },
      ],
    });
  }

  // ---------------------------------------------------------------------------
  // 2. Technology with one sub-dimension unassessed.
  //
  // The case the inline formula cannot express: `AVERAGE(IFERROR(a,""),IFERROR(b,""))` returns
  // #VALUE! the moment one side is empty, which is why the sub-dimension means get their own
  // columns. If that reasoning is wrong, this scenario returns an error string, not a number.
  // ---------------------------------------------------------------------------
  {
    const { areaId } = firstAreaInOrdinaryDomain(3);
    const infra = seedLevels(
      inputRowsFor(areaId, 'technology', 'technologyInfrastructureManagement'),
      [4, 4, 4, 5]
    );
    const expected = technologyDimensionScore({
      technologyInfrastructureManagement: infra.levels,
      applicationManagement: [],
    });

    scenarios.push({
      name: 'Technology with Application Management left blank',
      rationale:
        'Proves the empty sub-dimension is dropped rather than erroring — the reason the two ' +
        'sub-dimension means are written into their own cells instead of being inlined.',
      seeds: infra.seeds,
      expectations: [
        {
          label: 'Technology score equals the Infrastructure mean alone',
          cell: profileScoreCell(areaId, 'technology'),
          expected: expectNumber(expected),
        },
        {
          label: 'area score with Technology only',
          cell: areaScoreCell(areaId),
          expected: expectNumber(standardAreaScore([null, null, expected])),
        },
      ],
    });
  }

  // ---------------------------------------------------------------------------
  // 3. N/A counts toward completion but toward no average.
  // ---------------------------------------------------------------------------
  {
    const { areaId } = firstAreaInOrdinaryDomain(5);
    const rows = inputRowsFor(areaId, 'businessArchitecture');
    const [first, second] = rows;
    if (first === undefined || second === undefined) {
      throw new Error('Business Architecture needs at least two aspects for this scenario');
    }

    const levels: CellLevel[] = rows.map((_row, index) =>
      index === 0 ? 4 : index === 1 ? 'N/A' : ''
    );

    // This area's own denominator. Reading it off `areaScoreRows[0]` instead — which is the
    // organizational area, at 15 rather than 26 — is how the first run of this scenario produced a
    // wrong expectation and blamed Excel for it.
    const assessable = Number(
      areaScoreRows.find((row) => row.areaId === areaId)?.aspectsAssessable ?? 0
    );

    scenarios.push({
      name: 'an N/A determination',
      rationale:
        'The one place the exclusion rule inverts: N/A is complete but contributes to no mean. ' +
        'The score column and the count column read the same cells with different criteria.',
      seeds: [
        { cell: levelCell(first), value: 4 },
        { cell: levelCell(second), value: 'N/A' },
      ],
      expectations: [
        {
          label: 'dimension score ignores the N/A',
          cell: profileScoreCell(areaId, 'businessArchitecture'),
          expected: expectNumber(plainDimensionScore(levels)),
        },
        {
          label: 'aspects assessed counts the N/A',
          cell: cellOn(
            SHEET_NAMES.MATURITY_PROFILE,
            MATURITY_PROFILE_COLUMNS,
            'aspectsAssessed',
            profileRowFor(areaId, 'businessArchitecture')
          ),
          expected: 2,
        },
        {
          label: `area completion % counts the N/A (2 of ${String(assessable)})`,
          cell: areaScoreCell(areaId, 'completion'),
          expected: completionPercentage(levels, assessable),
        },
      ],
    });
  }

  // ---------------------------------------------------------------------------
  // 4. The aggregate dimension for an enterprise domain.
  // ---------------------------------------------------------------------------
  {
    const contributorA = firstAreaInOrdinaryDomain(7);
    const contributorB = firstAreaInOrdinaryDomain(8);
    const enterpriseArea = firstAreaInDomain('data-management');

    const a = seedLevels(inputRowsFor(contributorA.areaId, 'information'), [3, 3, 3, 4]);
    const b = seedLevels(inputRowsFor(contributorB.areaId, 'information'), [5]);
    const scoreA = plainDimensionScore(a.levels);
    const scoreB = plainDimensionScore(b.levels);
    const aggregate = meanOfScores([scoreA, scoreB]);

    // The enterprise-domain area also gets its own Business Architecture filled in, so it is
    // "touched" and its score is live. Technology is left blank, so this doubles as the
    // divisor-drops-to-2 case: the area score is the mean of Business Architecture and the
    // aggregate, with the absent Technology dropped rather than counted as zero.
    const enterpriseBa = seedLevels(inputRowsFor(enterpriseArea, 'businessArchitecture'), [2]);
    const enterpriseBaScore = plainDimensionScore(enterpriseBa.levels);
    const enterpriseAreaScore = standardAreaScore([enterpriseBaScore, aggregate, null]);

    scenarios.push({
      name: 'the Information aggregate for Data Management',
      rationale:
        'Averages per-area dimension scores on `06`, weighting every area equally — not a flat ' +
        'mean over input cells, which would weight by how many aspects each area filled in.',
      seeds: [...a.seeds, ...b.seeds, ...enterpriseBa.seeds],
      expectations: [
        {
          label: 'aggregate equals the mean of the two contributing area scores',
          cell: profileScoreCell(enterpriseArea, 'information'),
          expected: expectNumber(aggregate),
        },
        {
          label: 'aggregate To-Be stays Not applicable',
          cell: cellOn(
            SHEET_NAMES.MATURITY_PROFILE,
            MATURITY_PROFILE_COLUMNS,
            'targetScore',
            profileRowFor(enterpriseArea, 'information')
          ),
          expected: 'Not applicable',
        },
        {
          label: 'aggregate contributes 0 assessed aspects',
          cell: cellOn(
            SHEET_NAMES.MATURITY_PROFILE,
            MATURITY_PROFILE_COLUMNS,
            'aspectsAssessed',
            profileRowFor(enterpriseArea, 'information')
          ),
          expected: 0,
        },
        {
          // The aggregate's 0 must not reach the numerator, and the aggregated dimension's aspects
          // are already out of the denominator (26 drops to 16), so this reads as Business
          // Architecture's own aspects over 16.
          label: 'completion counts only the aspects the state actually entered',
          cell: areaScoreCell(enterpriseArea, 'completion'),
          expected: completionPercentage(
            enterpriseBa.levels,
            Number(
              areaScoreRows.find((row) => row.areaId === enterpriseArea)?.aspectsAssessable ?? 0
            )
          ),
        },
        {
          label: 'area score averages Business Architecture and the aggregate, divisor 2',
          cell: areaScoreCell(enterpriseArea),
          expected: expectNumber(enterpriseAreaScore),
        },
        {
          label: 'and reports 2 dimensions scored, not 3',
          cell: areaScoreCell(enterpriseArea, 'dimensionsScored'),
          expected: 2,
        },
        {
          // The note is the only place the contributing-area count appears. It used to reuse the
          // mean's criteria, which counted rows rather than scored areas and froze at 50 — so it
          // read the same on a blank workbook as on a full one.
          label: 'note names the 2 areas that actually produced a score',
          cell: cellOn(
            SHEET_NAMES.MATURITY_PROFILE,
            MATURITY_PROFILE_COLUMNS,
            'notes',
            profileRowFor(enterpriseArea, 'information')
          ),
          expected: '(Aggregate from 2 assessments)',
        },
      ],
    });
  }

  // ---------------------------------------------------------------------------
  // 5. The organizational area, which averages UNROUNDED section means.
  //
  // The fixture is chosen so the two rounding points disagree: unrounded gives 3.5, rounding the
  // section means first gives 3.6. Reading the wrong column on `07` is a silent tenth adrift and
  // this is the only check that can see it.
  // ---------------------------------------------------------------------------
  {
    const [sectionA, sectionB] = ORGANIZATIONAL_SECTIONS;
    if (sectionA === undefined || sectionB === undefined) {
      throw new Error('Expected at least two organizational sections');
    }

    const rowsA = organizationalRowsFor(sectionA);
    const rowsB = organizationalRowsFor(sectionB);

    /**
     * Levels chosen so the two rounding points give **different answers**.
     *
     * With section means of 8/6 = 1.333 and 23/5 = 4.6: averaging unrounded gives 2.967 -> 3.0,
     * while rounding the section means first gives (1.3 + 4.6) / 2 = 2.95 -> 2.9. One tenth apart.
     *
     * The first version of this scenario used a repeating pattern and both paths landed on 3.5, so
     * the check passed while proving nothing about the rounding point — the failure mode this whole
     * file exists to avoid. The assertion below fails the run if that ever recurs.
     */
    const levelsA = distributeToSum(rowsA.length, 8);
    const levelsB = distributeToSum(rowsB.length, 23);

    const seeds: Seed[] = [
      ...rowsA.map((row, index) => ({
        cell: organizationalLevelCell(row),
        value: levelsA[index] as number,
      })),
      ...rowsB.map((row, index) => ({
        cell: organizationalLevelCell(row),
        value: levelsB[index] as number,
      })),
    ];

    const unroundedAnswer = organizationalAreaScore([levelsA, levelsB]);
    const roundedFirstAnswer = meanOfScores([
      plainDimensionScore(levelsA),
      plainDimensionScore(levelsB),
    ]);
    if (unroundedAnswer === roundedFirstAnswer) {
      throw new Error(
        'The organizational fixture no longer distinguishes the two rounding points: both give ' +
          `${String(unroundedAnswer)}. Pick levels whose section means round differently.`
      );
    }

    scenarios.push({
      name: 'the organizational area, averaging unrounded section means',
      rationale:
        `The two rounding points disagree here: averaging unrounded gives ${String(unroundedAnswer)}, ` +
        `rounding the section means first gives ${String(roundedFirstAnswer)}. Nothing else in the ` +
        'suite can tell those apart, because both are correct-looking formulas over the same cells.',
      seeds,
      expectations: [
        {
          label:
            `organizational area score is ${String(unroundedAnswer)} from the unrounded column, ` +
            `not ${String(roundedFirstAnswer)} from the rounded one`,
          cell: areaScoreCell(ORGANIZATIONAL_ASSESSMENT_AREA_ID),
          expected: expectNumber(unroundedAnswer),
        },
      ],
    });
  }

  // ---------------------------------------------------------------------------
  // 6. The enterprise-wide ORBIT figure on `09`, which must exclude aggregate rows.
  // ---------------------------------------------------------------------------
  {
    const one = firstAreaInOrdinaryDomain(10);
    const two = firstAreaInOrdinaryDomain(11);
    const a = seedLevels(inputRowsFor(one.areaId, 'businessArchitecture'), [2]);
    const b = seedLevels(inputRowsFor(two.areaId, 'businessArchitecture'), [5]);
    const expected = meanOfScores([plainDimensionScore(a.levels), plainDimensionScore(b.levels)]);

    scenarios.push({
      name: 'the enterprise-wide Business Architecture figure',
      rationale:
        'Averages `Entered` rows only. Business Architecture is never aggregated, so this also ' +
        'confirms the source filter does not accidentally exclude ordinary rows.',
      seeds: [...a.seeds, ...b.seeds],
      expectations: [
        {
          label: 'enterprise-wide Business Architecture score',
          cell: cellOn(
            SHEET_NAMES.DIMENSION_SCORES,
            DIMENSION_SCORES_COLUMNS,
            'currentScore',
            indexOfDimensionRow('businessArchitecture')
          ),
          expected: expectNumber(expected),
        },
        {
          label: 'areas counted toward it',
          cell: cellOn(
            SHEET_NAMES.DIMENSION_SCORES,
            DIMENSION_SCORES_COLUMNS,
            'areaCount',
            indexOfDimensionRow('businessArchitecture')
          ),
          expected: 2,
        },
      ],
    });
  }

  // ---------------------------------------------------------------------------
  // 6b. The TEXTJOIN text columns.
  //
  // The gap that let two defects ship. Nothing in this file read a notes, barriers or plans cell,
  // so `#NAME?` in all 648 of them went unnoticed until a user opened the workbook — and behind it
  // a second, unrelated `#VALUE!` in the nine organizational text cells. Both were invisible to
  // the formula-string tests, because the generator emitted exactly the string it intended.
  //
  // Covers both builders: the assessment-input one, which joins two criteria with `*`, and the
  // organizational one, which has a single criterion and therefore needs the explicit `*1`.
  // ---------------------------------------------------------------------------
  {
    const { areaId } = firstAreaInOrdinaryDomain(15);
    const baRows = inputRowsFor(areaId, 'businessArchitecture');
    const [firstRow, secondRow, thirdRow] = baRows;
    if (firstRow === undefined || secondRow === undefined || thirdRow === undefined) {
      throw new Error('Need at least three Business Architecture aspects for this scenario');
    }

    const notesColumn = (row: number): CellRef =>
      cellOn(SHEET_NAMES.ASSESSMENT_INPUT, ASSESSMENT_INPUT_COLUMNS, 'notes', row);
    const barriersColumn = (row: number): CellRef =>
      cellOn(SHEET_NAMES.ASSESSMENT_INPUT, ASSESSMENT_INPUT_COLUMNS, 'barriers', row);
    const plansColumn = (row: number): CellRef =>
      cellOn(SHEET_NAMES.ASSESSMENT_INPUT, ASSESSMENT_INPUT_COLUMNS, 'plans', row);

    const [sectionA] = ORGANIZATIONAL_SECTIONS;
    if (sectionA === undefined) {
      throw new Error('Expected at least one organizational section');
    }
    const orgRows = organizationalRowsFor(sectionA);
    const [orgFirst, orgSecond] = orgRows;
    if (orgFirst === undefined || orgSecond === undefined) {
      throw new Error('Need at least two aspects in the first organizational section');
    }
    const orgNotes = (row: number): CellRef =>
      cellOn(SHEET_NAMES.ORGANIZATIONAL_INPUT, ORGANIZATIONAL_INPUT_COLUMNS, 'notes', row);

    scenarios.push({
      name: 'notes, barriers and plans concatenated',
      rationale:
        'Three defects lived in these columns: TEXTJOIN stored without its _xlfn. prefix, then ' +
        'TEXTJOIN itself being absent from Excel 2016, and an IF-based filter that silently read ' +
        "another area's rows. None was visible to a string assertion. Now a plain IF/&/MID " +
        'concatenation over the row block, with every function available in Excel 2007.',
      seeds: [
        { cell: notesColumn(firstRow), value: 'First note' },
        // Second aspect deliberately left blank, so the TRUE argument that skips empties is
        // exercised: a workbook that joined blanks would return "First note |  | Third note".
        { cell: notesColumn(thirdRow), value: 'Third note' },
        { cell: barriersColumn(firstRow), value: 'A barrier' },
        { cell: plansColumn(secondRow), value: 'A plan' },
        { cell: orgNotes(orgFirst), value: 'Org note one' },
        { cell: orgNotes(orgSecond), value: 'Org note two' },
        // A note belonging to a *different* capability area. The regression case: with the
        // criteria-based IF form, this text appeared in the first area's cell.
        {
          cell: notesColumn(
            inputRowsFor(firstAreaInOrdinaryDomain(16).areaId, 'businessArchitecture')[0] ?? 0
          ),
          value: 'OTHER AREA note',
        },
      ],
      expectations: [
        {
          // Exactly this area's two notes, and crucially NOT the other area's note seeded above.
          // Under the old IF form this cell read "First note | Third note | OTHER AREA note".
          label: "notes joined in row order, blanks skipped, no other area's text",
          cell: cellOn(
            SHEET_NAMES.MATURITY_PROFILE,
            MATURITY_PROFILE_COLUMNS,
            'notes',
            profileRowFor(areaId, 'businessArchitecture')
          ),
          expected: 'First note | Third note',
        },
        {
          label: 'barriers read the barriers column, not the notes column',
          cell: cellOn(
            SHEET_NAMES.MATURITY_PROFILE,
            MATURITY_PROFILE_COLUMNS,
            'barriers',
            profileRowFor(areaId, 'businessArchitecture')
          ),
          expected: 'A barrier',
        },
        {
          label: 'plans read the plans column',
          cell: cellOn(
            SHEET_NAMES.MATURITY_PROFILE,
            MATURITY_PROFILE_COLUMNS,
            'plans',
            profileRowFor(areaId, 'businessArchitecture')
          ),
          expected: 'A plan',
        },
        {
          // The organizational builder, which reads sheet 05 rather than 04. Its cells were the
          // ones that returned #VALUE! under the old IF-based form.
          label: 'organizational notes joined, off the other input sheet',
          cell: cellOn(
            SHEET_NAMES.MATURITY_PROFILE,
            MATURITY_PROFILE_COLUMNS,
            'notes',
            profileRowFor(ORGANIZATIONAL_ASSESSMENT_AREA_ID, sectionA)
          ),
          expected: 'Org note one | Org note two',
        },
        {
          // And symmetrically: the other area gets its own note and only its own.
          label: "the other area gets its own note and none of the first area's",
          cell: cellOn(
            SHEET_NAMES.MATURITY_PROFILE,
            MATURITY_PROFILE_COLUMNS,
            'notes',
            profileRowFor(firstAreaInOrdinaryDomain(16).areaId, 'businessArchitecture')
          ),
          expected: 'OTHER AREA note',
        },
      ],
    });
  }

  // ---------------------------------------------------------------------------
  // 7. To-Be travels the same path as As-Is.
  // ---------------------------------------------------------------------------
  {
    const { areaId } = firstAreaInOrdinaryDomain(13);
    const rows = inputRowsFor(areaId, 'information');
    const pattern: CellLevel[] = [5, 5, 5, 4];
    const levels = rows.map((_row, index) => pattern[index % pattern.length] as CellLevel);

    scenarios.push({
      name: 'To-Be levels',
      rationale:
        'The To-Be column set is generated by the same builders with a different level key, so ' +
        'one check that it reads column I rather than column H is enough.',
      seeds: rows.map((row, index) => ({
        cell: targetCell(row),
        value: levels[index] as number,
      })),
      expectations: [
        {
          label: 'Information To-Be score',
          cell: cellOn(
            SHEET_NAMES.MATURITY_PROFILE,
            MATURITY_PROFILE_COLUMNS,
            'targetScore',
            profileRowFor(areaId, 'information')
          ),
          expected: expectNumber(plainDimensionScore(levels)),
        },
        {
          label: 'As-Is stays empty, so the two columns are not crossed',
          cell: profileScoreCell(areaId, 'information'),
          expected: '',
        },
      ],
    });
  }

  return scenarios;
}

/**
 * `count` levels in 1..5 summing to exactly `total`, so a fixture can specify the section *mean*
 * it needs rather than a level pattern and hope.
 */
function distributeToSum(count: number, total: number): CellLevel[] {
  if (total < count || total > count * 5) {
    throw new Error(`Cannot make ${count} levels in 1..5 sum to ${total}`);
  }
  const levels = Array.from({ length: count }, () => 1);
  let remaining = total - count;
  for (let index = 0; index < count && remaining > 0; index += 1) {
    const add = Math.min(4, remaining);
    levels[index] = 1 + add;
    remaining -= add;
  }
  return levels;
}

function expectNumber(value: number | null): number {
  if (value === null) {
    throw new Error('Scenario expected a score but the model produced null');
  }
  return value;
}

// =============================================================================
// Driving Excel
// =============================================================================

/** AppleScript string literal: only backslash and double quote need escaping. */
function appleScriptString(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

const READING_DELIMITER = '<|>';

/**
 * Open the copy, apply one scenario's seeds, read its expectations back, and close without saving.
 *
 * One Excel session per scenario, deliberately. Scenarios seed overlapping areas — the aggregate
 * case and the enterprise-wide case both write Information and Business Architecture levels — so
 * sharing a session would make each scenario's expected values depend on what ran before it.
 */
function runScenario(workbookPath: string, scenario: Scenario): string[] {
  const statements: string[] = [
    'set priorAlerts to display alerts',
    'set display alerts to false',
    // Forced, not assumed. If the user's Excel is set to manual calculation, every reading below
    // would be the stale value the file was written with — which is a blank, and a blank compared
    // against a blank expectation would let the whole run pass while proving nothing.
    'set priorCalculation to calculation',
    'set calculation to calculation automatic',
    `open POSIX file ${appleScriptString(workbookPath)}`,
    'set wb to active workbook',
  ];

  for (const seed of scenario.seeds) {
    const value =
      typeof seed.value === 'number' ? String(seed.value) : appleScriptString(seed.value);
    statements.push(
      `set value of range ${appleScriptString(seed.cell.address)} of worksheet ${appleScriptString(seed.cell.sheet)} of wb to ${value}`
    );
  }

  // `calculate full` is application-level and rebuilds the whole dependency chain. `calculate` takes
  // a range or worksheet, not a workbook, and passing one fails with a bare "Parameter error".
  statements.push('calculate full');
  statements.push('set readings to {}');
  for (const expectation of scenario.expectations) {
    statements.push(
      `set end of readings to (get value of range ${appleScriptString(expectation.cell.address)} of worksheet ${appleScriptString(expectation.cell.sheet)} of wb) as text`
    );
  }
  statements.push('close wb saving no');
  statements.push('set calculation to priorCalculation');
  statements.push('set display alerts to priorAlerts');
  statements.push(
    `set AppleScript's text item delimiters to ${appleScriptString(READING_DELIMITER)}`
  );
  statements.push('return readings as text');

  const script = `tell application "Microsoft Excel"\n${statements.join('\n')}\nend tell`;
  const output = execFileSync('osascript', ['-e', script], {
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
  });
  return output.trimEnd().split(READING_DELIMITER);
}

/**
 * Compare a reading to an expectation.
 *
 * AppleScript returns everything as text, and Excel's text form of a number follows the locale, so
 * numbers are compared numerically with a tolerance well below the 0.1 that matters here rather
 * than by string equality.
 */
function matches(reading: string, expected: number | string): boolean {
  if (typeof expected === 'number') {
    // An empty or whitespace-only reading must never satisfy a numeric expectation. `Number('')`
    // is 0 and `Number.isFinite(0)` is true, so without this guard every `expected: 0` check —
    // the aggregate's assessed count, the blank-workbook area count, completion at 0% — passed on
    // a cell that was simply empty, which is the exact case they exist to distinguish.
    if (reading.trim() === '') {
      return false;
    }
    const parsed = Number(reading.replace(/,/g, ''));
    return Number.isFinite(parsed) && Math.abs(parsed - expected) < 1e-9;
  }
  return reading.trim() === expected;
}

/**
 * Settle whether Excel's `ROUND` really diverges from the app's `Math.round(x * 10) / 10`.
 *
 * Run in a **scratch workbook**, never the deliverable: these are bare formulas, not workbook
 * content, and putting them in the artifact would mean writing to cells the sheet protection
 * deliberately locks.
 *
 * `halfway.test.ts` enumerates the divergence assuming a model of Excel's behaviour that nothing in
 * this repo could check. This checks it. Both answers are useful: divergence confirmed means the
 * README's note is accurate; no divergence means the note is wrong and should come out.
 */
function verifyRoundingModel(): { diverged: number; matchedJs: number; unexplained: string[] } {
  const statements: string[] = [
    'set priorAlerts to display alerts',
    'set display alerts to false',
    'set priorCalculation to calculation',
    'set calculation to calculation automatic',
    'set scratch to make new workbook',
    'set sheet1 to worksheet 1 of scratch',
  ];

  for (const [index, fixture] of EXCEL_CHECK_FIXTURES.entries()) {
    statements.push(
      `set formula of range ${appleScriptString(`A${index + 1}`)} of sheet1 to ${appleScriptString(fixture.formula)}`
    );
  }
  statements.push('calculate full');
  statements.push('set readings to {}');
  for (const [index] of EXCEL_CHECK_FIXTURES.entries()) {
    statements.push(
      `set end of readings to (get value of range ${appleScriptString(`A${index + 1}`)} of sheet1) as text`
    );
  }
  statements.push('close scratch saving no');
  statements.push('set calculation to priorCalculation');
  statements.push('set display alerts to priorAlerts');
  statements.push(
    `set AppleScript's text item delimiters to ${appleScriptString(READING_DELIMITER)}`
  );
  statements.push('return readings as text');

  const script = `tell application "Microsoft Excel"\n${statements.join('\n')}\nend tell`;
  const readings = execFileSync('osascript', ['-e', script], { encoding: 'utf8' })
    .trimEnd()
    .split(READING_DELIMITER);

  let diverged = 0;
  let matchedJs = 0;
  const unexplained: string[] = [];

  console.log('— Excel vs JS rounding, in a scratch workbook');
  console.log(
    '  Settles whether the divergence documented on 00_README is real. Each formula has two\n' +
      "  candidate answers: the app's and the modelled Excel behaviour."
  );
  for (const [index, fixture] of EXCEL_CHECK_FIXTURES.entries()) {
    const reading = readings[index] ?? '';
    const value = Number(reading.replace(/,/g, ''));
    let verdict: string;
    if (Math.abs(value - fixture.excelStyle) < 1e-9) {
      verdict = `Excel-style ${String(fixture.excelStyle)} (diverges from the app)`;
      diverged += 1;
    } else if (Math.abs(value - fixture.js) < 1e-9) {
      verdict = `JS-style ${String(fixture.js)} (agrees with the app)`;
      matchedJs += 1;
    } else {
      verdict = `neither candidate: ${reading}`;
      unexplained.push(`${fixture.formula} returned ${reading}`);
    }
    console.log(`  ${fixture.formula.padEnd(32)} ${verdict}`);
  }
  console.log('');
  return { diverged, matchedJs, unexplained };
}

/**
 * Check every address a scenario uses against the generated file, before Excel is involved.
 *
 * Nine of these checks expect an empty reading, and an empty reading is exactly what a **wrong cell
 * address** produces. Without this, mistyping a column or drifting a row by one would turn a real
 * check into a free pass, silently — the same shape of defect as the assertions this repo has
 * already had to throw away.
 *
 * So: a cell a scenario expects to be empty at runtime must hold a *formula* in the file, because a
 * formula returning `""` is the only way a computed cell legitimately reads empty. A cell expected
 * to hold a value must not be blank in the file. And every seed must land on a cell that is blank in
 * the file, since the editable input cells are the only blank ones — a non-blank seed target means
 * the scenario is about to overwrite reference data.
 */
async function validateAddresses(scenarios: readonly Scenario[]): Promise<string[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(WORKBOOK_OUTPUT_PATH);

  const problems: string[] = [];
  const describe = (cell: CellRef): string => `${cell.sheet}!${cell.address}`;

  const cellAt = (ref: CellRef): ExcelJS.Cell => {
    const sheet = workbook.getWorksheet(ref.sheet);
    if (sheet === undefined) {
      throw new Error(`No sheet named ${ref.sheet}`);
    }
    return sheet.getCell(ref.address);
  };

  for (const scenario of scenarios) {
    for (const seed of scenario.seeds) {
      const cell = cellAt(seed.cell);
      const value = cell.formula ?? cell.value;
      if (value !== null && value !== undefined && value !== '') {
        problems.push(
          `${scenario.name}: seed target ${describe(seed.cell)} is not blank in the generated ` +
            `file (holds ${JSON.stringify(value)}) — the scenario would overwrite reference data`
        );
      }
    }

    for (const expectation of scenario.expectations) {
      const cell = cellAt(expectation.cell);
      const hasFormula = typeof cell.formula === 'string' && cell.formula !== '';
      const blank = !hasFormula && (cell.value === null || cell.value === undefined);

      if (expectation.expected === '' && !hasFormula) {
        problems.push(
          `${scenario.name} / ${expectation.label}: ${describe(expectation.cell)} holds no ` +
            'formula, so expecting an empty reading proves nothing — the address is probably wrong'
        );
      }
      if (expectation.expected !== '' && blank) {
        problems.push(
          `${scenario.name} / ${expectation.label}: ${describe(expectation.cell)} is blank in the ` +
            'generated file, so it cannot produce the expected value'
        );
      }
    }
  }

  return problems;
}

async function main(): Promise<void> {
  const scenarios = buildScenarios();

  const addressProblems = await validateAddresses(scenarios);
  if (addressProblems.length > 0) {
    console.log('Scenario addresses do not match the generated workbook:\n');
    for (const problem of addressProblems) {
      console.log(`  - ${problem}`);
    }
    process.exitCode = 1;
    return;
  }

  const scratch = mkdtempSync(join(tmpdir(), 'xlsx-excel-verify-'));
  const copyPath = join(scratch, 'workbook-under-test.xlsx');

  // Excel autosaves. The shipped artifact is never opened, only ever a fresh copy per scenario.
  process.on('exit', () => rmSync(scratch, { recursive: true, force: true }));

  console.log('Verifying workbook arithmetic in Microsoft Excel');
  console.log(`  Source   ${WORKBOOK_OUTPUT_PATH}`);
  console.log(`  Scenarios ${scenarios.length}\n`);

  let checks = 0;
  const failures: string[] = [];

  for (const scenario of scenarios) {
    copyFileSync(WORKBOOK_OUTPUT_PATH, copyPath);
    console.log(`— ${scenario.name}`);
    console.log(`  ${scenario.rationale}`);
    console.log(`  seeded ${scenario.seeds.length} input cells`);

    const readings = runScenario(copyPath, scenario);
    if (readings.length !== scenario.expectations.length) {
      failures.push(
        `${scenario.name}: read ${readings.length} values for ${scenario.expectations.length} expectations`
      );
      continue;
    }

    for (const [index, expectation] of scenario.expectations.entries()) {
      const reading = readings[index] ?? '';
      checks += 1;
      const ok = matches(reading, expectation.expected);
      const shown = reading === '' ? '(empty)' : reading;
      console.log(
        `  ${ok ? 'ok  ' : 'FAIL'} ${expectation.label}\n       expected ${JSON.stringify(expectation.expected)}, Excel gave ${shown} [${expectation.cell.sheet}!${expectation.cell.address}]`
      );
      if (!ok) {
        failures.push(
          `${scenario.name} / ${expectation.label}: expected ${JSON.stringify(expectation.expected)}, Excel gave ${shown}`
        );
      }
    }
    console.log('');
  }

  const rounding = verifyRoundingModel();

  console.log('='.repeat(70));
  if (failures.length === 0) {
    console.log(`${checks} of ${checks} arithmetic checks agree with the app's scoring rules.`);
  } else {
    console.log(`${failures.length} of ${checks} checks DISAGREE with the app:\n`);
    for (const failure of failures) {
      console.log(`  - ${failure}`);
    }
    process.exitCode = 1;
  }

  const total = EXCEL_CHECK_FIXTURES.length;
  if (rounding.unexplained.length > 0) {
    console.log(
      `\nRounding: ${rounding.unexplained.length} of ${total} fixtures returned neither candidate.\n` +
        'The rounding model needs revisiting:'
    );
    for (const entry of rounding.unexplained) {
      console.log(`  - ${entry}`);
    }
    process.exitCode = 1;
  } else if (rounding.diverged === total) {
    console.log(
      `\nRounding: all ${total} fixtures diverge. The Excel/JS difference documented on 00_README\n` +
        'is real, and the modelled behaviour in excel-rounding.ts is confirmed.'
    );
  } else if (rounding.matchedJs === total) {
    console.log(
      `\nRounding: all ${total} fixtures match the app. Excel does NOT diverge — the note on\n` +
        '00_README and the enumeration in halfway.test.ts are describing something that does not\n' +
        'happen, and should be removed.'
    );
  } else {
    console.log(
      `\nRounding: mixed — ${rounding.diverged} diverge, ${rounding.matchedJs} agree, of ${total}.\n` +
        'The model is partly right, so neither the note nor its removal is justified as written.'
    );
  }
}

main().catch((error: unknown) => {
  console.error('Verification could not run.');
  console.error(error);
  process.exitCode = 1;
});
