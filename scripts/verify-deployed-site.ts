/**
 * Fetches a deployed URL and checks that it is serving the built application.
 *
 * ```
 * node scripts/verify-deployed-site.ts https://org.github.io/mita-ssa-tool/
 * # or: SITE_URL=https://... node scripts/verify-deployed-site.ts
 * ```
 *
 * ## What this is, and what it is not
 *
 * This is a **content** check: it confirms the HTML at a URL carries the markers a Vite build
 * emits. It is deliberately paired with, and secondary to, a **configuration** check
 * (`verify:pages-config`) that reads the GitHub Pages `build_type`. The two catch different
 * failures and neither replaces the other:
 *
 *   - The config check catches the wrong **source setting** (Pages set to "Deploy from a branch"
 *     instead of "GitHub Actions"), which is what caused the original outage. It needs no live
 *     site and is immune to caching and marker drift.
 *   - This content check catches a **publish that produced the wrong bytes** — a build that
 *     shipped without its bundle, or a raw-source render reaching the live URL — which the config
 *     field cannot see.
 *
 * ## The deployment model this fits into (corrected)
 *
 * GitHub Pages has two "Source" modes, set in repository Settings, outside version control:
 *
 *   - **GitHub Actions** — only `deploy.yml` (the Vite build) publishes. The correct mode.
 *   - **Deploy from a branch** (`build_type: "legacy"`) — GitHub's built-in Jekyll pipeline runs
 *     *in addition to* `deploy.yml`. Both target the same site; whichever **publishes last wins**.
 *
 * The earlier version of this file claimed "Deploy from a branch" *bypasses* `deploy.yml`. That is
 * wrong, and checking the live repos disproved it: a repo in legacy mode still runs the Vite
 * workflow and serves its artifact. The real hazard is a race — on an event that triggers the
 * Jekyll build but no Vite deploy, a raw render of the repository can become what is live. So a
 * check that reads the site at one instant proves "a built app is here now", not "this stays the
 * published state", which is exactly why the config check is the primary gate and this is backup.
 *
 * It makes one bounded HTTPS request (with a couple of retries), reads no project files, and sends
 * no data.
 */

import process from 'node:process';
import { pathToFileURL } from 'node:url';

import { annotateError, appendStepSummary } from './ci-annotations.ts';

/** A single failed expectation about the fetched page. */
export interface Problem {
  readonly check: string;
  readonly detail: string;
}

/** How long to wait for one fetch attempt before aborting it. Pages can be slow cold. */
const FETCH_TIMEOUT_MS = 30_000;
/** Total fetch attempts before giving up, so one transient 5xx does not raise a false alarm. */
const FETCH_ATTEMPTS = 3;
/** Backoff between attempts. */
const RETRY_DELAY_MS = 3_000;
/**
 * Cap the body read, so a URL serving something huge is rejected without buffering it whole.
 *
 * Enforced by reading the response as a byte stream and aborting once the running total crosses the
 * cap, rather than by measuring `response.text()` after it has already pulled everything into
 * memory — the oversized body is reachable via a redirect (`redirect: 'follow'`) or, in the
 * monitor, a dispatch URL, so "measure then reject" would defeat the point.
 */
const MAX_BODY_BYTES = 5 * 1024 * 1024;

/**
 * A substring present only when a Vite build produced the page.
 *
 * Vite rewrites `index.html` to load a content-hashed entry bundle from `assets/`. That path
 * cannot appear in a render of the source tree, whose `index.html` references `/src/main.tsx` and
 * carries unreplaced `%BASE_URL%` placeholders instead. Matching on the path prefix, not the hash,
 * keeps it stable across builds.
 *
 * `modulepreload` was deliberately NOT included, though it is present in the current output: it
 * exists only because `vite.config.ts` splits vendor code via `manualChunks`, so a bundling change
 * (collapsing that split, or `build.modulePreload: false`) could remove it from a perfectly good
 * site. The `/assets/index-` presence plus the `%BASE_URL%` absence below already separate a built
 * page from a source render, and that is exactly the pair the pre-deploy grep in `deploy.yml`
 * asserts — so the live probe and the pre-deploy gate check the same contract rather than drifting.
 */
