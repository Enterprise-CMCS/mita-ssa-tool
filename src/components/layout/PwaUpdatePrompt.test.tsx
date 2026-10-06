/**
 * Tests for the service worker update prompt.
 *
 * What these can and cannot establish: jsdom has no service worker, so nothing here proves a worker
 * registers, caches, or serves the app offline. That was verified against a real build in a real
 * browser by stopping the server — recorded in OBS-22. What is asserted here is the part that is
 * pure UI and easy to regress: that the notice appears only when an update is waiting, that
 * dismissing it does **not** apply the update, and the accessibility properties the component's
 * docblock claims.
 *
 * Note the axe runs cannot evaluate colour contrast — jsdom has no canvas, so axe skips that rule
 * silently. The prompt's contrast was measured in a real browser instead: white on the filled info
 * background is 7.4:1.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
// The axe matchers are extended globally in `src/test/setup.ts` via `vitest-axe/matchers`, so only
// the runner is imported here. Calling `expect.extend(toHaveNoViolations)` in addition throws.
import { axe } from 'vitest-axe';

/** Controls what the mocked `useRegisterSW` reports, per test. */
const state = {
  needRefresh: false,
  updateServiceWorker: vi.fn<(reloadPage?: boolean) => Promise<void>>(),
  setNeedRefresh: vi.fn<(value: boolean) => void>(),
};

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [state.needRefresh, state.setNeedRefresh],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: state.updateServiceWorker,
  }),
}));

// Imported after the mock so the component binds to it.
const { PwaUpdatePrompt } = await import('./PwaUpdatePrompt');

const UPDATE_TEXT = /new version of this tool is available/i;

