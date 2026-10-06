/**
 * ExcelJS assembly for the MITA 4.0 self-assessment workbook.
 *
 * This layer places rows built by `rows.ts` and `readme.ts` onto sheets and applies
 * the 508 structure from Section 5.3 of the pilot clearance plan. It deliberately
 * builds no content of its own, so a content defect fails a `rows.test.ts` assertion
 * and a structure defect fails a `workbook.test.ts` assertion.
 *
 * ExcelJS is a pinned devDependency and must never reach the browser bundle
 * (Decision 12). The vendor chunk is already 450 kB gzipped and over its own warning
 * threshold (OBS-20), and this workbook is generated at build time, so it costs the
 * shipped app nothing.
 *
 * ## What 5.3 requires, and where each requirement is implemented here
 *
 * | Requirement                              | Where                          |
 * | ---------------------------------------- | ------------------------------ |
 * | No merged cells                          | nothing in this file merges    |
 * | One header row per table                 | `HEADER_ROW`, `addTableSheet`  |
 * | No blank rows or columns inside tables   | `addTableSheet`, no spacers    |
 * | Not conveyed by colour alone             | `renderHeader` suffix          |
 * | Descriptive tab names                    | `SHEET_NAMES`                  |
 * | No images or floating objects            | nothing adds one               |
 * | Document properties set                  | `applyDocumentProperties`      |
 * | Print header/footer duplicated in-sheet  | `applyNoticeRow` + footer      |
 * | Locked cells reachable by AT             | `selectLockedCells: true`      |
 * | ID columns visible, outside the range    | `identifier` columns, no hide  |
 * | Defined table ranges                     | `NAMED_RANGES`                 |
 */

import ExcelJS from 'exceljs';

import {
  DRAFT_NOTICE_FULL_BODY,
  DRAFT_NOTICE_LABEL,
  DRAFT_NOTICE_SHORT_LINE,
} from '../../src/constants/draftNotice.ts';
import {
  AREA_SCORES_COLUMNS,
  ASSESSMENT_INPUT_COLUMNS,
  CAPABILITY_REFERENCE_COLUMNS,
  COLORS,
  CRITERIA_REFERENCE_COLUMNS,
  DIMENSION_SCORES_COLUMNS,
  DOMAIN_SCORES_COLUMNS,
  FIRST_DATA_ROW,
  HEADER_ROW,
  HEADER_ROW_HEIGHT,
  LEVEL_DROPDOWN_VALUES,
  MATURITY_LEVEL_COLUMNS,
  MATURITY_PROFILE_COLUMNS,
  NAMED_RANGES,
  NOTICE_ROW,
  ORGANIZATIONAL_INPUT_COLUMNS,
  SHEET_NAMES,
  renderHeader,
  type ColumnDefinition,
} from './constants.ts';
import {
  buildAreaScoreRows,
  buildDimensionScoreRows,
  buildDomainScoreRows,
  buildMaturityProfileRows,
  resolveAggregateFormulas,
} from './profile-rows.ts';
import type { InputExtents } from './scoring-spec.ts';
import { buildReadmeRows } from './readme.ts';
import {
  buildAssessmentInputRows,
  buildCapabilityReferenceRows,
  buildCriteriaReferenceRows,
  buildMaturityLevelRows,
  buildOrganizationalInputRows,
  type SheetRow,
} from './rows.ts';
import { isDraft } from './env.ts';
import { getCapabilityModel, getOrbitModel } from './model.ts';
import { getBuildTimestamp } from './paths.ts';

/** Two columns of the README, in character-width units. */
const README_LABEL_WIDTH = 34;
const README_VALUE_WIDTH = 110;

/**
 * Build the complete workbook.
 *
 * Sheets `06`-`09` are Wave 7. The README already lists them as not yet included, so
 * the Wave 6 artifact is internally consistent rather than pointing at tabs that do
 * not exist.
 */
