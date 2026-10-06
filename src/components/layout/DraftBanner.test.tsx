/**
 * DraftBanner tests
 *
 * The banner exists so nobody can mistake the pilot build for a final one, so the
 * cases that matter are: it says what it is meant to say, it is reachable by
 * assistive technology without hijacking it, and it can actually be switched off
 * at go-live.
 *
 * CMS supplies the wording and requires two notices with different text, so several
 * tests here pin the *approved copy* rather than component behaviour. That is
 * deliberate: the top notice says "MITA 4.0 pilot activities" and the bottom one says
 * "pilot activities" plus the Paperwork Reduction Act statement, and a well-meaning
 * tidy-up that unified them would change text CMS has cleared.
 */

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import {
  DraftBanner,
  DRAFT_BANNER_LANDMARK_LABEL,
  DRAFT_BANNER_FULL_LANDMARK_LABEL,
} from './DraftBanner';
import { DRAFT_NOTICE_BODY, DRAFT_NOTICE_FULL_BODY, DRAFT_NOTICE_LABEL } from '../../constants';

/** Matches a <p> containing the given text, avoiding RegExp escaping of the copy. */
const paragraphContaining =
  (text: string) =>
  (_: string, el: Element | null): boolean =>
    el?.tagName === 'P' && (el.textContent ?? '').includes(text);

describe('DraftBanner', () => {
  describe('top notice', () => {
    it('states that the materials are predecisional pilot materials', () => {
      render(<DraftBanner variant="top" />);

      expect(screen.getByText(DRAFT_NOTICE_LABEL)).toBeInTheDocument();
      // Substring match rather than a RegExp built from the copy, which contains
      // regex metacharacters ("MITA 4.0" has a dot).
      expect(screen.getByText(paragraphContaining(DRAFT_NOTICE_BODY))).toBeInTheDocument();
    });

    it('scopes the short notice to MITA 4.0 pilot activities, as CMS worded it', () => {
      render(<DraftBanner variant="top" />);

      expect(
        screen.getByText(paragraphContaining('in support of MITA 4.0 pilot activities'))
      ).toBeInTheDocument();
    });

    it('does not carry the PRA statement, which belongs to the bottom notice', () => {
      render(<DraftBanner variant="top" />);

      expect(screen.queryByText(paragraphContaining('Paperwork Reduction Act'))).toBeNull();
    });
  });

  describe('bottom notice', () => {
    it('carries the full statement including the Paperwork Reduction Act text', () => {
      render(<DraftBanner variant="bottom" />);

      expect(screen.getByText(DRAFT_NOTICE_LABEL)).toBeInTheDocument();
      expect(screen.getByText(paragraphContaining(DRAFT_NOTICE_FULL_BODY))).toBeInTheDocument();
    });

    it('says the materials are not final agency policy and names the PRA', () => {
      // The two substantive clauses, pinned individually. If the copy is ever
      // shortened these are the parts that must not be lost.
      render(<DraftBanner variant="bottom" />);

      expect(
        screen.getByText(paragraphContaining('do not represent final agency policy'))
      ).toBeInTheDocument();
      expect(
        screen.getByText(paragraphContaining('Paperwork Reduction Act (PRA)'))
      ).toBeInTheDocument();
      expect(
        screen.getByText(paragraphContaining('OMB approval where required'))
      ).toBeInTheDocument();
    });
  });

  describe('both notices', () => {
    it('emphasises the label so it reads as a marker, not prose', () => {
      render(<DraftBanner variant="top" />);

      expect(screen.getByText(DRAFT_NOTICE_LABEL).tagName).toBe('STRONG');
    });

    it('is not an alert or live region', () => {
      render(<DraftBanner variant="top" />);

      // Static text present from first paint. role="alert" would interrupt screen
      // reader users on every navigation, and a live region would re-announce text
      // that never changes.
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(document.querySelector('[aria-live]')).toBeNull();
    });

    it('is a labelled landmark so screen readers can find it', () => {
      render(<DraftBanner variant="top" />);

      // Discoverable in the landmark list rather than relying on the user
      // traversing it. Follows the USWDS Site Alert shape.
      const landmark = screen.getByRole('region', { name: DRAFT_BANNER_LANDMARK_LABEL });
      expect(landmark.tagName).toBe('SECTION');
    });

    it('gives the two landmarks different accessible names', () => {
      // Two same-named landmarks is an axe `landmark-unique` violation, and it is the
      // defect Wave 4 found when AspectCard duplicated MUI's accordion region. Since
      // both notices now render on every page, this is the guard against reintroducing
      // it by copying an aria-label.
      render(
        <>
          <DraftBanner variant="top" />
          <DraftBanner variant="bottom" />
        </>
      );

      expect(DRAFT_BANNER_LANDMARK_LABEL).not.toBe(DRAFT_BANNER_FULL_LANDMARK_LABEL);
      expect(screen.getByRole('region', { name: DRAFT_BANNER_LANDMARK_LABEL })).toBeInTheDocument();
      expect(
        screen.getByRole('region', { name: DRAFT_BANNER_FULL_LANDMARK_LABEL })
      ).toBeInTheDocument();
    });

    it('cannot be dismissed', () => {
      render(<DraftBanner variant="bottom" />);

      // A notice a reviewer can close is a notice that may be absent from the
      // screenshot they circulate.
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('has no accessibility violations, in either variant or both together', async () => {
      const { container } = render(
        <>
          <DraftBanner variant="top" />
          <DraftBanner variant="bottom" />
        </>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();

      // Caveat worth knowing: axe-core cannot evaluate colour contrast under jsdom
      // (it needs a canvas to sample rendered pixels, hence the "getContext not
      // implemented" notice). Contrast is these banners' main accessibility risk, so
      // it is verified in a real browser instead — see the Wave 3 and Wave 5 notes in
      // docs/decisions/PILOT_CLEARANCE_PLAN.md.
    });
  });
});

describe('draft mode switch', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('is on by default, so an unset variable cannot drop the marker', async () => {
    vi.unstubAllEnvs();
    const { IS_DRAFT } = await import('../../constants');

    expect(IS_DRAFT).toBe(true);
  });

  it('stays on for any value other than the exact string "false"', async () => {
    // Guards against a deploy variable set to FALSE, 0, or no accidentally
    // switching the disclaimer off.
    vi.stubEnv('VITE_DRAFT_MODE', 'FALSE');
    const { IS_DRAFT } = await import('../../constants');

    expect(IS_DRAFT).toBe(true);
  });

  it('switches off for VITE_DRAFT_MODE=false, the go-live path', async () => {
    vi.stubEnv('VITE_DRAFT_MODE', 'false');
    const { IS_DRAFT } = await import('../../constants');

    expect(IS_DRAFT).toBe(false);
  });
});
