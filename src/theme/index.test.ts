/**
 * Theme Tests
 *
 * These assert the theme *object*, not rendered output, because jsdom does not
 * implement `:focus-visible` — a render-based test could not observe the focus
 * ring at all. The ring itself was verified in a real browser during the Wave 4
 * accessibility audit; this test exists so it cannot be silently removed.
 */

import { describe, it, expect } from 'vitest';
import theme from './index';

interface FocusVisibleOverride {
  '&.Mui-focusVisible'?: {
    outline?: string;
    outlineOffset?: number;
  };
}

function focusVisibleFor(component: 'MuiButtonBase'): FocusVisibleOverride {
  const root = theme.components?.[component]?.styleOverrides?.root;
  return (root ?? {}) as FocusVisibleOverride;
}

describe('theme focus indicator (WCAG 2.1 AA 2.4.7)', () => {
  it('should give every ButtonBase control a focus-visible outline', () => {
    const override = focusVisibleFor('MuiButtonBase')['&.Mui-focusVisible'];
    expect(override).toBeDefined();
    expect(override?.outline).toBe('2px solid currentColor');
  });

  it('should use currentColor so the ring adapts to the AppBar and page backgrounds', () => {
    // MUI's ButtonBase sets `outline: 0` and signals focus with a background
    // tint, which per-component `sx` backgrounds override. An outline cannot be
    // clobbered that way, and `currentColor` inherits the control's own text
    // colour — white on the dark blue AppBar, near-black on light backgrounds.
    const override = focusVisibleFor('MuiButtonBase')['&.Mui-focusVisible'];
    expect(override?.outline).toContain('currentColor');
  });

  it('should inset the ring on full-bleed rows so it is not clipped', () => {
    for (const component of ['MuiListItemButton', 'MuiAccordionSummary'] as const) {
      const root = theme.components?.[component]?.styleOverrides?.root as
        | FocusVisibleOverride
        | undefined;
      expect(root?.['&.Mui-focusVisible']?.outlineOffset).toBe(-2);
    }
  });
});

/** WCAG contrast maths. See the note in `utils/colors.test.ts` on why it is local. */
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

/** Composite a translucent overlay onto a base, as the browser would. */
function flatten(overlay: string, alpha: number, base: string): string {
  const parse = (hex: string): number[] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const [o, b] = [parse(overlay), parse(base)];
  return (
    '#' +
    o
      .map((v, i) =>
        Math.round(v * alpha + (b[i] as number) * (1 - alpha))
          .toString(16)
          .padStart(2, '0')
      )
      .join('')
  );
}

const WHITE = '#ffffff';
const AA_NORMAL_TEXT = 4.5;

describe('theme palette', () => {
  it('should keep error.dark as the draft banner colour measured at 7.03:1', () => {
    // Pinned because the draft banner's contrast was measured against this exact
    // value in a real browser (Wave 3). error.main computes to only 4.67:1.
    expect(theme.palette.error.dark).toBe('#b0142f');
    expect(contrastRatio(theme.palette.error.dark, WHITE)).toBeGreaterThanOrEqual(7);
  });

  /**
   * These tokens carry text somewhere in the app, so they have to clear 4.5:1.
   * Before OBS-30 they did not: `secondary.main` measured 2.19:1 (used for To-Be
   * chip text and flag icons) and `warning.dark` 2.89:1.
   */
  it.each([
    ['secondary.main', () => theme.palette.secondary.main],
    ['secondary.dark', () => theme.palette.secondary.dark],
    ['warning.dark', () => theme.palette.warning.dark],
    ['success.dark', () => theme.palette.success.dark],
    ['primary.main', () => theme.palette.primary.main],
    ['primary.dark', () => theme.palette.primary.dark],
    ['text.primary', () => theme.palette.text.primary],
    ['text.secondary', () => theme.palette.text.secondary],
  ])('should keep %s legible as text on white', (_name, read) => {
    expect(contrastRatio(read(), WHITE)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  /**
   * The recurring trap behind most of OBS-30: a chip tinted with
   * `alpha(X, 0.15)` and then filled with text in `X` cannot reach 4.5:1,
   * because tinting moves the background toward the foreground. The `.dark`
   * token has to be used for the text instead.
   */
  it.each([
    ['success', () => theme.palette.success.main, () => theme.palette.success.dark, 0.15],
    ['warning', () => theme.palette.warning.main, () => theme.palette.warning.dark, 0.15],
    ['primary', () => theme.palette.primary.main, () => theme.palette.primary.dark, 0.15],
  ])(
    'should keep %s.dark legible on an alpha-tinted %s.main chip',
    (_name, readMain, readDark, alpha) => {
      const background = flatten(readMain(), alpha, WHITE);
      expect(contrastRatio(readDark(), background)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    }
  );

  /**
   * A standard Alert paints its icon in `palette[severity].main`, a fill-grade
   * colour: measured against MUI's tinted alert backgrounds that gave warning
   * 1.65:1 and info 3.41:1, both under the 3:1 non-text minimum, with error
   * 3.98:1 and success 4.08:1 under the 4.5:1 text minimum.
   *
   * Only `standardWarning` was confirmed rendering in a real browser (the icon
   * computed to `rgb(122, 82, 0)` = `warning.dark`); the other three use the
   * identical mechanism but did not render in any reachable state during the
   * audit, so they are pinned here rather than claimed as visually verified.
   */
  it.each([
    ['standardWarning', 'warning'],
    ['standardInfo', 'info'],
    ['standardSuccess', 'success'],
    ['standardError', 'error'],
  ])('should paint the %s Alert icon with the .dark token', (slot, severity) => {
    const overrides = theme.components?.MuiAlert?.styleOverrides as
      | Record<string, unknown>
      | undefined;
    const build = overrides?.[slot];
    expect(typeof build).toBe('function');
    const resolved = (build as (arg: { theme: typeof theme }) => Record<string, unknown>)({
      theme,
    });
    const palette = theme.palette[severity as 'warning' | 'info' | 'success' | 'error'];
    expect(resolved['& .MuiAlert-icon']).toEqual({ color: palette.dark });
  });

  it('should darken rather than lighten to mark the active nav item', () => {
    // Lightening primary.main with rgba(255,255,255,0.1) produced #1a7fc3 and
    // dropped white text to 4.31:1, so the current page was the only failing nav
    // item. Darkening keeps white text well clear.
    const darkened = flatten('#000000', 0.16, theme.palette.primary.main);
    expect(contrastRatio(WHITE, darkened)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    const lightened = flatten(WHITE, 0.1, theme.palette.primary.main);
    expect(contrastRatio(WHITE, lightened)).toBeLessThan(AA_NORMAL_TEXT);
  });
});
