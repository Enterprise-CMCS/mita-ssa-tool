/**
 * Where Excel's `ROUND` and the app's `Math.round(x * 10) / 10` can disagree, enumerated.
 *
 * Section 5.4 flags this as a risk step 1 cannot catch — the JS model in `scoring-spec.ts`
 * shares the app's rounding primitive, so it agrees with the app by construction and is blind
 * to Excel behaving differently. This file maps the divergence instead of asserting it away.
 *
 * ## The mechanism
 *
 * `Math.round(x * 10) / 10` operates on an accumulated binary float. Excel normalises to 15
 * significant decimal digits before rounding, so a value the binary representation puts at
 * `2.8499999999999996` reads to Excel as `2.85` and rounds half-away-from-zero to `2.9`, while
 * JS sees `28.499999999999996`, rounds to `28`, and yields `2.8`. One tenth adrift.
 *
 * ## What the enumeration found, which is narrower than expected
 *
 * The divergence is **unreachable** in the roll-ups that matter most:
 *
 * | Roll-up                                         | Divergent combinations |
 * | ----------------------------------------------- | ---------------------- |
 * | Any dimension score (mean of integer levels)     | **0**                 |
 * | Technology (mean of 2 unrounded sub-dim means)    | **0** of 2,009        |
 * | Standard area (mean of 3 rounded dimension scores) | **0** of 68,921     |
 * | Organizational area, 2 sections assessed          | **0**                 |
 * | Standard area, only 2 dimensions scored           | 32 of 1,681           |
 * | Organizational area, 3 sections assessed          | 313 of 50,225 (~0.6%) |
 *
 * So Technology — the score this project has spent three waves getting right — cannot diverge,
 * and neither can a normal three-dimension area. What can diverge is the organizational area,
 * and an enterprise-domain area whose aggregate is absent so its divisor drops to two.
 *
 * ## Authoritative primitive
 *
 * **The tool is.** A state reads their score on screen and submits it through the CSV profile,
 * both of which come from `Math.round(x * 10) / 10`. Where Excel differs, the workbook is
 * wrong by definition, and the difference is always exactly 0.1. Documented on `00_README`
 * rather than engineered around: replicating JS float behaviour in a formula would mean an
 * unreadable expression in every score cell to correct a tenth in under one percent of the
 * organizational cases.
 *
 * ## What is verified and what is not
 *
 * The JS column is computed here and pinned. The Excel column comes from `excelStyleRound`, which
 * models normalise-then-half-up — and that model has now been **measured against Excel**, not just
 * reasoned about: `npm run verify:workbook-excel` evaluates `EXCEL_CHECK_FIXTURES` in a real
 * spreadsheet, and all five returned the Excel-style answer. So the divergence is real and the
 * counts below describe something that actually happens.
 *
 * What is still inferred rather than measured is the *enumeration*: 313 of 50,225 comes from the
 * model, not from 50,225 trips through Excel. Five confirmed points make the model credible; they
 * do not make it exhaustive.
 */

import { describe, expect, it } from 'vitest';

import { EXCEL_CHECK_FIXTURES, excelStyleRound } from './excel-rounding.ts';
import { roundToOneDecimal } from './scoring-spec.ts';

/** Every distinct mean reachable from `1..maxCount` integer levels in 1..5. */
function reachableMeans(maxCount: number): number[] {
  const means = new Set<number>();
  for (let count = 1; count <= maxCount; count += 1) {
    for (let sum = count; sum <= 5 * count; sum += 1) {
      means.add(sum / count);
    }
  }
  return [...means];
}

/** One-decimal scores, the inputs to any roll-up that averages already-rounded values. */
const ONE_DECIMAL_SCORES = Array.from({ length: 41 }, (_unused, index) => (10 + index) / 10);

function divergent(values: readonly number[]): boolean {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return roundToOneDecimal(mean) !== excelStyleRound(mean);
}

describe('the rounding model reproduces the documented case', () => {
  /**
   * The example Section 5.4 cites. Worth pinning because it is the evidence the whole concern
   * rests on, and because `4.05` is not reachable as a mean of integer levels — it is reachable
   * as a mean of already-rounded scores, which is the area roll-up.
   */
  it('splits on 4.05 / 3 exactly as the plan describes', () => {
    const value = 4.05 / 3;
    expect(value).toBe(1.3499999999999999);
    expect(roundToOneDecimal(value)).toBe(1.3);
    expect(excelStyleRound(value)).toBe(1.4);
  });

  it('agrees with JS everywhere the binary representation is exact', () => {
    for (const value of [1, 2.5, 3, 4.5, 5, 2.25, 3.75]) {
      expect(excelStyleRound(value), String(value)).toBe(roundToOneDecimal(value));
    }
  });
});

describe('dimension scores cannot diverge', () => {
  /**
   * The strongest result here. No mean of integer levels 1-5 over any aspect count the model
   * uses can land on a float that the two primitives round differently, so every dimension
   * score in the workbook is safe regardless of what a state enters.
   */
  it('finds no divergence in any reachable mean of integer levels', () => {
    const offenders = reachableMeans(11).filter((mean) => divergent([mean]));
    expect(offenders).toEqual([]);
  });

  /**
   * Technology is the mean of two **unrounded** sub-dimension means over 6 and 5 aspects. This
   * is the score OBS-21 and OBS-25 were about, and the one most likely to be scrutinised, so
   * establishing that it cannot diverge is worth the enumeration.
   */
  it('finds no divergence in the Technology roll-up over all 2,009 combinations', () => {
    const infrastructure = reachableMeans(6);
    const application = reachableMeans(5);
    const offenders: string[] = [];

    for (const infra of infrastructure) {
      for (const app of application) {
        if (divergent([infra, app])) {
          offenders.push(`mean(${infra}, ${app})`);
        }
      }
    }

    expect(infrastructure.length * application.length).toBe(2009);
    expect(offenders).toEqual([]);
  });
});

