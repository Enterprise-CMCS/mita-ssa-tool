/**
 * Build-environment flags for the workbook generator.
 *
 * Its own module because both `workbook.ts` and `readme.ts` need `isDraft()`, and
 * `workbook.ts` imports `readme.ts` — so putting it in either would be a cycle. Keeping it
 * separate is also what makes the go-live variant testable: `isDraft()` is read at call
 * time, never captured at module load, so a test can rebuild the workbook under a different
 * value without reloading the module graph.
 */

import process from 'node:process';

/**
 * Whether the workbook carries the predecisional notices.
 *
 * Derived from `process.env.VITE_DRAFT_MODE`, never from `src/constants/index.ts`, which
 * reads `import.meta.env` and throws under plain Node. Same default as the app: notices on
 * unless explicitly disabled, so forgetting the variable fails toward showing them.
 * Go-live is one workflow variable (Decision 13).
 *
 * **Every notice-bearing surface must consult this**, not just the visible banner row.
 * Wave 6 shipped a version where `A1`, the print footer, the title and the `description`
 * property were all correctly conditional while the README's own "Predecisional notice"
 * section was emitted unconditionally — so the go-live artifact still carried the full PRA
 * statement, and the test covering go-live checked only those four places and passed.
 */
export function isDraft(): boolean {
  return process.env.VITE_DRAFT_MODE !== 'false';
}
