/**
 * Service worker registration and the update prompt (P4 / OBS-22).
 *
 * ## Why prompt rather than auto-update
 *
 * `vite.config.ts` sets `registerType: 'prompt'`. An auto-updating worker activates a new build as
 * soon as it downloads, which during a pilot means a state's assessment page can be replaced
 * mid-edit by a build they did not ask for. Prompting keeps two promises at once: a pilot user is
 * never silently left on a stale build, and never has a running one swapped out.
 *
 * ## Dismissing defers indefinitely — say so
 *
 * A waiting worker does **not** take over on the next page load. The spec keeps it in `waiting` for
 * as long as any client is controlled, so activation needs either `skipWaiting` (which only the
 * Reload button sends) or every tab of the app being closed. Measured: with a worker waiting, a full
 * navigation to another route left `registration.waiting` non-null and re-showed the prompt.
 *
 * This matters because an earlier version of this file claimed the opposite — "the next full page
 * load picks the new worker up anyway, so dismissing costs nothing." That is inverted, and it is the
 * kind of comment that would later justify quietly removing the prompt. Dismissal is a real
 * deferral, which is why it is offered as a choice rather than framed as "later".
 *
 * ## `offlineReady` is deliberately not used
 *
 * `useRegisterSW` also returns an `offlineReady` flag, and a "ready to work offline" confirmation was
 * built on it and then removed, because **it never fired**. Measured three times from a fully reset
 * state (no registration, no caches): the worker reached `activated` before the hook's
 * `installed` listener observed the transition, so `onOfflineReady` was never invoked and the notice
 * was unreachable. Rather than ship a dead code path that looks like a feature, the Guide's copy was
 * written to promise only what is observable. Do not re-add it without first confirming the callback
 * fires — see OBS-22.
 *
 * ## In normal flow, not floating over the page
 *
 * Rendered as a flex sibling inside `Layout`'s column, immediately **above** the bottom
 * predecisional notice — not as a fixed-position toast. Measured reason: as a toast at `bottom: 16`
 * it overlapped both the CMS-required Paperwork Reduction Act notice (which occupied 629-667px of a
 * 720px viewport) and the footer. Those notices are a hard requirement (Decision 15), so covering
 * one even transiently is not available, and a hardcoded bottom offset would be fragile because the
 * footer is suppressed on the assessment page and the notice rewraps with viewport width.
 *
 * In flow it cannot overlap anything: `main` shrinks to accommodate it. This is the same reasoning
 * `Layout` already records for the bottom banner, so the two behave consistently.
 *
 * ## Announcement: one persistent live region, which is also the visible notice
 *
 * Assistive technology reliably announces a live region whose **contents change**; mounting an
 * already-populated one is inconsistent across implementations. So the region is a container that is
 * **always mounted** and normally empty — contributing no height in that state — and the notice
 * renders inside it.
 *
 * Three earlier attempts were each worse, and the reasons are worth keeping because each is the
 * obvious thing to reach for:
 *
 * 1. `role="status"` on an MUI `Snackbar` — the Snackbar unmounts when closed, so the region was
 *    mounted already populated: the unreliable case.
 * 2. A separate hidden live region alongside a `Snackbar` — reliable, but the sentence then existed
 *    twice in the accessibility tree, announced both politely by the region and **assertively** by
 *    the Alert, because MUI's `Alert` defaults to `role="alert"`.
 * 3. The same, with the Alert's text `aria-hidden` — removed the duplication, but left a bare
 *    "Reload" button with no context, and pulled the visible text out of every live region, which
 *    axe's `region` rule then flagged as content outside a landmark. (Live regions are exempt from
 *    that rule; ordinary content is not. Wave 4 deliberately stopped suppressing `region`, so
 *    silencing it was not available.)
 *
 * The current shape has none of those problems: one live region, text present exactly once, buttons
 * adjacent to the sentence explaining them, and the container is itself a live region so `region` is
 * satisfied. The `Alert` still gets `role="presentation"` so it does not nest a second one.
 *
 * Deliberately `polite`, not `assertive`: it waits for a pause rather than cutting across whatever
 * the user is doing.
 *
 * ## Why this does not steal focus
 *
 * Someone rating maturity levels is typing into text fields with debounced saves; moving focus to a
 * notification would interrupt that and lose their place on a long assessment. So: no `autoFocus`,
 * no focus trap, and no `tabIndex` on the container. The Reload and Close controls are real buttons
 * in the tab order, reachable by tabbing rather than thrown at the user.
 *
 * ## Data safety
 *
 * Reloading is safe by construction: assessment data lives in IndexedDB, and text fields auto-save
 * on a 500ms debounce. The one hazard is a reload inside that debounce window, which is why the copy
 * says "Your saved work is not affected" rather than promising nothing at all is lost.
 */

import { JSX, useCallback, useState } from 'react';
import { Alert, Box, Button, IconButton, Stack } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useRegisterSW } from 'virtual:pwa-register/react';

const UPDATE_MESSAGE = 'A new version of this tool is available. Your saved work is not affected.';

export function PwaUpdatePrompt(): JSX.Element {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error: unknown) {
      // Not fatal — the app works, it just will not work offline. Logged rather than surfaced,
      // because there is no action a pilot user could take about it. `README.md` records that
      // behaviour for environments where policy blocks service workers.
      console.error('Service worker registration failed:', error);
    },
  });

  const [reloading, setReloading] = useState(false);

  const handleReload = useCallback((): void => {
    setReloading(true);
    /*
     * The argument is vestigial: `vite-plugin-pwa`'s own types say "From version 0.13.2+ this param
     * is not used anymore." The reload comes from the `controlling` listener the plugin installs,
     * once the waiting worker takes over. Passed to match the documented signature, but do not write
     * a test that treats it as load-bearing — an earlier one did, and pinned a false belief about
     * what actually causes the reload.
     */
    void updateServiceWorker(true);
  }, [updateServiceWorker]);

  const handleDismiss = useCallback((): void => {
    setNeedRefresh(false);
  }, [setNeedRefresh]);

  return (
    <Box
      // Always mounted and normally empty, so the live region exists before any text arrives. With
      // no children it contributes no height, so it costs nothing in the idle case.
      role="status"
      aria-live="polite"
      sx={{
        flexShrink: 0,
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      {needRefresh && (
        <Alert
          severity="info"
          variant="filled"
          // MUI defaults to role="alert", an assertive live region. Nested inside the polite region
          // above, that announces the same sentence twice, once cutting across the user.
          role="presentation"
          sx={{ m: 1, maxWidth: 520, alignItems: 'center' }}
          action={
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Button color="inherit" size="small" onClick={handleReload} disabled={reloading}>
                {reloading ? 'Reloading…' : 'Reload'}
              </Button>
              <IconButton
                color="inherit"
                size="small"
                onClick={handleDismiss}
                aria-label="Close update notice"
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>
          }
        >
          {UPDATE_MESSAGE}
        </Alert>
      )}
    </Box>
  );
}
