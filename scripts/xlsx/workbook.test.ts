/**
 * Section 508 structural assertions for the generated workbook, plus the
 * disclaimer placement and sheet protection.
 *
 * These are the automated half of Decision P2 for the workbook: there is no axe for
 * XLSX, so the 5.3 requirements become tests. Excel's own Accessibility Checker is
 * the manual complement, in Wave 7.
 *
 * ## Everything here reads a serialized workbook, not the in-memory object
 *
 * The suite writes the workbook to a buffer and loads it back through ExcelJS's
 * reader before asserting. That costs a couple of seconds and is worth it: a 508
 * reviewer opens the file, not our object graph, and several properties do not
 * survive serialization in the shape they were written. `autoFilter` comes back as a
 * string having been written as an object, and `selectLockedCells` disappears
 * entirely — see the note on that test, it is the subtlest trap in this file.
 *
 * ## On assertion strength
 *
 * Wave 5 shipped three assertions over a generated PDF that could not fail, each
 * satisfied by unrelated content elsewhere in the document. The 508 checks here have
 * exactly that shape — "no merged cells" and "document properties populated" both
 * pass trivially on an empty workbook. **Every assertion in this file was proved by
 * breaking the thing it covers and watching it fail**, and where an assertion needs a
 * companion to be non-vacuous (protection is the clearest case) both halves are
 * present and the reason is written down.
 */

import ExcelJS from 'exceljs';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  DRAFT_NOTICE_FULL_BODY,
  DRAFT_NOTICE_LABEL,
  DRAFT_NOTICE_SHORT_LINE,
} from '../../src/constants/draftNotice.ts';
import {
  ASSESSMENT_INPUT_COLUMNS,
  CAPABILITY_REFERENCE_COLUMNS,
  COLORS,
  CRITERIA_REFERENCE_COLUMNS,
  EDITABLE_HEADER_SUFFIX,
  FIRST_DATA_ROW,
  HEADER_ROW,
  MATURITY_LEVEL_COLUMNS,
  NAMED_RANGES,
  NOTICE_ROW,
  ORGANIZATIONAL_INPUT_COLUMNS,
  SHEET_NAMES,
  BUILT_SHEET_NAMES,
  renderHeader,
  type ColumnDefinition,
} from './constants.ts';
import { INFORMATION_MANAGEMENT_GUIDANCE } from './readme.ts';
import {
  buildWorkbook,
  columnLetter,
  loadWorkbookFromBuffer,
  writeWorkbookBuffer,
} from './workbook.ts';

/** The table sheets, with the column model each was built from. */
const TABLE_SHEETS: ReadonlyArray<{ name: string; columns: readonly ColumnDefinition[] }> = [
  { name: SHEET_NAMES.MATURITY_LEVELS, columns: MATURITY_LEVEL_COLUMNS },
  { name: SHEET_NAMES.CAPABILITY_REFERENCE, columns: CAPABILITY_REFERENCE_COLUMNS },
  { name: SHEET_NAMES.CRITERIA_REFERENCE, columns: CRITERIA_REFERENCE_COLUMNS },
  { name: SHEET_NAMES.ASSESSMENT_INPUT, columns: ASSESSMENT_INPUT_COLUMNS },
  { name: SHEET_NAMES.ORGANIZATIONAL_INPUT, columns: ORGANIZATIONAL_INPUT_COLUMNS },
];

let workbook: ExcelJS.Workbook;

beforeAll(async () => {
  const built = buildWorkbook();
  const buffer = await writeWorkbookBuffer(built);
  workbook = await loadWorkbookFromBuffer(buffer);
});

function sheet(name: string): ExcelJS.Worksheet {
  const found = workbook.getWorksheet(name);
  if (!found) {
    throw new Error(`Sheet not found after round-trip: ${name}`);
  }
  return found;
}

/** Cell text, normalised. ExcelJS returns null for an empty cell and objects for rich text. */
function cellText(worksheet: ExcelJS.Worksheet, row: number, column: number): string {
  const value = worksheet.getCell(row, column).value;
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'object' && 'richText' in value) {
    return value.richText.map((run) => run.text).join('');
  }
  return String(value);
}

/** Sheet protection as it survives serialization. */
function protectionOf(worksheet: ExcelJS.Worksheet): Record<string, unknown> | undefined {
  return (worksheet as unknown as { sheetProtection?: Record<string, unknown> }).sheetProtection;
}

// =============================================================================
// Contrast maths
// =============================================================================

/**
 * WCAG contrast, reimplemented locally.
 *
 * Follows the convention set in `src/utils/colors.test.ts` and `src/theme/index.test.ts`:
 * deliberately not imported from production code, so a bug in a shared helper cannot
 * make a contrast regression invisible to the tests meant to catch it.
 */
function relativeLuminance(hex: string): number {
  const channels = [0, 2, 4].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255);
  const [r, g, b] = channels.map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * (r as number) + 0.7152 * (g as number) + 0.0722 * (b as number);
}

function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return ((hi as number) + 0.05) / ((lo as number) + 0.05);
}

/** Strip ExcelJS's leading `FF` alpha from an ARGB string. */
function rgbOf(argb: string): string {
  return argb.slice(2);
}

const AA_NORMAL_TEXT = 4.5;

// =============================================================================
// Sheet inventory
// =============================================================================

describe('workbook structure', () => {
  it('contains exactly the six sheets this wave builds, in order', () => {
    expect(workbook.worksheets.map((worksheet) => worksheet.name)).toEqual([...BUILT_SHEET_NAMES]);
  });

  it('names every sheet descriptively with a numeric order prefix', () => {
    for (const worksheet of workbook.worksheets) {
      expect(worksheet.name).toMatch(/^\d{2}_[A-Za-z_]+$/);
    }
  });

  it('has the expected row count on each sheet: notice + header + data', () => {
    expect(sheet(SHEET_NAMES.MATURITY_LEVELS).rowCount).toBe(HEADER_ROW + 6);
    expect(sheet(SHEET_NAMES.CAPABILITY_REFERENCE).rowCount).toBe(HEADER_ROW + 72);
    expect(sheet(SHEET_NAMES.CRITERIA_REFERENCE).rowCount).toBe(HEADER_ROW + 205);
    expect(sheet(SHEET_NAMES.ASSESSMENT_INPUT).rowCount).toBe(HEADER_ROW + 1625);
    expect(sheet(SHEET_NAMES.ORGANIZATIONAL_INPUT).rowCount).toBe(HEADER_ROW + 15);
  });
});

// =============================================================================
// 5.3 — No merged cells
// =============================================================================