export function buildWorkbook(): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  applyDocumentProperties(workbook);

  addReadmeSheet(workbook);

  addTableSheet(workbook, {
    name: SHEET_NAMES.MATURITY_LEVELS,
    columns: MATURITY_LEVEL_COLUMNS,
    rows: buildMaturityLevelRows(),
    freezeColumns: 0,
  });

  addTableSheet(workbook, {
    name: SHEET_NAMES.CAPABILITY_REFERENCE,
    columns: CAPABILITY_REFERENCE_COLUMNS,
    rows: buildCapabilityReferenceRows(),
    freezeColumns: 2,
  });

  addTableSheet(workbook, {
    name: SHEET_NAMES.CRITERIA_REFERENCE,
    columns: CRITERIA_REFERENCE_COLUMNS,
    rows: buildCriteriaReferenceRows(),
    freezeColumns: 3,
  });

  addTableSheet(workbook, {
    name: SHEET_NAMES.ASSESSMENT_INPUT,
    columns: ASSESSMENT_INPUT_COLUMNS,
    rows: buildAssessmentInputRows(),
    freezeColumns: 2,
  });

  const assessmentRows = buildAssessmentInputRows().length;
  const organizationalRows = buildOrganizationalInputRows().length;

  addTableSheet(workbook, {
    name: SHEET_NAMES.ORGANIZATIONAL_INPUT,
    columns: ORGANIZATIONAL_INPUT_COLUMNS,
    rows: buildOrganizationalInputRows(),
    freezeColumns: 2,
  });

  addComputedSheets(workbook, {
    assessmentLastRow: HEADER_ROW + assessmentRows,
    organizationalLastRow: HEADER_ROW + organizationalRows,
  });

  return workbook;
}

/**
 * The four computed sheets, `06` through `09`.
 *
 * Built in dependency order and the order matters: `07` needs to know where each row landed on
 * `06`, `08` reads `07`, and `09` reads `06`. The profile row index threads that through rather
 * than each sheet recomputing addresses, because two independent derivations of "which row is
 * Provider Enrollment's Technology score" is exactly how a formula silently addresses the wrong
 * area.
 */
function addComputedSheets(workbook: ExcelJS.Workbook, extents: InputExtents): void {
  const profile = buildMaturityProfileRows(extents);
  resolveAggregateFormulas(profile);

  addTableSheet(workbook, {
    name: SHEET_NAMES.MATURITY_PROFILE,
    columns: MATURITY_PROFILE_COLUMNS,
    rows: profile.rows,
    freezeColumns: 3,
  });

  const areaRows = buildAreaScoreRows(profile);
  addTableSheet(workbook, {
    name: SHEET_NAMES.AREA_SCORES,
    columns: AREA_SCORES_COLUMNS,
    rows: areaRows,
    freezeColumns: 3,
  });

  addTableSheet(workbook, {
    name: SHEET_NAMES.DOMAIN_SCORES,
    columns: DOMAIN_SCORES_COLUMNS,
    rows: buildDomainScoreRows(HEADER_ROW + areaRows.length),
    freezeColumns: 2,
  });

  addTableSheet(workbook, {
    name: SHEET_NAMES.DIMENSION_SCORES,
    columns: DIMENSION_SCORES_COLUMNS,
    rows: buildDimensionScoreRows(profile.lastRow),
    freezeColumns: 1,
  });
}

// =============================================================================
// Document properties
// =============================================================================

/**
 * Set the document properties 5.3 requires.
 *
 * These are not cosmetic. A screen reader announces the title when the file opens,
 * and 508 review checks for them explicitly. `description` carries the full
 * predecisional notice including the PRA statement, so the notice travels with the
 * file even if someone extracts a single sheet.
 */
function applyDocumentProperties(workbook: ExcelJS.Workbook): void {
  const orbitModel = getOrbitModel();
  const capabilityModel = getCapabilityModel();
  const draftPrefix = isDraft() ? `${DRAFT_NOTICE_LABEL} — ` : '';

  workbook.title = `${draftPrefix}MITA 4.0 State Self-Assessment Workbook`;
  workbook.subject =
    `MITA 4.0 State Self-Assessment using the ORBIT Maturity Model. ` +
    `Capability Reference Model ${capabilityModel.version}, Maturity Model ${orbitModel.version}.`;
  workbook.description = isDraft()
    ? `${DRAFT_NOTICE_LABEL}: ${DRAFT_NOTICE_FULL_BODY}`
    : 'Offline workbook equivalent of the MITA 4.0 State Self-Assessment Tool.';
  workbook.creator = 'MITA 4.0 State Self-Assessment Tool';
  workbook.lastModifiedBy = 'MITA 4.0 State Self-Assessment Tool';
  workbook.category = 'Medicaid Enterprise Systems; MITA 4.0; Self-Assessment';
  workbook.keywords = 'MITA 4.0; ORBIT; maturity model; Medicaid; self-assessment';
  workbook.company = 'Centers for Medicare & Medicaid Services';
  // A build input, not the clock — see `getBuildTimestamp`. Keeps the artifact
  // reproducible when `SOURCE_DATE_EPOCH` is set, so CI has the option of diffing bytes.
  const timestamp = getBuildTimestamp();
  workbook.created = timestamp;
  workbook.modified = timestamp;
}

