/**
 * Verifies that GitHub Pages is configured to deploy from GitHub Actions, not a branch.
 *
 * ```
 * node scripts/verify-pages-config.ts            # uses $GITHUB_REPOSITORY (set in CI)
 * node scripts/verify-pages-config.ts owner/repo # explicit
 * ```
 *
 * ## Why this is the primary deployment check
 *
 * The outage this guards against is a repository **setting**, not a code defect: Pages Source set
 * to "Deploy from a branch" (`build_type: "legacy"`) instead of "GitHub Actions"
 * (`build_type: "workflow"`). In legacy mode GitHub's built-in Jekyll pipeline runs *alongside*
 * `deploy.yml`, both publish to the same site, and whichever finishes last wins — so on an event
 * that triggers Jekyll but no Vite deploy, a raw render of the repository can become the live
 * site. This is a Vite/React PWA; the only correct Source is "GitHub Actions".
 *
 * A setting outside version control cannot be enforced by a committed file. What a repo *can* do
 * is read the setting and fail loudly when it is wrong. The GitHub REST API exposes it as one
 * field — `GET /repos/{owner}/{repo}/pages` -> `build_type` — and that field is the single most
 * reliable signal available: unlike a content probe, it needs no live site, is immune to CDN
 * caching and to drift in the build's output markers, and reports the cause directly rather than a
 * downstream symptom. The same response carries `html_url`, which this prints so the content check
 * can probe the real site rather than reconstructing the URL.
 *
 * This reads the GitHub API through the `gh` CLI (present and authenticated on GitHub runners;
 * the workflow grants `permissions: pages: read`). It makes one API call, with one retry on a
 * non-deterministic failure.
 */

import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

import { annotateError, appendStepSummary } from './ci-annotations.ts';

/** The only `build_type` that means "GitHub Actions is the publisher". */
const CORRECT_BUILD_TYPE = 'workflow';

/** The Pages API fields this reads, as one JSON object. */
interface PagesInfo {
  readonly buildType: string;
  readonly htmlUrl: string;
}

/** The shape of a `gh api` invocation, injectable so tests can drive the outcomes. */
export type GhRunner = (args: readonly string[]) => string;

/** Default runner: `execFileSync` with an argument array — never a shell string. */
const defaultGhRunner: GhRunner = (args) =>
  execFileSync('gh', [...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

/**
 * Resolve `owner/repo` from argv[2] or $GITHUB_REPOSITORY.
 *
 * The pattern is restricted to GitHub's allowed name characters so a typo (or a traversal-looking
 * value like `../etc`) fails here with a clear message rather than as a confusing API 404. There
 * is no injection exposure regardless — the slug only ever reaches `gh` as an argv element — so
 * this is purely about the error being legible.
 */
export function resolveRepo(argv2: string | undefined, envRepo: string | undefined): string {
  const repo = (argv2 ?? envRepo ?? '').trim();
  if (repo === '') {
    throw new Error(
      'No repository given. Pass "owner/repo" or set GITHUB_REPOSITORY (set automatically in CI).'
    );
  }
  // GitHub owner and repo names use these characters. There is no injection exposure regardless —
  // the slug only reaches `gh` as an argv element — so this is purely about a clear message.
  const parts = repo.split('/');
  const nameChars = /^[A-Za-z0-9_.-]+$/;
  const isName = (s: string): boolean => nameChars.test(s) && s !== '.' && s !== '..';
  if (parts.length !== 2 || !parts.every(isName)) {
    throw new Error(`Not an "owner/repo" slug: ${repo}`);
  }
  return repo;
}

/** Pull the HTTP status out of a `gh api` failure, if its stderr names one. */
function statusFromError(stderr: string): number | undefined {
  const match = /HTTP (\d{3})/.exec(stderr);
  return match ? Number(match[1]) : undefined;
}

/**
 * Read `build_type` and `html_url` via `gh api`, interpreting the common failures.
 *
 * One retry, because a transient 5xx or secondary rate-limit should not red a healthy deploy — but
 * a deterministic 4xx (404 Pages-not-enabled, 401/403 auth) is not retried, since the next call
 * would fail identically. The interpretation the JSDoc used to keep to itself (a 404 means Pages is
 * probably not enabled) is now in the thrown message, where a maintainer will actually see it.
 */
export function readPagesInfo(repo: string, run: GhRunner = defaultGhRunner): PagesInfo {
  const args = [
    'api',
    `repos/${repo}/pages`,
    '--jq',
    '{buildType: .build_type, htmlUrl: .html_url}',
  ];
  let lastError: unknown;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const parsed = JSON.parse(run(args)) as { buildType?: string; htmlUrl?: string };
      return { buildType: parsed.buildType ?? '', htmlUrl: parsed.htmlUrl ?? '' };
    } catch (error: unknown) {
      lastError = error;
      const stderr = (error as { stderr?: string }).stderr ?? '';
      const code = (error as { code?: string }).code;
      const status = statusFromError(stderr);

      if (code === 'ENOENT') {
        throw new Error('`gh` is not installed or not on PATH. Install the GitHub CLI.');
      }
      if (status === 404) {
        throw new Error(
          `GitHub Pages is not enabled for ${repo} (HTTP 404). Enable it at ` +
            'Settings -> Pages, with Source "GitHub Actions".'
        );
      }
      if (status === 401 || status === 403) {
        throw new Error(
          `Not authorized to read Pages config for ${repo} (HTTP ${String(status)}). ` +
            "Check the token / the workflow's `permissions: pages: read`."
        );
      }
      // Anything else (5xx, network, rate limit) is non-deterministic — retry once.
    }
  }

  const stderr = (lastError as { stderr?: string })?.stderr ?? '';
  throw new Error(
    `Could not read Pages config for ${repo} via "gh api".` +
      (stderr.trim() === '' ? '' : `\n  ${stderr.trim()}`)
  );
}