describe('508: no merged cells', () => {
  /**
   * The single most-cited reason the previous workbook was rejected
   * (`[20:53]`-`[22:09]`). CMS guidance permits merging in a first row only; avoiding
   * it entirely removes the judgement call.
   *
   * Proved failable by adding `sheet.mergeCells('A1:B1')` to `addReadmeSheet` — the
   * README case fails on `merges` becoming `['A1:B1']`.
   */
  it('has no merged cell range on any sheet', () => {
    for (const worksheet of workbook.worksheets) {
      expect(worksheet.model.merges ?? [], worksheet.name).toEqual([]);
    }
  });

  it('reports hasMerges false on every sheet', () => {
    for (const worksheet of workbook.worksheets) {
      // `toBe(false)` rather than `toBeFalsy()`: the getter exists today, and a falsy
      // check would also pass if upstream renamed it to `undefined`.
      expect((worksheet as unknown as { hasMerges?: boolean }).hasMerges, worksheet.name).toBe(
        false
      );
    }
  });
});

// =============================================================================
// 5.3 — Single header row per table
// =============================================================================

describe('508: exactly one header row per table', () => {
  /**
   * Two halves, and both are needed. Asserting only "row 2 holds the headers" would
   * pass on a workbook that also has a second header row further down — which is
   * precisely the multi-level-header shape 5.3 forbids and what the reference
   * implementation's repeated label rows amounted to.
   *
   * Proved failable both ways: shifting the header to row 3 fails the position test, and
   * appending a duplicate header tuple as a data row fails the uniqueness test.
   */

  /**
   * **Row 2 is asserted as a literal.** Reading the header at `HEADER_ROW` and
   * comparing it to the column model is self-referential — moving the constant moves
   * both the writer and the reader, and the test stays green. The mutation harness
   * reported exactly that when `HEADER_ROW` was changed to 3.
   *
   * The geometry is part of the contract, not an implementation detail: Wave 7's
   * formula ranges are computed from it, and a state who inserts a row at the top
   * breaks those formulas. So the literals are pinned here, and the constants are
   * checked against them, which is what makes moving either one fail.
   */
  it('places the notice on row 1, the single header row on row 2, and data from row 3', () => {
    expect(NOTICE_ROW).toBe(1);
    expect(HEADER_ROW).toBe(2);
    expect(FIRST_DATA_ROW).toBe(3);
  });

  it.each(TABLE_SHEETS)('$name puts every column header on row 2', ({ name, columns }) => {
    const worksheet = sheet(name);
    columns.forEach((column, index) => {
      expect(cellText(worksheet, 2, index + 1), `${name} column ${index + 1}`).toBe(
        renderHeader(column)
      );
    });
  });

  /**
   * **The editable signal is pinned as a literal string.** Every other assertion about
   * it compares the workbook to `renderHeader()` or `EDITABLE_HEADER_SUFFIX`, so all of
   * them derive both sides from the same constant: changing the suffix to `' (X)'` would
   * leave the whole suite green while destroying the requirement, which is that
   * editability is conveyed *in words* and not by fill colour alone.
   *
   * Same reasoning as the notice colour above and the literal `DRAFT:` prefix assertion
   * in `csvExport`. Do not "fix" this to use the constant.
   */
  it('spells the editable signal out in words on an input column header', () => {
    const worksheet = sheet(SHEET_NAMES.ASSESSMENT_INPUT);
    const asIsIndex = ASSESSMENT_INPUT_COLUMNS.findIndex((column) => column.key === 'currentLevel');
    expect(asIsIndex).toBeGreaterThan(-1);
    expect(cellText(worksheet, 2, asIsIndex + 1)).toBe('As-Is Level (enter value)');
    expect(EDITABLE_HEADER_SUFFIX).toBe(' (enter value)');
  });

  /**
   * The direct test for a stacked or multi-level header, which is what 5.3 forbids and
   * what the position assertion above cannot see. The header fill marks a header row,
   * so exactly one row may carry it.
   *
   * Proved failable by styling the notice row with the header fill as well.
   */
  it.each(TABLE_SHEETS)('$name carries the header fill on exactly one row', ({ name, columns }) => {
    const worksheet = sheet(name);
    const filledRows: number[] = [];

    for (let row = 1; row <= worksheet.rowCount; row += 1) {
      const isHeaderStyled = Array.from({ length: columns.length }, (_unused, index) => {
        const fill = worksheet.getCell(row, index + 1).fill;
        return (
          fill &&
          fill.type === 'pattern' &&
          'fgColor' in fill &&
          fill.fgColor?.argb === COLORS.headerFill
        );
      }).some(Boolean);
      if (isHeaderStyled) {
        filledRows.push(row);
      }
    }

    expect(filledRows, name).toEqual([2]);
  });

  it.each(TABLE_SHEETS)('$name repeats the header tuple nowhere else', ({ name, columns }) => {
    const worksheet = sheet(name);
    const headerTuple = columns.map((column) => renderHeader(column)).join('\u0000');

    for (let row = FIRST_DATA_ROW; row <= worksheet.rowCount; row += 1) {
      const rowTuple = columns
        .map((_column, index) => cellText(worksheet, row, index + 1))
        .join('\u0000');
      expect(rowTuple, `${name} row ${row}`).not.toBe(headerTuple);
    }
  });

  it.each(TABLE_SHEETS)('$name uses no column beyond its defined header', ({ name, columns }) => {
    const worksheet = sheet(name);
    expect(worksheet.columnCount, name).toBe(columns.length);
  });
});

// =============================================================================
// 5.3 — No blank rows or columns
// =============================================================================

describe('508: no blank rows or columns', () => {
  /**
   * Covers every sheet including the README, which is why the README uses heading
   * rows rather than blank spacers to separate its sections.
   *
   * Proved failable by adding a `sheet.addRow([])` spacer between README sections.
   */
  it('has no wholly blank row on any sheet', () => {
    for (const worksheet of workbook.worksheets) {
      for (let row = 1; row <= worksheet.rowCount; row += 1) {
        const hasContent = Array.from({ length: worksheet.columnCount }, (_unused, index) =>
          cellText(worksheet, row, index + 1)
        ).some((text) => text !== '');
        expect(hasContent, `${worksheet.name} row ${row} is blank`).toBe(true);
      }
    }
  });

  /**
   * Reference columns must be populated on every data row. The editable columns are
   * intentionally empty — this is a blank workbook under Decision 6 — so the
   * assertion splits on `editable` rather than exempting a hand-written list of
   * column names, which would drift.
   *
   * Proved failable by making `buildCapabilityReferenceRows` emit `''` for `topics`
   * on the organizational area, whose `topics` array really is empty in the model —
   * a realistic bug, and it fails on that one row.
   */
  it.each(TABLE_SHEETS)(
    '$name populates every reference column on every data row',
    ({ name, columns }) => {
      const worksheet = sheet(name);
      columns.forEach((column, index) => {
        if (column.editable) {
          return;
        }
        for (let row = FIRST_DATA_ROW; row <= worksheet.rowCount; row += 1) {
          expect(cellText(worksheet, row, index + 1), `${name} ${column.key} row ${row}`).not.toBe(
            ''
          );
        }
      });
    }
  );

  /**
   * The complement: the editable columns are the *only* empty ones. Without this, the
   * test above could be satisfied by a workbook that quietly stopped emitting an
   * editable column at all.
   */
  it.each(TABLE_SHEETS)('$name leaves exactly the editable columns empty', ({ name, columns }) => {
    const worksheet = sheet(name);
    const emptyColumnKeys = columns
      .filter((_column, index) => {
        for (let row = FIRST_DATA_ROW; row <= worksheet.rowCount; row += 1) {
          if (cellText(worksheet, row, index + 1) !== '') {
            return false;
          }
        }
        return true;
      })
      .map((column) => column.key);

    expect(emptyColumnKeys.sort()).toEqual(
      columns
        .filter((column) => column.editable)
        .map((column) => column.key)
        .sort()
    );
  });
});

