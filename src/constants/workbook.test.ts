/**
 * Guards on the two properties that make the workbook download link work.
 *
 * Both exist because the whole gate — typecheck, lint, 1017 tests, knip, build, and the artifact
 * check — stayed green through a version of this feature where either could have been wrong. The
 * artifact check only ever looks at the file the generator wrote, so nothing else in the repo can
 * see a broken URL or a broken `.gitignore` pairing.
 *
 * `src/pages/ImportExport.test.tsx` now renders one of the links, but it asserts the *fragment*
 * wiring, not the download URL — so these two guards are still the only cover for what they cover.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { WORKBOOK_APPROX_SIZE, WORKBOOK_DOWNLOAD_URL, WORKBOOK_FILENAME } from './index';

/**
 * Resolve a repository-root-relative path.
 *
 * Composed through `node:path` from a bare `import.meta.url`, **not** as
 * `new URL('../../x', import.meta.url)`. Vite statically rewrites that exact syntactic pattern into
 * its own asset-URL handling, which yields an `http://` URL — the trap recorded as OBS-38 and the
 * reason `scripts/xlsx/paths.ts` exists. It bit here on the first attempt at the `.gitignore` test.
 */
function resolveFromRepoRoot(relative: string): string {
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
  return resolve(repoRoot, relative);
}

describe('workbook download URL', () => {
  it('is built from the deployment base path, not a root-absolute path', () => {
    /*
     * The OBS-28 failure class: a root-absolute `/mita-4.0-...xlsx` resolves to the Pages *origin*
     * rather than the `/mita-ssa-tool/` subpath, and 404s. Verified by request against a built
     * subpath app; this guards the regression.
     *
     * **Asserted against the source, not the value, because the value cannot distinguish the two
     * forms.** Measured: `import.meta.env.BASE_URL` is `'/'` under vitest — and setting `base` in
     * `vitest.config.ts` does not change that, which was also measured — so
     * `expect(url.startsWith(BASE_URL))` passes identically for `${BASE_URL}${name}` and
     * `/${name}`. A mutation to the root-absolute form left that assertion green.
     *
     * Reading source to make an otherwise-vacuous claim testable is an established pattern here;
     * `scripts/xlsx/footer.test.ts` does the same for the mutation harness.
     */
    const source = readFileSync(resolveFromRepoRoot('src/constants/index.ts'), 'utf-8');
    const declaration = source
      .split('\n')
      .find((line) => line.includes('export const WORKBOOK_DOWNLOAD_URL'));

    expect(declaration).toBeDefined();
    expect(declaration).toContain('import.meta.env.BASE_URL');
  });

  it('ends with the shared filename, so the link and the generator agree', () => {
    // `scripts/xlsx/paths.ts` builds the generator's output path from the same constant. If these
    // ever diverge the link 404s while every other check stays green.
    expect(WORKBOOK_DOWNLOAD_URL.endsWith(WORKBOOK_FILENAME)).toBe(true);
  });

  it('does not double the separator between base path and filename', () => {
    // BASE_URL always ends in a slash, so the filename must not start with one.
    expect(WORKBOOK_DOWNLOAD_URL).not.toContain('//');
  });
});

describe('the generated workbook stays out of version control', () => {
  it('is listed in .gitignore under its shared filename', () => {
    /*
     * The one place the filename is still duplicated as a literal, because `.gitignore` cannot
     * import anything. Nothing else pairs them, and the failure is not cosmetic: break it and a
     * ~217 KB binary build output starts getting committed to a repository heading into a security
     * review.
     */
    const gitignore = readFileSync(resolveFromRepoRoot('.gitignore'), 'utf-8');
    expect(gitignore).toContain(`public/${WORKBOOK_FILENAME}`);
  });
});

describe('user-facing size copy', () => {
  it('matches the binary rounding every other figure in the repo uses', () => {
    /*
     * The generator's log, the artifact check's log and that script's comments all report ~217 KB
     * via `bytes / 1024`. This constant read "about 220 KB" for a while, which is neither the
     * binary nor the decimal rounding of any observed size, leaving the one number users read
     * disagreeing with the four internal ones. Asserted rather than trusted, because it is copy and
     * copy drifts.
     */
    expect(WORKBOOK_APPROX_SIZE).toContain('217');
  });
});
