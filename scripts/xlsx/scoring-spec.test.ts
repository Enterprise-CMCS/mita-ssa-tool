/**
 * The workbook's scoring model, tested against the app's canonical scorer.
 *
 * This is what makes `scoring-spec.ts` worth having. The formulas are generated from the same
 * definitions these tests exercise, so proving the model agrees with `calculateDimensionScore`
 * proves the *rule* the formulas encode is the tool's rule.
 *
 * **What it does not prove.** It says nothing about whether the Excel expression implements the
 * model — ExcelJS cannot evaluate a formula, so that gap closes only by opening the file. It
 * also cannot catch Excel/JS rounding divergence, because the model deliberately shares the
 * app's `Math.round(x * 10) / 10`; `halfway.test.ts` enumerates that separately.
 *
 * Fixtures are driven off the real model rather than invented, so a change to aspect counts
 * shows up here rather than silently altering what is being compared.
 */

import { describe, expect, it } from 'vitest';

import { calculateDimensionScore } from '../../src/services/scoring';
import type { RatingForScoring } from '../../src/services/scoring';

import {
  TEXT_SEPARATOR,
  columnLetter,
  completionPercentage,
  joinTextFormula,
  letterOf,
  meanOfAssessed,
  meanOfScores,
  organizationalAreaScore,
  plainDimensionScore,
  roundToOneDecimal,
  standardAreaScore,
  technologyDimensionScore,
  type CellLevel,
} from './scoring-spec.ts';
import { ASSESSMENT_INPUT_COLUMNS } from './constants.ts';
import { getAspectLocationsForDimension } from './model.ts';

/**
 * Turn workbook cell values into the app's rating shape.
 *
 * The bridge between the two domains, and the reason it is worth writing down: a workbook has
 * no `-1`. Unassessed is an empty cell and N/A is the text token, both of which map to the
 * app's `0`/`-1` sentinels only through a conversion like this one. Getting the conversion
 * wrong would make every comparison below agree about the wrong thing.
 */
function toRatings(levels: readonly CellLevel[], subDimensionId?: string): RatingForScoring[] {
  return levels.map((level) => ({
    currentLevel: level === '' ? 0 : level === 'N/A' ? -1 : level,
    ...(subDimensionId === undefined ? {} : { subDimensionId }),
  }));
}

describe('exclusion rules match the app', () => {
  it.each([
    ['all assessed', [1, 2, 3, 4, 5] as CellLevel[]],
    ['with blanks', [3, '', 4, '', 5] as CellLevel[]],
    ['with N/A', [3, 'N/A', 4] as CellLevel[]],
    ['blanks and N/A mixed', ['', 'N/A', 2, '', 4, 'N/A'] as CellLevel[]],
    ['single value', [3] as CellLevel[]],
    ['all blank', ['', '', ''] as CellLevel[]],
    ['all N/A', ['N/A', 'N/A'] as CellLevel[]],
    ['empty', [] as CellLevel[]],
  ])('agrees on a non-Technology dimension: %s', (_label, levels) => {
    expect(plainDimensionScore(levels)).toBe(
      calculateDimensionScore('information', toRatings(levels))
    );
  });

  it('drops a dimension with nothing assessed rather than scoring it zero', () => {
    expect(plainDimensionScore(['', '', ''])).toBeNull();
    expect(plainDimensionScore(['N/A'])).toBeNull();
    // The distinction that matters for the roll-up above: null is dropped, 0 would be averaged.
    expect(meanOfScores([3, null, 5])).toBe(4);
    expect(meanOfScores([3, 0, 5])).toBeCloseTo(2.7, 5);
  });

  /**
   * Defensive, and not reachable through the dropdown — validation rejects typed entries but
   * not every paste path. Pinned because the formulas carry an explicit `">0"` criterion whose
   * only purpose is this case, and without a test that criterion looks like noise someone
   * would tidy away.
   */
  it('excludes a pasted zero or negative exactly as the app does', () => {
    const levels: CellLevel[] = [3, 0, -1, 5];
    expect(plainDimensionScore(levels)).toBe(4);
    expect(plainDimensionScore(levels)).toBe(
      calculateDimensionScore('information', toRatings(levels))
    );
  });
});

