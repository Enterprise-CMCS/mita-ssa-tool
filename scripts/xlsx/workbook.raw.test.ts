/**
 * Assertions against the workbook's raw OOXML, unzipped from the generated file.
 *
 * ## Why a second suite, when `workbook.test.ts` already reloads the file
 *
 * That suite reloads through ExcelJS's own reader, which **normalises**. It expands a
 * range-scoped data validation back into individual cells, resolves style inheritance,
 * and inverts the sheet-protection attributes. Anything the reader smooths over is
 * invisible to it — including a defect this wave actually shipped and then fixed:
 * ExcelJS emitted two overlapping `<dataValidation>` elements because its range
 * coalescer sorts cell addresses as strings (`H10` before `H3`). A per-cell count after
 * reload returned 1,625 for both the broken and the correct form.
 *
 * A 508 reviewer's tooling reads the XML, not our object graph. So the requirements
 * where the file format is the ground truth are asserted here, on the bytes.
 *
 * `jszip` is already a production dependency of the app, so this adds nothing.
 */

import JSZip from 'jszip';
import { beforeAll, describe, expect, it } from 'vitest';

import { HEADER_ROW, SHEET_NAMES } from './constants.ts';
import { buildWorkbook, writeWorkbookBuffer } from './workbook.ts';

let archive: JSZip;
/** Sheet display name to its part name inside the archive. */
let sheetParts: Map<string, string>;

/**
 * Resolve sheet names to archive parts properly, via `workbook.xml` and its rels.
 *
 * Assuming `sheet1.xml` is the first worksheet happens to be true today and is not
 * guaranteed by the format — the ordering lives in `workbook.xml`, and the file name
 * comes from the relationship target.
 */
async function mapSheetParts(zip: JSZip): Promise<Map<string, string>> {
  const workbookXml = await zip.file('xl/workbook.xml')?.async('string');
  const relsXml = await zip.file('xl/_rels/workbook.xml.rels')?.async('string');
  if (!workbookXml || !relsXml) {
    throw new Error('Archive is missing xl/workbook.xml or its relationships');
  }

  const relTargets = new Map<string, string>();
  for (const match of relsXml.matchAll(/<Relationship\b[^>]*\/>/g)) {
    const id = /Id="([^"]+)"/.exec(match[0])?.[1];
    const target = /Target="([^"]+)"/.exec(match[0])?.[1];
    if (id && target) {
      relTargets.set(id, target.replace(/^\/?xl\//, ''));
    }
  }

  const parts = new Map<string, string>();
  for (const match of workbookXml.matchAll(/<sheet\b[^>]*\/>/g)) {
    const name = /name="([^"]+)"/.exec(match[0])?.[1];
    const relId = /r:id="([^"]+)"/.exec(match[0])?.[1];
    const target = relId ? relTargets.get(relId) : undefined;
    if (name && target) {
      parts.set(decodeXml(name), `xl/${target}`);
    }
  }
  return parts;
}