describe('PwaUpdatePrompt', () => {
  beforeEach(() => {
    state.needRefresh = false;
    state.updateServiceWorker = vi.fn().mockResolvedValue(undefined);
    state.setNeedRefresh = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('the live region', () => {
    it('is mounted and empty when there is nothing to announce', () => {
      /*
       * Load-bearing: assistive technology announces a region whose *contents* change. Mounting an
       * already-populated region is the unreliable case, so the region must exist up front — which
       * is why this component returns a container rather than `null`. Proved failable by making it
       * return a fragment when idle.
       */
      render(<PwaUpdatePrompt />);

      const region = screen.getByRole('status');
      expect(region).toBeInTheDocument();
      expect(region).toHaveAttribute('aria-live', 'polite');
      expect(region).toHaveTextContent('');
    });

    it('carries the update text when an update is waiting', () => {
      state.needRefresh = true;
      render(<PwaUpdatePrompt />);
      expect(screen.getByRole('status')).toHaveTextContent(UPDATE_TEXT);
    });

    it('is the only live region, so nothing is announced twice', () => {
      /*
       * This assertion earned its keep. An earlier version queried only `role="status"` and passed
       * while the message really was announced twice: MUI's `Alert` defaults to `role="alert"`,
       * which is an assertive live region, so the text was announced assertively by the Alert and
       * politely by the surrounding region. Querying one of the two roles made the test vacuous on
       * precisely the claim it existed to protect.
       *
       * So count every live-region role and every explicit aria-live. Proved failable by dropping
       * `role="presentation"` from the Alert.
       */
      state.needRefresh = true;
      const { baseElement } = render(<PwaUpdatePrompt />);

      const liveRegions = baseElement.querySelectorAll(
        '[role="status"],[role="alert"],[role="log"],[aria-live]'
      );
      expect(liveRegions).toHaveLength(1);
      expect(liveRegions[0]).toHaveAttribute('aria-live', 'polite');
    });

    it('holds the message exactly once', () => {
      // An earlier design paired a hidden live region with a visible notice, so the sentence existed
      // twice in the accessibility tree. The notice now renders inside the region.
      state.needRefresh = true;
      render(<PwaUpdatePrompt />);
      expect(screen.getAllByText(UPDATE_TEXT)).toHaveLength(1);
    });

    it('is in normal flow rather than floating over the page', () => {
      /*
       * Measured reason, not a style preference. As a fixed-position toast at bottom: 16 it
       * overlapped both the CMS-required Paperwork Reduction Act notice and the footer — those are a
       * hard requirement (Decision 15), so covering one even transiently is not available. In flow,
       * `main` shrinks and nothing can be covered.
       */
      render(<PwaUpdatePrompt />);
      const region = screen.getByRole('status');
      expect(getComputedStyle(region).position).not.toBe('fixed');
      expect(getComputedStyle(region).position).not.toBe('absolute');
    });

    it('contributes no height when there is nothing to show', () => {
      // It sits in the layout column on every page, so an idle notice must not push content.
      const { container } = render(<PwaUpdatePrompt />);
      expect(container.firstElementChild?.childElementCount).toBe(0);
    });
  });

  describe('the update prompt', () => {
    it('shows no visible notice when no update is waiting', () => {
      render(<PwaUpdatePrompt />);
      expect(screen.queryByRole('button', { name: /reload/i })).not.toBeInTheDocument();
      expect(screen.queryByText(UPDATE_TEXT)).not.toBeInTheDocument();
    });

    it('offers exactly two actions: reload and dismiss', () => {
      // Pins a real defect. MUI's Alert drops its built-in close button when `action` is supplied,
      // so the first version of this component rendered one button and had an unreachable dismiss
      // handler.
      state.needRefresh = true;
      render(<PwaUpdatePrompt />);

      expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Close update notice' })).toBeInTheDocument();
      expect(screen.getAllByRole('button')).toHaveLength(2);
    });

    it('tells the user their saved work is unaffected', () => {
      // A reload prompt with no reassurance invites a state to avoid reloading indefinitely, which
      // is the outcome prompt-on-update exists to prevent.
      state.needRefresh = true;
      render(<PwaUpdatePrompt />);
      expect(screen.getByRole('status')).toHaveTextContent(/saved work is not affected/i);
    });

    it('does not move focus when it appears', () => {
      // The specific hazard: someone typing notes on the assessment page. Focus must stay put.
      state.needRefresh = true;
      render(
        <>
          <input aria-label="notes" />
          <PwaUpdatePrompt />
        </>
      );

      const input = screen.getByRole('textbox', { name: 'notes' });
      input.focus();
      expect(document.activeElement).toBe(input);

      expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
      expect(document.activeElement).toBe(input);
    });

    it('applies the update when Reload is pressed', async () => {
      state.needRefresh = true;
      const user = userEvent.setup();
      render(<PwaUpdatePrompt />);

      await user.click(screen.getByRole('button', { name: 'Reload' }));

      // Asserts only that the update was requested. Deliberately does NOT assert the argument:
      // `vite-plugin-pwa` documents `reloadPage` as unused since 0.13.2, and an earlier version of
      // this test asserted `toHaveBeenCalledWith(true)` beside a comment claiming the argument is
      // what causes the reload. It is not — the plugin's `controlling` listener is.
      expect(state.updateServiceWorker).toHaveBeenCalledTimes(1);
    });

    it('shows progress on the reload button so the press is acknowledged', async () => {
      state.needRefresh = true;
      const user = userEvent.setup();
      render(<PwaUpdatePrompt />);

      await user.click(screen.getByRole('button', { name: 'Reload' }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /reloading/i })).toBeDisabled();
      });
    });

    it('dismisses without applying the update', async () => {
      // Dismissing must not silently upgrade. A waiting worker stays waiting until `skipWaiting` or
      // until every tab closes, so this is a genuine deferral rather than a delayed apply. Proved
      // failable by making the dismiss handler also call updateServiceWorker.
      state.needRefresh = true;
      const user = userEvent.setup();
      render(<PwaUpdatePrompt />);

      await user.click(screen.getByRole('button', { name: 'Close update notice' }));

      expect(state.setNeedRefresh).toHaveBeenCalledWith(false);
      expect(state.updateServiceWorker).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('has no violations while idle', async () => {
      const { container } = render(<PwaUpdatePrompt />);
      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no violations showing an update', async () => {
      // The state that matters: the idle component renders an empty container, so an axe run against
      // that alone would be close to vacuous.
      state.needRefresh = true;
      const { container } = render(<PwaUpdatePrompt />);
      expect(await axe(container)).toHaveNoViolations();
    });
  });
});