// =============================================================================
// Shared sheet furniture
// =============================================================================

/**
 * Write the notice into `A1` and the print header/footer.
 *
 * Option D of the disclaimer treatment, settled with the user on September 14. Three
 * placements, each covering a gap the others leave:
 *
 * - **`A1`, short line.** Ctrl+Home lands here, so a keyboard or screen reader user
 *   meets the notice before any data. Excel reopens a file on its last active sheet,
 *   so a per-sheet notice is the only way a reviewer who lands on `04_Assessment_Input`
 *   sees one at all.
 * - **Print footer, short line.** Covers printed and PDF'd copies, where cell A1 of a
 *   1,625-row sheet appears only on the first page.
 * - **README and the `description` property, full text including the PRA statement.**
 *   The substantive statement, in the two places with room for it.
 *
 * ## Why the footer carries the short line and not the full PRA statement
 *
 * It was specified as the full line, and **the full line does not fit**. Excel's limit
 * for a footer is 255 characters; `DRAFT_NOTICE_LINE` alone is 420, and with the `&L&8`
 * and page-number codes the string is 441. Over-length footer text is rejected or
 * truncated by Excel, which would have produced a *silently mangled* PRA statement —
 * worse than an abbreviated one.
 *
 * Shortening the wording was not available either: Decision 15 requires the CMS-supplied
 * text verbatim, and the PRA sentence by itself exceeds 255. So the full statement
 * cannot go in an Excel footer at all, by anyone, and the README plus the document
 * `description` property carry it instead. `assertFooterFits` makes the constraint
 * enforced rather than remembered.
 *
 * This mirrors what the PDF already does — full statement on the cover, short line in
 * the per-page footer — so the two artifacts are consistent.
 *
 * Note 5.3 also requires that print-header content appear as sheet content, because
 * screen readers do not read print headers. The footer's short line is exactly what
 * `A1` carries, so that rule is satisfied per sheet; the full text's in-sheet home is
 * the README.
 */
function applyNoticeRow(sheet: ExcelJS.Worksheet): void {
  const cell = sheet.getCell(NOTICE_ROW, 1);
  cell.font = { bold: true, color: { argb: COLORS.noticeFont }, size: 11 };
  cell.alignment = { vertical: 'middle', horizontal: 'left' };

  // Row 1 is never left empty. At go-live (`VITE_DRAFT_MODE=false`) the notice is gone,
  // but the row stays and carries the sheet's own name instead. Two reasons: the
  // workbook must contain no blank rows in either mode, and the table geometry stays
  // fixed, so Wave 7's formula ranges do not have to be mode-dependent.
  cell.value = isDraft() ? DRAFT_NOTICE_SHORT_LINE : sheet.name;

  // Deliberately one cell, not merged across the table's width: 5.3 forbids merged
  // cells outright, and Excel lets a long string overflow into the empty cells beside
  // it, so the notice reads across the sheet without any merge.

  // No page numbers. `&P of &N` reported nonsense in Excel — "1 of 24" on the first page
  // and "114 of 24" after scrolling right — because the sheet spans a grid of pages rather
  // than a single column of them, and `&N` counts only one dimension of that grid. Dropped
  // on the user's call during Excel verification rather than papered over: on a sheet nobody
  // prints whole, a page number that contradicts itself is worse than none.
  if (isDraft()) {
    const footer = `&L&8${escapeHeaderFooter(DRAFT_NOTICE_SHORT_LINE)}`;
    assertFooterFits(sheet.name, footer);
    sheet.headerFooter.oddFooter = footer;
    // `evenFooter` is deliberately not set. Without a `differentOddEven` flag Excel uses
    // `oddFooter` for every page and ignores `evenFooter`, so setting it would be dead
    // weight that reads like coverage.
  }
}