function decodeXml(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

async function sheetXml(name: string): Promise<string> {
  const part = sheetParts.get(name);
  if (!part) {
    throw new Error(
      `No archive part for sheet ${name}. Known: ${[...sheetParts.keys()].join(', ')}`
    );
  }
  const xml = await archive.file(part)?.async('string');
  if (!xml) {
    throw new Error(`Archive part ${part} is empty`);
  }
  return xml;
}

async function partNames(): Promise<string[]> {
  return Object.keys(archive.files).filter((name) => !name.endsWith('/'));
}

beforeAll(async () => {
  const buffer = await writeWorkbookBuffer(buildWorkbook());
  archive = await JSZip.loadAsync(buffer);
  sheetParts = await mapSheetParts(archive);
});

describe('raw OOXML: file inventory', () => {
  it('maps every expected sheet name to an archive part', async () => {
    for (const name of Object.values(SHEET_NAMES)) {
      expect(sheetParts.get(name), name).toMatch(/^xl\/worksheets\/sheet\d+\.xml$/);
    }
    expect(sheetParts.size).toBe(Object.values(SHEET_NAMES).length);
    expect(sheetParts.size).toBe(10);
  });

  /**
   * 5.3's no-images rule, asserted at the level where it is unambiguous. An image adds
   * an `xl/media/` entry and an `xl/drawings/` part; asserting their absence is
   * stronger than asking ExcelJS whether it knows about any.
   */
  it('contains no media, drawing, or VML parts', async () => {
    const names = await partNames();
    expect(names.filter((name) => name.startsWith('xl/media/'))).toEqual([]);
    expect(names.filter((name) => name.startsWith('xl/drawings/'))).toEqual([]);
    expect(names.filter((name) => name.endsWith('.vml'))).toEqual([]);
  });

  it('contains no chart, pivot table, or embedded object parts', async () => {
    const names = await partNames();
    for (const fragment of ['charts/', 'pivotTables/', 'pivotCache/', 'embeddings/']) {
      expect(
        names.filter((name) => name.includes(fragment)),
        fragment
      ).toEqual([]);
    }
  });

  /**
   * No macros. A macro-bearing workbook would need a `.xlsm` extension and gets blocked
   * or warned about by most government mail gateways, which is a delivery problem before
   * it is an accessibility one.
   */
  it('contains no VBA project', async () => {
    const names = await partNames();
    expect(names.filter((name) => name.includes('vbaProject'))).toEqual([]);
  });
});

describe('raw OOXML: no merged cells', () => {
  /**
   * The single most-cited reason the previous workbook was rejected. Asserted on the
   * bytes because `mergeCells` is a sheet-level element and its absence is the whole
   * requirement — there is no normalisation for the reader to hide behind, but there is
   * also no reason to trust a second layer when the first is this cheap.
   */
  it('emits no mergeCell element on any sheet', async () => {
    for (const [name, part] of sheetParts) {
      const xml = await archive.file(part)?.async('string');
      expect(xml?.includes('<mergeCell'), `${name} contains a merged cell`).toBe(false);
      expect(xml?.includes('<mergeCells'), `${name} contains a mergeCells block`).toBe(false);
    }
  });
});

describe('raw OOXML: data validation', () => {
  const inputSheets = [
    { name: SHEET_NAMES.ASSESSMENT_INPUT, range: 'H3:I1627' },
    { name: SHEET_NAMES.ORGANIZATIONAL_INPUT, range: 'D3:E17' },
  ];

  /**
   * The assertion that caught the real defect. ExcelJS's reader expands any number of
   * overlapping `<dataValidation>` elements back to the same set of cells, so the
   * per-cell count in `workbook.test.ts` cannot distinguish one clean element from two
   * overlapping ones. The element count can.
   *
   * Proved failable by reverting `applyLevelValidation` to per-cell assignment, which
   * produces `count="2"` with a spurious `H10:I1627`.
   */
  it.each(inputSheets)(
    '$name declares exactly one validation covering $range',
    async ({ name, range }) => {
      const xml = await sheetXml(name);
      const block = /<dataValidations\b[^>]*>[\s\S]*?<\/dataValidations>/.exec(xml)?.[0];
      expect(block, `${name} has no dataValidations block`).toBeDefined();

      const elements = block?.match(/<dataValidation\b/g) ?? [];
      expect(elements, `${name} declares ${elements.length} validation elements`).toHaveLength(1);

      const sqrefs = [...(block ?? '').matchAll(/sqref="([^"]+)"/g)].map((match) => match[1]);
      expect(sqrefs).toEqual([range]);
    }
  );

  /**
   * The editable cells must be genuinely **blank**, not text cells holding an empty
   * string. This is only visible here: ExcelJS's reader normalises both to `null` and
   * `cellText()` normalises them to `''`, so every assertion in `workbook.test.ts` passes
   * either way.
   *
   * It matters because `ISBLANK` and `COUNTBLANK` disagree with `AVERAGEIF`. An
   * empty-string cell is not blank, so a Wave 7 completion formula counting non-blank
   * level cells would report a blank workbook as 100% complete, while the score formulas
   * — `AVERAGEIF` with `">0"`, which skips text — correctly reported nothing. Two figures
   * on one sheet disagreeing about the same cells is the worst available outcome.
   *
   * Proved failable by writing `''` rather than `null` in `addTableSheet`, which is what
   * the generator originally did: 8,125 shared-string references on a blank workbook.
   */
  it.each(inputSheets)(
    '$name leaves the level cells truly blank, not empty text',
    async ({ name }) => {
      const xml = await sheetXml(name);
      const levelColumns = name === SHEET_NAMES.ASSESSMENT_INPUT ? ['H', 'I'] : ['D', 'E'];

      for (const column of levelColumns) {
        const cells = [...xml.matchAll(new RegExp(`<c r="${column}(\\d+)"[^>]*?(?:/>|>)`, 'g'))];
        const dataCells = cells.filter((cell) => Number(cell[1]) > HEADER_ROW);
        expect(dataCells.length, `${name} column ${column} has no data cells`).toBeGreaterThan(0);

        for (const cell of dataCells) {
          // A blank styled cell is `<c r="H3" s="8"/>`. A text cell carries `t="s"` plus a
          // `<v>` pointing into sharedStrings, which is the defect.
          expect(cell[0], `${name} ${column}${cell[1]} is a text cell, not blank`).not.toContain(
            't="s"'
          );
          expect(cell[0], `${name} ${column}${cell[1]} is not self-closing`).toMatch(/\/>$/);
        }
      }
    }
  );

  it.each(inputSheets)(
    '$name validates against the level list and permits blank',
    async ({ name }) => {
      const xml = await sheetXml(name);
      const block = /<dataValidations\b[^>]*>[\s\S]*?<\/dataValidations>/.exec(xml)?.[0] ?? '';
      expect(block).toContain('type="list"');
      expect(block).toContain('allowBlank="1"');
      expect(decodeXml(block)).toContain('<formula1>"N/A,1,2,3,4,5"</formula1>');
    }
  );

  /**
   * Workbook-wide, not just the level columns. The `null`-not-`''` fix was applied to
   * `addTableSheet` and initially missed `addReadmeSheet`, which assigns cells directly —
   * leaving nine `<c … t="s"><v>4</v></c>` cells and an empty shared-string entry on the
   * README. Scoping the check to the level columns would not have caught it.
   */
  it('writes no empty-string text cells on any sheet', async () => {
    const sharedStrings = (await archive.file('xl/sharedStrings.xml')?.async('string')) ?? '';
    const items = [...sharedStrings.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((match) => match[1]);
    const emptyIndexes = new Set(
      items
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item === '<t></t>' || item === '<t/>')
        .map(({ index }) => String(index))
    );

    // If no shared string is empty, no cell can reference one — the strongest form.
    if (emptyIndexes.size === 0) {
      expect(emptyIndexes.size).toBe(0);
      return;
    }

    const offenders: string[] = [];
    for (const [name] of sheetParts) {
      const xml = await sheetXml(name);
      for (const cell of xml.matchAll(/<c r="([A-Z]+\d+)"[^>]*t="s"[^>]*><v>(\d+)<\/v><\/c>/g)) {
        if (emptyIndexes.has(cell[2] as string)) {
          offenders.push(`${name} ${cell[1]}`);
        }
      }
    }

    expect(
      offenders,
      `cells hold an empty string rather than being blank:\n${offenders.join('\n')}`
    ).toEqual([]);
  });

  it('declares no validation on the reference sheets', async () => {
    for (const name of [
      SHEET_NAMES.README,
      SHEET_NAMES.MATURITY_LEVELS,
      SHEET_NAMES.CAPABILITY_REFERENCE,
      SHEET_NAMES.CRITERIA_REFERENCE,
    ]) {
      const xml = await sheetXml(name);
      expect(xml.includes('<dataValidation'), name).toBe(false);
    }
  });
});

describe('raw OOXML: sheet protection', () => {
  /**
   * **The OOXML attributes are inverted relative to the ExcelJS API**, which is worth
   * stating plainly because it makes a naive reading of the XML look alarming.
   *
   * In the file format each flag means "this operation is *blocked*". So `sort="0"`
   * means sorting is permitted, and the flags for formatting, inserting and deleting
   * are omitted entirely, defaulting to `1` — blocked. Most importantly,
   * `selectLockedCells` is **absent**, and its format default is `0`: locked cells
   * remain selectable, which is the 5.3 requirement that reference content stays
   * reachable by keyboard and screen reader.
   *
   * A present `selectLockedCells="1"` would be the violation. That is what this
   * asserts, alongside `sheet="1"` so that removing protection altogether also fails.
   */
  it('protects every sheet without blocking selection of locked cells', async () => {
    for (const [name] of sheetParts) {
      const xml = await sheetXml(name);
      const element = /<sheetProtection\b[^>]*\/>/.exec(xml)?.[0];
      expect(element, `${name} has no sheetProtection element`).toBeDefined();
      expect(element, name).toContain('sheet="1"');
      // Absent means selectable. Present and "1" would block it.
      expect(element, `${name} blocks selection of locked cells`).not.toContain(
        'selectLockedCells="1"'
      );
      expect(element, `${name} blocks selection of unlocked cells`).not.toContain(
        'selectUnlockedCells="1"'
      );
    }
  });

  it('permits sorting and filtering on the table sheets', async () => {
    for (const name of [
      SHEET_NAMES.MATURITY_LEVELS,
      SHEET_NAMES.CAPABILITY_REFERENCE,
      SHEET_NAMES.CRITERIA_REFERENCE,
      SHEET_NAMES.ASSESSMENT_INPUT,
      SHEET_NAMES.ORGANIZATIONAL_INPUT,
    ]) {
      const element = /<sheetProtection\b[^>]*\/>/.exec(await sheetXml(name))?.[0] ?? '';
      expect(element, name).toContain('sort="0"');
      expect(element, name).toContain('autoFilter="0"');
    }
  });

  /**
   * No password hash. Protection here guards against accidental edits to reference
   * data; it is not a security control, and a password a state cannot obtain would make
   * the workbook unmaintainable for them.
   */
  it('sets no protection password', async () => {
    for (const [name] of sheetParts) {
      const element = /<sheetProtection\b[^>]*\/>/.exec(await sheetXml(name))?.[0] ?? '';
      expect(element, name).not.toContain('password=');
      expect(element, name).not.toContain('hashValue=');
    }
  });
});

describe('raw OOXML: document properties', () => {
  it('writes the core properties 5.3 requires', async () => {
    const xml = await archive.file('docProps/core.xml')?.async('string');
    expect(xml).toBeDefined();
    for (const tag of ['dc:title', 'dc:subject', 'dc:description', 'dc:creator', 'cp:category']) {
      const content = new RegExp(`<${tag}>([^<]+)</${tag}>`).exec(xml ?? '')?.[1];
      expect(String(content ?? '').length, `${tag} is empty`).toBeGreaterThan(8);
    }
  });

  /**
   * The PRA statement in the description, asserted on the specific sentence rather
   * than on the label. The label alone appears in the title too, so matching on it
   * would pass against a description carrying only the short body.
   */
  it('carries the PRA statement in the description property', async () => {
    const xml = decodeXml((await archive.file('docProps/core.xml')?.async('string')) ?? '');
    const description = /<dc:description>([^<]*)<\/dc:description>/.exec(xml)?.[1] ?? '';
    expect(description).toContain('Paperwork Reduction Act');
    expect(description).toContain('do not represent final agency policy');
  });
});

describe('raw OOXML: print setup', () => {
  /**
   * Asserted on the emitted bytes, and length-checked. Excel's footer limit is 255
   * characters; the full notice line is 420, so it lives on the README and in the
   * `description` property instead.
   *
   * This does catch an over-length footer. What no test can do is confirm Excel *accepts*
   * what we wrote — the bytes are exactly what we intended and only Excel objects — which
   * is why `assertFooterFits` also throws at generation time.
   *
   * The footer text also carries `&` formatting codes, so a literal `&` in the notice has
   * to be doubled. There is none today; this incidentally pins that the footer survived
   * escaping intact rather than being truncated at an `&`.
   */
  it('puts the notice in the footer of every sheet, within Excel 255-char limit', async () => {
    for (const [name] of sheetParts) {
      const xml = decodeXml(await sheetXml(name));
      const footer = /<oddFooter>([\s\S]*?)<\/oddFooter>/.exec(xml)?.[1] ?? '';
      expect(footer, `${name} footer`).toContain('Predecisional Pilot Materials');
      expect(footer.length, `${name} footer is ${footer.length} chars`).toBeLessThanOrEqual(255);
    }
  });

  it('repeats the header row on printed pages of the table sheets', async () => {
    const workbookXml = decodeXml((await archive.file('xl/workbook.xml')?.async('string')) ?? '');
    for (const name of [
      SHEET_NAMES.MATURITY_LEVELS,
      SHEET_NAMES.CAPABILITY_REFERENCE,
      SHEET_NAMES.CRITERIA_REFERENCE,
      SHEET_NAMES.ASSESSMENT_INPUT,
      SHEET_NAMES.ORGANIZATIONAL_INPUT,
    ]) {
      // Print titles are stored as a `_xlnm.Print_Titles` defined name in workbook.xml.
      expect(workbookXml, `${name} print titles`).toContain(
        `'${name}'!$${HEADER_ROW}:$${HEADER_ROW}`
      );
    }
  });
});

/**
 * Formula dialect: the workbook must not use a function newer than Excel 2007.
 *
 * Two separate hazards, and the allowlist below covers both at once.
 *
 * **Storage.** A worksheet function added after Excel 2007 has to be *stored* with an `_xlfn.`
 * prefix. Excel strips it for display, so the formula bar looks right, but a file containing the
 * bare name shows `#NAME?` in every cell that uses it. ExcelJS prefixes nothing.
 *
 * **Availability.** Even correctly prefixed, the function only resolves in a version of Excel that
 * has it. `TEXTJOIN` was used here for the three text roll-ups and **does not exist in Excel 2016
 * or earlier** — so once the prefix was fixed, states on an older Office would still have seen
 * `#NAME?` in all 648 cells. It was replaced with `IF`/`&`/`MID`, which are all ancient.
 *
 * The first of those shipped and was found by a user opening the file. The formula-string tests
 * could not see it: they assert what the generator emits, and `TEXTJOIN(` was exactly what it
 * emitted. The string was right and the dialect was wrong, which is a distinction only the file
 * format can make.
 *
 * So the check is on emitted names against a set that predates the prefix rule. Anything newer
 * fails here — whether or not it is prefixed — which keeps the Excel 2007 floor a property of the
 * build rather than a claim in a document.
 */
describe('raw OOXML: formula dialect', () => {
  /**
   * Functions available in Excel 2007 and earlier, which are stored under their plain name.
   *
   * Deliberately an allowlist rather than a denylist of new functions: a denylist silently permits
   * whatever nobody thought to add to it, which is how this defect happened.
   */
  const AVAILABLE_IN_EXCEL_2007 = new Set([
    'AVERAGE',
    'AVERAGEIFS',
    'COUNT',
    'COUNTA',
    'COUNTIF',
    'COUNTIFS',
    'IF',
    'IFERROR',
    'LEN',
    'MAX',
    'MID',
    'MIN',
    'ROUND',
    'SUBSTITUTE',
    'SUM',
    'SUMIFS',
    'TRIM',
  ]);

  /** Every function name appearing in a `<f>` element, across every sheet. */
  async function emittedFunctionNames(): Promise<Map<string, string[]>> {
    const found = new Map<string, string[]>();

    for (const sheetName of sheetParts.keys()) {
      const xml = await sheetXml(sheetName);
      for (const match of decodeXml(xml).matchAll(/<f[^>]*>([^<]*)<\/f>/g)) {
        const formula = match[1] ?? '';
        // A function call is a name immediately followed by `(`. `_xlfn.` and `_xlws.` are legal
        // leading characters, so they are captured as part of the name rather than stripped.
        for (const call of formula.matchAll(
          /(^|[^A-Z0-9_.])((?:_xl[a-z]+\.)*[A-Z][A-Z0-9_.]*)\(/g
        )) {
          const name = call[2];
          if (name === undefined) {
            continue;
          }
          found.set(name, [...new Set([...(found.get(name) ?? []), sheetName])]);
        }
      }
    }
    return found;
  }

  it('emits at least one formula, so this suite is not vacuous', async () => {
    const names = await emittedFunctionNames();
    expect(names.size).toBeGreaterThan(0);
    // The functions the computed sheets are built from. If the scan stopped matching, these would
    // silently vanish and every assertion below would pass over an empty set.
    for (const expected of ['AVERAGEIFS', 'COUNTIFS', 'IFERROR', 'ROUND', 'SUM']) {
      expect([...names.keys()], `scan missed ${expected}`).toContain(expected);
    }
  });

  it('uses no function newer than Excel 2007', async () => {
    const offenders: string[] = [];
    for (const [name, sheets] of await emittedFunctionNames()) {
      if (AVAILABLE_IN_EXCEL_2007.has(name)) {
        continue;
      }
      offenders.push(`${name} on ${sheets.join(', ')}`);
    }

    // A name here is a function that either needs an `_xlfn.` prefix to be stored correctly, or
    // does not exist in an older Excel, or both. Before adding it to the allowlist, check when it
    // was introduced — the allowlist is the workbook's compatibility floor, not a convenience.
    expect(offenders).toEqual([]);
  });

  /**
   * `TEXTJOIN` specifically, because it is the one that shipped broken twice — first stored without
   * its prefix, then still unavailable in Excel 2016 once the prefix was added. Its absence is the
   * regression test.
   */
  it('does not use TEXTJOIN, which needs Excel 2019 or later', async () => {
    const names = [...(await emittedFunctionNames()).keys()];
    expect(names).not.toContain('TEXTJOIN');
    expect(names).not.toContain('_xlfn.TEXTJOIN');

    // And the text roll-ups it used to serve are still present, so this is not passing because the
    // columns were quietly dropped.
    const profile = decodeXml(await sheetXml(SHEET_NAMES.MATURITY_PROFILE));
    expect((profile.match(/MID\(IF\(/g) ?? []).length).toBe(195 * 3);
  });
});
