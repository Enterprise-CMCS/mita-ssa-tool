/**
 * Mutation harness: proves every 508 assertion in `workbook.test.ts` can actually fail.
 *
 * ## Why this exists
 *
 * Wave 5 shipped three assertions over a generated PDF that could not fail, each
 * satisfied by unrelated content elsewhere in the document. The workbook's 508 checks
 * have exactly that shape: "no merged cells", "document properties populated" and "no
 * blank rows" all pass trivially on an empty or half-built workbook. A green suite
 * therefore proves nothing on its own.
 *
 * So each assertion is verified by breaking the thing it covers and confirming the test
 * goes red. Two genuinely vacuous assertions were found this way and fixed — both
 * self-referential, comparing the workbook against the same constant it was generated
 * from, so mutating the constant moved both sides and the test stayed green. That class
 * of defect is invisible to review and invisible to a passing suite.
 *
 * ## Kept rather than deleted
 *
 * Wave 7 adds sheets `06`-`09` with more assertions of the same shape, and this is what
 * validates them. It is also the evidence that the 508 suite is real, which matters when
 * CMS asks what the accessibility claim rests on.
 *
 * ## Safety
 *
 * It **mutates generator source files in place**, backing them up to a temp directory
 * first and restoring after each case. Signal and exit handlers restore as well, so a
 * Ctrl-C mid-run does not leave a mutation on disk. Even so, run it on a clean tree: if
 * the process is killed with SIGKILL, the backup in `os.tmpdir()` is the only copy.
 *
 * Run: `node scripts/xlsx/prove-assertions.ts`
 */

import { execSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';

/** One mutation: break something, name the test that must notice. */
interface MutationCase {
  /** The 508 requirement or behaviour being proved. */
  assertion: string;
  /** Generator source file to mutate. */
  file: string;
  /** Exact source text to replace. Reported if it no longer matches. */
  find: string;
  replace: string;
  /** Substring of the test name that must go red, passed to vitest's `-t`. */
  test: string;
  /** Which suite holds that test. Defaults to the reload-based 508 suite. */
  testFile?: string;
}

const DEFAULT_TEST_FILE = 'scripts/xlsx/workbook.test.ts';

interface MutationResult extends MutationCase {
  outcome: string;
  detail?: string;
}

const SOURCES = [
  'scripts/xlsx/workbook.ts',
  'scripts/xlsx/rows.ts',
  'scripts/xlsx/constants.ts',
  'scripts/xlsx/readme.ts',
  'scripts/xlsx/model.ts',
  'scripts/xlsx/paths.ts',
  'scripts/xlsx/scoring-spec.ts',
  'scripts/xlsx/profile-rows.ts',
  'scripts/xlsx/excel-rounding.ts',
];

/**
 * Each case: the assertion under test, the file to mutate, the exact string to replace,
 * its replacement, and a `-t` filter naming the test that must fail.
 *
 * The mutations are deliberately *plausible* rather than absurd — a real off-by-one in
 * the validation loop, a real `topics: joinList(area.topics)` that goes empty on the one
 * area whose topics array is empty, a real `hidden: true` on the identifier columns.
 * An absurd mutation proves a test can fail; a plausible one proves it would catch the
 * bug someone is actually going to write.
 */
export const MUTATION_CASES: MutationCase[] = [
  {
    assertion: 'no merged cells',
    file: 'scripts/xlsx/workbook.ts',
    find: `  titleRow.height = 26;`,
    replace: `  sheet.mergeCells(HEADER_ROW, 1, HEADER_ROW, 2);\n  titleRow.height = 26;`,
    test: 'has no merged cell range on any sheet',
  },
  {
    assertion: 'header is on row 2',
    file: 'scripts/xlsx/constants.ts',
    find: `export const HEADER_ROW = 2;`,
    replace: `export const HEADER_ROW = 3;`,
    test: 'places the notice on row 1, the single header row on row 2, and data from row 3',
  },
  {
    assertion: 'header fill appears on exactly one row',
    file: 'scripts/xlsx/workbook.ts',
    find: `  cell.font = { bold: true, color: { argb: COLORS.noticeFont }, size: 11 };`,
    replace: `  cell.font = { bold: true, color: { argb: COLORS.noticeFont }, size: 11 };\n  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerFill } };`,
    test: 'carries the header fill on exactly one row',
  },
  {
    assertion: 'header tuple appears exactly once',
    file: 'scripts/xlsx/rows.ts',
    find: `  return rows;\n}\n\n// =============================================================================\n// 05_Organizational_Input`,
    replace: `  rows.push(\n    Object.fromEntries(\n      Object.keys(rows[0] ?? {}).map((key) => [\n        key,\n        ({\n          domainName: 'Capability Domain',\n          areaName: 'Capability Area',\n          informationManagement: 'Information Management Area',\n          dimensionName: 'Dimension',\n          subDimensionName: 'Sub-Dimension',\n          aspectName: 'Aspect',\n          aspectQuestion: 'Aspect Question',\n          currentLevel: 'As-Is Level (enter value)',\n          targetLevel: 'To-Be Level (enter value)',\n          notes: 'Notes (enter value)',\n          barriers: 'Barriers and Challenges (enter value)',\n          plans: 'Advancement Plans (enter value)',\n          domainId: 'Domain ID',\n          areaId: 'Capability Area ID',\n          dimensionId: 'Dimension ID',\n          subDimensionId: 'Sub-Dimension ID',\n          aspectId: 'Aspect ID',\n        })[key] ?? '',\n      ])\n    )\n  );\n  return rows;\n}\n\n// =============================================================================\n// 05_Organizational_Input`,
    test: 'repeats the header tuple nowhere else',
  },
  {
    assertion: 'no blank rows',
    file: 'scripts/xlsx/workbook.ts',
    find: `    sheetRow.commit();
    rowNumber += 1;
  }`,
    replace: `    sheetRow.commit();
    rowNumber += 1;
    if (row.kind === 'heading') {
      rowNumber += 1;
    }
  }`,
    test: 'has no wholly blank row on any sheet',
  },
  {
    assertion: 'reference columns are populated everywhere',
    file: 'scripts/xlsx/rows.ts',
    find: `    topics: area.topics.length > 0 ? joinList(area.topics) : 'None listed',`,
    replace: `    topics: joinList(area.topics),`,
    test: 'populates every reference column on every data row',
  },
  {
    assertion: 'editable columns are the only empty ones',
    file: 'scripts/xlsx/rows.ts',
    find: `          notes: '',
          barriers: '',
          plans: '',
          domainId: domain.id,`,
    replace: `          notes: 'placeholder',
          barriers: '',
          plans: '',
          domainId: domain.id,`,
    test: 'leaves exactly the editable columns empty',
  },
  {
    assertion: 'input fill implies a textual header signal',
    file: 'scripts/xlsx/workbook.ts',
    find: `      if (column.editable) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.inputFill } };`,
    replace: `      if (column.editable || column.key === 'aspectQuestion') {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.inputFill } };`,
    test: 'gives every input-filled cell a header that says so in words',
  },
  {
    assertion: 'editable headers carry the suffix',
    file: 'scripts/xlsx/constants.ts',
    find: `  return column.editable ? \`\${column.header}\${EDITABLE_HEADER_SUFFIX}\` : column.header;`,
    replace: `  return column.header;`,
    test: 'suffixes every editable column header and no other',
  },
  {
    assertion: 'no images embedded in the workbook',
    file: 'scripts/xlsx/workbook.ts',
    find: `  addReadmeSheet(workbook);`,
    replace: `  const imageId = workbook.addImage({\n    buffer: Buffer.from(\n      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8AAAwAB/AEB1n8AAAAASUVORK5CYII=',\n      'base64'\n    ),\n    extension: 'png',\n  });\n  addReadmeSheet(workbook);\n  workbook.worksheets[0]?.addImage(imageId, 'D1:E4');`,
    test: 'embeds no media in the workbook',
  },
  {
    assertion: 'no image placed on any sheet',
    file: 'scripts/xlsx/workbook.ts',
    find: `  addReadmeSheet(workbook);

  addTableSheet(workbook, {
    name: SHEET_NAMES.MATURITY_LEVELS,`,
    replace: `  addReadmeSheet(workbook);
  const proveImageId = workbook.addImage({
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8AAAwAB/AEB1n8AAAAASUVORK5CYII=',
      'base64'
    ),
    extension: 'png',
  });
  workbook.worksheets[0]?.addImage(proveImageId, 'D1:E4');

  addTableSheet(workbook, {
    name: SHEET_NAMES.MATURITY_LEVELS,`,
    test: 'places no image on any sheet',
  },
  {
    assertion: 'document properties are populated',
    file: 'scripts/xlsx/workbook.ts',
    find: `  workbook.creator = 'MITA 4.0 State Self-Assessment Tool';`,
    replace: `  workbook.creator = '';`,
    test: 'sets creator to a non-trivial value that survives serialization',
  },
  {
    assertion: 'notice in A1 of every sheet',
    file: 'scripts/xlsx/workbook.ts',
    find: `  cell.value = isDraft() ? DRAFT_NOTICE_SHORT_LINE : sheet.name;`,
    replace: `  cell.value = isDraft() && sheet.name === '00_README' ? DRAFT_NOTICE_SHORT_LINE : sheet.name;`,
    test: 'puts the short notice in A1 of every sheet',
  },
  {
    assertion: 'notice appears in the print footer',
    file: 'scripts/xlsx/workbook.ts',
    find: `    const footer = \`&L&8\${escapeHeaderFooter(DRAFT_NOTICE_SHORT_LINE)}\`;
    assertFooterFits(sheet.name, footer);
    sheet.headerFooter.oddFooter = footer;`,
    replace: `    const footer = '&L&8';
    sheet.headerFooter.oddFooter = footer;`,
    test: 'puts the notice in the print footer of every sheet, within Excel limits',
  },
  {
    assertion: 'full PRA statement is present somewhere, not only abbreviated',
    file: 'scripts/xlsx/workbook.ts',
    find: `  workbook.description = isDraft()
    ? \`\${DRAFT_NOTICE_LABEL}: \${DRAFT_NOTICE_FULL_BODY}\`
    : 'Offline workbook equivalent of the MITA 4.0 State Self-Assessment Tool.';`,
    replace: `  workbook.description = \`\${DRAFT_NOTICE_LABEL}: \${DRAFT_NOTICE_SHORT_LINE}\`;`,
    test: 'keeps the full PRA statement out of the footer but present in the workbook',
  },
  {
    assertion: 'selection of locked cells is never disabled',
    file: 'scripts/xlsx/workbook.ts',
    find: `    selectLockedCells: true,`,
    replace: `    selectLockedCells: false,`,
    test: 'never disables selection of locked or unlocked cells',
  },
  {
    assertion: 'sheet protection is enabled',
    file: 'scripts/xlsx/workbook.ts',
    find: `  applyPrintSetup(sheet);
  protectSheet(sheet);
}

/**
 * Freeze the notice row`,
    replace: `  applyPrintSetup(sheet);
}

/**
 * Freeze the notice row`,
    test: 'enables sheet protection on every sheet',
  },
  {
    assertion: 'editable cells are unlocked',
    file: 'scripts/xlsx/workbook.ts',
    find: `        // Unlocked before the sheet-level protection below, which locks everything else.
        cell.protection = { locked: false };`,
    replace: `        // Unlocked before the sheet-level protection below, which locks everything else.`,
    test: 'unlocks exactly the editable cells',
  },
  {
    assertion: 'no column is hidden',
    file: 'scripts/xlsx/workbook.ts',
    find: `    sheetColumn.alignment = { vertical: 'top', wrapText: column.wrap === true };`,
    replace: `    sheetColumn.alignment = { vertical: 'top', wrapText: column.wrap === true };
    if (column.identifier) {
      sheetColumn.hidden = true;
    }`,
    test: 'hides no column on any sheet',
  },
  {
    assertion: 'named range excludes identifier columns',
    file: 'scripts/xlsx/workbook.ts',
    find: `  const lastNonIdentifierIndex = lastIndexOfNonIdentifier(spec.columns);`,
    replace: `  const lastNonIdentifierIndex = spec.columns.length - 1;`,
    test: 'scopes its range from the header to the last content column',
  },
  {
    assertion: 'level validation covers every data row',
    file: 'scripts/xlsx/workbook.ts',
    find: `  const range = \`\${cellReference(FIRST_DATA_ROW, first)}:\${cellReference(lastRow, last)}\`;`,
    replace: `  const range = \`\${cellReference(FIRST_DATA_ROW + 1, first)}:\${cellReference(lastRow, last)}\`;`,
    test: 'validates both level columns on all',
  },
  {
    assertion: 'README lists every sheet including the unbuilt ones',
    file: 'scripts/xlsx/readme.ts',
    find: `    ...Object.values(SHEET_NAMES).map((sheetName) =>`,
    replace: `    ...BUILT_SHEET_NAMES.slice(0, 6).map((sheetName) =>`,
    test: 'lists every sheet in the workbook, built or not',
  },
  {
    assertion: 'README quotes a row count matching the sheet',
    file: 'scripts/xlsx/readme.ts',
    find: `      \`Sheet \${SHEET_NAMES.ASSESSMENT_INPUT} has \${assessmentRowCount.toLocaleString('en-US')} \` +`,
    replace: `      \`Sheet \${SHEET_NAMES.ASSESSMENT_INPUT} has \${(assessmentRowCount + 1).toLocaleString('en-US')} \` +`,
    test: 'quotes a row count that matches the sheet it describes',
  },
  {
    assertion: 'palette clears WCAG AA',
    file: 'scripts/xlsx/constants.ts',
    find: `  headerFill: 'FF1A4480',`,
    replace: `  headerFill: 'FFBBBBBB',`,
    test: 'keeps the header, notice and input palettes above WCAG AA for their text',
  },
  {
    assertion: 'notice is the app banner red',
    file: 'scripts/xlsx/constants.ts',
    find: `  noticeFont: 'FFB0142F',`,
    replace: `  noticeFont: 'FFE31C3D',`,
    test: 'renders the notice in the measured 7.03:1 app banner red, bold',
  },
  {
    assertion: 'row counts per sheet',
    file: 'scripts/xlsx/rows.ts',
    find: `  for (const { domain, area } of getStandardAreasWithDomains()) {
    for (const dimensionId of getInputDimensionsForArea(area.id, domain.id)) {`,
    replace: `  for (const { domain, area } of getStandardAreasWithDomains()) {
    for (const dimensionId of ORBIT_DIMENSION_IDS) {`,
    test: 'has the expected row count on each sheet',
  },

  // ---------------------------------------------------------------------------
  // Raw-OOXML suite. These cover the requirements where the file format is the
  // ground truth and ExcelJS's reader normalises the difference away.
  // ---------------------------------------------------------------------------
  {
    assertion: 'raw: one validation element, not two overlapping',
    file: 'scripts/xlsx/workbook.ts',
    find: `  const range = \`\${cellReference(FIRST_DATA_ROW, first)}:\${cellReference(lastRow, last)}\`;
  asRangeValidatable(sheet).dataValidations.add(range, {
    type: 'list',
    allowBlank: true,
    formulae: [\`"\${LEVEL_DROPDOWN_VALUES.join(',')}"\`],
    showErrorMessage: true,
    errorStyle: 'stop',
    errorTitle: 'Not a valid maturity level',
    error: \`Enter one of: \${LEVEL_DROPDOWN_VALUES.join(', ')}. Leave the cell blank if you have not assessed this aspect yet.\`,
  });`,
    replace: `  for (const columnIndex of levelColumnIndexes) {
    for (let row = FIRST_DATA_ROW; row <= lastRow; row += 1) {
      sheet.getCell(row, columnIndex).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [\`"\${LEVEL_DROPDOWN_VALUES.join(',')}"\`],
        showErrorMessage: true,
        errorStyle: 'stop',
        errorTitle: 'Not a valid maturity level',
        error: \`Enter one of: \${LEVEL_DROPDOWN_VALUES.join(', ')}. Leave the cell blank if you have not assessed this aspect yet.\`,
      };
    }
  }`,
    test: 'declares exactly one validation covering',
    testFile: 'scripts/xlsx/workbook.raw.test.ts',
  },
  {
    assertion: 'raw: no mergeCell element',
    file: 'scripts/xlsx/workbook.ts',
    find: `  titleRow.height = 26;`,
    replace: `  sheet.mergeCells(HEADER_ROW, 1, HEADER_ROW, 2);\n  titleRow.height = 26;`,
    test: 'emits no mergeCell element on any sheet',
    testFile: 'scripts/xlsx/workbook.raw.test.ts',
  },
  {
    assertion: 'raw: no media part in the archive',
    file: 'scripts/xlsx/workbook.ts',
    find: `  addReadmeSheet(workbook);

  addTableSheet(workbook, {
    name: SHEET_NAMES.MATURITY_LEVELS,`,
    replace: `  addReadmeSheet(workbook);
  const proveImageId = workbook.addImage({
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8AAAwAB/AEB1n8AAAAASUVORK5CYII=',
      'base64'
    ),
    extension: 'png',
  });
  workbook.worksheets[0]?.addImage(proveImageId, 'D1:E4');

  addTableSheet(workbook, {
    name: SHEET_NAMES.MATURITY_LEVELS,`,
    test: 'contains no media, drawing, or VML parts',
    testFile: 'scripts/xlsx/workbook.raw.test.ts',
  },
  {
    assertion: 'raw: selectLockedCells is not blocked',
    file: 'scripts/xlsx/workbook.ts',
    find: `    selectLockedCells: true,`,
    replace: `    selectLockedCells: false,`,
    test: 'protects every sheet without blocking selection of locked cells',
    testFile: 'scripts/xlsx/workbook.raw.test.ts',
  },
  {
    assertion: 'raw: protection uses no password',
    file: 'scripts/xlsx/workbook.ts',
    find: `  void sheet.protect('', {`,
    replace: `  void sheet.protect('mita', {`,
    test: 'sets no protection password',
    testFile: 'scripts/xlsx/workbook.raw.test.ts',
  },
  {
    assertion: 'raw: PRA statement in the description property',
    file: 'scripts/xlsx/workbook.ts',
    find: `  workbook.description = isDraft()
    ? \`\${DRAFT_NOTICE_LABEL}: \${DRAFT_NOTICE_FULL_BODY}\`
    : 'Offline workbook equivalent of the MITA 4.0 State Self-Assessment Tool.';`,
    replace: `  workbook.description = \`\${DRAFT_NOTICE_LABEL}: short body only, no PRA statement here.\`;`,
    test: 'carries the PRA statement in the description property',
    testFile: 'scripts/xlsx/workbook.raw.test.ts',
  },
  {
    assertion: 'go-live README omits the notice section',
    file: 'scripts/xlsx/readme.ts',
    find: `    ...(isDraft()
      ? [heading('Predecisional notice'), entry(DRAFT_NOTICE_LABEL, DRAFT_NOTICE_FULL_BODY)]
      : []),`,
    replace: `    heading('Predecisional notice'),
    entry(DRAFT_NOTICE_LABEL, DRAFT_NOTICE_FULL_BODY),`,
    test: 'carries no predecisional notice in any cell of any sheet',
  },
  {
    assertion: 'input fill is present on editable cells',
    file: 'scripts/xlsx/workbook.ts',
    find: `        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.inputFill } };`,
    replace: ``,
    test: 'fills every editable data cell and no reference cell',
  },
  {
    assertion: 'editable cells are ruled on all four sides',
    file: 'scripts/xlsx/workbook.ts',
    find: `        cell.border = { top: edge, left: edge, bottom: edge, right: edge };`,
    replace: `        cell.border = { top: edge, bottom: edge };`,
    test: 'rules every editable cell on all four sides and no reference cell',
  },
  {
    assertion: 'input border clears 3:1 on the fill',
    file: 'scripts/xlsx/constants.ts',
    find: `  inputBorder: 'FF8C8C8C',`,
    replace: `  inputBorder: 'FFD4D4D4',`,
    test: 'keeps the input border above 3:1 against the fill it sits on',
  },
  {
    assertion: 'gridlines print, matching the cell borders',
    file: 'scripts/xlsx/workbook.ts',
    find: `    showGridLines: true,`,
    replace: ``,
    test: 'prints gridlines so the ruling is consistent on paper',
  },
  {
    // Reverts to the pre-fix form: alignment only on the wrapping columns, leaving every
    // other column at Excel's bottom default. That is the state the user saw in Excel, where
    // typed notes floated above their own As-Is level.
    assertion: 'every column is aligned to the top of the row',
    file: 'scripts/xlsx/workbook.ts',
    find: `    sheetColumn.alignment = { vertical: 'top', wrapText: column.wrap === true };`,
    replace: `    if (column.wrap) {
      sheetColumn.alignment = { vertical: 'top', wrapText: true };
    }`,
    test: 'aligns every column of every table sheet to the top of the row',
  },
  {
    assertion: 'header columns leave room for the filter button',
    file: 'scripts/xlsx/constants.ts',
    find: `  flag: 22,`,
    replace: `  flag: 8,`,
    test: 'leaves room for the filter button beside every header word',
  },
  {
    assertion: 'page numbers survive in go-live mode',
    file: 'scripts/xlsx/workbook.ts',
    find: `    printTitlesRow: \`\${HEADER_ROW}:\${HEADER_ROW}\`,`,
    replace: ``,
    test: 'keeps the header row repeating on printed pages',
  },
  {
    assertion: 'footer length guard rejects an over-long footer',
    file: 'scripts/xlsx/workbook.ts',
    find: `  if (footer.length > HEADER_FOOTER_LIMIT) {`,
    replace: `  if (footer.length > HEADER_FOOTER_LIMIT * 10) {`,
    test: 'throws for a footer one character over the limit',
    testFile: 'scripts/xlsx/footer.test.ts',
  },
  {
    assertion: 'README writes no empty-string cells',
    file: 'scripts/xlsx/workbook.ts',
    find: `    sheetRow.getCell(1).value = row.label === '' ? null : row.label;
    sheetRow.getCell(2).value = row.value === '' ? null : row.value;`,
    replace: `    sheetRow.getCell(1).value = row.label;
    sheetRow.getCell(2).value = row.value;`,
    test: 'writes no empty-string text cells on any sheet',
    testFile: 'scripts/xlsx/workbook.raw.test.ts',
  },
  {
    assertion: 'raw: editable cells are blank, not empty text',
    file: 'scripts/xlsx/workbook.ts',
    find: `      cell.value = value === undefined || value === '' ? null : value;`,
    replace: `      cell.value = value ?? '';`,
    test: 'leaves the level cells truly blank, not empty text',
    testFile: 'scripts/xlsx/workbook.raw.test.ts',
  },
  {
    // Removes the build-time guard *and* over-lengthens, because with the guard in place
    // generation throws before the test can observe the footer — which is the guard working,
    // but it makes the assertion's own coverage unprovable. This proves the test would catch
    // an over-long footer if the guard were ever bypassed.
    assertion: 'raw: footer stays within Excel 255-char limit',
    file: 'scripts/xlsx/workbook.ts',
    find: `    assertFooterFits(sheet.name, footer);
    sheet.headerFooter.oddFooter = footer;`,
    replace: `    sheet.headerFooter.oddFooter = footer.padEnd(300, ' ');`,
    test: 'puts the notice in the footer of every sheet, within Excel 255-char limit',
    testFile: 'scripts/xlsx/workbook.raw.test.ts',
  },
  {
    assertion: 'go-live mode leaves no blank row',
    file: 'scripts/xlsx/workbook.ts',
    find: `  cell.value = isDraft() ? DRAFT_NOTICE_SHORT_LINE : sheet.name;`,
    replace: `  cell.value = isDraft() ? DRAFT_NOTICE_SHORT_LINE : null;`,
    test: 'still has no wholly blank row on any sheet',
  },
  {
    assertion: 'go-live document properties drop the notice',
    file: 'scripts/xlsx/workbook.ts',
    find: `  workbook.title = \`\${draftPrefix}MITA 4.0 State Self-Assessment Workbook\`;`,
    replace: `  workbook.title = \`\${DRAFT_NOTICE_LABEL} — MITA 4.0 State Self-Assessment Workbook\`;`,
    test: 'carries no predecisional notice in any footer or document property',
  },
  {
    assertion: 'go-live README does not describe a notice',
    file: 'scripts/xlsx/readme.ts',
    find: `      'Every sheet has a single header row on row 2, directly under row 1. There are no merged ' +`,
    replace: `      'Every sheet has a single header row on row 2, directly under the notice on row 1. There are no merged ' +`,
    test: 'describes its own structure without referring to a notice',
  },
  {
    assertion: 'the editable signal is the literal words "(enter value)"',
    file: 'scripts/xlsx/constants.ts',
    find: `export const EDITABLE_HEADER_SUFFIX = ' (enter value)';`,
    replace: `export const EDITABLE_HEADER_SUFFIX = ' (X)';`,
    test: 'spells the editable signal out in words on an input column header',
  },
  {
    assertion: 'levels run 1-5 within every aspect',
    file: 'scripts/xlsx/rows.ts',
    find: `      for (const [index, levelKey] of LEVEL_KEYS.entries()) {
        rows.push({
          dimensionName: location.dimensionName,`,
    replace: `      for (const [rawIndex, levelKey] of LEVEL_KEYS.entries()) {
        const index = rawIndex === 4 ? 3 : rawIndex;
        rows.push({
          dimensionName: location.dimensionName,`,
    test: 'numbers levels 1 to 5 in order within every aspect',
    testFile: 'scripts/xlsx/rows.test.ts',
  },
  {
    assertion: 'workbook IM guidance keeps its load-bearing claims',
    file: 'scripts/xlsx/readme.ts',
    find: `  "the Information dimension in that domain's other capability areas. If you are assessing " +`,
    replace: `  "the other dimensions in that domain's other capability areas. If you are assessing " +`,
    test: 'makes every load-bearing claim in the workbook guidance',
    testFile: 'scripts/xlsx/readme.test.tsx',
  },
  {
    assertion: 'raw: header row repeats on printed pages',
    file: 'scripts/xlsx/workbook.ts',
    find: `    printTitlesRow: \`\${HEADER_ROW}:\${HEADER_ROW}\`,`,
    replace: ``,
    test: 'repeats the header row on printed pages of the table sheets',
    testFile: 'scripts/xlsx/workbook.raw.test.ts',
  },

  // ===========================================================================
  // Wave 7: the scoring model. These matter more than the 508 cases above, because a wrong
  // formula is a wrong number in a state's submission to CMS rather than a cosmetic defect —
  // and unlike the 508 assertions, nothing about a wrong score is visible on inspection.
  //
  // Every mutation here is a rule someone could plausibly "simplify" into place: dropping a
  // redundant-looking `">0"`, rounding the sub-dimension means because every other mean is
  // rounded, averaging domain scores for the overall figure because that reads naturally.
  // ===========================================================================
  {
    assertion: 'a pasted 0 or negative is excluded from every mean',
    file: 'scripts/xlsx/scoring-spec.ts',
    find: `    (level): level is number => typeof level === 'number' && level > 0
  );`,
    replace: `    (level): level is number => typeof level === 'number'
  );`,
    test: 'excludes a pasted zero or negative exactly as the app does',
    testFile: 'scripts/xlsx/scoring-spec.test.ts',
  },
  {
    assertion: 'nothing assessed yields null, not zero',
    file: 'scripts/xlsx/scoring-spec.ts',
    find: `  if (assessed.length === 0) {
    return null;
  }
  return assessed.reduce((sum, level) => sum + level, 0) / assessed.length;`,
    replace: `  if (assessed.length === 0) {
    return 0;
  }
  return assessed.reduce((sum, level) => sum + level, 0) / assessed.length;`,
    test: 'drops a dimension with nothing assessed rather than scoring it zero',
    testFile: 'scripts/xlsx/scoring-spec.test.ts',
  },
  {
    // The flat mean over all 11 Technology aspects — the original OBS-21 defect, which took
    // three waves to clear out of five call sites.
    assertion: 'Technology is the mean of two sub-dimension means, not 11 aspects',
    file: 'scripts/xlsx/scoring-spec.ts',
    find: `  const subDimensionMeans = [
    meanOfAssessed(levels.technologyInfrastructureManagement),
    meanOfAssessed(levels.applicationManagement),
  ].filter((mean): mean is number => mean !== null);`,
    replace: `  const flat = meanOfAssessed([
    ...levels.technologyInfrastructureManagement,
    ...levels.applicationManagement,
  ]);
  const subDimensionMeans = flat === null ? [] : [flat];`,
    test: 'averages the two sub-dimension means, not the 11 aspects',
    testFile: 'scripts/xlsx/scoring-spec.test.ts',
  },
  {
    // The other half of OBS-21: right structure, wrong rounding point. No fixture in the suite
    // could distinguish this until one with a fractional inner mean was added.
    assertion: "Technology's inner sub-dimension means are not rounded first",
    file: 'scripts/xlsx/scoring-spec.ts',
    find: `  const subDimensionMeans = [
    meanOfAssessed(levels.technologyInfrastructureManagement),
    meanOfAssessed(levels.applicationManagement),
  ].filter((mean): mean is number => mean !== null);`,
    replace: `  const subDimensionMeans = [
    roundToOneDecimal(meanOfAssessed(levels.technologyInfrastructureManagement)),
    roundToOneDecimal(meanOfAssessed(levels.applicationManagement)),
  ].filter((mean): mean is number => mean !== null);`,
    test: 'agrees with the app: fractional inner mean',
    testFile: 'scripts/xlsx/scoring-spec.test.ts',
  },
  {
    assertion: 'a dimension with no score shrinks the divisor rather than counting as zero',
    file: 'scripts/xlsx/scoring-spec.ts',
    find: `  const present = scores.filter((score): score is number => score !== null);`,
    replace: `  const present = scores.map((score) => score ?? 0);`,
    test: 'drops dimensions with no score, shrinking the divisor',
    testFile: 'scripts/xlsx/scoring-spec.test.ts',
  },
  {
    assertion: 'the organizational area averages unrounded section means',
    file: 'scripts/xlsx/scoring-spec.ts',
    find: `  const sectionMeans = sectionLevels
    .map((levels) => meanOfAssessed(levels))
    .filter((mean): mean is number => mean !== null);`,
    replace: `  const sectionMeans = sectionLevels
    .map((levels) => roundToOneDecimal(meanOfAssessed(levels)))
    .filter((mean): mean is number => mean !== null);`,
    test: 'gives a different answer depending on where rounding happens',
    testFile: 'scripts/xlsx/scoring-spec.test.ts',
  },
  {
    assertion: 'completion counts N/A as assessed, inverting the exclusion rule',
    file: 'scripts/xlsx/scoring-spec.ts',
    find: `  const entered = levels.filter((level) => level !== '').length;`,
    replace: `  const entered = levels.filter((level) => typeof level === 'number' && level > 0).length;`,
    test: 'counts an N/A entry as complete',
    testFile: 'scripts/xlsx/scoring-spec.test.ts',
  },
  {
    assertion: 'an unknown column throws rather than addressing the wrong data',
    file: 'scripts/xlsx/scoring-spec.ts',
    find: `  if (index < 0) {
    throw new Error(\`No column named "\${key}". Available: \${columns.map((c) => c.key).join(', ')}\`);
  }`,
    replace: `  if (index < 0) {
    return 'A';
  }`,
    test: 'throws for an unknown column rather than guessing',
    testFile: 'scripts/xlsx/scoring-spec.test.ts',
  },
  {
    assertion: 'multi-letter column references are built in the right order',
    file: 'scripts/xlsx/scoring-spec.ts',
    find: `    letters = String.fromCharCode(65 + modulo) + letters;`,
    replace: `    letters += String.fromCharCode(65 + modulo);`,
    test: 'converts index',
    testFile: 'scripts/xlsx/scoring-spec.test.ts',
  },
  {
    // A single-cell reference into an input sheet is the sorting bug: a state reorders 1,625
    // rows and every such formula silently reads a different area's data.
    assertion: 'no formula reaches into an input sheet by row position',
    file: 'scripts/xlsx/scoring-spec.ts',
    find: `  return \`'\${sheetName}'!$\${letter}$\${FIRST_DATA_ROW}:$\${letter}$\${lastRow}\`;`,
    replace: `  return \`'\${sheetName}'!$\${letter}$\${FIRST_DATA_ROW}\`;`,
    test: 'never references a single cell on an input sheet',
    testFile: 'scripts/xlsx/profile-rows.test.ts',
  },
  {
    assertion: 'completion tests for a non-empty cell, not > 0',
    file: 'scripts/xlsx/scoring-spec.ts',
    find: `  return \`COUNTIFS(\${assessmentCriteria(criteria, extents)},\${levels},"<>")\`;`,
    replace: `  return \`COUNTIFS(\${assessmentCriteria(criteria, extents)},\${levels},">0")\`;`,
    test: 'counts a non-empty level cell, so N/A counts toward completion',
    testFile: 'scripts/xlsx/profile-rows.test.ts',
  },
  {
    assertion: 'the unrounded column carries no ROUND',
    file: 'scripts/xlsx/scoring-spec.ts',
    find: `  return \`IFERROR(AVERAGEIFS(\${levels},\${assessmentCriteria(criteria, extents)},\${levels},">0"),"")\`;`,
    replace: `  return \`IFERROR(ROUND(AVERAGEIFS(\${levels},\${assessmentCriteria(criteria, extents)},\${levels},">0"),1),"")\`;`,
    test: 'keeps the unrounded column free of ROUND on every row that has one',
    testFile: 'scripts/xlsx/profile-rows.test.ts',
  },
  {
    assertion: 'the organizational sections are scored against their own input sheet',
    file: 'scripts/xlsx/scoring-spec.ts',
    find: `  const levels = dataRange(
    SHEET_NAMES.ORGANIZATIONAL_INPUT,
    letterOf(ORGANIZATIONAL_INPUT_COLUMNS, levelKey),
    extents.organizationalLastRow
  );`,
    replace: `  const levels = dataRange(
    SHEET_NAMES.ASSESSMENT_INPUT,
    letterOf(ASSESSMENT_INPUT_COLUMNS, levelKey),
    extents.assessmentLastRow
  );`,
    test: 'scores an organizational section against the organizational input sheet',
    testFile: 'scripts/xlsx/profile-rows.test.ts',
  },
  {
    assertion: 'every computed sheet has the expected row count',
    file: 'scripts/xlsx/profile-rows.ts',
    find: `  for (const sectionId of ORGANIZATIONAL_SECTIONS) {
    const sheetRow = FIRST_DATA_ROW + rows.length;`,
    replace: `  for (const sectionId of ORGANIZATIONAL_SECTIONS.slice(0, 2)) {
    const sheetRow = FIRST_DATA_ROW + rows.length;`,
    test: 'builds the expected number of rows on each computed sheet',
    testFile: 'scripts/xlsx/profile-rows.test.ts',
  },
  {
    assertion: 'the 21 aggregate rows are labelled as aggregates',
    file: 'scripts/xlsx/profile-rows.ts',
    find: `    source: SCORE_SOURCES.aggregate,`,
    replace: `    source: SCORE_SOURCES.entered,`,
    test: 'marks 21 rows as aggregates, one per enterprise-domain area',
    testFile: 'scripts/xlsx/profile-rows.test.ts',
  },
  {
    assertion: 'an aggregate row has no To-Be figure',
    file: 'scripts/xlsx/profile-rows.ts',
    find: `    targetScore: NOT_APPLICABLE,`,
    replace: `    targetScore: formula(\`{{aggregate:\${dimensionId}}}\`),`,
    test: 'marks the To-Be cell not applicable on every aggregate row',
    testFile: 'scripts/xlsx/profile-rows.test.ts',
  },
  {
    // Reverts to the empty strings the first draft used, which produced 21 genuinely blank cells
    // on `06` in a workbook whose every other inapplicable cell says so in words.
    assertion: 'no computed-sheet cell is left empty',
    file: 'scripts/xlsx/profile-rows.ts',
    find: `    targetScore: NOT_APPLICABLE,`,
    replace: `    targetScore: '',`,
    test: 'writes no empty cell on any computed sheet',
    testFile: 'scripts/xlsx/profile-rows.test.ts',
  },
  {
    // The defect this wave shipped and then caught: the contributing-area count in the cell that
    // feeds completion's numerator, over a denominator that excludes the aggregated dimension.
    assertion: 'an aggregate row contributes zero assessed aspects',
    file: 'scripts/xlsx/profile-rows.ts',
    find: `    aspectsAssessed: 0,`,
    replace: `    aspectsAssessed: formula(\`{{aggregateUnrounded:\${dimensionId}}}\`),`,
    test: 'counts zero assessed aspects on an aggregate row',
    testFile: 'scripts/xlsx/profile-rows.test.ts',
  },
  {
    assertion: 'completion can never exceed 100%',
    file: 'scripts/xlsx/profile-rows.ts',
    find: `    aspectsAssessed: 0,`,
    replace: `    aspectsAssessed: formula(\`{{aggregateUnrounded:\${dimensionId}}}\`),`,
    test: 'cannot report completion above 100% on any area',
    testFile: 'scripts/xlsx/profile-rows.test.ts',
  },
  {
    assertion: 'the aggregate averages per-area scores, not raw input cells',
    file: 'scripts/xlsx/profile-rows.ts',
    find: `  const scoreRange = profileRange('currentScore', lastRow);`,
    replace: `  const scoreRange = dataRange(SHEET_NAMES.ASSESSMENT_INPUT, 'H', 1627);`,
    test: 'averages per-area scores for the aggregate, not raw input cells',
    testFile: 'scripts/xlsx/profile-rows.test.ts',
  },
  {
    assertion: 'the aggregate excludes both enterprise domains, not just its own',
    file: 'scripts/xlsx/profile-rows.ts',
    find: `        ...Object.keys(DOMAIN_AGGREGATE_DIMENSIONS).map((enterpriseDomainId) => ({
          range: domainIdRange,
          value: \`<>\${enterpriseDomainId}\`,
        })),`,
    replace: `        {
          range: domainIdRange,
          value: \`<>\${dimensionId === 'information' ? 'data-management' : 'technical'}\`,
        },`,
    test: 'excludes both enterprise domains from every aggregate',
    testFile: 'scripts/xlsx/profile-rows.test.ts',
  },
  {
    // Reverts to `TEXTJOIN`, which shipped broken twice: first stored without its `_xlfn.` prefix,
    // then still absent from Excel 2016 once the prefix was added. Either way, `#NAME?` in 648 cells.
    assertion: 'no function newer than Excel 2007 reaches the file',
    file: 'scripts/xlsx/scoring-spec.ts',
    find: `  return \`MID(\${terms.join('&')},\${TEXT_SEPARATOR.length + 1},32767)\`;`,
    replace: `  void terms;
  return \`TEXTJOIN("\${TEXT_SEPARATOR}",TRUE,'\${sheetName}'!$\${letter}$\${block.firstRow}:$\${letter}$\${block.lastRow})\`;`,
    test: 'uses no function newer than Excel 2007',
    testFile: 'scripts/xlsx/workbook.raw.test.ts',
  },
  {
    assertion: 'TEXTJOIN specifically stays out, and the columns it served stay in',
    file: 'scripts/xlsx/scoring-spec.ts',
    find: `  return \`MID(\${terms.join('&')},\${TEXT_SEPARATOR.length + 1},32767)\`;`,
    replace: `  void terms;
  return \`TEXTJOIN("\${TEXT_SEPARATOR}",TRUE,'\${sheetName}'!$\${letter}$\${block.firstRow}:$\${letter}$\${block.lastRow})\`;`,
    test: 'does not use TEXTJOIN, which needs Excel 2019 or later',
    testFile: 'scripts/xlsx/workbook.raw.test.ts',
  },
  {
    // Drops the per-cell emptiness guard, so every unfilled aspect contributes a bare separator and
    // a state with two notes among 26 aspects reads " |  |  | note |  | ...".
    assertion: 'each concatenation term skips its own empty cell',
    file: 'scripts/xlsx/scoring-spec.ts',
    find: `    terms.push(\`IF(\${cell}="","","\${TEXT_SEPARATOR}"&\${cell})\`);`,
    replace: `    terms.push(\`"\${TEXT_SEPARATOR}"&\${cell}\`);`,
    test: 'concatenates text with functions that exist in Excel 2007',
    testFile: 'scripts/xlsx/profile-rows.test.ts',
  },
  {
    // A sheet-wide block instead of the row's own: every area's text in every cell.
    assertion: 'each text formula references exactly its own group of rows',
    file: 'scripts/xlsx/rows.ts',
    find: `  return { firstRow, lastRow };`,
    replace: `  void lastRow;
  return { firstRow, lastRow: FIRST_DATA_ROW + rows.length - 1 };`,
    test: 'references exactly its own group of rows, one term per row',
    testFile: 'scripts/xlsx/profile-rows.test.ts',
  },
  {
    // Starting at 1 instead of past the separator leaves a leading " | " on every populated cell.
    assertion: 'the leading separator is stripped',
    file: 'scripts/xlsx/scoring-spec.ts',
    find: `  return \`MID(\${terms.join('&')},\${TEXT_SEPARATOR.length + 1},32767)\`;`,
    replace: `  return \`MID(\${terms.join('&')},1,32767)\`;`,
    test: 'strips the leading separator so a single entry has no prefix',
    testFile: 'scripts/xlsx/scoring-spec.test.ts',
  },
  {
    // Reverts to reusing the mean's criteria, which made the count a constant 50 because every row
    // exists at generation time. Found by a reviewer reading the emitted Notes cell.
    assertion: 'the aggregate note counts scored areas, not rows that exist',
    file: 'scripts/xlsx/profile-rows.ts',
    find: `      const count = countFormula([...criteria, { range: scoreRange, value: '>0' }]);`,
    replace: `      const count = countFormula(criteria);`,
    test: 'counts only areas that produced a score, not every row that exists',
    testFile: 'scripts/xlsx/profile-rows.test.ts',
  },
  {
    assertion: 'the aggregate note reads like the CSV profile',
    file: 'scripts/xlsx/profile-rows.ts',
    find: `              \`IF(\${count}=0,"No contributing capability areas yet",\` +
              \`"(Aggregate from "&\${count}&" assessment"&IF(\${count}=1,"","s")&")")\``,
    replace: `              \`"(Aggregate)"\``,
    test: 'writes the same contributing-count note the CSV writes',
    testFile: 'scripts/xlsx/profile-rows.test.ts',
  },
  {
    assertion: 'Technology reads its two sub-dimension mean cells',
    file: 'scripts/xlsx/profile-rows.ts',
    find: `    currentScore: formula(
      isTechnology
        ? technologyDimensionFormula(infrastructureCell, applicationCell)
        : plainDimensionFormula('currentLevel', dimensionCriteria, extents)
    ),`,
    replace: `    currentScore: formula(plainDimensionFormula('currentLevel', dimensionCriteria, extents)),`,
    test: 'scores Technology from its two sub-dimension mean cells',
    testFile: 'scripts/xlsx/profile-rows.test.ts',
  },
  {
    assertion: 'the sub-dimension mean cells stay unrounded',
    file: 'scripts/xlsx/profile-rows.ts',
    find: `    infrastructureCurrent: isTechnology
      ? formula(
          unroundedMeanFormula(
            'currentLevel',
            subDimensionCriteria('technologyInfrastructureManagement'),
            extents
          )
        )
      : NOT_APPLICABLE,`,
    replace: `    infrastructureCurrent: isTechnology
      ? formula(
          plainDimensionFormula(
            'currentLevel',
            subDimensionCriteria('technologyInfrastructureManagement'),
            extents
          )
        )
      : NOT_APPLICABLE,`,
    test: 'computes each Technology sub-dimension mean unrounded',
    testFile: 'scripts/xlsx/profile-rows.test.ts',
  },
  {
    assertion: 'the organizational area averages the unrounded column, standard areas the rounded',
    file: 'scripts/xlsx/profile-rows.ts',
    find: `    const scoreKey = organizational ? 'currentUnrounded' : 'currentScore';
    const targetKey = organizational ? 'targetUnrounded' : 'targetScore';`,
    replace: `    const scoreKey = 'currentScore';
    const targetKey = 'targetScore';`,
    test: 'averages unrounded section means for the organizational area',
    testFile: 'scripts/xlsx/profile-rows.test.ts',
  },
  {
    assertion: 'completion divides by the area-specific assessable count',
    file: 'scripts/xlsx/profile-rows.ts',
    find: `    const assessable = getAssessableAspectCountForArea(area.id, domain.id);`,
    replace: `    const assessable = 26;`,
    test: 'divides completion by the area-specific assessable count',
    testFile: 'scripts/xlsx/profile-rows.test.ts',
  },
  {
    assertion: 'the overall row averages area scores, not the 14 domain scores',
    file: 'scripts/xlsx/profile-rows.ts',
    find: `    currentScore: formula(\`IFERROR(ROUND(AVERAGE(\${scoreRange}),1),"")\`),
    targetScore: formula(\`IFERROR(ROUND(AVERAGE(\${targetRange}),1),"")\`),
    areasScored: formula(\`COUNT(\${scoreRange})\`),`,
    replace: `    currentScore: formula(
      \`IFERROR(ROUND(AVERAGE('\${SHEET_NAMES.DOMAIN_SCORES}'!$C$3:$C$16),1),"")\`
    ),
    targetScore: formula(\`IFERROR(ROUND(AVERAGE(\${targetRange}),1),"")\`),
    areasScored: formula(\`COUNT(\${scoreRange})\`),`,
    test: 'computes the overall row from area scores, not domain scores',
    testFile: 'scripts/xlsx/profile-rows.test.ts',
  },
  {
    assertion: 'a domain score averages only its own areas',
    file: 'scripts/xlsx/profile-rows.ts',
    find: `      currentScore: formula(filteredMeanFormula(scoreRange, criteria)),
      targetScore: formula(filteredMeanFormula(targetRange, criteria)),
      areasScored: formula(\`COUNTIFS(\${domainIdRange},"\${domain.id}",\${scoreRange},">0")\`),`,
    replace: `      currentScore: formula(\`IFERROR(ROUND(AVERAGE(\${scoreRange}),1),"")\`),
      targetScore: formula(\`IFERROR(ROUND(AVERAGE(\${targetRange}),1),"")\`),
      areasScored: formula(\`COUNTIFS(\${domainIdRange},"\${domain.id}",\${scoreRange},">0")\`),`,
    test: 'averages one domain from its own areas only',
    testFile: 'scripts/xlsx/profile-rows.test.ts',
  },
  {
    // Without the source filter the 21 aggregate rows join the enterprise-wide figure, counting
    // those areas twice: once directly and once through the aggregate derived from them.
    assertion: 'the enterprise-wide dimension figure excludes aggregate rows',
    file: 'scripts/xlsx/profile-rows.ts',
    find: `    const criteria = [
      { range: dimensionIdRange, value: dimensionId },
      { range: sourceRange, value: SCORE_SOURCES.entered },
    ];`,
    replace: `    const criteria = [{ range: dimensionIdRange, value: dimensionId }];`,
    test: 'excludes aggregate rows from the enterprise-wide dimension figure',
    testFile: 'scripts/xlsx/profile-rows.test.ts',
  },
  {
    assertion: 'the enterprise-wide figure shows its own denominator',
    file: 'scripts/xlsx/profile-rows.ts',
    find: `      areaCount: formula(
        \`COUNTIFS(\${dimensionIdRange},"\${dimensionId}",\${sourceRange},"\${SCORE_SOURCES.entered}",\${scoreRange},">0")\`
      ),`,
    replace: `      areaCount: 71,`,
    test: 'shows a visible Areas denominator on each dimension row',
    testFile: 'scripts/xlsx/profile-rows.test.ts',
  },
  {
    assertion: 'input data is addressed by ID column, never by position',
    file: 'scripts/xlsx/profile-rows.ts',
    find: `  const areaCriteria = [{ key: 'areaId', value: area.id }];`,
    replace: `  const areaCriteria: Array<{ key: string; value: string }> = [];`,
    test: 'addresses input data by ID column on every profile row that reads it',
    testFile: 'scripts/xlsx/profile-rows.test.ts',
  },
  {
    // `halfway.test.ts` shares the app's rounding primitive on purpose, so it is blind to Excel
    // differing — but it must still notice the app's own primitive changing under it.
    assertion: "the divergence enumeration tracks the app's real rounding primitive",
    file: 'scripts/xlsx/scoring-spec.ts',
    find: `  return value === null ? null : Math.round(value * 10) / 10;`,
    replace: `  return value === null ? null : Math.round(value * 100) / 100;`,
    test: 'splits on 4.05 / 3 exactly as the plan describes',
    testFile: 'scripts/xlsx/halfway.test.ts',
  },
  {
    assertion: 'the 313 divergent organizational cases are really enumerated',
    file: 'scripts/xlsx/scoring-spec.ts',
    find: `  return value === null ? null : Math.round(value * 10) / 10;`,
    replace: `  return value === null ? null : Math.round(value * 100) / 100;`,
    test: 'finds 313 divergent organizational area scores',
    testFile: 'scripts/xlsx/halfway.test.ts',
  },
  {
    // Found by evaluating the workbook in Excel: an aggregate is computed domain-wide from other
    // domains' areas, so it is non-empty while the area holding it is untouched. Without the guard,
    // 21 areas the state never opened joined the domain and overall averages.
    assertion: 'an untouched area scores blank even when its aggregate is live',
    file: 'scripts/xlsx/profile-rows.ts',
    find: `      currentScore: formula(enteredGuard(meanOfCellsFormula(currentCells))),`,
    replace: `      currentScore: formula(meanOfCellsFormula(currentCells)),`,
    test: 'blanks an area score until the state has entered something for that area',
    testFile: 'scripts/xlsx/profile-rows.test.ts',
  },
  {
    // The guard and the completion numerator must count the same cells, or the workbook can report
    // a score for an area it simultaneously calls 0% complete.
    assertion: 'the entered guard and the completion numerator count the same cells',
    file: 'scripts/xlsx/profile-rows.ts',
    find: `      completion: formula(\`ROUND(\${enteredCount}/\${assessable}*100,0)\`),`,
    replace: `      completion: formula(\`ROUND(COUNT(\${currentCells.join(',')})/\${assessable}*100,0)\`),`,
    test: 'gates the score on the same cells completion counts',
    testFile: 'scripts/xlsx/profile-rows.test.ts',
  },
  {
    assertion: 'the Excel model rounds half AWAY from zero, not half up past the midpoint',
    file: 'scripts/xlsx/excel-rounding.ts',
    find: `  const tenths = Number(whole) * 10 + firstDecimal + (secondDecimal >= 5 ? 1 : 0);`,
    replace: `  const tenths = Number(whole) * 10 + firstDecimal + (secondDecimal > 5 ? 1 : 0);`,
    test: 'matches both models for each fixture',
    testFile: 'scripts/xlsx/halfway.test.ts',
  },
  {
    // The mutation that caught the model modelling the wrong thing. The first implementation
    // survived this unchanged, because a float fudge downstream was absorbing the difference —
    // which meant the "15 significant digits" mechanism was decorative.
    assertion: 'the Excel model normalises to 15 significant digits before rounding',
    file: 'scripts/xlsx/excel-rounding.ts',
    find: `  const normalised = Math.abs(value).toPrecision(15);`,
    replace: `  const normalised = String(Math.abs(value));`,
    test: 'rounds on the normalised decimal digits, not on the raw float',
    testFile: 'scripts/xlsx/halfway.test.ts',
  },
];

/** Vitest colourises its summary, which defeats a naive regex over the output. */
function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\u001B\[[0-9;]*m/g, '');
}

