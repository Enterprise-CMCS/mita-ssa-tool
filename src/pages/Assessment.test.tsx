/**
 * Assessment page tests
 *
 * First coverage for this page (OBS-19: the largest and most-branched file in the
 * app had none). Scope is deliberately narrow — the behaviours that carry data
 * integrity rather than the full rendering surface:
 *
 *  - view mode must not write (the `save()` funnel is the single enforcement point)
 *  - a failed write must surface as an error, not as success (OBS-7)
 *  - text typed before a level is chosen must persist (OBS-6, end to end through
 *    the page's handlers rather than only at the hook level)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Assessment from './Assessment';
import { db, clearDatabase } from '../services/db';

/** A real capability area from the current model, so nav items resolve. */
const AREA_ID = 'provider-enrollment';
const DOMAIN_ID = 'provider-management';
const ASSESSMENT_ID = 'assessment-under-test';

/** First Business Architecture aspect, the default landing dimension. */
const ASPECT_ID = 'business-process-performance';
const ASPECT_NAME = 'Business Process Performance';

async function seedAssessment(): Promise<void> {
  await db.capabilityAssessments.add({
    id: ASSESSMENT_ID,
    capabilityDomainId: DOMAIN_ID,
    capabilityDomainName: 'Provider Management',
    capabilityAreaId: AREA_ID,
    capabilityAreaName: 'Provider Enrollment',
    status: 'in_progress',
    tags: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

function renderAssessment({ viewMode = false }: { viewMode?: boolean } = {}): void {
  const path = `/assessment/${ASSESSMENT_ID}${viewMode ? '?view=true' : ''}`;
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/assessment/:assessmentId" element={<Assessment />} />
      </Routes>
    </MemoryRouter>
  );
}

/** Wait for the page to finish loading the assessment from IndexedDB. */
async function waitForLoaded(): Promise<void> {
  await waitFor(() => {
    expect(screen.queryByText('Loading assessment...')).not.toBeInTheDocument();
  });
}

/**
 * Expand an aspect accordion and return its details region.
 *
 * The region is located by id, which MUI's Accordion puts on its own
 * `div.MuiAccordion-region` wrapper (matching the summary's `aria-controls`).
 * Do not query `getByRole('region', { name: '' })` here: that used to match
 * because `AccordionDetails` carried a duplicate, *unnamed* `role="region"`
 * with the same id. That duplicate was removed as part of the Wave 4
 * accessibility work, and the surviving region is correctly named.
 */
async function expandAspect(user: ReturnType<typeof userEvent.setup>): Promise<HTMLElement> {
  const header = await screen.findByRole('button', { name: new RegExp(ASPECT_NAME) });
  await user.click(header);
  const detailsId = `aspect-${ASPECT_ID}-content`;
  await waitFor(() => {
    expect(document.getElementById(detailsId)).not.toBeNull();
  });
  return document.getElementById(detailsId) as HTMLElement;
}

describe('Assessment page', () => {
  beforeEach(async () => {
    await clearDatabase();
    await seedAssessment();
  });

  afterEach(async () => {
    await clearDatabase();
    vi.restoreAllMocks();
  });

  describe('view mode', () => {
    /**
     * Note on what this does and does not cover. Activating a level in view mode
     * is blocked twice: the level radios are rendered `disabled`, and the page's
     * `save()` funnel refuses to write. This test pins the user-visible guarantee
     * (view mode does not mutate data) and would still pass if the funnel's guard
     * were removed. The funnel is defense in depth and is unreachable through the
     * UI by design — worth keeping, but not something this test isolates.
     *
     * `pointerEventsCheck: 0` is needed because MUI sets `pointer-events: none`
     * on disabled controls, so userEvent would otherwise refuse to click and the
     * test would pass without ever exercising the click path. Clicking through
     * proves the browser's own disabled-input behaviour is what stops the write,
     * not merely that the cursor cannot reach it.
     */
    it('does not write when a maturity level is activated', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      renderAssessment({ viewMode: true });
      await waitForLoaded();

      expect(screen.getByText(/View Mode/)).toBeInTheDocument();

      await expandAspect(user);

      const levelOption = screen
        .getAllByRole('radio')
        .find((el) => (el.getAttribute('aria-label') ?? '').startsWith('L3:'));
      expect(levelOption).toBeDefined();
      expect(levelOption).toBeDisabled();
      await user.click(levelOption as HTMLElement);

      // Give any in-flight write a chance to land before asserting absence
      await new Promise((resolve) => setTimeout(resolve, 100));
      await expect(db.orbitRatings.count()).resolves.toBe(0);
    });
  });

  describe('save failures', () => {
    it('reports an error instead of success when the write fails', async () => {
      const user = userEvent.setup();
      // Simulate a storage failure on the rating write path.
      vi.spyOn(db.orbitRatings, 'add').mockRejectedValue(new Error('QuotaExceededError'));
      vi.spyOn(console, 'error').mockImplementation(() => {});

      renderAssessment();
      await waitForLoaded();
      await expandAspect(user);

      const levelOption = screen
        .getAllByRole('radio')
        .find((el) => (el.getAttribute('aria-label') ?? '').startsWith('L3:'));
      await user.click(levelOption as HTMLElement);

      // The status region reports the failure, assertively
      const alert = await screen.findByRole('alert');
      expect(within(alert).getByText('Not saved')).toBeInTheDocument();

      // ...and the user gets something actionable, not just a chip
      expect(await screen.findByText(/Could not save your last change/)).toBeInTheDocument();

      // Crucially, "Saved" is never shown for a write that did not land
      expect(screen.queryByText('Saved')).not.toBeInTheDocument();
    });
  });

  describe('text before a level is chosen (OBS-6)', () => {
    it('persists notes typed with no maturity level selected', async () => {
      const user = userEvent.setup();
      renderAssessment();
      await waitForLoaded();
      const details = await expandAspect(user);

      const notes = within(details).getByLabelText('Notes');
      // Kept deliberately short. `user.type` re-renders the whole page per
      // keystroke, and the page mounts every aspect's level selector — including
      // collapsed ones — so each character is expensive. A longer string pushed
      // this past the 4s gate on roughly one full-suite run in three once the
      // selector moved to real radio inputs. See OBS-33.
      await user.type(notes, 'Pre-rating');

      await waitFor(
        async () => {
          const stored = await db.orbitRatings.toArray();
          expect(stored).toHaveLength(1);
          expect(stored[0]?.notes).toBe('Pre-rating');
        },
        { timeout: 4000 }
      );

      // Created unassessed, so overall progress must stay at 0%
      const stored = await db.orbitRatings.toArray();
      expect(stored[0]?.currentLevel).toBe(0);
      expect(stored[0]?.aspectId).toBe(ASPECT_ID);
    });
  });
});
