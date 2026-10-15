/**
 * Unit coverage for the deployed-site content verifier.
 *
 * The script's value is a behavioural assumption about Vite's output — that a built page carries
 * `/assets/index-` and `modulepreload`, and that a source render carries `%BASE_URL%`. A live-URL
 * probe cannot pin that assumption in CI, so these tests exercise the pure `inspect` and
 * `resolveUrl` directly, including against the committed source `index.html` so a change that
 * removed its `%BASE_URL%` placeholder (and thus weakened the source-render signal) is caught.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { inspect, resolveUrl } from './verify-deployed-site.ts';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

/** A minimal built page: hashed entry bundle plus a modulepreload, no placeholder. */
const BUILT_HTML = [
  '<!DOCTYPE html><html><head>',
  '<script type="module" crossorigin src="/mita-ssa-tool/assets/index-ABC123.js"></script>',
  '<link rel="modulepreload" crossorigin href="/mita-ssa-tool/assets/vendor-XYZ.js">',
  '</head><body><div id="root"></div></body></html>',
].join('\n');

describe('inspect', () => {
  it('passes a built page carrying the asset-bundle marker', () => {
    expect(inspect(BUILT_HTML)).toEqual([]);
  });

  it('fails a page missing the asset bundle', () => {
    const problems = inspect('<html><head><link rel="modulepreload" href="/x.js"></head></html>');
    expect(problems).toHaveLength(1);
    expect(problems[0]?.check).toContain('/assets/index-');
  });

  it('passes a built page even without a modulepreload link', () => {
    // modulepreload is intentionally not a required marker — a manualChunks change could drop it
    // from a healthy site, so the asset-bundle path is the only required positive signal.
    const noPreload =
      '<html><head><script type="module" src="/assets/index-ABC.js"></script></head></html>';
    expect(inspect(noPreload)).toEqual([]);
  });

  it('fails an unrelated page on the built-app marker', () => {
    // example.com-shaped: the asset-bundle marker is absent.
    const problems = inspect('<html><head><title>Example</title></head><body>hi</body></html>');
    expect(problems).toHaveLength(1);
    expect(problems[0]?.check).toContain('/assets/index-');
  });

  it('treats a %BASE_URL% hit as a conclusive source-render failure', () => {
    // A page that even accidentally contained the built markers must still fail if it also carries
    // the raw placeholder, because that proves the build did not run for what is live.
    const sourceish = `${BUILT_HTML}\n<link rel="icon" href="%BASE_URL%favicon.svg">`;
    const problems = inspect(sourceish);
    expect(problems.some((p) => p.check.includes('%BASE_URL%'))).toBe(true);
  });

  it('flags the committed source index.html as not-the-app', () => {
    // Pins the assumption the source-render signal depends on: the source index.html carries
    // %BASE_URL% and no built bundle. If a refactor removed the placeholder, this fails and tells
    // us the signal weakened.
    const sourceHtml = readFileSync(join(repoRoot, 'index.html'), 'utf8');
    const problems = inspect(sourceHtml);
    expect(problems.length).toBeGreaterThan(0);
    expect(sourceHtml).toContain('%BASE_URL%');
  });

  it('includes HTTP facts in the failure detail when given them', () => {
    const problems = inspect('<html></html>', {
      status: 404,
      contentType: 'text/html',
      bodyLength: 12,
    });
    expect(problems[0]?.detail).toContain('HTTP 404');
  });
});

describe('resolveUrl', () => {
  it('takes the argument when present', () => {
    expect(resolveUrl('https://example.com/', undefined)).toBe('https://example.com/');
  });

  it('falls back to SITE_URL when the argument is absent', () => {
    expect(resolveUrl(undefined, 'https://example.com/')).toBe('https://example.com/');
  });

  it('treats an empty-string argument as absent so SITE_URL still applies', () => {
    expect(resolveUrl('', 'https://example.com/')).toBe('https://example.com/');
    expect(resolveUrl('   ', 'https://example.com/')).toBe('https://example.com/');
  });

  it('throws when neither is set', () => {
    expect(() => resolveUrl(undefined, undefined)).toThrow(/No URL given/);
  });

  it('rejects a non-URL', () => {
    expect(() => resolveUrl('not a url', undefined)).toThrow(/valid URL/);
  });

  it('rejects a non-http(s) scheme', () => {
    expect(() => resolveUrl('file:///etc/passwd', undefined)).toThrow(/http/);
  });
});