/**
 * `execSync` options.
 *
 * `maxBuffer` is raised because one mutation — adding an image — makes vitest dump every
 * image anchor and produces ~195 MB of output. At the 1 MB default `execSync` throws
 * `ENOBUFS` and the classifier then reads a prefix that does not contain the summary line,
 * so the outcome was decided by a coincidental substring match rather than by the summary.
 */
const EXEC_OPTIONS = { stdio: 'pipe', encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 } as const;

function runCommand(testCase: MutationCase): string {
  const file = testCase.testFile ?? DEFAULT_TEST_FILE;
  // `--silent` suppresses per-test console output. Without it the image mutation makes
  // vitest dump every image anchor — roughly 195 MB — which overran the buffer and left
  // the classifier reading a prefix with no summary line in it.
  return `npx vitest run ${file} --silent -t ${JSON.stringify(testCase.test)}`;
}

/**
 * Decide what a non-zero vitest exit actually means.
 *
 * The distinction matters more than it looks. A loose `/\d+ failed/` also matches
 * `Test Files  1 failed (1)`, which vitest prints on a **collection error** — so a mutation
 * that broke the module at import time, running zero assertions, was reported as proof that
 * the assertion works. `41 of 41` is the evidence behind the accessibility claim, and it
 * cannot rest on a check that a broken import satisfies.
 *
 * So the summary line is required, and "no tests ran" is its own outcome that counts
 * against the total rather than for it.
 */