const BUILT_APP_MARKERS: readonly string[] = ['/assets/index-'];

/**
 * A substring that proves an unbuilt source render — the raw-`index.html` failure mode.
 *
 * `%BASE_URL%` is Vite's placeholder, replaced at build time; seeing it live means the source
 * `index.html` was served verbatim. A hit here is **conclusive**. Its *absence* proves nothing (a
 * 404 page or proxy error contains none of it either), which is why the build-marker checks above
 * are the real gate rather than this one.
 */
const SOURCE_RENDER_MARKERS: readonly string[] = ['%BASE_URL%'];

/** Diagnostic facts about the fetched response, included in failure output. */
export interface PageFacts {
  readonly status: number;
  readonly contentType: string;
  /** Decoded body size in bytes (from the streamed read), not UTF-16 code units. */
  readonly bodyLength: number;
}

/**
 * Resolve the target URL from argv[2] or SITE_URL.
 *
 * An empty or whitespace argument is treated as *absent* so `SITE_URL` still applies. This is
 * load-bearing for the standing monitor (`verify-deployment.yml`), which passes no argument and
 * sets `SITE_URL` — without the empty-is-absent rule an empty `argv[2]` would shadow it. If
 * neither yields a URL, that is the caller's error and throws.
 */
export function resolveUrl(argv2: string | undefined, siteUrl: string | undefined): string {
  const fromArg = (argv2 ?? '').trim();
  const fromEnv = (siteUrl ?? '').trim();
  const url = fromArg !== '' ? fromArg : fromEnv;
  if (url === '') {
    throw new Error(
      'No URL given. Pass it as the first argument or set SITE_URL, e.g.\n' +
        '  node scripts/verify-deployed-site.ts https://org.github.io/mita-ssa-tool/'
    );
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Not a valid URL: ${url}`);
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error(`URL must be http(s): ${url}`);
  }
  return parsed.toString();
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** One fetch attempt, bounded by a timeout that also covers the streamed body read. */
async function fetchOnce(url: string): Promise<{ body: string; facts: PageFacts }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'mita-ssa-tool-deploy-verifier' },
    });
    const contentType = response.headers.get('content-type') ?? '';
    if (!response.ok) {
      throw new Error(`HTTP ${String(response.status)} ${response.statusText}`);
    }
    const { body, bytes } = await readBounded(response, controller);
    return {
      body,
      facts: { status: response.status, contentType, bodyLength: bytes },
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Read a response body as a stream, aborting once the running byte total exceeds the cap.
 *
 * Decodes only what was read, so an oversized or endless response never gets fully buffered. Falls
 * back to a plain `text()` read if the body is not a readable stream (older runtimes), where the
 * cap is then a post-hoc check — acceptable because that path is not the attack surface.
 */
async function readBounded(
  response: Response,
  controller: AbortController
): Promise<{ body: string; bytes: number }> {
  if (!response.body) {
    const text = await response.text();
    const bytes = Buffer.byteLength(text);
    if (bytes > MAX_BODY_BYTES) {
      throw new Error(`response body exceeds the ${String(MAX_BODY_BYTES)}-byte cap`);
    }
    return { body: text, bytes };
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      controller.abort(); // stop the transfer; we are not going to read a body this large
      throw new Error(`response body exceeds the ${String(MAX_BODY_BYTES)}-byte cap`);
    }
    chunks.push(value);
  }
  return { body: Buffer.concat(chunks).toString('utf8'), bytes: total };
}

/** Fetch with retries, so a single transient failure does not raise a false alarm. */
export async function fetchBody(url: string): Promise<{ body: string; facts: PageFacts }> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= FETCH_ATTEMPTS; attempt += 1) {
    try {
      return await fetchOnce(url);
    } catch (error: unknown) {
      lastError = error;
      if (attempt < FETCH_ATTEMPTS) {
        await sleep(RETRY_DELAY_MS);
      }
    }
  }
  throw new Error(
    `could not fetch ${url} after ${String(FETCH_ATTEMPTS)} attempts: ` +
      (lastError instanceof Error ? lastError.message : String(lastError))
  );
}

/**
 * Check a fetched page body against the markers.
 *
 * Pure and exported so it is unit-testable against real documents (the repo-root `index.html`,
 * which must fail, and a built `index.html`, which must pass) rather than only against a live URL.
 *
 * @returns Every failed expectation. Empty means the page is the built app.
 */
export function inspect(body: string, facts?: PageFacts): Problem[] {
  const problems: Problem[] = [];
  const context = facts
    ? ` (HTTP ${String(facts.status)}, ${facts.contentType || 'no content-type'}, ` +
      `${String(facts.bodyLength)} bytes)`
    : '';

  for (const marker of BUILT_APP_MARKERS) {
    if (!body.includes(marker)) {
      problems.push({
        check: `built-app marker absent: ${marker}`,
        detail:
          `The page does not contain "${marker}", which a Vite build emits${context}. The live ` +
          'content is not the built app. One likely cause is GitHub Pages Source set to "Deploy ' +
          'from a branch", serving a source render instead of the Vite build; another is a build ' +
          'that published without its bundle. Check repo Settings -> Pages -> Source ("GitHub ' +
          'Actions" is correct) and the latest deploy run.',
      });
    }
  }

  for (const marker of SOURCE_RENDER_MARKERS) {
    if (body.includes(marker)) {
      problems.push({
        check: `source-render marker present: ${marker}`,
        detail:
          `The page contains "${marker}", an unbuilt Vite placeholder${context}, so the raw ` +
          'source index.html is being served — a conclusive sign the build did not run for what ' +
          'is live. Set repo Settings -> Pages -> Source to "GitHub Actions".',
      });
    }
  }

  return problems;
}

async function main(): Promise<void> {
  let url: string;
  try {
    url = resolveUrl(process.argv[2], process.env.SITE_URL);
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    return;
  }

  let result: { body: string; facts: PageFacts };
  try {
    result = await fetchBody(url);
  } catch (error: unknown) {
    const message = `Could not fetch the deployed site ${url}: ${
      error instanceof Error ? error.message : String(error)
    }`;
    console.error(message);
    annotateError(message);
    process.exitCode = 1;
    return;
  }

  const problems = inspect(result.body, result.facts);
  if (problems.length > 0) {
    console.error(`Deployed site FAILED ${String(problems.length)} check(s): ${url}\n`);
    for (const { check, detail } of problems) {
      console.error(`  \u2717 ${check}`);
      console.error(`    ${detail}\n`);
    }
    annotateError(
      `Deployed site at ${url} is not serving a Vite-built page. ` + `${problems[0]?.detail ?? ''}`
    );
    appendStepSummary(
      `### Deployed-site check failed\n\n` +
        `URL: ${url}\n\n` +
        problems.map((p) => `- **${p.check}** — ${p.detail}`).join('\n')
    );
    process.exitCode = 1;
    return;
  }

  // "looks like" / "Vite-shaped", not "is the app": the markers are hash- and app-agnostic, so this
  // confirms a Vite-built page is being served, not that it is this build or even this application.
  // The Pages Source config check is the authoritative gate.
  console.log('Deployed site is serving a Vite-built page.');
  console.log(`  URL       ${url}`);
  console.log(`  HTTP      ${String(result.facts.status)} ${result.facts.contentType}`);
  console.log(`  Markers   ${BUILT_APP_MARKERS.join(', ')}`);
  console.log('  Note: this confirms content now; the Pages Source check is the primary gate.');
}

// Only run when invoked directly, so the exports above can be imported by tests without the
// network call firing. `process.argv[1]` may be a relative path, so normalise both sides to an
// absolute file URL before comparing rather than string-concatenating "file://".
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
