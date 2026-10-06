/**
 * Parity between README copy and the app copy it reproduces.
 *
 * Separate from `workbook.test.ts` because this file renders a React component, so it
 * needs jsdom and Testing Library, and it is asserting a content-parity requirement
 * rather than a 508 structural one.
 *
 * ## Why this exists
 *
 * Section 5.2 makes the Information Management guidance a parity requirement: 11 areas
 * carry `informationManagement`, and the tool shows on-screen guidance telling states to
 * assess information maturity once per domain rather than once per area. Without an
 * equivalent in the workbook, the same state produces *different input data* depending on
 * which artifact it used — and would have no way of knowing.
 *
 * The first version of this check searched the README for substrings lifted from the
 * README's own constant, which proves nothing. This renders the actual component and
 * compares the load-bearing claims. The component's own comment says "Copy is pending
 * working-group affirmation in staging", so the wording is expected to change, which is
 * exactly why a drift alarm is worth having.
 */

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { InformationManagementNotice } from '../../src/components/assessment/InformationManagementNotice.tsx';
import { INFORMATION_MANAGEMENT_GUIDANCE } from './readme.ts';

/**
 * Collapse whitespace and typographic apostrophes so the comparison is about meaning
 * rather than about how JSX happened to wrap a line.
 */
function normalise(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[\u2018\u2019]/g, "'")
    .trim()
    .toLowerCase();
}

describe('Information Management guidance parity', () => {
  /**
   * The three claims the guidance has to make. Asserted against both sources from one
   * list, so neither can lose a claim without failing — which is the property the
   * previous version lacked, since its expectations came from the workbook side only.
   */
  const LOAD_BEARING_CLAIMS = [
    'assess your information maturity once',
    'skip the information dimension',
    'single capability area',
  ];

  it('makes every load-bearing claim in the on-screen notice', () => {
    const { container } = render(<InformationManagementNotice />);
    const onScreen = normalise(container.textContent ?? '');

    for (const claim of LOAD_BEARING_CLAIMS) {
      expect(onScreen, `tool notice is missing: ${claim}`).toContain(claim);
    }
  });

  it('makes every load-bearing claim in the workbook guidance', () => {
    const inWorkbook = normalise(INFORMATION_MANAGEMENT_GUIDANCE);

    for (const claim of LOAD_BEARING_CLAIMS) {
      expect(inWorkbook, `workbook guidance is missing: ${claim}`).toContain(claim);
    }
  });

  /**
   * The two are deliberately *not* byte-identical: the tool says "this capability area"
   * because it renders inside one, and the workbook says "the Information Management
   * capability area" because it is read out of context on a README. Pinned so that
   * difference stays a deliberate rewording rather than becoming a silent divergence in
   * substance.
   */
  it('differs from the on-screen notice only in deixis, not in substance', () => {
    const { container } = render(<InformationManagementNotice />);
    const onScreen = normalise(container.textContent ?? '');
    const inWorkbook = normalise(INFORMATION_MANAGEMENT_GUIDANCE);

    expect(onScreen).not.toBe(inWorkbook);

    // The tool is anchored to the area being viewed; the workbook names it.
    expect(onScreen).toContain('this capability area');
    expect(inWorkbook).toContain('the information management capability area');

    // Both must say the guidance applies within a domain, not across the enterprise.
    expect(onScreen).toContain('domain');
    expect(inWorkbook).toContain('domain');
  });

  /**
   * The workbook guidance has to tell a reader where to find the flagged areas, because
   * unlike the tool it cannot show the notice contextually on the 11 areas concerned.
   */
  it('points the reader at the flag column, which the tool does not need to', () => {
    expect(INFORMATION_MANAGEMENT_GUIDANCE).toContain('Information Management Area column');
    expect(INFORMATION_MANAGEMENT_GUIDANCE).toContain('02');
    expect(INFORMATION_MANAGEMENT_GUIDANCE).toContain('04');
  });
});
