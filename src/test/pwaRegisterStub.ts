/**
 * Test stub for `virtual:pwa-register/react`.
 *
 * `vite-plugin-pwa` supplies that module as a Vite virtual import, and `vitest.config.ts`
 * deliberately does not load the plugin — doing so would run Workbox and emit a service worker on
 * every test run, for no benefit. Without a stub, importing anything that reaches
 * `PwaUpdatePrompt` fails at resolution with "Failed to resolve import", which is how this file
 * came to exist: adding the prompt to `Layout` broke `Layout.test.tsx` even though the test has
 * nothing to do with service workers.
 *
 * Aliased in `vitest.config.ts`.
 *
 * The default state is **no update pending**, which is the state every other test wants: the
 * prompt renders nothing, so it cannot interfere with assertions about page content. A test that
 * wants to exercise the prompt overrides the module with `vi.mock`, as `PwaUpdatePrompt.test.tsx`
 * does.
 */

import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

/** Mirrors the shape `useRegisterSW` returns, narrowed to what this app consumes. */
interface RegisterSWReturn {
  needRefresh: [boolean, Dispatch<SetStateAction<boolean>>];
  offlineReady: [boolean, Dispatch<SetStateAction<boolean>>];
  updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
}

/**
 * Stand-in for the real hook. Reports no waiting update and no offline-ready event.
 *
 * Takes and ignores an options argument so a caller passing `onRegisterError` type-checks against
 * the stub exactly as it does against the real module.
 */
export function useRegisterSW(_options?: Record<string, unknown>): RegisterSWReturn {
  const needRefresh = useState(false);
  const offlineReady = useState(false);
  return {
    needRefresh,
    offlineReady,
    updateServiceWorker: async (): Promise<void> => {
      /* no-op: nothing registers a worker under jsdom */
    },
  };
}
