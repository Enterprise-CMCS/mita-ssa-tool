import '@testing-library/jest-dom/vitest';
import * as matchers from 'vitest-axe/matchers';
import { expect } from 'vitest';
import { configure } from '@testing-library/react';

// Dexie's liveQuery can exceed the 1000ms default before its first emission when
// fake-indexeddb is under concurrent load, which surfaced as intermittent
// `waitFor` timeouts in the hook suites. Kept below `testTimeout` on purpose: if this
// matched or exceeded it, a failing `waitFor` would blow the test timeout and report
// "Test timed out" instead of the actual assertion difference. `testTimeout` is
// declared in `vitest.config.ts` and is 15000, not vitest's 5000ms default — an
// earlier version of this comment named 5000 and went stale when it was raised.
configure({ asyncUtilTimeout: 3000 });

// Extend vitest expect with axe matchers
expect.extend(matchers);

// Mock IndexedDB for Dexie tests
import 'fake-indexeddb/auto';

// Configure React act() environment for testing
// @ts-expect-error - globalThis typing
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Mock scrollTo for jsdom (not implemented in jsdom)
Element.prototype.scrollTo = function () {
  // No-op in test environment
};

// Suppress act() warnings from Dexie's useLiveQuery hook
// These warnings occur because useLiveQuery triggers async state updates
// that are expected behavior and don't affect test correctness
const originalError = console.error;
console.error = (...args: unknown[]) => {
  const message = args[0];
  if (typeof message === 'string' && message.includes('not wrapped in act')) {
    return;
  }
  originalError.apply(console, args);
};