/**
 * Excel rejects or truncates a header/footer longer than this.
 *
 * Exported so the boundary is unit-tested. It previously was not, which meant the guard
 * the prose called "enforced rather than remembered" had no coverage on either side of the
 * comparison — an inverted `>` or a wrong limit would have gone unnoticed.
 */
export const HEADER_FOOTER_LIMIT = 255;

/**
 * Fail the build rather than emit a footer Excel will mangle.
 *
 * **No test can verify that Excel *accepts* a given footer** — the bytes we write are
 * exactly what we intended, so a round-trip or raw-XML assertion passes and only Excel
 * objects. That is a narrower claim than "no test can catch a regression here", which an
 * earlier version of this comment made and which was false: the suites do assert the
 * emitted footer is within the limit, and that assertion is mutation-proved. What the
 * throw adds is failing at generation time rather than at a reviewer's desk.
 *
 * It matters because the string is a legally significant notice, and a silently truncated
 * PRA statement is worse than an absent one.
 */
export function assertFooterFits(sheetName: string, footer: string): void {
  if (footer.length > HEADER_FOOTER_LIMIT) {
    throw new Error(
      `Print footer for ${sheetName} is ${footer.length} characters; Excel's limit is ` +
        `${HEADER_FOOTER_LIMIT}. Excel truncates or rejects longer text, so this would ship ` +
        'a mangled notice. Shorten the footer, or move the text to the README.'
    );
  }
}

/**
 * Escape a string for an Excel print header/footer.
 *
 * `&` is the formatting-code introducer in that mini-language, so an unescaped `&`
 * in the notice text would silently swallow the following character. The notice has
 * no `&` today; `Centers for Medicare & Medicaid Services` does, and this function
 * exists so that adding it later cannot corrupt the footer.
 */
function escapeHeaderFooter(text: string): string {
  return text.replace(/&/g, '&&');
}

/**
 * `Worksheet.dataValidations`, which ExcelJS ships at runtime but omits from its
 * published type definitions.
 *
 * A narrow local shape rather than a global module augmentation: augmenting the module
 * would assert this about ExcelJS everywhere, and upstream has been dormant since
 * v4.4.0 (October 2023), so the types are unlikely to be corrected and equally unlikely
 * to be verified. Keeping the assertion at the one call site that needs it means the
 * risk is visible where it is taken. The runtime behaviour is pinned by
 * `workbook.raw.test.ts`, which reads the emitted `<dataValidation>` element.
 */
interface RangeValidatableWorksheet {
  dataValidations: {
    add(range: string, validation: ExcelJS.DataValidation): void;
  };
}

function asRangeValidatable(sheet: ExcelJS.Worksheet): RangeValidatableWorksheet {
  return sheet as unknown as RangeValidatableWorksheet;
}

interface TableSheetSpec {
  name: string;
  columns: readonly ColumnDefinition[];
  rows: SheetRow[];
  /** Columns to freeze alongside the header, for horizontal scrolling context. */
  freezeColumns: number;
}

/**
 * Add one flat table sheet: notice on row 1, single header row on row 2, data below.
 *
 * The flat shape is the heart of the 508 fix. The reference implementation grouped
 * rows under merged domain and area label rows with blank spacers between groups;
 * every row here instead carries its own domain, area, and dimension in real columns.
 * That removes the merges and the blanks, makes autofilter work, and means a screen
 * reader user reading row 900 knows what it belongs to without navigating upward.
 */
