/**
 * Verifies the workbook that actually ships.
 *
 * ```
 * npm run verify:workbook-artifact
 * ```
 *
 * ## Why this exists when the suite is already green
 *
 * Three things check the workbook, and they check three different objects:
 *
 * | Check                          | What it looks at                                    |
 * | ------------------------------ | --------------------------------------------------- |
 * | `npm test`                     | A workbook built **in memory**, never written       |
 * | `npm run verify:workbook-excel` | The `public/` file, opened by **real Excel**        |
 * | this script                    | The **`dist/` file** — the only copy a user gets    |
 *
 * `workbook.raw.test.ts` calls `writeWorkbookBuffer(buildWorkbook())` and unzips the buffer.
 * Nothing in the suite reads a file off disk, so nothing in the suite can notice that the
 * generator failed to run, wrote to the wrong place, or that Vite did not copy the result into
 * the build. Those are exactly the failures that produce a 404 on a download link a stakeholder
 * clicks, which is the Wave 8 deliverable.
 *
 * This is deliberately an **integrity** check, not a correctness one. Whether the formulas
 * compute the right numbers is Excel's gate (`verify:workbook-excel`); whether the OOXML is
 * shaped correctly is the suite's. What is established here is narrower and currently unowned:
 * a real, openable, complete workbook is present in the built site, and it is byte-for-byte the
 * file the generator produced.
 *
 * ## Why there is deliberately no `public/` vs `dist/` comparison
 *
 * The obvious extra check — "is the shipped copy the one the generator just produced" — was
 * built, measured, and removed. It cannot be made both meaningful and quiet.
 *
 * A **byte** comparison fails on every run. ExcelJS stamps ZIP entry timestamps it does not
 * expose, so the archive differs even when the model has not; the same model has been observed
 * at 222,655, 222,656 and 222,658 bytes, because the timestamp encoding varies in length.
 *
 * An **unzipped content** comparison — which `paths.ts` suggests as the durable alternative —
 * also fails on every run, for a different reason that refines what `paths.ts` records. Its
 * "byte-identical unzipped content" finding holds only with `SOURCE_DATE_EPOCH` *fixed*. With the
 * variable unset, which is every local run, the build timestamp goes into the content itself:
 * measured, the sole differing part is `docProps/core.xml`, at `dcterms:created`.
 *
 * Excluding the timestamp-bearing parts would work and was rejected: a hand-maintained exclusion
 * list is precisely the kind of thing that silently stops covering what it claims to.
 *
 * And the check has no failure worth catching. In CI, `prebuild` runs in the same step as
 * `vite build`, so `dist/` is fresh by construction; every way the copy can actually fail — no
 * copy, partial copy, garbage copy — is already caught below by the presence, ZIP, open and
 * sheet checks. Locally it would fire in a sequence the project documents as normal (`npm run
 * build`, then `npm run dev`, whose `predev` regenerates `public/`), on a tree where nothing is
 * wrong. A check that cries wolf gets learned-and-ignored, which is worse than no check.
 */

import { accessSync, readFileSync } from 'node:fs';
import process from 'node:process';

import ExcelJS from 'exceljs';

import { BUILT_SHEET_NAMES } from './xlsx/constants.ts';
import { DIST_WORKBOOK_PATH, WORKBOOK_OUTPUT_PATH } from './xlsx/paths.ts';

/**
 * Smallest plausible workbook, in bytes.
 *
 * **Redundant with the open check, and kept anyway for its message.** An earlier version of this
 * comment claimed truncation was the one corruption that "still unzips far enough to look
 * plausible." That is backwards: a ZIP's central directory sits at the *end* of the file, so any
 * truncation makes the archive unopenable. Measured — truncating to 150 KB clears this floor and
 * still fails the open check with "can't find end of central directory."
 *
 * So this catches nothing the open check misses, at any truncation point. It earns its place only
 * by naming the failure plainly: "truncated at 40 KB" is a faster diagnosis than a ZIP parse
 * error. Set well below the real ~217 KB so model changes never trip it.
 */
const MIN_PLAUSIBLE_BYTES = 50 * 1024;

/** The first four bytes of every ZIP archive, and therefore of every `.xlsx`. */
const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

/** A single failed expectation. */
interface Problem {
  readonly check: string;
  readonly detail: string;
}

/**
 * Reads a file, returning `null` rather than throwing if it is absent.
 *
 * Absence is the single most likely failure here — the generator not having run — and it wants
 * a named check with a useful message, not a stack trace from `readFileSync`.
 *
 * Only `ENOENT` is swallowed. `EACCES` and `EISDIR` are genuine problems that would be
 * misreported as "the file does not exist," so they propagate. An earlier version used
 * `statSync`-then-read, which both left a TOCTOU window and produced exactly the raw stack trace
 * this function exists to avoid for every error other than absence.
 */