describe('Technology dimension matches the app', () => {
  /**
   * The OBS-21 fixture, which cost three waves to get right across five call sites. Rounding
   * the sub-dimension means before averaging them yields 3.2; the correct answer is 3.0.
   */
  it('averages the two sub-dimension means, not the 11 aspects', () => {
    const infrastructure: CellLevel[] = [5, 5, 5, 5, 5, 5];
    const application: CellLevel[] = [1, 1, 1, 1, 1];

    expect(
      technologyDimensionScore({
        technologyInfrastructureManagement: infrastructure,
        applicationManagement: application,
      })
    ).toBe(3);

    // The flat mean a naive implementation produces, kept visible so the difference is
    // concrete rather than asserted.
    const flat = plainDimensionScore([...infrastructure, ...application]);
    expect(flat).toBe(3.2);
  });

  it.each([
    ['both populated', [3, 4] as CellLevel[], [5] as CellLevel[]],
    ['infrastructure only', [3, 4] as CellLevel[], [] as CellLevel[]],
    ['application only', [] as CellLevel[], [2, 2, 3] as CellLevel[]],
    ['neither', [] as CellLevel[], [] as CellLevel[]],
    ['infrastructure all N/A', ['N/A', 'N/A'] as CellLevel[], [4] as CellLevel[]],
    ['uneven counts', [1, 2, 3, 4, 5, 5] as CellLevel[], [5, 5] as CellLevel[]],
    // The OBS-21 shape specifically: a sub-dimension mean of 3.25 that rounds to 3.3. Correct is
    // mean(3.25, 4) = 3.625 -> 3.6; rounding the inner mean first gives mean(3.3, 4) = 3.65 -> 3.7.
    // Every other fixture above has inner means that survive rounding unchanged, so none of them
    // can tell the two apart — which left the suite guarding OBS-21 unable to see it.
    ['fractional inner mean', [3, 3, 3, 4] as CellLevel[], [4] as CellLevel[]],
  ])('agrees with the app: %s', (_label, infrastructure, application) => {
    const model = technologyDimensionScore({
      technologyInfrastructureManagement: infrastructure,
      applicationManagement: application,
    });
    const app = calculateDimensionScore('technology', [
      ...toRatings(infrastructure, 'technologyInfrastructureManagement'),
      ...toRatings(application, 'applicationManagement'),
    ]);
    expect(model).toBe(app);
  });

  /**
   * A sub-dimension with nothing assessed is dropped, so the other one's mean stands alone.
   * This is the case the inline Excel form cannot express, and the reason the sub-dimension
   * means get their own columns.
   */
  it('drops an unassessed sub-dimension instead of erroring', () => {
    expect(
      technologyDimensionScore({
        technologyInfrastructureManagement: [4, 4],
        applicationManagement: ['', '', ''],
      })
    ).toBe(4);
  });

  it('uses the real aspect counts from the model, 6 and 5', () => {
    const technology = getAspectLocationsForDimension('technology');
    const infrastructure = technology.filter(
      (location) => location.subDimensionId === 'technologyInfrastructureManagement'
    );
    const application = technology.filter(
      (location) => location.subDimensionId === 'applicationManagement'
    );
    expect([infrastructure.length, application.length]).toEqual([6, 5]);
  });
});