function fail(message: string): void {
  console.error(message);
  annotateError(message);
  process.exitCode = 1;
}

function main(): void {
  let repo: string;
  try {
    repo = resolveRepo(process.argv[2], process.env.GITHUB_REPOSITORY);
  } catch (error: unknown) {
    fail(error instanceof Error ? error.message : String(error));
    return;
  }

  let info: PagesInfo;
  try {
    info = readPagesInfo(repo);
  } catch (error: unknown) {
    fail(error instanceof Error ? error.message : String(error));
    return;
  }

  if (info.buildType !== CORRECT_BUILD_TYPE) {
    const message =
      `Pages Source is misconfigured for ${repo}: build_type is "${info.buildType}", expected ` +
      `"${CORRECT_BUILD_TYPE}". Pages is set to "Deploy from a branch", which runs GitHub's Jekyll ` +
      'pipeline alongside the Vite deploy and can publish a raw source render that wins the race. ' +
      'Fix: repo Settings -> Pages -> Build and deployment -> Source -> "GitHub Actions".';
    fail(message);
    appendStepSummary(`### Pages Source misconfigured\n\n${message}`);
    return;
  }

  console.log(
    `Pages Source verified for ${repo}: build_type is "${info.buildType}" (GitHub Actions).`
  );
  // Emit the canonical site URL for a downstream content check to consume, rather than having it
  // reconstruct the URL and get a user-site or custom-domain repo wrong.
  if (info.htmlUrl !== '') {
    console.log(`  html_url  ${info.htmlUrl}`);
    const outputPath = process.env.GITHUB_OUTPUT;
    if (process.env.GITHUB_ACTIONS === 'true' && outputPath) {
      // html_url comes from the GitHub API (not user input), so writing it as a single output
      // record is safe. A newline would still corrupt the output file, so guard against one
      // defensively rather than trust the source.
      if (!/[\r\n]/.test(info.htmlUrl)) {
        appendFileSync(outputPath, `html_url=${info.htmlUrl}\n`);
      }
    }
  }
}

// Run only when invoked directly, so the exported helpers can be imported by tests without the
// API call firing. `process.argv[1]` may be a relative path, so normalise both sides to a file URL.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