function addTableSheet(workbook: ExcelJS.Workbook, spec: TableSheetSpec): void {
  const sheet = workbook.addWorksheet(spec.name);

  // Vertical alignment is set on **every** column, not only the wrapping ones.
  //
  // Excel's default is bottom, and only the wrap columns were being set to top — so on a
  // row made tall by a wrapped question, the short values sat at the bottom while the
  // question started at the top, and a state's typed notes floated above their own As-Is
  // level. Found in Excel during review; invisible to every structural assertion, because
  // alignment is not a 508 property.
  //
  // Top rather than bottom, which is the opposite of the first instinct: on a row whose
  // height is driven by one long wrapped cell, top-alignment puts each value on the same
  // visual line as the beginning of the text it answers. Bottom-alignment also lines the
  // values up with each other, but pushes them away from the start of the question. It is a
  // one-word change here if that reads better in practice.
  spec.columns.forEach((column, index) => {
    const sheetColumn = sheet.getColumn(index + 1);
    sheetColumn.width = column.width;
    sheetColumn.alignment = { vertical: 'top', wrapText: column.wrap === true };
  });

  applyNoticeRow(sheet);

  const headerRow = sheet.getRow(HEADER_ROW);
  spec.columns.forEach((column, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = renderHeader(column);
    cell.font = { bold: true, color: { argb: COLORS.headerFont } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerFill } };
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
  });
  headerRow.height = HEADER_ROW_HEIGHT;
  headerRow.commit();

  spec.rows.forEach((row, rowIndex) => {
    const sheetRow = sheet.getRow(FIRST_DATA_ROW + rowIndex);
    spec.columns.forEach((column, columnIndex) => {
      const cell = sheetRow.getCell(columnIndex + 1);
      const value = row[column.key];
      // `null`, not `''`. An empty string is a *text cell holding nothing*, so
      // `ISBLANK` returns FALSE and `COUNTBLANK` returns 0 — which would make any
      // completion formula of the form "count the filled-in level cells" report
      // a blank workbook as 100% complete, while the score formulas (`AVERAGEIF` with
      // `">0"`, which skips text) correctly reported nothing. Two figures on one sheet
      // disagreeing about the same cells is the worst available outcome.
      //
      // ExcelJS still emits the cell with its style when the value is null, so the
      // input fill and the unlocked protection survive. Excel also drops empty-string
      // cells on save, so writing them would have made a state's re-saved file behave
      // differently from the generated one.
      //
      // A `{ formula }` object needs no special case: that is ExcelJS's own shape for a
      // formula cell, so assigning it works exactly like assigning a string or a number and
      // the computed sheets inherit this sheet's styling, protection and 508 treatment for
      // free. An earlier version branched on it and returned `value` either way, which was
      // dead logic dressed up as a special case.
      cell.value = value === undefined || value === '' ? null : value;
      // No per-cell alignment: the column-level alignment set above is merged into each
      // cell's own style by ExcelJS, verified in `styles.xml` — the editable cells carry
      // `applyAlignment="1"` with `vertical="top"` even though only the column was set.
      // Setting it here as well was redundant, and redundant enough that a mutation could
      // not tell the two mechanisms apart, which made the alignment assertion unprovable.
      if (column.editable) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.inputFill } };
        // All four sides, because both directions were lost. The fill hides Excel's
        // gridlines, so without this the input block is an undifferentiated area: rows are
        // hard to track across a wide sheet, and the three adjacent text columns on `04`
        // have no visible boundary at all. See `COLORS.inputBorder`.
        const edge = { style: 'thin' as const, color: { argb: COLORS.inputBorder } };
        cell.border = { top: edge, left: edge, bottom: edge, right: edge };
        // Unlocked before the sheet-level protection below, which locks everything else.
        cell.protection = { locked: false };
      }
    });
    sheetRow.commit();
  });

  const lastRow = FIRST_DATA_ROW + spec.rows.length - 1;

  applyFreezePanes(sheet, spec.freezeColumns);
  applyAutoFilter(sheet, spec.columns.length, lastRow);
  applyLevelValidation(sheet, spec.columns, lastRow);
  applyNamedRange(workbook, sheet, spec, lastRow);
  applyPrintSetup(sheet);
  protectSheet(sheet);
}

/**
 * Freeze the notice row, the header row, and optionally leading columns.
 *
 * `ySplit` is `HEADER_ROW` rather than 1 so the header stays visible while scrolling
 * a 1,625-row sheet. Deriving it from the constant rather than writing `2` means the
 * freeze cannot drift out of step if the notice row ever moves.
 */
function applyFreezePanes(sheet: ExcelJS.Worksheet, freezeColumns: number): void {
  sheet.views = [
    {
      state: 'frozen',
      ySplit: HEADER_ROW,
      xSplit: freezeColumns,
      topLeftCell: cellReference(FIRST_DATA_ROW, freezeColumns + 1),
      activeCell: cellReference(FIRST_DATA_ROW, 1),
    },
  ];
}

/**
 * Attach an autofilter to the header row.
 *
 * Only possible because the table is flat. The reference implementation's blank
 * spacer rows would have truncated the filter range at the first gap, which is a
 * good illustration of the 508 fix and the usability fix being the same change.
 */
