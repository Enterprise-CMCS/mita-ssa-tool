import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';
import process from 'node:process';

// Read version from package.json for injection into app
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Draft-notice copy, shared with the app and the workbook generator. This module is deliberately
// free of `import.meta` so Node-side tooling — including this config — can import it.
import { DRAFT_NOTICE_LABEL, DRAFT_TITLE_MARKER } from './src/constants/draftNotice';
// Same single source the generator's output path and the in-app download URL are built from.
import { WORKBOOK_FILENAME } from './src/constants/workbook';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

/**
 * Whether the predecisional pilot notices are on.
 *
 * Read from `process.env` rather than `import.meta.env`, because this file runs in Node. Mirrors
 * `IS_DRAFT` in `src/constants/index.ts` and `isDraft()` in `scripts/xlsx/env.ts`: the default is
 * ON, and only the literal string 'false' turns it off, so a typo or a forgotten variable fails
 * toward showing the notice.
 */
const IS_DRAFT = process.env.VITE_DRAFT_MODE !== 'false';

/** Plain product name, without any draft marking. */
const APP_NAME = 'MITA 4.0 State Self-Assessment Tool';

/** One-line description, used for the manifest and the static meta description. */
const APP_DESCRIPTION =
  'Assess your Medicaid Enterprise maturity using the ORBIT framework. ' +
  'Runs entirely in your browser — no accounts, no servers, and your data never leaves your device.';

/**
 * The `<title>` and `<meta name="description">` that ship in `index.html`.
 *
 * These are what a crawler and a link unfurler read, which is why they are marked here rather than
 * only at runtime. `Layout.tsx` appends the same marker to `document.title` after hydration, but
 * that never reaches the preview card Teams or Slack renders when someone pastes the pilot URL —
 * those fetch the HTML and never execute the bundle.
 *
 * Done as a build-time transform rather than by hardcoding "(Draft)" into `index.html`, so that
 * `VITE_DRAFT_MODE=false` removes it in the same single change as everything else (Decision 13).
 * Hardcoded marking would survive go-live, which is the specific failure this avoids.
 */
const HTML_TITLE = IS_DRAFT ? `${APP_NAME} (${DRAFT_TITLE_MARKER})` : APP_NAME;
const HTML_DESCRIPTION = IS_DRAFT ? `${DRAFT_NOTICE_LABEL}. ${APP_DESCRIPTION}` : APP_DESCRIPTION;

/**
 * Connect middleware that 404s the workbook URL when the file is not on disk.
 *
 * Shared by the dev and preview servers, which look in different directories — `public/` and
 * `dist/` respectively — hence the parameter.
 *
 * @param serveDir - Directory the server serves static files from.
 */
function workbookGuard(serveDir: string) {
  return (
    req: { url?: string | undefined },
    res: {
      statusCode: number;
      setHeader: (name: string, value: string) => void;
      end: (body: string) => void;
    },
    next: () => void
  ): void => {
    const path = (req.url ?? '').split('?')[0] ?? '';
    if (!path.endsWith(`/${WORKBOOK_FILENAME}`)) {
      next();
      return;
    }
    if (existsSync(join(serveDir, WORKBOOK_FILENAME))) {
      next();
      return;
    }
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end(
      `${WORKBOOK_FILENAME} has not been generated.\n\n` +
        'Run `npm run generate:workbook`, or start the server with `npm run dev` rather than a ' +
        'bare `vite` — generation is wired to the `predev` script.\n\n' +
        'This is a 404 on purpose. Without it Vite would answer with index.html and HTTP 200, and ' +
        'the download link would silently save that HTML to disk as an .xlsx file.\n'
    );
  };
}