// =============================================================================
// 5.3 — Information not conveyed by colour alone
// =============================================================================

describe('508: editability is signalled in text, not only by fill', () => {
  it('suffixes every editable column header and no other', () => {
    for (const { name, columns } of TABLE_SHEETS) {
      for (const column of columns) {
        const header = renderHeader(column);
        expect(header.endsWith(EDITABLE_HEADER_SUFFIX), `${name} ${column.key}`).toBe(
          Boolean(column.editable)
        );
      }
    }
  });

  /**
   * The assertion that actually enforces the rule, rather than restating the
   * constant. It walks the rendered cells looking for the input fill and requires the
   * header above each one to carry the textual signal — so a yellow cell in a column
   * with a plain header fails, which is the real-world form of this defect.
   *
   * Proved failable by removing the `editable` flag from the `notes` column while
   * leaving its fill applied.
   */
  it('gives every input-filled cell a header that says so in words', () => {
    for (const { name, columns } of TABLE_SHEETS) {
      const worksheet = sheet(name);
      for (let column = 1; column <= columns.length; column += 1) {
        let sawInputFill = false;
        for (let row = FIRST_DATA_ROW; row <= worksheet.rowCount; row += 1) {
          const fill = worksheet.getCell(row, column).fill;
          if (
            fill &&
            fill.type === 'pattern' &&
            'fgColor' in fill &&
            fill.fgColor?.argb === COLORS.inputFill
          ) {
            sawInputFill = true;
            break;
          }
        }
        if (sawInputFill) {
          expect(
            cellText(worksheet, HEADER_ROW, column),
            `${name} column ${columnLetter(column)} is filled as input`
          ).toContain(EDITABLE_HEADER_SUFFIX);
        }
      }
    }
  });

  it('keeps the header, notice and input palettes above WCAG AA for their text', () => {
    // White header text on the navy header fill.
    expect(
      contrastRatio(rgbOf(COLORS.headerFont), rgbOf(COLORS.headerFill))
    ).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    // Notice text on the default white sheet background — same value as the app
    // banner, measured at 7.03:1 in a real browser during Wave 3.
    expect(contrastRatio(rgbOf(COLORS.noticeFont), 'ffffff')).toBeGreaterThanOrEqual(7);
    // Black cell text on the pale input fill, which is where a state types.
    expect(contrastRatio('000000', rgbOf(COLORS.inputFill))).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  it('sanity-checks the contrast maths so a broken implementation cannot pass the above', () => {
    expect(contrastRatio('000000', 'ffffff')).toBeCloseTo(21, 1);
    expect(contrastRatio('123456', '123456')).toBeCloseTo(1, 5);
    expect(contrastRatio('b0142f', 'ffffff')).toBeCloseTo(7.03, 1);
  });
});

// =============================================================================
// 5.3 — No images or floating objects
// =============================================================================

describe('508: no images or floating objects', () => {
  /**
   * Images were called out specifically in the rejection of the previous workbook.
   * Charts belong in the tool, not here.
   *
   * Proved failable by adding a 1x1 PNG via `workbook.addImage` and
   * `sheet.addImage` — `model.media` becomes length 1 and the sheet reports an image.
   */
  it('embeds no media in the workbook', () => {
    expect(workbook.model.media ?? []).toEqual([]);
  });

  /**
   * Asserted on the **count**, not on the array. An image anchor holds a reference back
   * into the worksheet, so `toEqual([])` against a populated array serialises the entire
   * object graph — about 195 MB for one 1x1 pixel. That is unreadable as a failure message
   * and it overran the mutation harness's output buffer.
   */
  it('places no image on any sheet', () => {
    for (const worksheet of workbook.worksheets) {
      expect((worksheet.getImages?.() ?? []).length, `${worksheet.name} has images`).toBe(0);
    }
  });
});

// =============================================================================
// 5.3 — Document properties
// =============================================================================

describe('508: document properties are populated', () => {
  /**
   * A screen reader announces the title when the file opens, and 508 review checks
   * these explicitly. Asserted individually with a minimum length rather than as one
   * object, so a single blanked property names itself in the failure.
   *
   * Proved failable by setting `workbook.title = ''`.
   */
  it.each([
    ['title', () => workbook.title],
    ['subject', () => workbook.subject],
    ['description', () => workbook.description],
    ['creator', () => workbook.creator],
    ['category', () => workbook.category],
    ['keywords', () => workbook.keywords],
    ['company', () => workbook.company],
    ['lastModifiedBy', () => workbook.lastModifiedBy],
  ])('sets %s to a non-trivial value that survives serialization', (_name, read) => {
    const value = read();
    expect(typeof value).toBe('string');
    expect(String(value ?? '').trim().length).toBeGreaterThan(8);
  });

  it('names the tool as creator and identifies the model versions in the subject', () => {
    expect(workbook.creator).toBe('MITA 4.0 State Self-Assessment Tool');
    expect(workbook.subject).toContain('Capability Reference Model');
    expect(workbook.subject).toContain('Maturity Model');
  });
});

// =============================================================================
// Decision 15 — the predecisional notices (option D)
// =============================================================================

describe('predecisional notice placement', () => {
  /**
   * `A1` on every sheet, because Ctrl+Home lands there and because Excel reopens a
   * file on its last active sheet — a README-only notice is invisible to a reviewer
   * who lands on a data sheet.
   *
   * Anchored to `A1` specifically rather than searched for anywhere on the sheet.
   * A substring search would be satisfied by the README's own full-text copy of the
   * notice, which is the class of vacuous assertion Wave 5 shipped three of.
   */
  it('puts the short notice in A1 of every sheet', () => {
    for (const worksheet of workbook.worksheets) {
      expect(cellText(worksheet, NOTICE_ROW, 1), worksheet.name).toBe(DRAFT_NOTICE_SHORT_LINE);
    }
  });

  /**
   * **Asserted against the literal, not against `COLORS.noticeFont`.** Comparing the
   * workbook to the constant it was built from is self-referential: changing the
   * constant changes both sides and the test stays green. The mutation harness caught
   * exactly that — swapping the notice red for `error.main` was reported as passing.
   *
   * `FFB0142F` is the app banner's `theme.palette.error.dark`, measured at 7.03:1 in a
   * real browser during Wave 3. `error.main` (`#e31c3d`) is only 4.67:1, so this is a
   * value with a reason rather than a preference. Do not "fix" this to use the
   * constant — the same reasoning as the literal `DRAFT:` prefix assertion in
   * `csvExport` (see `draftNotice.ts`).
   */
  it('renders the notice in the measured 7.03:1 app banner red, bold', () => {
    for (const worksheet of workbook.worksheets) {
      const font = worksheet.getCell(NOTICE_ROW, 1).font;
      expect(font?.bold, worksheet.name).toBe(true);
      expect(font?.color?.argb, worksheet.name).toBe('FFB0142F');
    }
    // And the constant the generator uses really is that value, so the two halves of
    // this cannot drift apart silently.
    expect(COLORS.noticeFont).toBe('FFB0142F');
  });

  /**
   * The footer carries the **short** line, not the full PRA statement, and that is
   * forced rather than chosen: Excel's footer limit is 255 characters and the full line
   * is 420. See `applyNoticeRow` in `workbook.ts`. The length guard is asserted below so
   * that a future edit cannot quietly push it over.
   */
  it('puts the notice in the print footer of every sheet, within Excel limits', () => {
    for (const worksheet of workbook.worksheets) {
      const footer = worksheet.headerFooter?.oddFooter ?? '';
      expect(footer, worksheet.name).toContain(DRAFT_NOTICE_LABEL);
      expect(footer, worksheet.name).toContain('made available for limited review');
      expect(
        footer.length,
        `${worksheet.name} footer is ${footer.length} chars`
      ).toBeLessThanOrEqual(255);
      // `evenFooter` is deliberately unset: without a `differentOddEven` flag Excel uses
      // `oddFooter` for every page, so setting it would be dead weight reading as coverage.
      expect(worksheet.headerFooter?.evenFooter, worksheet.name).toBeUndefined();
    }
  });

  /**
   * The full statement's in-sheet home is the README, and its metadata home is the
   * `description` property. Since it cannot be in the footer, these are the only two
   * places it exists — so both are pinned rather than assumed.
   */
  it('keeps the full PRA statement out of the footer but present in the workbook', () => {
    for (const worksheet of workbook.worksheets) {
      expect(worksheet.headerFooter?.oddFooter ?? '', worksheet.name).not.toContain(
        'Paperwork Reduction Act'
      );
    }
    expect(workbook.description).toContain('Paperwork Reduction Act');
  });

  it('carries the full PRA body verbatim in the description property', () => {
    expect(workbook.description).toBe(`${DRAFT_NOTICE_LABEL}: ${DRAFT_NOTICE_FULL_BODY}`);
  });

  /**
   * The README carries the full text as sheet content. This is 5.3's rule that
   * anything in a print header must also appear in-sheet, since screen readers do not
   * read print headers — the footer alone would not satisfy it.
   */
  it('reproduces the full PRA body as README sheet content', () => {
    const readme = sheet(SHEET_NAMES.README);
    let found = false;
    for (let row = 1; row <= readme.rowCount; row += 1) {
      if (cellText(readme, row, 2) === DRAFT_NOTICE_FULL_BODY) {
        expect(cellText(readme, row, 1)).toBe(DRAFT_NOTICE_LABEL);
        found = true;
        break;
      }
    }
    expect(found, 'README does not carry the full PRA body verbatim').toBe(true);
  });

  it('marks the title property as predecisional', () => {
    expect(workbook.title).toContain(DRAFT_NOTICE_LABEL);
  });
});

// =============================================================================
// Decision 13 — the go-live artifact
// =============================================================================

/**
 * The workbook as it ships at go-live, with `VITE_DRAFT_MODE=false`.
 *
 * This mode had no coverage at all, which meant the file states will actually use had no
 * 508 assertion behind it — only the draft variant did. Two things could have gone wrong
 * unnoticed: row 1 becoming blank once the notice is removed, which would break the
 * no-blank-rows requirement, and the README continuing to describe a notice that is no
 * longer there.
 *
 * Removing the notice is deliberately **not** allowed to move the table. `HEADER_ROW`
 * stays 2 in both modes, so Wave 7's formula ranges are the same in both, and row 1
 * carries the sheet's own name instead. A mode-dependent geometry would mean every
 * formula range had two possible values.
 */
describe('go-live mode (VITE_DRAFT_MODE=false)', () => {
  let released: ExcelJS.Workbook;

  beforeAll(async () => {
    const previous = process.env.VITE_DRAFT_MODE;
    process.env.VITE_DRAFT_MODE = 'false';
    try {
      const buffer = await writeWorkbookBuffer(buildWorkbook());
      released = await loadWorkbookFromBuffer(buffer);
    } finally {
      if (previous === undefined) {
        delete process.env.VITE_DRAFT_MODE;
      } else {
        process.env.VITE_DRAFT_MODE = previous;
      }
    }
  });

  function releasedSheet(name: string): ExcelJS.Worksheet {
    const found = released.getWorksheet(name);
    if (!found) {
      throw new Error(`Sheet not found in the go-live workbook: ${name}`);
    }
    return found;
  }

  /**
   * **Scans every cell of every sheet**, rather than the places the notice is known to
   * appear. The earlier version checked `A1`, the print footer, the title and the
   * `description` property — and passed against a workbook that carried the full PRA
   * statement verbatim on README row 4, because the README's notice section was the one
   * surface not gated on `isDraft()`.
   *
   * A "this text appears nowhere" claim has to be enumerated over the whole artifact.
   * Checking the four places you remembered to gate repeats the original mistake.
   */
  it('carries no predecisional notice in any cell of any sheet', () => {
    const forbidden = [DRAFT_NOTICE_LABEL, 'Paperwork Reduction Act', 'Predecisional'];
    const leaks: string[] = [];

    for (const worksheet of released.worksheets) {
      for (let row = 1; row <= worksheet.rowCount; row += 1) {
        for (let column = 1; column <= worksheet.columnCount; column += 1) {
          const text = cellText(worksheet, row, column);
          for (const phrase of forbidden) {
            if (text.includes(phrase)) {
              leaks.push(`${worksheet.name} R${row}C${column}: ${text.slice(0, 60)}`);
            }
          }
        }
      }
    }

    expect(leaks, `go-live workbook still carries the notice:\n${leaks.join('\n')}`).toEqual([]);
  });

  it('carries no predecisional notice in any footer or document property', () => {
    for (const worksheet of released.worksheets) {
      expect(worksheet.headerFooter?.oddFooter ?? '', worksheet.name).not.toContain(
        DRAFT_NOTICE_LABEL
      );
    }
    for (const [label, value] of [
      ['title', released.title],
      ['subject', released.subject],
      ['description', released.description],
      ['keywords', released.keywords],
      ['category', released.category],
    ] as const) {
      expect(String(value ?? ''), label).not.toContain(DRAFT_NOTICE_LABEL);
      expect(String(value ?? ''), label).not.toContain('Paperwork Reduction Act');
    }
  });

  /**
   * The requirement the notice removal could most easily have broken. Row 1 exists in
   * both modes and must never be empty.
   */
  it('still has no wholly blank row on any sheet', () => {
    for (const worksheet of released.worksheets) {
      for (let row = 1; row <= worksheet.rowCount; row += 1) {
        const hasContent = Array.from({ length: worksheet.columnCount }, (_unused, index) =>
          cellText(worksheet, row, index + 1)
        ).some((text) => text !== '');
        expect(hasContent, `${worksheet.name} row ${row} is blank at go-live`).toBe(true);
      }
    }
  });

  it('puts the sheet name in row 1 in place of the notice', () => {
    for (const worksheet of released.worksheets) {
      expect(cellText(worksheet, NOTICE_ROW, 1), worksheet.name).toBe(worksheet.name);
    }
  });

  it('keeps the header row and the table geometry unchanged', () => {
    for (const { name, columns } of TABLE_SHEETS) {
      const worksheet = releasedSheet(name);
      columns.forEach((column, index) => {
        expect(cellText(worksheet, HEADER_ROW, index + 1), `${name} ${column.key}`).toBe(
          renderHeader(column)
        );
      });
    }
  });

  it('keeps the same row count on every table sheet as the draft build', () => {
    for (const { name } of TABLE_SHEETS) {
      expect(releasedSheet(name).rowCount, name).toBe(sheet(name).rowCount);
    }
  });

  /**
   * The README is two rows shorter, and that is the *only* difference: the notice heading
   * and its body. Asserted as an exact delta rather than "fewer", so removing anything else
   * from the README at go-live fails here.
   */
  it('drops exactly the two notice rows from the README and nothing else', () => {
    expect(releasedSheet(SHEET_NAMES.README).rowCount).toBe(sheet(SHEET_NAMES.README).rowCount - 2);
  });

  /**
   * With the notice gone and page numbers dropped, there is nothing left for a footer to
   * carry, so the go-live build legitimately has none. Asserted as empty rather than left
   * implicit, because "the footer does not contain the notice" would also be satisfied by a
   * footer that failed to render for an unrelated reason.
   */
  it('emits no footer at all, the notice having been its only content', () => {
    for (const worksheet of released.worksheets) {
      expect(worksheet.headerFooter?.oddFooter ?? '', worksheet.name).toBe('');
    }
  });

  /**
   * The repeating header row is not part of the notice and must survive its removal — it is
   * what makes a printed page from the middle of a 1,625-row sheet identify its own columns.
   */
  it('keeps the header row repeating on printed pages', () => {
    for (const { name } of TABLE_SHEETS) {
      expect(releasedSheet(name).pageSetup?.printTitlesRow, name).toBe(
        `${HEADER_ROW}:${HEADER_ROW}`
      );
    }
  });

  it('still has no merged cells and still protects every sheet selectably', () => {
    for (const worksheet of released.worksheets) {
      expect(worksheet.model.merges ?? [], worksheet.name).toEqual([]);
      const protection =
        (worksheet as unknown as { sheetProtection?: Record<string, unknown> }).sheetProtection ??
        {};
      expect(protection.sheet, worksheet.name).toBe(true);
      expect(protection.selectLockedCells, worksheet.name).not.toBe(false);
    }
  });

  it('still populates the document properties that 508 review checks', () => {
    for (const value of [
      released.title,
      released.subject,
      released.description,
      released.creator,
      released.category,
    ]) {
      expect(String(value ?? '').trim().length).toBeGreaterThan(8);
    }
  });

  /**
   * The README describes the workbook's own structure. At go-live there is no notice, so
   * a sentence saying the header sits "directly under the notice on row 1" would be a
   * false statement inside the shipped deliverable.
   */
  it('describes its own structure without referring to a notice', () => {
    const readme = releasedSheet(SHEET_NAMES.README);
    for (let row = 1; row <= readme.rowCount; row += 1) {
      const value = cellText(readme, row, 2);
      expect(value, `README row ${row} still mentions a notice`).not.toContain('under the notice');
    }
  });
});

// =============================================================================
// 5.3 — Protection and assistive-technology reachability
// =============================================================================

describe('508: locked cells stay reachable by assistive technology', () => {
  /**
   * **The subtlest assertion in this file.** `selectLockedCells: true` means "allow
   * selecting locked cells", and OOXML stores that as the *absence* of the attribute
   * because allowing is the format default. So after a round-trip the reloaded
   * protection is `{ sheet: true, sort: true, autoFilter: true }` with no
   * `selectLockedCells` key at all, and an assertion that it equals `true` would
   * always fail while an assertion that it is `!== false` would pass even on a sheet
   * with no protection whatsoever.
   *
   * Hence two assertions. The first pins that protection is genuinely enabled, so
   * removing `protectSheet` fails. The second pins that selection is not disabled,
   * so `selectLockedCells: false` fails. Verified by probe: setting it false makes
   * the key appear in the reloaded model as `false`.
   */
  it('enables sheet protection on every sheet', () => {
    for (const worksheet of workbook.worksheets) {
      expect(protectionOf(worksheet)?.sheet, worksheet.name).toBe(true);
    }
  });

  it('never disables selection of locked or unlocked cells', () => {
    for (const worksheet of workbook.worksheets) {
      const protection = protectionOf(worksheet) ?? {};
      expect(protection.selectLockedCells, worksheet.name).not.toBe(false);
      expect(protection.selectUnlockedCells, worksheet.name).not.toBe(false);
    }
  });

  it('leaves sorting and filtering available on the table sheets', () => {
    for (const { name } of TABLE_SHEETS) {
      const protection = protectionOf(sheet(name)) ?? {};
      expect(protection.sort, name).toBe(true);
      expect(protection.autoFilter, name).toBe(true);
    }
  });

  /**
   * Unlocking is what makes a protected sheet usable. Asserted on the editable
   * columns being unlocked *and* on the reference columns not being, so a change that
   * unlocked everything would fail.
   */
  it('unlocks exactly the editable cells', () => {
    for (const { name, columns } of TABLE_SHEETS) {
      const worksheet = sheet(name);
      columns.forEach((column, index) => {
        const cell = worksheet.getCell(FIRST_DATA_ROW, index + 1);
        if (column.editable) {
          expect(cell.protection?.locked, `${name} ${column.key}`).toBe(false);
        } else {
          expect(cell.protection?.locked, `${name} ${column.key}`).not.toBe(false);
        }
      });
    }
  });

  /**
   * The input fill must be **present** on every editable data cell.
   *
   * The companion assertion — "every input-filled cell has a header that says so in words"
   * — is conditionally vacuous on its own: it scans for the fill and only asserts if it
   * finds one, so deleting the fill entirely left it green. The fill is a redundant 508
   * signal rather than the primary one, but it is still a signal, and this is the
   * assertion that notices when it disappears.
   *
   * It also backs the claim in `addTableSheet` that writing `null` keeps the style: a cell
   * with no value still has to carry its fill, which is exactly what could regress if
   * ExcelJS changed how it emits valueless styled cells.
   */
  /**
   * Uniform vertical alignment across every column of a row.
   *
   * Excel defaults to bottom, and only the wrapping columns were being set to top — so on a
   * row made tall by a wrapped question, a state's typed notes floated above their own
   * As-Is level. Alignment is not a 508 property, so no structural assertion could see it;
   * it was found by looking at the sheet in Excel.
   */
  it('aligns every column of every table sheet to the top of the row', () => {
    for (const { name, columns } of TABLE_SHEETS) {
      const worksheet = sheet(name);
      columns.forEach((column, index) => {
        expect(
          worksheet.getCell(FIRST_DATA_ROW, index + 1).alignment?.vertical,
          `${name} ${column.key}`
        ).toBe('top');
      });
    }
  });

  /**
   * Every header must have room for its text alongside the autofilter button, which Excel
   * draws over the header cell's bottom-right corner and which clips text rather than
   * reflowing it. This asserts the cheap, deterministic half: no single unbreakable word in
   * a header is wider than its column minus button clearance. Whether the wrapped result
   * *looks* right is a visual check, recorded in Section 8j as verified in Excel.
   */
  it('leaves room for the filter button beside every header word', () => {
    const filterButtonWidth = 3;
    for (const { name, columns } of TABLE_SHEETS) {
      for (const column of columns) {
        const longestWord = Math.max(
          ...renderHeader(column)
            .split(/\s+/)
            .map((word) => word.length)
        );
        expect(
          column.width,
          `${name} ${column.key}: width ${column.width} cannot fit "${longestWord}" chars + button`
        ).toBeGreaterThanOrEqual(longestWord + filterButtonWidth);
      }
    }
  });

  it('fills every editable data cell and no reference cell', () => {
    for (const { name, columns } of TABLE_SHEETS) {
      const worksheet = sheet(name);
      columns.forEach((column, index) => {
        const fill = worksheet.getCell(FIRST_DATA_ROW, index + 1).fill;
        const argb =
          fill && fill.type === 'pattern' && 'fgColor' in fill ? fill.fgColor?.argb : undefined;
        if (column.editable) {
          expect(argb, `${name} ${column.key} has no input fill`).toBe(COLORS.inputFill);
        } else {
          expect(argb, `${name} ${column.key} is filled as input`).not.toBe(COLORS.inputFill);
        }
      });
    }
  });

  /**
   * Every editable cell is ruled on all four sides, and no reference cell is.
   *
   * The fill covers Excel's gridlines, so without borders the input block is an
   * undifferentiated area — rows are hard to track across a wide sheet and the three
   * adjacent text columns on `04` have no visible boundary. Reference columns keep their
   * gridlines and deliberately get no border, which is what makes this assertion able to
   * fail in both directions.
   *
   * Checked on the last data row as well as the first, since the borders are applied in the
   * same loop as the values and an off-by-one at the end would be invisible at the top.
   */
  it('rules every editable cell on all four sides and no reference cell', () => {
    for (const { name, columns } of TABLE_SHEETS) {
      const worksheet = sheet(name);
      const lastRow = worksheet.rowCount;

      for (const row of [FIRST_DATA_ROW, lastRow]) {
        columns.forEach((column, index) => {
          const border = worksheet.getCell(row, index + 1).border;
          const label = `${name} ${column.key} row ${row}`;

          if (column.editable) {
            for (const side of ['top', 'left', 'bottom', 'right'] as const) {
              expect(border?.[side]?.style, `${label} has no ${side} border`).toBe('thin');
              expect(border?.[side]?.color?.argb, `${label} ${side} border colour`).toBe(
                COLORS.inputBorder
              );
            }
          } else {
            expect(
              border?.top ?? border?.left ?? border?.bottom ?? border?.right,
              label
            ).toBeUndefined();
          }
        });
      }
    }
  });

  /**
   * The border colour clears WCAG 1.4.11 against the fill it sits on. Not strictly required
   * — the structure is available programmatically, so a border duplicating it is a redundant
   * aid, and Excel's own gridlines are only about 1.48:1 — but it costs nothing to clear the
   * threshold and it removes the argument.
   */
  it('keeps the input border above 3:1 against the fill it sits on', () => {
    expect(
      contrastRatio(rgbOf(COLORS.inputBorder), rgbOf(COLORS.inputFill))
    ).toBeGreaterThanOrEqual(3);
  });

  /**
   * Gridlines print off by default, which would have left the editable columns as the only
   * ruled part of a printed sheet — the borders exist to imitate the gridlines the fill
   * covers, so the two have to appear together or neither does.
   */
  it('prints gridlines so the ruling is consistent on paper', () => {
    for (const worksheet of workbook.worksheets) {
      expect(worksheet.pageSetup?.showGridLines, worksheet.name).toBe(true);
    }
  });
});

// =============================================================================
// 5.3 — Identifier columns visible, outside the named range
// =============================================================================

describe('508: identifier columns are visible, not hidden', () => {
  /**
   * The Wave 0 review settled this: the plan simultaneously required no blank or
   * hidden columns and carried forward the reference implementation's hidden ID
   * columns. Hidden columns inside a table range conceal content from assistive
   * technology and get flagged, so the IDs are visible at the far right with real
   * headers, and excluded from the named range instead.
   *
   * Note this also corrects the Wave 6 checklist line in Section 6 of the plan, which
   * still said "hidden ID columns" against 5.3's explicit resolution.
   *
   * Proved failable by setting `hidden: true` on the identifier columns.
   */
  it('hides no column on any sheet', () => {
    for (const worksheet of workbook.worksheets) {
      for (let index = 1; index <= worksheet.columnCount; index += 1) {
        expect(worksheet.getColumn(index).hidden, `${worksheet.name} column ${index}`).toBeFalsy();
      }
    }
  });

  it('gives every identifier column a real header', () => {
    for (const { name, columns } of TABLE_SHEETS) {
      const worksheet = sheet(name);
      columns.forEach((column, index) => {
        if (!column.identifier) {
          return;
        }
        expect(cellText(worksheet, HEADER_ROW, index + 1), `${name} ${column.key}`).toBe(
          column.header
        );
      });
    }
  });

  it('places every identifier column after every other column', () => {
    for (const { name, columns } of TABLE_SHEETS) {
      const firstIdentifier = columns.findIndex((column) => column.identifier);
      expect(firstIdentifier, name).toBeGreaterThan(-1);
      expect(
        columns.slice(firstIdentifier).every((column) => column.identifier),
        `${name} interleaves identifier and content columns`
      ).toBe(true);
    }
  });
});

// =============================================================================
// 5.3 — Defined table ranges
// =============================================================================

describe('508: defined table ranges', () => {
  function rangesFor(rangeName: string): string[] {
    const model = (
      workbook.definedNames as unknown as {
        model?: Array<{ name: string; ranges: string[] }>;
      }
    ).model;
    return model?.find((entry) => entry.name === rangeName)?.ranges ?? [];
  }

  it('defines a named range for every table sheet', () => {
    for (const { name } of TABLE_SHEETS) {
      const rangeName = NAMED_RANGES[name];
      expect(rangeName, `no named range configured for ${name}`).toBeDefined();
      expect(rangesFor(rangeName as string), name).toHaveLength(1);
    }
  });

  /**
   * The range must start at the header row and stop before the identifier columns.
   * Computed from the column model rather than written as a literal so it cannot drift
   * when a column is added.
   *
   * Proved failable by extending the range to `columns.length`, which pulls the
   * identifier columns in.
   */
  it.each(TABLE_SHEETS)(
    '$name scopes its range from the header to the last content column',
    ({ name, columns }) => {
      const worksheet = sheet(name);
      const lastContentColumn = columns.filter((column) => !column.identifier).length;
      const lastRow = worksheet.rowCount;
      const expected = `'${name}'!$A$${HEADER_ROW}:$${columnLetter(lastContentColumn)}$${lastRow}`;

      expect(rangesFor(NAMED_RANGES[name] as string)).toEqual([expected]);
    }
  );
});

// =============================================================================
// Data entry
// =============================================================================

describe('level entry validation', () => {
  const inputSheets = [
    { name: SHEET_NAMES.ASSESSMENT_INPUT, columns: ASSESSMENT_INPUT_COLUMNS, rows: 1625 },
    { name: SHEET_NAMES.ORGANIZATIONAL_INPUT, columns: ORGANIZATIONAL_INPUT_COLUMNS, rows: 15 },
  ];

  /**
   * Counted across every data row rather than spot-checked on the first, because the
   * validation is applied in a loop and an off-by-one at either end would leave the
   * first or last row unvalidated — a defect a single-cell check cannot see.
   */
  it.each(inputSheets)(
    '$name validates both level columns on all $rows rows',
    ({ name, columns, rows }) => {
      const worksheet = sheet(name);
      const levelColumnIndexes = columns
        .map((column, index) => ({ column, index: index + 1 }))
        .filter(({ column }) => column.key === 'currentLevel' || column.key === 'targetLevel')
        .map(({ index }) => index);

      expect(levelColumnIndexes).toHaveLength(2);

      for (const columnIndex of levelColumnIndexes) {
        let validated = 0;
        for (let row = FIRST_DATA_ROW; row <= worksheet.rowCount; row += 1) {
          const validation = worksheet.getCell(row, columnIndex).dataValidation;
          if (validation?.type === 'list') {
            validated += 1;
          }
        }
        expect(validated, `${name} column ${columnLetter(columnIndex)}`).toBe(rows);
      }
    }
  );

  it('offers N/A and levels 1-5, and allows blank for not yet assessed', () => {
    const worksheet = sheet(SHEET_NAMES.ASSESSMENT_INPUT);
    // Column derived from the model rather than hardcoded, so a column reorder moves the
    // assertion with it instead of pointing at whatever now sits in position 8.
    const asIsColumn =
      ASSESSMENT_INPUT_COLUMNS.findIndex((column) => column.key === 'currentLevel') + 1;
    const validation = worksheet.getCell(FIRST_DATA_ROW, asIsColumn).dataValidation;
    expect(validation?.formulae).toEqual(['"N/A,1,2,3,4,5"']);
    expect(validation?.allowBlank).toBe(true);
    expect(validation?.showErrorMessage).toBe(true);
  });

  it('applies no validation to a reference column', () => {
    const worksheet = sheet(SHEET_NAMES.ASSESSMENT_INPUT);
    expect(worksheet.getCell(FIRST_DATA_ROW, 1).dataValidation).toBeUndefined();
  });
});

// =============================================================================
// Navigation
// =============================================================================

describe('navigation aids', () => {
  it('freezes the notice and header rows on every sheet', () => {
    for (const worksheet of workbook.worksheets) {
      const view = worksheet.views?.[0];
      expect(view?.state, worksheet.name).toBe('frozen');
      expect((view as unknown as { ySplit?: number } | undefined)?.ySplit, worksheet.name).toBe(
        HEADER_ROW
      );
    }
  });

  /**
   * The autofilter must span the header row through the last data row, over every
   * column including the identifiers. It comes back from the reader as a string
   * having been written as an object, which is why this reads it loosely.
   */
  it.each(TABLE_SHEETS)(
    '$name filters from the header row to the last data row',
    ({ name, columns }) => {
      const worksheet = sheet(name);
      const expected = `A${HEADER_ROW}:${columnLetter(columns.length)}${worksheet.rowCount}`;
      expect(String(worksheet.autoFilter), name).toBe(expected);
    }
  );

  /**
   * The README is a label/value list, not a table. It deliberately gets no autofilter
   * and no named range; asserting that keeps it from quietly becoming a half-table
   * whose heading rows sit under a filter dropdown.
   */
  it('gives the README no autofilter and no named range', () => {
    expect(sheet(SHEET_NAMES.README).autoFilter).toBeFalsy();
    const model = (
      workbook.definedNames as unknown as {
        model?: Array<{ ranges: string[] }>;
      }
    ).model;
    const readmeRanges = (model ?? []).flatMap((entry) => entry.ranges);
    expect(readmeRanges.some((range) => range.includes(SHEET_NAMES.README))).toBe(false);
  });

  it('repeats the header row on every printed page of each table sheet', () => {
    for (const { name } of TABLE_SHEETS) {
      expect(sheet(name).pageSetup?.printTitlesRow, name).toBe(`${HEADER_ROW}:${HEADER_ROW}`);
    }
  });

  it('does not repeat the README title band on printed pages', () => {
    expect(sheet(SHEET_NAMES.README).pageSetup?.printTitlesRow).toBeFalsy();
  });

  /**
   * No page-number field anywhere. `&P of &N` reported "1 of 24" on the first page and
   * "114 of 24" after scrolling right, because the sheet spans a grid of pages while `&N`
   * counts one dimension of that grid. Removed on the user's call during Excel verification.
   * Pinned so it is not reintroduced without confronting the pagination first.
   */
  it('puts no page-number field in any footer', () => {
    for (const worksheet of workbook.worksheets) {
      expect(worksheet.headerFooter?.oddFooter ?? '', worksheet.name).not.toContain('&P');
      expect(worksheet.headerFooter?.oddFooter ?? '', worksheet.name).not.toContain('&N');
    }
  });

  /**
   * `fitToWidth` on a table sheet forced Excel to roughly 23% scale to obey it — one page
   * wide and illegible, and the source of the incoherent page numbering above. Only the
   * README is narrow enough for the instruction to help.
   */
  it('forces page-width scaling only on the README', () => {
    expect(sheet(SHEET_NAMES.README).pageSetup?.fitToPage).toBe(true);
    for (const { name } of TABLE_SHEETS) {
      expect(sheet(name).pageSetup?.fitToPage, name).toBeFalsy();
    }
  });
});

// =============================================================================
// README content
// =============================================================================

describe('00_README content', () => {
  function readmeLabels(): string[] {
    const readme = sheet(SHEET_NAMES.README);
    const labels: string[] = [];
    for (let row = 1; row <= readme.rowCount; row += 1) {
      labels.push(cellText(readme, row, 1));
    }
    return labels;
  }

  it('lists every sheet in the workbook, built or not', () => {
    const labels = readmeLabels();
    for (const sheetName of Object.values(SHEET_NAMES)) {
      expect(labels, `README omits ${sheetName}`).toContain(sheetName);
    }
  });

  /**
   * Every sheet is now built, so nothing may be marked as absent. The Wave 6 version of this
   * test asserted the opposite — that `06`-`09` were described as "not included" — and
   * inverting it is the point: a reviewer must not be told a tab is missing when it is there,
   * and equally must not be left hunting for one that is not.
   */
  it('describes every sheet as present, none as missing', () => {
    const readme = sheet(SHEET_NAMES.README);
    expect(BUILT_SHEET_NAMES).toEqual(Object.values(SHEET_NAMES));

    for (const sheetName of Object.values(SHEET_NAMES)) {
      let described = '';
      for (let row = 1; row <= readme.rowCount; row += 1) {
        if (cellText(readme, row, 1) === sheetName) {
          described = cellText(readme, row, 2);
          break;
        }
      }
      expect(described, `${sheetName} has no README description`).not.toBe('');
      expect(described, `${sheetName} is described as missing`).not.toContain('Not included');
    }
  });

  it('tells the reader the score sheets calculate themselves', () => {
    const readme = sheet(SHEET_NAMES.README);
    let text = '';
    for (let row = 1; row <= readme.rowCount; row += 1) {
      if (cellText(readme, row, 1) === 'Scores update as you type') {
        text = cellText(readme, row, 2);
        break;
      }
    }
    expect(text).toContain('nothing on those sheets for you to fill in');
  });

  /**
   * Renamed from "reproduces the guidance the tool shows on screen", which it did not do
   * — it searched the README for substrings taken from the very constant under test,
   * never touching the component. The real parity check against
   * `InformationManagementNotice` lives in `readme.test.tsx`, which renders it.
   *
   * What this asserts is narrower and honest: the guidance reached the README sheet.
   */
  it('carries the Information Management guidance on the README sheet', () => {
    const readme = sheet(SHEET_NAMES.README);
    let guidance = '';
    for (let row = 1; row <= readme.rowCount; row += 1) {
      const value = cellText(readme, row, 2);
      if (value === INFORMATION_MANAGEMENT_GUIDANCE) {
        guidance = value;
        break;
      }
    }
    expect(guidance, 'README does not carry INFORMATION_MANAGEMENT_GUIDANCE verbatim').toBe(
      INFORMATION_MANAGEMENT_GUIDANCE
    );
  });

  /**
   * The accepted divergences from Section 5.4. These are the workbook's honest
   * limitations, and stating them is the whole reason they are acceptable — an
   * unstated divergence is a defect.
   */
  it('documents that it cannot represent finalized status', () => {
    const readme = sheet(SHEET_NAMES.README);
    let text = '';
    for (let row = 1; row <= readme.rowCount; row += 1) {
      if (cellText(readme, row, 1) === 'Finalized assessments') {
        text = cellText(readme, row, 2);
        break;
      }
    }
    expect(text).toContain('counts everything you have entered');
    expect(text).toContain('same rules');
  });

  it('documents the Technology sub-dimension scoring rule', () => {
    const readme = sheet(SHEET_NAMES.README);
    let text = '';
    for (let row = 1; row <= readme.rowCount; row += 1) {
      if (cellText(readme, row, 1) === 'Technology dimension score') {
        text = cellText(readme, row, 2);
        break;
      }
    }
    expect(text).toContain('average of the two sub-dimension averages');
    expect(text).toContain('not the average of all 11 Technology');
  });

  it('states the model versions read from the data files', () => {
    const readme = sheet(SHEET_NAMES.README);
    const labels = readmeLabels();
    expect(labels).toContain('Capability Reference Model version');
    expect(labels).toContain('Maturity Model version');
    expect(labels).toContain('Self-Assessment Tool version');

    const versionRow = labels.indexOf('Capability Reference Model version') + 1;
    expect(cellText(readme, versionRow, 2)).toBe('4.0');
  });

  /**
   * The README quotes the row count of sheet 04. If it were hardcoded it would
   * eventually lie; this asserts it matches what the sheet actually contains.
   */
  it('quotes a row count that matches the sheet it describes', () => {
    const readme = sheet(SHEET_NAMES.README);
    const actualRows = sheet(SHEET_NAMES.ASSESSMENT_INPUT).rowCount - HEADER_ROW;
    let text = '';
    for (let row = 1; row <= readme.rowCount; row += 1) {
      if (cellText(readme, row, 1) === 'Row counts') {
        text = cellText(readme, row, 2);
        break;
      }
    }
    expect(text).toContain(actualRows.toLocaleString('en-US'));
  });
});
