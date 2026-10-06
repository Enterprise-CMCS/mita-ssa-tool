/**
 * The offline Excel workbook, named in one place.
 *
 * Deliberately separate from `constants/index.ts` and deliberately free of any `import.meta`
 * reference, for the same reason `draftNotice.ts` is: `import.meta.env` is `undefined` in plain
 * Node ESM and touching it throws, so a module that reads it cannot be imported by build-time
 * tooling. `scripts/xlsx/paths.ts` imports this to build the generator's output path, and the app
 * imports it to build the download URL.
 *
 * That sharing is the point. Before this existed the filename was a literal in `paths.ts` and
 * would have been a second literal in the download link — and the failure mode of those two
 * drifting is a 404 on the link a pilot user clicks, which is the one thing the artifact check in
 * `scripts/verify-workbook-artifact.ts` cannot catch, because it only ever looks at the file the
 * generator wrote.
 *
 * Keep this file dependency-free.
 */

/**
 * Filename of the generated workbook.
 *
 * Stable and carrying no version, so a guidance-site URL never breaks when the model changes
 * (Decision 14) — the versions are printed inside the workbook on `00_README`.
 *
 * Also duplicated as a literal in `.gitignore`, which cannot import anything. If this ever
 * changes, that entry must change with it or the build output starts getting committed.
 */
export const WORKBOOK_FILENAME = 'mita-4.0-self-assessment-workbook.xlsx';

/**
 * Approximate download size, for the in-app links.
 *
 * Approximate on purpose: the exact byte count is **not stable between builds** — 222,655 /
 * 222,656 / 222,658 have all been observed for identical content, because ExcelJS stamps ZIP entry
 * timestamps whose encoded length varies. So this is rounded copy for a user deciding whether to
 * click, never an assertion.
 *
 * **217, matching every other figure in the repo.** The generator's log, the artifact check's log
 * and that script's own comments all report ~217 KB, via `bytes / 1024`. An earlier version of this
 * constant said "about 220 KB", which is neither the binary nor the decimal rounding of any
 * observed size — 222,65x is 217 KiB or 223 kB — and left the one number users read disagreeing
 * with the four internal ones.
 */
export const WORKBOOK_APPROX_SIZE = 'about 217 KB';

/** File type, spelled out for the link's accessible name rather than left to the extension. */
export const WORKBOOK_FILE_TYPE = 'Excel workbook';