function applyAutoFilter(sheet: ExcelJS.Worksheet, columnCount: number, lastRow: number): void {
  if (lastRow < FIRST_DATA_ROW) {
    return;
  }
  sheet.autoFilter = {
    from: { row: HEADER_ROW, column: 1 },
    to: { row: lastRow, column: columnCount },
  };
}

/**
 * Attach the level dropdown to the editable level columns.
 *
 * `allowBlank` is true because blank is a meaningful value — not yet assessed — and
 * distinct from `N/A`. `showErrorMessage` is on so a typo is rejected at entry rather
 * than silently producing a cell Wave 7's formulas skip.
 *
 * ## Applied as a range, not cell by cell
 *
 * Assigning `cell.dataValidation` on each of the 3,250 cells looks equivalent and is
 * not: **ExcelJS's range coalescer sorts cell addresses as strings**, so `H10` sorts
 * before `H3`, and it emits two overlapping `<dataValidation>` elements —
 * `H10:I1627` nested inside `H3:I1627`. Any validated range that starts below row 10
 * and extends past it hits this, which is every input sheet here.
 *
 * Excel tolerates the duplicate, so nothing visibly breaks, and **the defect is
 * invisible to a round-trip test**: ExcelJS's reader expands both elements back to the
 * same set of cells, so a per-cell count returns 1,625 either way. It was found by
 * unzipping the artifact and reading the OOXML. `workbook.raw.test.ts` now asserts the
 * element count directly, because that is the only layer at which the two forms differ.
 */
function applyLevelValidation(
  sheet: ExcelJS.Worksheet,
  columns: readonly ColumnDefinition[],
  lastRow: number
): void {
  const levelColumnIndexes = columns
    .map((column, index) => ({ column, index }))
    .filter(({ column }) => column.key === 'currentLevel' || column.key === 'targetLevel')
    .map(({ index }) => index + 1);

  if (levelColumnIndexes.length === 0 || lastRow < FIRST_DATA_ROW) {
    return;
  }

  const first = Math.min(...levelColumnIndexes);
  const last = Math.max(...levelColumnIndexes);
  // The two level columns are adjacent by design, so one range covers both. Asserted
  // rather than assumed: a reorder that separated them would silently validate the
  // reference column between them.
  if (last - first + 1 !== levelColumnIndexes.length) {
    throw new Error(
      `Level columns must be adjacent on ${sheet.name}; found ${levelColumnIndexes.join(', ')}`
    );
  }

  const range = `${cellReference(FIRST_DATA_ROW, first)}:${cellReference(lastRow, last)}`;
  asRangeValidatable(sheet).dataValidations.add(range, {
    type: 'list',
    allowBlank: true,
    formulae: [`"${LEVEL_DROPDOWN_VALUES.join(',')}"`],
    showErrorMessage: true,
    errorStyle: 'stop',
    errorTitle: 'Not a valid maturity level',
    error: `Enter one of: ${LEVEL_DROPDOWN_VALUES.join(', ')}. Leave the cell blank if you have not assessed this aspect yet.`,
  });
}

/**
 * Define a name for the table's data range, excluding identifier columns.
 *
 * The identifier columns sit at the far right and outside this range. 5.3 settled
 * that after the Wave 0 review found the plan simultaneously requiring no hidden
 * columns and carrying forward the reference implementation's hidden ID columns:
 * hidden columns inside a table range conceal content from assistive technology and
 * get flagged, so the IDs are visible, narrow, properly headed, and simply not part
 * of the named range.
 */
function applyNamedRange(
  workbook: ExcelJS.Workbook,
  sheet: ExcelJS.Worksheet,
  spec: TableSheetSpec,
  lastRow: number
): void {
  const rangeName = NAMED_RANGES[spec.name];
  if (!rangeName || lastRow < FIRST_DATA_ROW) {
    return;
  }

  const lastNonIdentifierIndex = lastIndexOfNonIdentifier(spec.columns);
  if (lastNonIdentifierIndex < 0) {
    return;
  }

  const from = `'${sheet.name}'!${cellReference(HEADER_ROW, 1, true)}`;
  const to = cellReference(lastRow, lastNonIdentifierIndex + 1, true);
  workbook.definedNames.add(`${from}:${to}`, rangeName);
}

function lastIndexOfNonIdentifier(columns: readonly ColumnDefinition[]): number {
  for (let index = columns.length - 1; index >= 0; index -= 1) {
    if (!columns[index]?.identifier) {
      return index;
    }
  }
  return -1;
}

