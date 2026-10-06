import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// Read version from package.json for test environment
import { readFileSync } from 'node:fs';
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  plugins: [react()],
  define: {
    // Inject app version for tests (matches vite.config.ts)
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    /**
     * `scripts/` is included so the XLSX workbook generator's tests run in the
     * normal `npm test` gate. The generator produces a CMS deliverable whose 508
     * structure is asserted only by those tests — leaving them out of the default
     * run would mean the assertions existed but nothing enforced them.
     */
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.{ts,tsx}'],
    /**
     * Vitest's default is 5000ms, which is not enough headroom here. The
     * container tests in `pages/Assessment.test.tsx` drive React + a debounced
     * save + a Dexie write through fake-indexeddb, and one of them deliberately
     * uses a 4000ms `waitFor` to observe a persisted row. A 4000ms wait inside a
     * 5000ms budget leaves 1000ms for everything else, so under CPU contention
     * (a dev server and a browser running alongside) those tests intermittently
     * reported "Test timed out in 5000ms" rather than a real failure.
     *
     * Raising the ceiling keeps the ordering that `src/test/setup.ts` relies on:
     * `asyncUtilTimeout` (3000) stays well below this, so a failing `waitFor`
     * still surfaces as an assertion difference instead of a timeout.
     */
    testTimeout: 15000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.test.{ts,tsx}',
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/App.tsx',
        'src/theme/**',
        'src/**/index.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      /**
       * `virtual:pwa-register/react` is a virtual module created by `vite-plugin-pwa`, which this
       * config deliberately does not load — running Workbox and emitting a service worker on every
       * test run buys nothing. Without this alias, any test that reaches `PwaUpdatePrompt` fails at
       * import resolution rather than on an assertion.
       *
       * The stub reports no pending update, so the prompt renders nothing by default and cannot
       * interfere with other tests. See `src/test/pwaRegisterStub.ts`.
       */
      'virtual:pwa-register/react': fileURLToPath(
        new URL('./src/test/pwaRegisterStub.ts', import.meta.url)
      ),
    },
  },
});