describe('area roll-ups apply rounding at the right point', () => {
  /**
   * The standard area averages **already-rounded** dimension scores; the organizational area
   * averages **unrounded** section means. Same arithmetic shape, different rounding point, and
   * the difference is observable — which is exactly why `06` carries both a rounded and an
   * unrounded column.
   */
  it('distinguishes the two rounding points on a fixture where they differ', () => {
    // Three sections whose unrounded means are 3.25, 3.25 and 3.25.
    const sections: CellLevel[][] = [
      [3, 3, 3, 4],
      [3, 3, 3, 4],
      [3, 3, 3, 4],
    ];
    const unroundedMeans = sections.map((levels) => meanOfAssessed(levels));
    expect(unroundedMeans).toEqual([3.25, 3.25, 3.25]);

    // Averaging unrounded: mean(3.25, 3.25, 3.25) = 3.25 -> 3.3
    expect(organizationalAreaScore(sections)).toBe(3.3);

    // Averaging the rounded versions instead: mean(3.3, 3.3, 3.3) = 3.3 -> 3.3.
    // Same here, so a sharper fixture is needed to show the divergence.
    const rounded = unroundedMeans.map((mean) => roundToOneDecimal(mean));
    expect(meanOfScores(rounded)).toBe(3.3);
  });

  /**
   * A fixture where the two rounding points give **different answers**, which is what makes
   * the distinction worth carrying two columns for. The previous version of this test only
   * asserted that both paths returned numbers, which proved nothing.
   */
  it('gives a different answer depending on where rounding happens', () => {
    const sections: CellLevel[][] = [
      [3, 3, 3, 4], // unrounded 3.25, rounded 3.3
      [4, 4, 4, 3], // unrounded 3.75, rounded 3.8
    ];

    const unrounded = sections.map((levels) => meanOfAssessed(levels));
    expect(unrounded).toEqual([3.25, 3.75]);

    // The app's rule for the organizational area: average unrounded, round once.
    // mean(3.25, 3.75) = 3.5
    expect(organizationalAreaScore(sections)).toBe(3.5);

    // Rounding first instead: mean(3.3, 3.8) = 3.55 -> 3.6. One tenth adrift.
    const roundedFirst = meanOfScores(unrounded.map((mean) => roundToOneDecimal(mean)));
    expect(roundedFirst).toBe(3.6);
    expect(roundedFirst).not.toBe(organizationalAreaScore(sections));
  });

  it('drops dimensions with no score, shrinking the divisor', () => {
    expect(standardAreaScore([3, null, 5])).toBe(4);
    expect(standardAreaScore([3, 5])).toBe(4);
    expect(standardAreaScore([null, null, null])).toBeNull();
  });

  /**
   * For an enterprise domain one of the three is the aggregate, and a null aggregate shrinks
   * the divisor to 2 — `finalizeAssessment` injects it into the same map, so it participates
   * identically to a manual score.
   */
  it('treats an absent aggregate as a missing dimension, not a zero', () => {
    const businessArchitecture = 4;
    const technology = 2;
    expect(standardAreaScore([businessArchitecture, null, technology])).toBe(3);
    expect(standardAreaScore([businessArchitecture, 3, technology])).toBe(3);
  });

  it('excludes organizational sections with nothing assessed', () => {
    expect(organizationalAreaScore([[4, 4], [], ['N/A']])).toBe(4);
    expect(organizationalAreaScore([[], [], []])).toBeNull();
  });

  /**
   * The three sections weigh equally despite 6, 5 and 4 aspects. A flat mean over all 15
   * gives a different answer, and that is the mistake this rule exists to prevent.
   */
  it('weighs the three sections equally regardless of aspect count', () => {
    const outcomes: CellLevel[] = [5, 5, 5, 5, 5, 5];
    const roles: CellLevel[] = [1, 1, 1, 1, 1];
    const enterpriseArchitecture: CellLevel[] = [1, 1, 1, 1];

    // Equal weighting: mean(5, 1, 1) = 2.33 -> 2.3
    expect(organizationalAreaScore([outcomes, roles, enterpriseArchitecture])).toBe(2.3);

    // Flat over all 15: (6x5 + 5x1 + 4x1) / 15 = 39/15 = 2.6. Different answer, and the
    // 6-aspect section is over-weighted, which is the mistake the rule prevents.
    const flat = plainDimensionScore([...outcomes, ...roles, ...enterpriseArchitecture]);
    expect(flat).toBe(2.6);
  });
});

