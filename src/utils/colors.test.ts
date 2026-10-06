/**
 * Tests for color utilities
 */

import { describe, it, expect } from 'vitest';
import { getScoreColor, formatScore, SCORE_COLORS } from './colors';

describe('getScoreColor', () => {
  it('returns grey for null score', () => {
    expect(getScoreColor(null)).toBe(SCORE_COLORS.none);
  });

  it('returns green for excellent scores (>= 4)', () => {
    expect(getScoreColor(4)).toBe(SCORE_COLORS.excellent);
    expect(getScoreColor(4.5)).toBe(SCORE_COLORS.excellent);
    expect(getScoreColor(5)).toBe(SCORE_COLORS.excellent);
  });

  it('returns amber for good scores (>= 3, < 4)', () => {
    expect(getScoreColor(3)).toBe(SCORE_COLORS.good);
    expect(getScoreColor(3.5)).toBe(SCORE_COLORS.good);
    expect(getScoreColor(3.9)).toBe(SCORE_COLORS.good);
  });

  it('returns blue for developing scores (>= 2, < 3)', () => {
    expect(getScoreColor(2)).toBe(SCORE_COLORS.developing);
    expect(getScoreColor(2.5)).toBe(SCORE_COLORS.developing);
    expect(getScoreColor(2.9)).toBe(SCORE_COLORS.developing);
  });

  it('returns red for initial scores (< 2)', () => {
    expect(getScoreColor(1)).toBe(SCORE_COLORS.initial);
    expect(getScoreColor(1.5)).toBe(SCORE_COLORS.initial);
    expect(getScoreColor(1.9)).toBe(SCORE_COLORS.initial);
    expect(getScoreColor(0)).toBe(SCORE_COLORS.initial);
  });
});

describe('SCORE_COLORS', () => {
  it('has all expected color keys', () => {
    expect(SCORE_COLORS).toHaveProperty('excellent');
    expect(SCORE_COLORS).toHaveProperty('good');
    expect(SCORE_COLORS).toHaveProperty('developing');
    expect(SCORE_COLORS).toHaveProperty('initial');
    expect(SCORE_COLORS).toHaveProperty('none');
  });

  it('has valid hex color values', () => {
    const hexColorRegex = /^#[0-9a-fA-F]{6}$/;
    expect(SCORE_COLORS.excellent).toMatch(hexColorRegex);
    expect(SCORE_COLORS.good).toMatch(hexColorRegex);
    expect(SCORE_COLORS.developing).toMatch(hexColorRegex);
    expect(SCORE_COLORS.initial).toMatch(hexColorRegex);
    expect(SCORE_COLORS.none).toMatch(hexColorRegex);
  });
});

describe('formatScore', () => {
  it('returns em dash for null', () => {
    expect(formatScore(null)).toBe('—');
  });

  it('returns em dash for undefined', () => {
    expect(formatScore(undefined)).toBe('—');
  });

  it('formats whole numbers with one decimal place', () => {
    expect(formatScore(3)).toBe('3.0');
    expect(formatScore(5)).toBe('5.0');
    expect(formatScore(1)).toBe('1.0');
  });

  it('formats decimal numbers to one decimal place', () => {
    expect(formatScore(3.5)).toBe('3.5');
    expect(formatScore(4.2)).toBe('4.2');
    expect(formatScore(2.7)).toBe('2.7');
  });

  it('rounds to one decimal place', () => {
    expect(formatScore(3.14)).toBe('3.1');
    expect(formatScore(3.16)).toBe('3.2');
    expect(formatScore(3.149)).toBe('3.1');
    expect(formatScore(4.96)).toBe('5.0');
  });

  it('handles zero', () => {
    expect(formatScore(0)).toBe('0.0');
  });
});

/**
 * WCAG contrast maths, deliberately reimplemented in the test rather than
 * imported from production code, so that a bug in a shared helper cannot make a
 * contrast regression invisible to the very tests meant to catch it. (Knip would
 * in fact tolerate a test-only export — its vitest plugin treats test files as
 * entry points — so this is a choice about independence, not a tooling limit.)
 *
 * These assertions exist because the palette's own docstring previously claimed
 * AA compliance while every value measured between 2.16:1 and 3.68:1. A comment
 * cannot enforce contrast; a test can. Note that axe **cannot** check contrast
 * in this suite — it needs a canvas to sample rendered pixels, which jsdom does
 * not provide — so `toHaveNoViolations()` elsewhere in the suite silently skips
 * the colour-contrast rule. This is the only automated contrast coverage there is.
 */
function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * (r as number) + 0.7152 * (g as number) + 0.0722 * (b as number);
}

function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return ((hi as number) + 0.05) / ((lo as number) + 0.05);
}

const WHITE = '#ffffff';
/** WCAG 2.1 AA, 1.4.3 Contrast (Minimum), for text below 18.66px bold / 24px regular. */
const AA_NORMAL_TEXT = 4.5;

describe('SCORE_COLORS contrast (WCAG 2.1 AA 1.4.3)', () => {
  const entries = Object.entries(SCORE_COLORS);

  it('sanity-checks the contrast maths against known values', () => {
    // Black on white is the theoretical maximum, 21:1.
    expect(contrastRatio('#000000', WHITE)).toBeCloseTo(21, 1);
    // A colour against itself is 1:1.
    expect(contrastRatio('#123456', '#123456')).toBeCloseTo(1, 5);
    // The function is symmetric: it sorts its inputs by luminance.
    expect(contrastRatio('#ff9800', WHITE)).toBe(contrastRatio(WHITE, '#ff9800'));
    // Documented failures of the palette this replaced, so a broken
    // implementation cannot report the old colours as compliant.
    expect(contrastRatio('#ff9800', WHITE)).toBeCloseTo(2.16, 1);
    expect(contrastRatio('#4caf50', WHITE)).toBeCloseTo(2.78, 1);
  });

  it.each(entries)('uses %s as a chip fill behind white text at >= 4.5:1', (_name, color) => {
    expect(contrastRatio(WHITE, color)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  it.each(entries)('uses %s as text on a white surface at >= 4.5:1', (_name, color) => {
    expect(contrastRatio(color, WHITE)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  it('records that the bands separate by hue, not by luminance', () => {
    // Forcing all five to ~5:1 against white necessarily puts them at similar
    // luminance, so they are NOT distinguishable from one another by brightness:
    // the widest gap between any two bands is only about 1.21:1, and amber vs
    // red is 1.08:1. This is a documented consequence, not an aspiration, so the
    // bound is pinned tight enough to actually mean something rather than left at
    // a value nothing could ever exceed.
    //
    // It is acceptable only because colour is never the sole carrier of meaning:
    // every chip and text site renders the numeric score beside the colour, and
    // the two bar charts convey value through bar length against a labelled axis
    // (WCAG 1.4.1 Use of Color). Note the charts do NOT print numbers — there is
    // no datalabels plugin — so bar length is the redundancy there, not text.
    const ratios = entries.flatMap(([, a], i) =>
      entries.slice(i + 1).map(([, b]) => contrastRatio(a, b))
    );
    expect(Math.max(...ratios)).toBeLessThan(1.3);
  });
});