describe('a three-dimension area score cannot diverge', () => {
  it('finds no divergence over all 68,921 three-score combinations', () => {
    let tested = 0;
    const offenders: string[] = [];

    for (const a of ONE_DECIMAL_SCORES) {
      for (const b of ONE_DECIMAL_SCORES) {
        for (const c of ONE_DECIMAL_SCORES) {
          tested += 1;
          if (divergent([a, b, c])) {
            offenders.push(`mean(${a}, ${b}, ${c})`);
          }
        }
      }
    }

    expect(tested).toBe(68921);
    expect(offenders).toEqual([]);
  });
});

describe('two roll-ups can diverge, and these are they', () => {
  /**
   * A standard area normally averages three dimension scores and is safe. It averages **two**
   * when one dimension has nothing assessed — including an enterprise-domain area whose
   * aggregate is absent, which `finalizeAssessment` handles by shrinking the divisor to 2.
   */
  it('finds 32 divergent two-score means', () => {
    const offenders: Array<[number, number]> = [];

    for (const a of ONE_DECIMAL_SCORES) {
      for (const b of ONE_DECIMAL_SCORES) {
        if (divergent([a, b])) {
          offenders.push([a, b]);
        }
      }
    }

    expect(offenders).toHaveLength(32);
    // Always exactly one tenth, never more, which bounds the damage.
    for (const [a, b] of offenders) {
      const mean = (a + b) / 2;
      const gap = Math.abs((excelStyleRound(mean) - (roundToOneDecimal(mean) ?? 0)) * 10);
      expect(Math.round(gap), `mean(${a}, ${b})`).toBe(1);
    }
  });

  /**
   * The organizational area averages three **unrounded** section means over 6, 5 and 4 aspects.
   * This is the roll-up most exposed to the divergence, at roughly 0.6% of combinations.
   */
  it('finds 313 divergent organizational area scores, about 0.6% of combinations', () => {
    const sections = [reachableMeans(6), reachableMeans(5), reachableMeans(4)];
    let tested = 0;
    let offenders = 0;

    for (const outcomes of sections[0] as number[]) {
      for (const roles of sections[1] as number[]) {
        for (const enterpriseArchitecture of sections[2] as number[]) {
          tested += 1;
          if (divergent([outcomes, roles, enterpriseArchitecture])) {
            offenders += 1;
          }
        }
      }
    }

    expect(tested).toBe(50225);
    expect(offenders).toBe(313);
    expect(offenders / tested).toBeLessThan(0.007);
  });
});

/**
 * The fixtures that settle whether the model above describes Excel.
 *
 * These assertions only establish that each fixture *would* tell the two apart. Which side Excel
 * actually lands on is answered by `npm run verify:workbook-excel`, which evaluates them in Excel
 * and reports the verdict — this file cannot know.
 */
describe('the Excel check fixtures', () => {
  it('states two different candidate answers for every fixture', () => {
    expect(EXCEL_CHECK_FIXTURES.length).toBeGreaterThanOrEqual(5);
    for (const fixture of EXCEL_CHECK_FIXTURES) {
      expect(fixture.js, fixture.formula).not.toBe(fixture.excelStyle);
      // And the JS answer really is what the app would produce, so the fixture is not
      // asserting against a number nobody computes.
      expect(Math.abs(fixture.excelStyle - fixture.js)).toBeCloseTo(0.1, 5);
    }
  });

  /**
   * Each fixture's stated answers really are what the two models produce for its arithmetic. This
   * is what makes the pair meaningful: without it, `js` and `excelStyle` are just two numbers
   * somebody typed, and a fixture could quietly stop discriminating.
   */
  it('matches both models for each fixture', () => {
    for (const fixture of EXCEL_CHECK_FIXTURES) {
      expect(roundToOneDecimal(fixture.expression), `JS for ${fixture.formula}`).toBe(fixture.js);
      expect(excelStyleRound(fixture.expression), `Excel model for ${fixture.formula}`).toBe(
        fixture.excelStyle
      );
    }
  });

  /**
   * The 15-significant-digit normalisation is the entire mechanism, pinned on its own.
   *
   * Worth a dedicated test because the first version of `excelStyleRound` normalised *and* then
   * fudged a float comparison, and the fudge was doing all the work — removing the normalisation
   * changed nothing across 120,827 reachable values. The model agreed with every fixture while
   * modelling the wrong thing, which no fixture could reveal.
   */
  it('rounds on the normalised decimal digits, not on the raw float', () => {
    // 2.8 and 2.9 average to this in binary. Excel reads it as 2.85 and rounds up; JS sees
    // 28.499999999999996, rounds to 28, and yields 2.8.
    const value = (2.8 + 2.9) / 2;
    expect(value).toBe(2.8499999999999996);
    expect(roundToOneDecimal(value)).toBe(2.8);
    expect(excelStyleRound(value)).toBe(2.9);

    // Without normalisation the digits after the point read 84999..., whose second decimal is 4,
    // so the model would return the JS answer and the divergence would look nonexistent.
    expect(value.toPrecision(15)).toBe('2.85000000000000');
    expect(String(value)).toContain('2.84999');
  });
});
