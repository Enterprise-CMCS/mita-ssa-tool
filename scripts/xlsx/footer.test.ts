/**
 * The print-footer length guard, and the staleness check on the mutation harness.
 *
 * Both exist because of the same lesson: a guard nobody exercises is a comment.
 *
 * `assertFooterFits` was added to stop an over-length footer reaching Excel, and then had
 * no test — its own mutation *deleted* it rather than triggering it, so an inverted
 * comparison or a wrong limit would have gone unnoticed while the prose called it
 * "enforced rather than remembered".
 *
 * The harness has a matching problem one level up: three of its mutations went stale within
 * a single wave when refactors renamed the code they patch. A stale mutation reports as
 * `MUTATION-NOT-APPLIED`, but only if somebody runs the harness — and it takes minutes, so
 * it is not in `npm test`. The cheap half of that guarantee is checking that every
 * mutation's target text still exists, which is fast enough to run every time.
 */

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { DRAFT_NOTICE_LINE, DRAFT_NOTICE_SHORT_LINE } from '../../src/constants/draftNotice.ts';
import { fromRepoRoot } from './paths.ts';
import { MUTATION_CASES } from './prove-assertions.ts';
import { assertFooterFits, HEADER_FOOTER_LIMIT } from './workbook.ts';

describe('print footer length guard', () => {
  it('uses Excel documented 255-character limit', () => {
    expect(HEADER_FOOTER_LIMIT).toBe(255);
  });

  it('accepts a footer exactly at the limit', () => {
    expect(() => assertFooterFits('sheet', 'x'.repeat(HEADER_FOOTER_LIMIT))).not.toThrow();
  });

  /**
   * The half the harness's own mutation could not reach, because that mutation removes the
   * guard rather than crossing it.
   */
  it('throws for a footer one character over the limit', () => {
    expect(() => assertFooterFits('sheet', 'x'.repeat(HEADER_FOOTER_LIMIT + 1))).toThrow(
      /256 characters/
    );
  });

  it('names the sheet in the error so the failure is actionable', () => {
    expect(() => assertFooterFits('04_Assessment_Input', 'x'.repeat(300))).toThrow(
      /04_Assessment_Input/
    );
  });

  /**
   * The arithmetic behind Decision 16, pinned so the reasoning cannot rot.
   *
   * The full notice line cannot be an Excel footer, and shortening it is forbidden by
   * Decision 15 — the PRA sentence alone exceeds the limit. So this is not an
   * implementation choice that a later change could revisit.
   */
  it('records why the full notice cannot be a footer', () => {
    expect(DRAFT_NOTICE_LINE.length).toBe(420);
    expect(DRAFT_NOTICE_SHORT_LINE.length).toBe(163);

    const assembledFull = `&L&8${DRAFT_NOTICE_LINE}&R&8Page &P of &N`;
    const assembledShort = `&L&8${DRAFT_NOTICE_SHORT_LINE}&R&8Page &P of &N`;
    expect(assembledFull.length).toBe(441);
    expect(assembledShort.length).toBe(184);
    expect(assembledFull.length).toBeGreaterThan(HEADER_FOOTER_LIMIT);
    expect(assembledShort.length).toBeLessThanOrEqual(HEADER_FOOTER_LIMIT);
  });
});

describe('mutation harness staleness', () => {
  /**
   * Every mutation must still match the source it patches.
   *
   * This is the fast half of the harness's guarantee. Running the harness itself takes
   * minutes — it invokes vitest once per mutation — so it is not in `npm test`, which is
   * how three mutations went stale inside one wave without anyone noticing until a review.
   * Checking that each `find` string still exists costs milliseconds and catches exactly
   * that failure, leaving the slow run for deliberate verification.
   *
   * A failure here does **not** mean the code is wrong. It means a mutation no longer
   * applies, so the assertion it was proving is currently unproved: update the `find`
   * string and re-run `node scripts/xlsx/prove-assertions.ts`.
   */
  it('still finds every mutation target in the source it patches', () => {
    const sources = new Map<string, string>();
    const stale: string[] = [];

    for (const mutation of MUTATION_CASES) {
      if (!sources.has(mutation.file)) {
        sources.set(mutation.file, readFileSync(fromRepoRoot(mutation.file), 'utf8'));
      }
      if (!sources.get(mutation.file)?.includes(mutation.find)) {
        stale.push(`${mutation.assertion} (${mutation.file})`);
      }
    }

    expect(
      stale,
      `Mutation targets no longer match their source, so these assertions are unproved:\n` +
        `${stale.join('\n')}\n` +
        `Update the find strings in prove-assertions.ts and re-run the harness.`
    ).toEqual([]);
  });

  it('names a distinct test for every mutation, so none proves a neighbour', () => {
    const byTestAndFile = MUTATION_CASES.map(
      (mutation) => `${mutation.testFile ?? 'default'}::${mutation.test}`
    );
    expect(new Set(byTestAndFile).size).toBe(byTestAndFile.length);
  });

  it('covers every source file it can mutate', () => {
    const filesMutated = new Set(MUTATION_CASES.map((mutation) => mutation.file));
    for (const file of filesMutated) {
      expect(file, `${file} is mutated but would not be restored`).toMatch(/^scripts\/xlsx\//);
    }
  });
});