/**
 * Print setup: landscape, the header row repeated on every page, and no forced scaling.
 *
 * `printTitlesRow` is what makes a printed sheet usable — without it, page 2 onward is
 * unlabelled columns of text, which is a 508 problem on paper as much as a usability one.
 *
 * ## Why `fitToWidth` is not used on the table sheets
 *
 * It was, and it was a bad instruction. `04_Assessment_Input` is about 498 character-widths
 * across, roughly five landscape pages at 100%. Telling Excel to fit that onto one page
 * width makes it obey at around 23% scale — technically one page wide, and completely
 * illegible. It also made the page numbering incoherent in Page Layout view, which is how
 * the problem surfaced during review in Excel.
 *
 * Natural pagination at 100% is the better trade: anything printed is readable, and the
 * repeated header row means a page from the middle of the sheet still identifies its
 * columns. Printing all 1,625 rows is a lot of paper, but that is inherent to the content
 * and the realistic case is printing a filtered subset.
 *
 * `00_README` is the exception and keeps `fitToWidth` — it is two columns, about 144
 * character-widths, which fits one page at roughly 85% and stays perfectly readable.
 */
function applyPrintSetup(sheet: ExcelJS.Worksheet, options: { fitToWidth?: boolean } = {}): void {
  sheet.pageSetup = {
    orientation: 'landscape',
    ...(options.fitToWidth ? { fitToPage: true, fitToWidth: 1, fitToHeight: 0 } : {}),
    printTitlesRow: `${HEADER_ROW}:${HEADER_ROW}`,
    // Gridlines are off by default when printing, which would have made the ruling
    // inconsistent on paper: the editable columns carry real borders, so without this the
    // printed input block would be the only ruled part of the sheet. Turning them on makes
    // print match screen, where the borders exist precisely to imitate gridlines the fill
    // covers up.
    showGridLines: true,
    margins: {
      left: 0.4,
      right: 0.4,
      top: 0.5,
      bottom: 0.6,
      header: 0.3,
      footer: 0.3,
    },
  };
}

/**
 * Lock the sheet, leaving editable cells writable.
 *
 * `selectLockedCells: true` is the important one and is easy to get wrong in the
 * other direction: disabling selection of locked cells looks like a helpful way to
 * guide data entry, and it hides every reference cell from keyboard and screen reader
 * users. `sort` and `autoFilter` stay enabled so the tables remain navigable.
 *
 * The password is empty on purpose. This is a guard against accidental edits to
 * reference data, not a security control, and a password a state cannot obtain would
 * make the workbook unmaintainable for them.
 */
function protectSheet(sheet: ExcelJS.Worksheet): void {
  // ExcelJS types `protect` as returning a promise, but with no password it resolves
  // synchronously before returning, and the sheet-level flags are set either way.
  void sheet.protect('', {
    selectLockedCells: true,
    selectUnlockedCells: true,
    formatCells: false,
    formatColumns: false,
    formatRows: false,
    insertRows: false,
    insertColumns: false,
    insertHyperlinks: false,
    deleteRows: false,
    deleteColumns: false,
    sort: true,
    autoFilter: true,
    pivotTables: false,
  });
}

// =============================================================================
// 00_README
// =============================================================================

/**
 * The README, as a two-column label/value list rather than a table.
 *
 * It gets no autofilter and no named range, which is deliberate: it is not a table,
 * so claiming otherwise would put a filter on heading rows. `workbook.test.ts`
 * asserts that absence, so the sheet cannot quietly become a half-table later.
 */
