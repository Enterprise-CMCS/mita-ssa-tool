/**
 * Import & Export page — the offline workbook section's fragment wiring.
 *
 * Narrow on purpose. This covers the one path on this page that fails **silently**: three separate
 * references have to agree on the section's DOM id — the pointer link's `href`, the section's own
 * `id`, and the `getElementById` in the effect that makes
 * `…/import-export#offline-workbook-section` work when opened cold. Break any one and the link
 * still looks and behaves like a link, and does nothing. Nothing else in the repo can see that:
 * nothing else in the repo renders these links, and the artifact check only ever inspects the file
 * the generator wrote. `src/constants/workbook.test.ts` covers the download URL and the
 * `.gitignore` pairing; this covers the fragment. The two do not overlap.
 *
 * What this cannot cover, and what covers it instead: jsdom has no layout, so there is nothing to
 * scroll and `scrollIntoView` does not exist — it is stubbed below. Whether the section actually
 * ends up on screen was verified in Chromium against the built site (cold load, plain click, and
 * Cmd+click into a background tab). This asserts the wiring; the browser asserts the effect.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import ImportExport from './ImportExport';
import { clearDatabase } from '../services/db';
import { OFFLINE_WORKBOOK_SECTION_ID } from '../constants';

function renderPage(path: string): void {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/import-export" element={<ImportExport />} />
      </Routes>
    </MemoryRouter>
  );
}

/**
 * Run whatever the component queued with `requestAnimationFrame`.
 *
 * The effect defers a frame so it cannot race `Layout`'s `ScrollToTop`, which also scrolls on
 * mount. jsdom does implement `requestAnimationFrame`, but on a ~16ms timer, so the assertions have
 * to wait for it rather than assuming it has already run.
 */
async function flushAnimationFrame(): Promise<void> {
  await new Promise((resolve) => {
    requestAnimationFrame(() => resolve(undefined));
  });
}

/**
 * Shared prototype spy, because jsdom implements no layout and so defines no `scrollIntoView` at
 * all. Stubbed rather than skipped so a *missing* call is still detectable.
 *
 * Assertions go through `mock.instances` rather than `toHaveBeenCalled`, since one spy on the
 * prototype answers for every element on the page: "something scrolled" would pass if the effect
 * scrolled the wrong node, and the negative case would fail spuriously the moment any other caller
 * appears here.
 */
let scrollSpy: Mock<typeof Element.prototype.scrollIntoView>;

describe('ImportExport — offline workbook fragment', () => {
  beforeEach(async () => {
    await clearDatabase();
    scrollSpy = vi.fn<typeof Element.prototype.scrollIntoView>();
    Element.prototype.scrollIntoView = scrollSpy;
  });

  afterEach(async () => {
    await clearDatabase();
    vi.restoreAllMocks();
  });

  it('points the intro link at the section that exists on the page', async () => {
    renderPage('/import-export');

    const link = await screen.findByRole('link', { name: /offline Excel workbook/i });
    const section = await screen.findByRole('region', { name: 'Offline Excel workbook' });

    /*
     * The assertion that catches the silent failure: the href's fragment has to name the id the
     * section actually rendered with. Comparing both to the shared constant would pass even if the
     * two were wired to different literals, so they are compared to each other.
     */
    expect(link.getAttribute('href')).toBe(`#${section.id}`);
    expect(section.id).toBe(OFFLINE_WORKBOOK_SECTION_ID);
  });

  it('scrolls and focuses the section when the page is opened at the fragment', async () => {
    renderPage(`/import-export#${OFFLINE_WORKBOOK_SECTION_ID}`);

    const section = await screen.findByRole('region', { name: 'Offline Excel workbook' });
    await flushAnimationFrame();

    await waitFor(() => {
      expect(document.activeElement).toBe(section);
    });
    // `tabIndex={-1}` is what makes the focus move possible; assert it rather than assume it, since
    // removing it would leave the focus assertion above failing for a non-obvious reason.
    expect(section).toHaveAttribute('tabindex', '-1');
    expect(scrollSpy.mock.instances).toContain(section);
  });

  it('leaves the section alone when the page is opened without the fragment', async () => {
    renderPage('/import-export');

    const section = await screen.findByRole('region', { name: 'Offline Excel workbook' });
    await flushAnimationFrame();

    expect(document.activeElement).not.toBe(section);
    expect(scrollSpy.mock.instances).not.toContain(section);
  });
});
