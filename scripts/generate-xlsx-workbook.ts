/**
 * Generates the offline MITA 4.0 self-assessment workbook.
 *
 * Run directly with Node — no build step, no loader flag:
 *
 * ```
 * node scripts/generate-xlsx-workbook.ts
 * ```
 *
 * Node 22.18 strips TypeScript types natively, so this is a `.ts` file rather than
 * the `.mjs` Section 5.5 of the plan named. Written in TypeScript so it is covered by
 * `npm run typecheck` and `npm run lint` like the rest of the codebase, instead of
 * being an unchecked island that generates a CMS deliverable.
 *
 * Output goes to `public/`, where Vite copies it into `dist/` verbatim. The file is
 * gitignored: it is a build output, not source. The filename is stable and carries no
 * version, so the guidance-site URL never breaks when the model changes
 * (Decision 14); the versions are printed inside the workbook on `00_README`.
 *
 * Set `VITE_DRAFT_MODE=false` to generate without the predecisional notices
 * (Decision 13). The default is notices on, so forgetting the variable fails toward
 * showing them.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import process from 'node:process';

import { WORKBOOK_OUTPUT_PATH } from './xlsx/paths.ts';
import {
  getAllAreasWithDomains,
  getAllDomains,
  getAllOrganizationalAspectLocations,
  getAllStandardAspectLocations,
} from './xlsx/model.ts';
import {
  buildAssessmentInputRows,
  buildCapabilityReferenceRows,
  buildCriteriaReferenceRows,
  buildMaturityLevelRows,
  buildOrganizationalInputRows,
} from './xlsx/rows.ts';
import { SHEET_NAMES } from './xlsx/constants.ts';
import { expectedComputedRowCounts } from './xlsx/profile-rows.ts';
import { isDraft } from './xlsx/env.ts';
import { buildWorkbook, writeWorkbookBuffer } from './xlsx/workbook.ts';

/**
 * Row counts per sheet, for the summary log.
 *
 * Computed from the row builders rather than hardcoded, so the log reports what was
 * actually written. A summary that restates constants would have told us nothing when
 * the model changes — which is the whole reason for logging it.
 */
function summariseRowCounts(): Array<[string, number]> {
  const computed = expectedComputedRowCounts();
  return [
    [SHEET_NAMES.MATURITY_LEVELS, buildMaturityLevelRows().length],
    [SHEET_NAMES.CAPABILITY_REFERENCE, buildCapabilityReferenceRows().length],
    [SHEET_NAMES.CRITERIA_REFERENCE, buildCriteriaReferenceRows().length],
    [SHEET_NAMES.ASSESSMENT_INPUT, buildAssessmentInputRows().length],
    [SHEET_NAMES.ORGANIZATIONAL_INPUT, buildOrganizationalInputRows().length],
    [SHEET_NAMES.MATURITY_PROFILE, computed[SHEET_NAMES.MATURITY_PROFILE] ?? 0],
    [SHEET_NAMES.AREA_SCORES, computed[SHEET_NAMES.AREA_SCORES] ?? 0],
    [SHEET_NAMES.DOMAIN_SCORES, computed[SHEET_NAMES.DOMAIN_SCORES] ?? 0],
    [SHEET_NAMES.DIMENSION_SCORES, computed[SHEET_NAMES.DIMENSION_SCORES] ?? 0],
  ];
}

async function main(): Promise<void> {
  const outputPath = WORKBOOK_OUTPUT_PATH;

  const workbook = buildWorkbook();
  const buffer = await writeWorkbookBuffer(workbook);

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, buffer);

  const domains = getAllDomains().length;
  const areas = getAllAreasWithDomains().length;
  const standardAspects = getAllStandardAspectLocations().length;
  const organizationalAspects = getAllOrganizationalAspectLocations().length;

  console.log('MITA 4.0 self-assessment workbook generated.');
  console.log(`  Output          ${outputPath}`);
  console.log(`  Size            ${(buffer.byteLength / 1024).toFixed(0)} KB`);
  console.log(`  Notices         ${isDraft() ? 'on (predecisional)' : 'off'}`);
  console.log(
    `  Model           ${domains} domains, ${areas} areas, ` +
      `${standardAspects} standard aspects, ${organizationalAspects} organizational aspects`
  );
  console.log('  Rows written');
  for (const [sheetName, count] of summariseRowCounts()) {
    console.log(`    ${sheetName.padEnd(30)}${count.toLocaleString('en-US').padStart(6)}`);
  }
}

main().catch((error: unknown) => {
  console.error('Failed to generate the workbook.');
  console.error(error);
  process.exitCode = 1;
});