function addReadmeSheet(workbook: ExcelJS.Workbook): void {
  const sheet = workbook.addWorksheet(SHEET_NAMES.README);

  sheet.getColumn(1).width = README_LABEL_WIDTH;
  sheet.getColumn(2).width = README_VALUE_WIDTH;
  sheet.getColumn(2).alignment = { wrapText: true, vertical: 'top' };

  applyNoticeRow(sheet);

  const titleRow = sheet.getRow(HEADER_ROW);
  titleRow.getCell(1).value = 'MITA 4.0 State Self-Assessment Workbook';
  titleRow.getCell(1).font = {
    bold: true,
    size: 14,
    color: { argb: COLORS.headerFont },
  };
  titleRow.getCell(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: COLORS.headerFill },
  };

  // The second cell is filled to the same colour but left **empty**, so the band reads as
  // one continuous band with no merged cell, and the 39-character title can overflow
  // across it. A fill does not block overflow; content does — and putting the version here
  // was doing exactly that, clipping the workbook's own title to "MITA 4.0 State
  // Self-Assessment W" in Excel. The version is already its own labelled row below, so it
  // was redundant as well as harmful.
  titleRow.getCell(2).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: COLORS.headerFill },
  };
  titleRow.height = 26;
  titleRow.commit();

  let rowNumber = FIRST_DATA_ROW;
  for (const row of buildReadmeRows()) {
    const sheetRow = sheet.getRow(rowNumber);
    // Same `null`-not-`''` rule as the table sheets: a heading row has no value and a note
    // row has no label, and writing `''` for them made 9 text cells holding the empty
    // string plus an empty shared-string entry. No formula reads this sheet today, but the
    // reason applies identically — Excel drops empty-string cells on save, so a re-saved
    // file would differ from the generated one.
    sheetRow.getCell(1).value = row.label === '' ? null : row.label;
    sheetRow.getCell(2).value = row.value === '' ? null : row.value;

    if (row.kind === 'heading') {
      sheetRow.getCell(1).font = { bold: true, size: 12 };
      sheetRow.getCell(1).alignment = { vertical: 'top' };
    } else {
      sheetRow.getCell(1).font = { bold: true };
      sheetRow.getCell(1).alignment = { vertical: 'top', wrapText: true };
      sheetRow.getCell(2).alignment = { vertical: 'top', wrapText: true };
    }

    sheetRow.commit();
    rowNumber += 1;
  }

  sheet.views = [{ state: 'frozen', ySplit: HEADER_ROW, activeCell: 'A1' }];

  // `fitToWidth` here but not on the table sheets: the README is two columns and about 144
  // character-widths, which fits one page at roughly 85% and stays readable. See
  // `applyPrintSetup` for why the same instruction is wrong on a 498-wide data sheet.
  applyPrintSetup(sheet, { fitToWidth: true });
  // No printTitlesRow: the README has no repeating header, and pointing print titles
  // at the title band would repeat it on every page.
  if (sheet.pageSetup) {
    delete sheet.pageSetup.printTitlesRow;
  }
  protectSheet(sheet);
}

// =============================================================================
// Cell reference helpers
// =============================================================================

/** Convert a 1-based column index to its spreadsheet letters. */
export function columnLetter(index: number): string {
  let remaining = index;
  let letters = '';
  while (remaining > 0) {
    const modulo = (remaining - 1) % 26;
    letters = String.fromCharCode(65 + modulo) + letters;
    remaining = Math.floor((remaining - modulo) / 26);
  }
  return letters;
}

/** Build an A1-style cell reference, optionally absolute. */
export function cellReference(row: number, column: number, absolute = false): string {
  const marker = absolute ? '$' : '';
  return `${marker}${columnLetter(column)}${marker}${row}`;
}

/** Serialize the workbook to a buffer. */
export async function writeWorkbookBuffer(workbook: ExcelJS.Workbook): Promise<Buffer> {
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Read a workbook back from a buffer produced by {@link writeWorkbookBuffer}.
 *
 * Exists to hold **one** type assertion in **one** place. ExcelJS declares its own
 * `interface Buffer extends ArrayBuffer {}`, while `@types/node` 25 declares `Buffer` as generic
 * (`Buffer<TArrayBuffer>`). A Node buffer is therefore not assignable to ExcelJS's parameter type,
 * and `xlsx.load()` needs an assertion at every call site without a seam like this one.
 *
 * Worth knowing how this surfaced, because it looks like an unrelated change breaking the build:
 * the incompatibility only appears once a full `@types/node` is in the global scope, and for most
 * of this project's life it was not. Wiring `vite-plugin-pwa` into `vite.config.ts` — which
 * `tsconfig.json` includes — pulled `workbox-build`'s Node types in and surfaced the mismatch in
 * three pre-existing call sites at once. The assertion is a genuine gap in ExcelJS's published
 * types (see OBS-39 for the other one), not a shortcut: the runtime accepts a Node buffer, which
 * is what every test here has always passed it.
 */
export async function loadWorkbookFromBuffer(buffer: Buffer): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  return workbook;
}
