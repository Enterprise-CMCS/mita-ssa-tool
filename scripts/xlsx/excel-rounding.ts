/**
 * A model of Excel's `ROUND`, and the fixtures that check the model against Excel itself.
 *
 * Split out of `halfway.test.ts` so two consumers can share it: that test enumerates where the
 * model and the app's `Math.round(x * 10) / 10` diverge, and `verify-workbook-in-excel.ts` puts the
 * fixtures into a real spreadsheet and reads back which side Excel lands on. As long as this lived
 * in a test file, the model was an unverified claim about the world with nothing able to check it.
 *
 * **Verdict, measured:** all five fixtures returned the `excelStyle` answer in Excel 16 on macOS.
 * The model is confirmed and the divergence noted on `00_README` is real.
 */

/**
 * Excel's rounding, modelled: normalise to 15 significant decimal digits, then round half away
 * from zero at one decimal place.
 *
 * The documented mechanism, and it explains the `4.05 / 3` case Section 5.4 cites. Whether Excel
 * really behaves this way is settled by `EXCEL_CHECK_FIXTURES`, not by this function.
 *
 * ## Why the rounding is done on digits rather than arithmetic
 *
 * The obvious implementation multiplies by 10, takes the floor, and compares the remainder to 0.5 —
 * and that reintroduces exactly the binary representation error the normalisation just removed, so
 * it needs a second fudge (`toPrecision` on the remainder) to absorb it. The first version of this
 * function did that, and the fudge turned out to be doing **all** the work: over the 120,827 values
 * reachable from the model's roll-ups, dropping the 15-digit normalisation entirely changed nothing.
 * The function was returning the right answers through the wrong mechanism, which makes it useless
 * as a model of Excel even while every fixture agreed with it.
 *
 * So the normalised value is inspected as decimal text. Half away from zero at one decimal place is
 * exactly "is the second decimal digit 5 or more" — digits beyond it can only add — and read off a
 * decimal string there is no float error to absorb.
 */
export function excelStyleRound(value: number): number {
  const sign = value < 0 ? -1 : 1;
  // 15 significant digits is what Excel carries, so a value the binary representation puts at
  // 2.8499999999999996 reads to Excel as 2.85.
  const normalised = Math.abs(value).toPrecision(15);
  if (normalised.includes('e')) {
    // Maturity scores live in 1..5. Exponential notation means the caller is outside the domain
    // this models, and silently mis-rounding it would be worse than refusing.
    throw new Error(`Outside the modelled range: ${String(value)}`);
  }

  const [whole = '0', fraction = ''] = normalised.split('.');
  const firstDecimal = Number(fraction[0] ?? '0');
  const secondDecimal = Number(fraction[1] ?? '0');
  const tenths = Number(whole) * 10 + firstDecimal + (secondDecimal >= 5 ? 1 : 0);
  return (sign * tenths) / 10;
}

/**
 * Formulas whose answer distinguishes the two rounding behaviours.
 *
 * Each entry is a formula and the two candidate answers. If Excel returns `excelStyle`, the model
 * above is right and the divergence documented on `00_README` is real. If it returns `js`, Excel
 * matches the tool and the concern is void. Either outcome is worth knowing, and neither can be
 * established without running Excel — which is why these are fixtures rather than assertions.
 *
 * `expression` is the same arithmetic in JS, so a test can confirm each fixture really does split
 * the two models rather than just asserting two numbers that nobody computes.
 */
export const EXCEL_CHECK_FIXTURES = [
  { formula: '=ROUND(4.05/3,1)', expression: 4.05 / 3, js: 1.3, excelStyle: 1.4 },
  { formula: '=ROUND(AVERAGE(1.2,1.9),1)', expression: (1.2 + 1.9) / 2, js: 1.5, excelStyle: 1.6 },
  { formula: '=ROUND(AVERAGE(2.8,2.9),1)', expression: (2.8 + 2.9) / 2, js: 2.8, excelStyle: 2.9 },
  { formula: '=ROUND(AVERAGE(4.3,4.6),1)', expression: (4.3 + 4.6) / 2, js: 4.4, excelStyle: 4.5 },
  {
    formula: '=ROUND(AVERAGE(1,1.8,1.25),1)',
    expression: (1 + 1.8 + 1.25) / 3,
    js: 1.3,
    excelStyle: 1.4,
  },
] as const;