describe('completion counts N/A, unlike every average', () => {
  /**
   * The single place the exclusion rule inverts. `useScores` counts
   * `currentLevel > 0 || currentLevel === -1`, so an N/A determination is *complete* but
   * contributes to no score.
   */
  it('counts an N/A entry as complete', () => {
    expect(completionPercentage([3, 'N/A', '', ''], 4)).toBe(50);
    // The same cells score over one value only.
    expect(plainDimensionScore([3, 'N/A', '', ''])).toBe(3);
  });

  it.each([
    [[] as CellLevel[], 26, 0],
    [[3] as CellLevel[], 26, 4],
    [Array.from({ length: 26 }, () => 3) as CellLevel[], 26, 100],
    [Array.from({ length: 16 }, () => 'N/A') as CellLevel[], 16, 100],
    [[3, 3, 3, 3] as CellLevel[], 15, 27],
  ])('computes %#: %s of %i assessable', (levels, assessable, expected) => {
    expect(completionPercentage(levels, assessable)).toBe(expected);
  });

  it('returns zero rather than dividing by zero', () => {
    expect(completionPercentage([3], 0)).toBe(0);
  });
});

/**
 * The text concatenation, which replaced `TEXTJOIN` because that function does not exist in Excel
 * 2016 or earlier. The shape carries the semantics, so the shape is what gets pinned.
 */
describe('text concatenation', () => {
  const BLOCK = { firstRow: 10, lastRow: 13 };

  function formulaFor(block = BLOCK): string {
    return joinTextFormula('04_Assessment_Input', ASSESSMENT_INPUT_COLUMNS, 'notes', block);
  }

  it('emits one guarded term per row in the block', () => {
    const formula = formulaFor();
    // One `IF` per row, each guarding that row's own cell.
    expect((formula.match(/IF\(/g) ?? []).length).toBe(4);
    for (const row of [10, 11, 12, 13]) {
      expect(formula, `row ${String(row)}`).toContain(
        `IF('04_Assessment_Input'!$J$${String(row)}="","","${TEXT_SEPARATOR}"&'04_Assessment_Input'!$J$${String(row)})`
      );
    }
    // And no row outside the block.
    expect(formula).not.toContain('$J$9');
    expect(formula).not.toContain('$J$14');
  });

  /**
   * Every term contributes a *leading* separator, which makes the terms uniform — no special case
   * for "first non-empty cell" — and `MID` then drops it. Starting at 1 instead would leave every
   * populated cell reading " | text".
   */
  it('strips the leading separator so a single entry has no prefix', () => {
    const formula = formulaFor();
    expect(formula.startsWith('MID(')).toBe(true);
    // Derived from the separator, not hardcoded: a three-character separator is skipped by starting
    // at the fourth character.
    expect(TEXT_SEPARATOR).toHaveLength(3);
    expect(formula).toMatch(new RegExp(`,${String(TEXT_SEPARATOR.length + 1)},32767\\)$`));
    expect(formula).not.toMatch(/,1,32767\)$/);
  });

  it('handles a single-row block without a special case', () => {
    const formula = formulaFor({ firstRow: 7, lastRow: 7 });
    expect((formula.match(/IF\(/g) ?? []).length).toBe(1);
    expect(formula).toMatch(/,4,32767\)$/);
  });

  /**
   * Stays well inside Excel's 8,192-character formula limit at the largest block the model
   * produces — Technology's 11 aspects.
   */
  it('stays within the formula length limit at the largest block', () => {
    const longest = formulaFor({ firstRow: 1000, lastRow: 1010 });
    expect(longest.length).toBeLessThan(8192);
  });
});

describe('column addressing', () => {
  it.each([
    [1, 'A'],
    [26, 'Z'],
    [27, 'AA'],
    [52, 'AZ'],
    [702, 'ZZ'],
    [703, 'AAA'],
  ])('converts index %i to %s', (index, expected) => {
    expect(columnLetter(index)).toBe(expected);
  });

  it('resolves a column key to its letter', () => {
    expect(letterOf(ASSESSMENT_INPUT_COLUMNS, 'currentLevel')).toBe('H');
    expect(letterOf(ASSESSMENT_INPUT_COLUMNS, 'areaId')).toBe('N');
  });

  /**
   * Throws rather than falling back. A formula built against a column that does not exist
   * addresses the wrong data silently, and a `#REF!` in a shipped workbook is not something
   * any test here can catch.
   */
  it('throws for an unknown column rather than guessing', () => {
    expect(() => letterOf(ASSESSMENT_INPUT_COLUMNS, 'notAColumn')).toThrow(/No column named/);
  });
});
