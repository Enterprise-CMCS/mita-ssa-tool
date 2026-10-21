/**
 * Unit coverage for the Pages Source config gate — the primary deployment check, which until now
 * had none while the secondary content check had thirteen tests.
 *
 * `readPagesInfo` takes an injectable `gh` runner, so the four outcomes that matter (correct,
 * misconfigured, Pages-not-enabled, auth failure) are driven here without touching the network or
 * the real CLI. `resolveRepo` is covered for the slug cases.
 */

import { describe, expect, it } from 'vitest';

import { readPagesInfo, resolveRepo, type GhRunner } from './verify-pages-config.ts';

/** A runner that returns a canned stdout string, as the real `gh api --jq '{...}'` would. */
const ok = (buildType: string, htmlUrl = 'https://o.github.io/r/'): GhRunner => {
  return () => JSON.stringify({ buildType, htmlUrl });
};

/** A runner that throws like `execFileSync` does on a non-zero exit, carrying stderr/code. */
const failing = (opts: { stderr?: string; code?: string }): GhRunner => {
  return () => {
    const error = new Error('Command failed') as Error & { stderr?: string; code?: string };
    if (opts.stderr !== undefined) error.stderr = opts.stderr;
    if (opts.code !== undefined) error.code = opts.code;
    throw error;
  };
};

describe('readPagesInfo', () => {
  it('returns build_type and html_url for a correctly configured repo', () => {
    const info = readPagesInfo('o/r', ok('workflow', 'https://o.github.io/r/'));
    expect(info.buildType).toBe('workflow');
    expect(info.htmlUrl).toBe('https://o.github.io/r/');
  });

  it('returns legacy for a branch-source repo (so main() can fail it)', () => {
    expect(readPagesInfo('o/r', ok('legacy')).buildType).toBe('legacy');
  });

  it('explains a 404 as Pages not being enabled', () => {
    const run = failing({ stderr: 'gh: Not Found (HTTP 404)' });
    expect(() => readPagesInfo('o/r', run)).toThrow(/not enabled.*404/i);
  });

  it('explains a 401 as an authorization problem', () => {
    const run = failing({ stderr: 'gh: Bad credentials (HTTP 401)' });
    expect(() => readPagesInfo('o/r', run)).toThrow(/authorized.*401/i);
  });

  it('names a missing gh binary distinctly', () => {
    const run = failing({ code: 'ENOENT' });
    expect(() => readPagesInfo('o/r', run)).toThrow(/not installed|not on PATH/i);
  });

  it('retries a non-deterministic failure, then gives up with the stderr', () => {
    let calls = 0;
    const run: GhRunner = () => {
      calls += 1;
      const error = new Error('fail') as Error & { stderr?: string };
      error.stderr = 'gh: server error (HTTP 503)';
      throw error;
    };
    expect(() => readPagesInfo('o/r', run)).toThrow(/Could not read Pages config/);
    expect(calls).toBe(2); // one retry on a 5xx
  });

  it('does not retry a deterministic 404', () => {
    let calls = 0;
    const run: GhRunner = () => {
      calls += 1;
      const error = new Error('fail') as Error & { stderr?: string };
      error.stderr = 'gh: Not Found (HTTP 404)';
      throw error;
    };
    expect(() => readPagesInfo('o/r', run)).toThrow(/not enabled/i);
    expect(calls).toBe(1);
  });
});

describe('resolveRepo', () => {
  it('takes the argument when present', () => {
    expect(resolveRepo('owner/repo', undefined)).toBe('owner/repo');
  });

  it('falls back to the environment', () => {
    expect(resolveRepo(undefined, 'owner/repo')).toBe('owner/repo');
  });

  it('throws when neither is set', () => {
    expect(() => resolveRepo(undefined, undefined)).toThrow(/No repository given/);
  });

  it('rejects a non-slug', () => {
    expect(() => resolveRepo('not-a-slug', undefined)).toThrow(/slug/);
  });

  it('rejects a traversal-shaped segment', () => {
    expect(() => resolveRepo('../etc', undefined)).toThrow(/slug/);
  });
});