export default defineConfig({
  plugins: [
    react(),

    /**
     * Returns a real 404 for the workbook when it has not been generated.
     *
     * Without this, requesting the workbook while it is absent gets **HTTP 200 with
     * `Content-Type: text/html` and the contents of `index.html`** — Vite's SPA fallback catching a
     * path it should not. Measured: 1,922 bytes beginning `<!DOCTYPE html>`. Because the in-app
     * links carry a `download` attribute, the browser then writes that HTML to disk *as*
     * `mita-4.0-self-assessment-workbook.xlsx`, with no error, no console warning and nothing on
     * screen. The person holding it sees Excel report a corrupt file and has no reason to suspect
     * the tool.
     *
     * This is the same failure `workbox.navigateFallbackDenylist` guards against for the service
     * worker — an `.xlsx` that is silently HTML. It was guarded there and left open here, which is
     * the gap this closes.
     *
     * Dev and preview only. In a deployed build the artifact is always present: `prebuild`
     * generates it and `verify:workbook-artifact` fails the pipeline if it did not reach `dist/`.
     * Reachable in development via a bare `vite` (which skips `predev`), or by deleting the file
     * while a server is already running.
     */
    {
      name: 'mita-workbook-missing-404',
      configureServer(server) {
        server.middlewares.use(workbookGuard(server.config.publicDir));
      },
      configurePreviewServer(server) {
        server.middlewares.use(workbookGuard(server.config.build.outDir));
      },
    },

    /**
     * Marks the static HTML as predecisional (Decision 13).
     *
     * `transformIndexHtml` runs for both `dev` and `build`, so what a crawler sees in production
     * is what a developer sees locally.
     */
    {
      name: 'mita-draft-html-metadata',
      transformIndexHtml: {
        order: 'pre' as const,
        handler(html: string): string {
          /*
           * Both replacements throw if they match nothing.
           *
           * `String.replace` on a non-matching pattern is a silent no-op, so reordering the
           * attributes on the description meta tag — or deleting either tag — would ship an
           * unmarked title and description to a predecisional pilot site, with a green build and
           * no test to catch it. `format:check` does not even cover `index.html`; its glob is
           * `{src,scripts}/**`. Failing the build is the only thing standing here.
           */
          const replaceOrThrow = (
            source: string,
            pattern: RegExp,
            replacement: string,
            what: string
          ): string => {
            if (!pattern.test(source)) {
              throw new Error(
                `[mita-draft-html-metadata] Could not find the ${what} in index.html ` +
                  `(pattern: ${String(pattern)}). The predecisional marker would have been ` +
                  `silently omitted, so the build is failing instead. Fix index.html or this ` +
                  `plugin — do not hardcode the marker, which would survive go-live.`
              );
            }
            return source.replace(pattern, replacement);
          };

          const withTitle = replaceOrThrow(
            html,
            /<title>[\s\S]*?<\/title>/,
            `<title>${HTML_TITLE}</title>`,
            '<title> tag'
          );
          return replaceOrThrow(
            withTitle,
            /(<meta\s+name="description"\s+content=")[\s\S]*?(")/,
            `$1${HTML_DESCRIPTION}$2`,
            'description <meta> tag'
          );
        },
      },
    },

    /**
     * Service worker and web app manifest (P4 / OBS-22).
     *
     * The app advertised "Works Offline — full functionality after initial load" while having no
     * service worker at all, so a reload without network failed. States are being recruited on
     * that premise, so the claim was made true rather than removed.
     *
     * **`registerType: 'prompt'`, not `autoUpdate`.** An auto-updating service worker can swap the
     * app out from under someone mid-assessment, and stakeholders are actively reviewing this
     * build. Prompting means a pilot user is never silently served a stale build *and* never has
     * one replaced without being told. `PwaUpdatePrompt` renders the prompt.
     */
    VitePWA({
      registerType: 'prompt',
      // `injectRegister: null` because registration is explicit in `PwaUpdatePrompt` via
      // `useRegisterSW`. Letting the plugin also inject a registration script would register the
      // worker twice.
      injectRegister: null,
      workbox: {
        /**
         * Precache list, spelled out because the default is much narrower than it looks.
         *
         * Workbox's own schema default is `['**\/*.{js,wasm,css,html}']` (verified in
         * `workbox-build/build/schema/GenerateSWOptions.json`, not assumed — an earlier version of
         * this comment claimed `js,css,html,ico,png,svg`, which is a figure from a plugin README
         * and is wrong). So without this line the precache would omit **the workbook, every icon,
         * the favicon and the manifest** — not just the workbook, which is the only one OBS-22
         * called out.
         *
         * `xlsx` is the one that matters most: the workbook is the fallback for states that cannot
         * use a browser tool, and an offline fallback that is itself unavailable offline is no
         * fallback.
         */
        globPatterns: ['**/*.{js,wasm,css,html,ico,png,svg,webmanifest,xlsx}'],
        /**
         * Ceiling for a single precached file. The vendor chunk is ~1.4 MiB.
         *
         * **This raises an existing tripwire rather than creating one**, which is the opposite of
         * what an earlier version of this comment said. `vite-plugin-pwa` sets
         * `throwMaximumFileSizeToCacheInBytes: !showMaximumFileSizeToCacheInBytesWarning`, and
         * that warning flag defaults to `false` — so an oversized asset already **fails the
         * build** at any limit, including Workbox's 2 MiB default. Workbox itself only warns; the
         * throw is the plugin's.
         *
         * So the reason for 3 MiB is headroom, not safety: at the 2 MiB default a moderate
         * dependency bump would break the build outright. If this is ever raised again, that is
         * the signal to code-split instead (OBS-20).
         */
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        // Single-page app: any navigation that is not a precached file resolves to the shell.
        navigateFallback: 'index.html',
        // Never hand index.html to a request for the workbook. Precache routing already wins for
        // it, but a download-attribute click is a navigation request in some browsers, and the
        // failure mode — an .xlsx that is actually HTML — is silent and confusing.
        navigateFallbackDenylist: [/\.xlsx$/],
        cleanupOutdatedCaches: true,
      },
      manifest: {
        name: IS_DRAFT ? `${APP_NAME} (${DRAFT_TITLE_MARKER})` : APP_NAME,
        // Installed-icon captions truncate around 12 characters, so this stays short. It carries
        // no draft marker: there is no room, and the app itself shows the banner on every page.
        short_name: 'MITA SS-A',
        description: HTML_DESCRIPTION,
        // Relative, so both resolve against the manifest's own URL. Stated explicitly rather than
        // relied upon: `vite-plugin-pwa` already defaults both to the resolved `base`, so this is
        // belt-and-braces and not, as an earlier comment claimed, a way to avoid the config
        // needing to know the base path. Both forms were verified to work at the Pages subpath.
        start_url: '.',
        scope: '.',
        display: 'standalone',
        theme_color: '#0071bc',
        background_color: '#ffffff',
        // `lang` and `dir` so an installed window is announced correctly; `index.html` sets
        // lang="en" but the manifest is read independently of it.
        lang: 'en-US',
        dir: 'ltr',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: 'pwa-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      // Leave the dev server alone. A service worker in dev caches modules and produces
      // confusing stale-reload behaviour during development, and nothing here needs testing
      // against the dev server — `npm run preview` serves a real build with a real worker.
      devOptions: { enabled: false },

      // ---------------------------------------------------------------------------------------
      // KILL SWITCH — read this before assuming a bad deploy can be fixed by deploying again.
      //
      // A service worker is the one thing here that outlives a deploy. If a build **without**
      // `sw.js` ever reaches the site, browsers that already installed a worker do not fall back
      // to the network: the update check 404s, the spec aborts the update, and the installed
      // worker keeps serving its cached build **indefinitely, with no update prompt**. Reviewers
      // would be pinned to a stale build with no way to know.
      //
      // That is not hypothetical here. `deploy.yml` auto-triggers on push to `main`, and
      // `origin/main` sits far behind this branch, so an accidental push to `main` deploys a
      // build predating the PWA entirely. `cleanupOutdatedCaches` does not help — it only prunes
      // when a *new* worker activates, and in this scenario none ever does.
      //
      // The recovery is to deploy a worker that removes itself. Set:
      //
      //   selfDestroying: true,
      //
      // and deploy. That emits an `sw.js` which unregisters itself and deletes its caches, so
      // every client returns to the network on its next visit. Leave it set for long enough for
      // clients to check in (they check on navigation), then remove it and deploy normally.
      //
      // Left `false` deliberately — enabling it ships a self-destroying worker, which is the
      // thing we do not want. Documented here so the fix is known before it is needed.
      selfDestroying: false,
      // ---------------------------------------------------------------------------------------
    }),
  ],
  define: {
    // Inject app version at build time
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  // Base path for deployment - defaults to '/' for local dev
  // Set VITE_BASE_PATH env var for GitHub Pages (e.g., '/repo-name/')
  base: process.env.VITE_BASE_PATH || '/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    /*
     * Chunk-size warning threshold (Rollup's default is 500 kB).
     *
     * Note this does **not** silence anything: the vendor chunk is ~1.4 MB, so the warning fires on
     * every build including deploy. Left as-is deliberately rather than raised past the real size,
     * because a threshold set above the thing it measures is not a threshold. The warning is the
     * standing reminder that OBS-20 (code-splitting) is open.
     *
     * The chunk is tolerable meanwhile for a reason that is now actually true: the service worker
     * precaches it, so a pilot user downloads it once rather than per visit.
     */
    chunkSizeWarningLimit: 520,
    rollupOptions: {
      output: {
        manualChunks(id): string | undefined {
          // MUI is the largest dependency - isolate it for better caching
          // Include Emotion (MUI's styling engine) to keep them together
          if (id.includes('node_modules/@mui') || id.includes('node_modules/@emotion')) {
            return 'vendor-mui';
          }

          // Everything else from node_modules goes into vendor
          // Keeping React with its dependents avoids circular chunk warnings
          if (id.includes('node_modules')) {
            return 'vendor';
          }

          return undefined;
        },
      },
    },
  },
});