function classifyFailure(output: string): string {
  if (/Tests\s+no tests/.test(output)) {
    return 'NO-ASSERTION-RAN';
  }
  if (/Tests\s+\d+\s+failed/.test(output)) {
    return 'FAILS-AS-EXPECTED';
  }
  return 'ERRORED';
}

/**
 * Run every mutation.
 *
 * Wrapped in a function, and only invoked when this module is the process entry point, so
 * that `footer.test.ts` can import `MUTATION_CASES` to check for staleness without
 * triggering a multi-minute run that rewrites source files mid-test.
 */
function proveAssertions(): void {
  const backupDir = mkdtempSync(join(tmpdir(), 'xlsx-prove-'));
  for (const source of SOURCES) {
    copyFileSync(source, join(backupDir, source.replace(/\//g, '_')));
  }

  function restore(): void {
    for (const source of SOURCES) {
      copyFileSync(join(backupDir, source.replace(/\//g, '_')), source);
    }
  }

  /**
   * Restore on any exit path, not just the happy one.
   *
   * Without this, interrupting the run leaves a deliberately broken generator on disk —
   * and the mutations are plausible enough that the damage would not be obvious from a
   * glance at the diff.
   */
  process.on('exit', restore);
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) {
    process.on(signal, () => {
      restore();
      process.exit(1);
    });
  }

  const results: MutationResult[] = [];

  for (const testCase of MUTATION_CASES) {
    const original = readFileSync(testCase.file, 'utf8');

    if (!original.includes(testCase.find)) {
      // The generator changed and this mutation no longer applies. Reported rather than
      // skipped silently, because a stale mutation is an unproved assertion.
      // `footer.test.ts` catches this case in milliseconds so it does not depend on
      // somebody remembering to run the slow harness.
      results.push({ ...testCase, outcome: 'MUTATION-NOT-APPLIED' });
      continue;
    }

    writeFileSync(
      testCase.file,
      original.replace(testCase.find, () => testCase.replace)
    );

    let outcome: string;
    try {
      const output = execSync(runCommand(testCase), EXEC_OPTIONS);
      // A zero exit with no matching test is not a pass — it means the -t filter did
      // not select anything, which would report every mutation as vacuous.
      outcome = /No test found/.test(stripAnsi(output))
        ? 'FILTER-MATCHED-NOTHING'
        : 'VACUOUS-STILL-PASSES';
    } catch (error) {
      const failure = error as { stdout?: string; stderr?: string };
      const output = stripAnsi(String(failure.stdout ?? '') + String(failure.stderr ?? ''));
      outcome = classifyFailure(output);
      if (outcome !== 'FAILS-AS-EXPECTED') {
        results.push({ ...testCase, outcome, detail: output.slice(-600) });
        restore();
        continue;
      }
    }

    results.push({ ...testCase, outcome });
    restore();
  }

  restore();

  console.log('\n=== Mutation results ===\n');
  let unproved = 0;
  for (const result of results) {
    const marker = result.outcome === 'FAILS-AS-EXPECTED' ? 'ok  ' : 'FAIL';
    console.log(`${marker} ${result.assertion.padEnd(50)} ${result.outcome}`);
    if (result.outcome !== 'FAILS-AS-EXPECTED') {
      unproved += 1;
      if (result.detail) {
        console.log(result.detail);
      }
    }
  }
  console.log(`\n${results.length - unproved} of ${results.length} assertions proved failable.`);
  if (unproved > 0) {
    console.log(
      'An assertion that stays green under its mutation is a defect in the test, not in the mutation.'
    );
  }
  process.exitCode = unproved === 0 ? 0 : 1;
}

/**
 * Only run when invoked directly, never on import.
 *
 * `footer.test.ts` imports `MUTATION_CASES` to check the mutations are still current, and
 * without this guard that import would kick off a multi-minute run that rewrites generator
 * source files while the suite is executing.
 */
if (process.argv[1] !== undefined && process.argv[1].endsWith('prove-assertions.ts')) {
  proveAssertions();
}