function readIfPresent(path: string): Buffer | null {
  try {
    return readFileSync(path);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

/**
 * Whether a path exists, without reading it.
 *
 * Used for the `public/` copy, where only presence is in question — its contents are covered by
 * the test suite and by the Excel gate. Same `ENOENT`-only handling as `readIfPresent`.
 */
function exists(path: string): boolean {
  try {
    accessSync(path);
    return true;
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

/**
 * Verifies the built workbook.
 *
 * @returns Every failed expectation. Empty means the artifact is sound.
 */
async function verify(): Promise<Problem[]> {
  const problems: Problem[] = [];

  if (!exists(WORKBOOK_OUTPUT_PATH)) {
    problems.push({
      check: 'generated workbook exists',
      detail:
        `${WORKBOOK_OUTPUT_PATH} is missing. Run \`npm run generate:workbook\`. ` +
        'This normally happens automatically via the `prebuild` script, so its absence ' +
        'usually means the build was run with --ignore-scripts.',
    });
  }

  const shipped = readIfPresent(DIST_WORKBOOK_PATH);
  if (shipped === null) {
    problems.push({
      check: 'workbook present in the built site',
      detail:
        `${DIST_WORKBOOK_PATH} is missing. Vite copies \`public/\` into \`dist/\`, so either ` +
        'the build has not run since the workbook was generated, or the generator ran after ' +
        'it. The in-app download links 404 in this state.',
    });
    // Everything below reads the shipped file, so there is nothing further to check.
    return problems;
  }

  if (!shipped.subarray(0, 4).equals(ZIP_MAGIC)) {
    problems.push({
      check: 'shipped workbook is a ZIP archive',
      detail: `Expected the bytes ${ZIP_MAGIC.toString('hex')}, found ${shipped
        .subarray(0, 4)
        .toString('hex')}. An .xlsx is a ZIP; this file is something else.`,
    });
  }

  if (shipped.byteLength < MIN_PLAUSIBLE_BYTES) {
    problems.push({
      check: 'shipped workbook is not truncated',
      detail:
        `${shipped.byteLength} bytes, below the ${MIN_PLAUSIBLE_BYTES}-byte floor for a ` +
        'workbook that is normally ~217 KB. The open check below will also fail; this one ' +
        'just names the cause.',
    });
  }

  // Open the shipped file rather than the generated one. This is the copy a user downloads, and
  // opening it is the only check here that exercises a real reader end to end.
  //
  // `readFile` by path rather than `load` by buffer, which keeps ExcelJS's `Buffer` type out of
  // this file entirely — Node's `Buffer` is generic and not assignable to it, so the buffer form
  // needs a type assertion. `verify-workbook-in-excel.ts` reads by path for the same reason.
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.readFile(DIST_WORKBOOK_PATH);
  } catch (error: unknown) {
    problems.push({
      check: 'shipped workbook opens',
      detail: `ExcelJS could not read ${DIST_WORKBOOK_PATH}: ${String(error)}`,
    });
    return problems;
  }

  // Derived from the generator's own constants, so adding a sheet updates this check for free
  // rather than leaving it asserting a stale list.
  const found = workbook.worksheets.map((sheet) => sheet.name);
  const missing = BUILT_SHEET_NAMES.filter((name) => !found.includes(name));
  if (missing.length > 0) {
    problems.push({
      check: 'shipped workbook has every sheet',
      detail: `Missing ${missing.join(', ')}. Found ${found.length}: ${found.join(', ')}.`,
    });
  }

  const unexpected = found.filter((name) => !BUILT_SHEET_NAMES.includes(name));
  if (unexpected.length > 0) {
    problems.push({
      check: 'shipped workbook has no unexpected sheets',
      detail:
        `Found ${unexpected.join(', ')}, which BUILT_SHEET_NAMES does not list. ` +
        'If a sheet was added deliberately, add it to SHEET_NAMES.',
    });
  }

  if (problems.length === 0) {
    console.log('Shipped workbook verified.');
    console.log(`  Path    ${DIST_WORKBOOK_PATH}`);
    console.log(`  Size    ${(shipped.byteLength / 1024).toFixed(0)} KB`);
    console.log(`  Sheets  ${found.length} — ${found.join(', ')}`);
    console.log('  Opened by a real reader; every expected sheet present.');
  }

  return problems;
}

const failures = await verify();
if (failures.length > 0) {
  console.error(`Shipped workbook FAILED ${failures.length} check(s).\n`);
  for (const { check, detail } of failures) {
    console.error(`  ✗ ${check}`);
    console.error(`    ${detail}\n`);
  }
  process.exitCode = 1;
}
