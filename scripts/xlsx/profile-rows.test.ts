/**
 * The computed sheets: row structure, and snapshots of the generated formula strings.
 *
 * This is mitigation step 2 from Section 5.4. Step 1 (`scoring-spec.test.ts`) proves the *rule*
 * matches the app; these snapshots catch the other failure mode — a range or a criterion drifting
 * so that a correct rule is applied to the wrong cells. A formula can be perfectly shaped and
 * point at the wrong column, and nothing else in the suite would notice.
 *
 * Snapshots are written inline rather than to a `.snap` file, so a diff in review shows the actual
 * formula rather than a hash. That matters here: these strings are the arithmetic a state submits
 * to CMS, and a reviewer should be able to read them.
 *
 * **What this cannot do** is evaluate anything. `AVERAGEIFS('04'!$H$3:$H$1627, ...)` is asserted as
 * a string; whether Excel computes 3.4 from it is settled only by opening the file.
 */

import { describe, expect, it } from 'vitest';

import { FIRST_DATA_ROW, SCORE_SOURCES, SHEET_NAMES } from './constants.ts';
import { buildAssessmentInputRows, buildOrganizationalInputRows } from './rows.ts';
import {
  ORBIT_DIMENSION_IDS,
  ORGANIZATIONAL_ASSESSMENT_AREA_ID,
  ORGANIZATIONAL_SECTIONS,
  getAllAreasWithDomains,
  getAllOrganizationalAspectLocations,
  getAspectCountForDimension,
  getStandardAreasWithDomains,
} from './model.ts';
import {
  buildAreaScoreRows,
  buildDimensionScoreRows,
  buildDomainScoreRows,
  buildMaturityProfileRows,
  expectedComputedRowCounts,
  resolveAggregateFormulas,
  type ComputedRow,
} from './profile-rows.ts';
import type { InputExtents } from './scoring-spec.ts';

/** The real extents, so snapshots reflect what actually ships. */
const EXTENTS: InputExtents = { assessmentLastRow: 1627, organizationalLastRow: 17 };

function profile(): ReturnType<typeof buildMaturityProfileRows> {
  const built = buildMaturityProfileRows(EXTENTS);
  resolveAggregateFormulas(built);
  return built;
}

/**
 * The most aspects one profile row's `aspectsAssessed` cell can ever count.
 *
 * Derived from the model rather than written down, so the completion ceiling below stays an
 * independent check on the denominator rather than restating it.
 */
function aspectCountOf(row: ComputedRow): number {
  const dimensionId = String(row.dimensionId);
  if ((ORGANIZATIONAL_SECTIONS as readonly string[]).includes(dimensionId)) {
    return getAllOrganizationalAspectLocations().filter(
      (location) => location.sectionId === dimensionId
    ).length;
  }
  return getAspectCountForDimension(dimensionId as (typeof ORBIT_DIMENSION_IDS)[number]);
}

/** The formula text of a cell, or a marker if it holds a literal. */
function formulaOf(row: ComputedRow, key: string): string {
  const value = row[key];
  if (typeof value === 'object' && value !== null && 'formula' in value) {
    return value.formula;
  }
  return `(literal: ${JSON.stringify(value)})`;
}

describe('row structure', () => {
  it('builds the expected number of rows on each computed sheet', () => {
    const built = profile();
    const expected = expectedComputedRowCounts();

    expect(built.rows).toHaveLength(expected[SHEET_NAMES.MATURITY_PROFILE] as number);
    expect(buildAreaScoreRows(built)).toHaveLength(expected[SHEET_NAMES.AREA_SCORES] as number);
    expect(buildDomainScoreRows(74)).toHaveLength(expected[SHEET_NAMES.DOMAIN_SCORES] as number);
    expect(buildDimensionScoreRows(built.lastRow)).toHaveLength(
      expected[SHEET_NAMES.DIMENSION_SCORES] as number
    );
  });

  /**
   * 216, not the 228 an earlier draft of 5.2 specified. The arithmetic is spelled out so a model
   * change shows which part moved: 71 standard areas x 3 dimensions, plus one row per
   * organizational section rather than per organizational aspect.
   */
  it('is 213 standard dimension rows plus 3 organizational section rows', () => {
    const built = profile();
    const areaCount = getStandardAreasWithDomains().length;
    expect(areaCount).toBe(71);

    const standard = built.rows.filter((row) => row.source !== SCORE_SOURCES.organizational);
    const organizational = built.rows.filter((row) => row.source === SCORE_SOURCES.organizational);
    expect(standard).toHaveLength(213);
    expect(organizational).toHaveLength(3);

    // Ties the two literals above to the model, so a capability-model change fails here with the
    // arithmetic visible rather than just reporting a count that no longer means anything.
    expect(standard).toHaveLength(areaCount * ORBIT_DIMENSION_IDS.length);
    expect(organizational).toHaveLength(ORGANIZATIONAL_SECTIONS.length);
    expect(built.rows).toHaveLength(216);
  });

  it('gives every standard area exactly one row per ORBIT dimension', () => {
    const built = profile();
    const byArea = new Map<string, Set<string>>();
    for (const row of built.rows) {
      if (row.source === SCORE_SOURCES.organizational) {
        continue;
      }
      const areaId = String(row.areaId);
      byArea.set(areaId, (byArea.get(areaId) ?? new Set()).add(String(row.dimensionId)));
    }

    expect(byArea.size).toBe(71);
    for (const [areaId, dimensions] of byArea) {
      expect([...dimensions].sort(), areaId).toEqual([...ORBIT_DIMENSION_IDS].sort());
    }
  });

  /**
   * 21 aggregate rows: Data Management's 10 areas plus Technology Management's 11. Each replaces
   * a dimension the state does not enter, which is what makes an area's three dimension scores
   * complete enough to average.
   */
  it('marks 21 rows as aggregates, one per enterprise-domain area', () => {
    const aggregates = profile().rows.filter((row) => row.source === SCORE_SOURCES.aggregate);
    expect(aggregates).toHaveLength(21);

    const byDomain = new Map<string, string>();
    for (const row of aggregates) {
      byDomain.set(String(row.domainId), String(row.dimensionId));
    }
    expect(Object.fromEntries(byDomain)).toEqual({
      'data-management': 'information',
      technical: 'technology',
    });
  });

  /**
   * An aggregate has no To-Be. `generateStandardAreaProfile` leaves it empty and the tool has no
   * target for a derived figure, so computing one would invent a number the tool does not have.
   *
   * Written as the words "Not applicable" rather than a blank cell: blank reads as "not filled in
   * yet" to both a screen reader and a person, and the distinction matters on a submission
   * artifact. `AVERAGE` ignores text in a cell reference just as it ignores a blank, so the
   * roll-up on `07` still drops it and the divisor still falls from 3 to 2.
   */
  it('marks the To-Be cell not applicable on every aggregate row', () => {
    for (const row of profile().rows.filter((r) => r.source === SCORE_SOURCES.aggregate)) {
      expect(row.targetScore, String(row.areaId)).toBe('Not applicable');
      expect(row.targetUnrounded, String(row.areaId)).toBe('Not applicable');
    }
  });

  /**
   * No cell on a computed sheet is ever empty.
   *
   * The value sheets get this from the 508 suite, which allows blanks only in the editable input
   * columns — and the computed sheets have none, so nothing on them should be blank at all. Worth
   * asserting separately because a formula returning `""` is invisible here: this checks what the
   * builders write, and `workbook.raw.test.ts` checks that no empty-string text cell reaches the
   * file.
   */
  it('writes no empty cell on any computed sheet', () => {
    const built = profile();
    const everySheet: Array<[string, ComputedRow[]]> = [
      [SHEET_NAMES.MATURITY_PROFILE, built.rows],
      [SHEET_NAMES.AREA_SCORES, buildAreaScoreRows(built)],
      [SHEET_NAMES.DOMAIN_SCORES, buildDomainScoreRows(74)],
      [SHEET_NAMES.DIMENSION_SCORES, buildDimensionScoreRows(built.lastRow)],
    ];

    const offenders: string[] = [];
    for (const [sheetName, rows] of everySheet) {
      for (const [index, row] of rows.entries()) {
        for (const [key, value] of Object.entries(row)) {
          if (value === '' || value === null || value === undefined) {
            offenders.push(`${sheetName} row ${index + 1} ${key}`);
          }
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  /**
   * An aggregate row contributes **zero** assessed aspects, because a state enters none for an
   * aggregated dimension. This is arithmetic, not cosmetics: `07_Area_Scores` sums the three
   * dimension rows' `aspectsAssessed` as the numerator of completion %, while the denominator
   * from `getAssessableAspectCountForArea` leaves the aggregated dimension's aspects out (26
   * drops to 16 for Data Management, 15 for Technology Management). Anything but zero here
   * inflates completion on all 21 enterprise-domain areas — the first draft put the
   * contributing-area count in this cell and reported well over 100%.
   */
  it('counts zero assessed aspects on an aggregate row', () => {
    const aggregates = profile().rows.filter((row) => row.source === SCORE_SOURCES.aggregate);
    expect(aggregates).toHaveLength(21);
    for (const row of aggregates) {
      expect(row.aspectsAssessed, String(row.areaId)).toBe(0);
    }
  });

  /**
   * Completion can never exceed 100%, checked by construction rather than by reading cells: for
   * every area, the aspects its dimension rows can contribute must not exceed the denominator the
   * completion formula divides by.
   */
  it('cannot report completion above 100% on any area', () => {
    const built = profile();
    for (const row of buildAreaScoreRows(built)) {
      const assessable = Number(row.aspectsAssessable);
      const contributors = built.rows.filter((profileRow) => profileRow.areaId === row.areaId);
      const maximum = contributors.reduce((total, profileRow) => {
        // A formula cell can contribute at most its dimension's aspect count; a literal
        // contributes exactly its value.
        const value = profileRow.aspectsAssessed;
        if (typeof value === 'number') {
          return total + value;
        }
        return total + aspectCountOf(profileRow);
      }, 0);
      expect(maximum, `${String(row.areaId)} max ${maximum} vs assessable ${assessable}`).toBe(
        assessable
      );
    }
  });

  it('covers all 72 areas on the area-score sheet', () => {
    const rows = buildAreaScoreRows(profile());
    expect(new Set(rows.map((row) => String(row.areaId))).size).toBe(72);
    expect(new Set(rows.map((row) => String(row.areaId)))).toEqual(
      new Set(getAllAreasWithDomains().map(({ area }) => area.id))
    );
  });

  it('ends the domain sheet with a single overall row', () => {
    const rows = buildDomainScoreRows(74);
    expect(rows).toHaveLength(15);
    expect(rows[14]?.domainId).toBe('overall');
    expect(rows.filter((row) => row.domainId === 'overall')).toHaveLength(1);
  });
});

describe('formula snapshots: 06_Maturity_Profile', () => {
  /**
   * A non-Technology dimension. Criteria address the ID columns rather than row offsets, because
   * sorting is enabled on the input sheets — a state can reorder 1,625 rows and this must still
   * find its data.
   */
  it('scores a Business Architecture row from the input sheet', () => {
    const row = profile().rows.find(
      (candidate) =>
        candidate.dimensionId === 'businessArchitecture' &&
        candidate.source === SCORE_SOURCES.entered
    );
    expect(formulaOf(row as ComputedRow, 'currentScore')).toBe(
      'IFERROR(ROUND(AVERAGEIFS(' +
        "'04_Assessment_Input'!$H$3:$H$1627," +
        '\'04_Assessment_Input\'!$N$3:$N$1627,"health-plan-administration",' +
        '\'04_Assessment_Input\'!$O$3:$O$1627,"businessArchitecture",' +
        '\'04_Assessment_Input\'!$H$3:$H$1627,">0"),1),"")'
    );
  });

  /**
   * Technology averages its own row's two sub-dimension mean cells. Referencing cells rather than
   * inlining the means is what gives the drop-an-empty-sub-dimension behaviour: `AVERAGE` ignores
   * text in a cell reference but errors on text passed directly.
   */
  it('scores Technology from its two sub-dimension mean cells', () => {
    const row = profile().rows.find(
      (candidate) =>
        candidate.dimensionId === 'technology' && candidate.source === SCORE_SOURCES.entered
    );
    expect(formulaOf(row as ComputedRow, 'currentScore')).toBe(
      "IFERROR(ROUND(AVERAGE('06_Maturity_Profile'!$J$5,'06_Maturity_Profile'!$K$5),1),\"\")"
    );
  });

  it('computes each Technology sub-dimension mean unrounded', () => {
    const row = profile().rows.find(
      (candidate) =>
        candidate.dimensionId === 'technology' && candidate.source === SCORE_SOURCES.entered
    ) as ComputedRow;
    const infrastructure = formulaOf(row, 'infrastructureCurrent');

    // No ROUND: the inner means must stay unrounded or Technology disagrees with the app by 0.1,
    // which is OBS-21.
    expect(infrastructure).not.toContain('ROUND');
    expect(infrastructure).toContain('"technologyInfrastructureManagement"');
    expect(infrastructure).toContain('IFERROR(AVERAGEIFS(');
  });

  /**
   * The aggregate averages **per-area dimension scores on this sheet**, not raw input cells. A
   * flat mean over every Information input cell would weight each area by how many aspects it
   * filled in; the tool weights every area equally. 5.4 is explicit and this is the easiest thing
   * in the wave to get quietly wrong.
   */
  it('averages per-area scores for the aggregate, not raw input cells', () => {
    const row = profile().rows.find(
      (candidate) => candidate.source === SCORE_SOURCES.aggregate
    ) as ComputedRow;
    const expression = formulaOf(row, 'currentScore');

    // Reads column E of its own sheet — the rounded per-area score — not the input sheet.
    expect(expression).toContain("'06_Maturity_Profile'!$E$3:$E$218");
    expect(expression).not.toContain('04_Assessment_Input');
    // Only directly entered scores contribute, so the 21 aggregate rows cannot feed themselves.
    expect(expression).toContain(`"${SCORE_SOURCES.entered}"`);
  });

  /**
   * Both enterprise domains are excluded from both aggregates, matching
   * `status === 'finalized' && !isEnterpriseDomain(domain)`. Excluding only the aggregate's own
   * domain is the plausible mistake — it reads as the obvious self-reference guard — and would
   * feed Technology Management's areas into the Information aggregate and vice versa.
   */
  it('excludes both enterprise domains from every aggregate', () => {
    for (const row of profile().rows.filter((r) => r.source === SCORE_SOURCES.aggregate)) {
      const expression = formulaOf(row, 'currentScore');
      expect(expression, String(row.areaId)).toContain('"<>data-management"');
      expect(expression, String(row.areaId)).toContain('"<>technical"');
    }
  });

  it('writes the same contributing-count note the CSV writes', () => {
    const row = profile().rows.find(
      (candidate) => candidate.source === SCORE_SOURCES.aggregate
    ) as ComputedRow;
    const note = formulaOf(row, 'notes');
    expect(note).toContain('"(Aggregate from "');
    // Singular/plural handled the same way, so the two artifacts read alike.
    expect(note).toContain('IF(COUNTIFS');
    expect(note).toContain('" assessment"');
  });

  /**
   * The note counts areas that produced a score, not rows that exist.
   *
   * `AVERAGEIFS` ignores non-numeric cells in its average range for free; `COUNTIFS` does not, so
   * reusing the mean's criteria for the count made it a **constant** — every aggregate note read
   * "(Aggregate from 50 assessments)" on a blank workbook, next to a blank score, and the CSV
   * profile's `breakdown.length` would have said 3. It also made the zero and singular branches
   * unreachable.
   *
   * The extra criterion goes on the count only: `scoreRange` is column E and the note lives in the
   * Notes column, so this is not circular, whereas adding it to the mean — which sits *in* column E
   * — would be.
   */
  it('counts only areas that produced a score, not every row that exists', () => {
    for (const row of profile().rows.filter((r) => r.source === SCORE_SOURCES.aggregate)) {
      const note = formulaOf(row, 'notes');
      // Every COUNTIFS in the note requires a score in the per-area score column.
      const counts = note.match(/COUNTIFS\(/g) ?? [];
      expect(counts.length, String(row.areaId)).toBeGreaterThan(0);
      expect(
        note.match(/'06_Maturity_Profile'!\$E\$3:\$E\$218,">0"/g)?.length,
        String(row.areaId)
      ).toBe(counts.length);

      // And the mean must NOT carry it, or the formula references its own cell as a criteria range.
      expect(formulaOf(row, 'currentScore'), String(row.areaId)).not.toContain('$E$218,">0"');
    }
  });

  /**
   * The inverted exclusion rule, in the only column that inverts it (5.4.1). Completion tests for
   * a non-empty cell, so an aspect marked `N/A` counts as assessed while contributing to no
   * average. A `">0"` here would under-report every state who marked anything Not Applicable, and
   * the criterion is one character away from the one every score column uses.
   */
  it('counts a non-empty level cell, so N/A counts toward completion', () => {
    let checked = 0;
    for (const row of profile().rows) {
      const assessed = formulaOf(row, 'aspectsAssessed');
      if (!assessed.startsWith('COUNTIFS(')) {
        continue;
      }
      checked += 1;
      expect(assessed, String(row.areaId)).toContain(',"<>")');
      expect(assessed, String(row.areaId)).not.toContain('">0"');
    }
    // 192 entered dimension rows plus 3 organizational sections. Pinned because a loop that
    // `continue`s past every row asserts nothing and still passes — the filter here is one string
    // literal away from excluding everything.
    expect(checked).toBe(195);
  });

  /**
   * Every text roll-up is a prefixed `TEXTJOIN` over a plain contiguous range, with **no `IF`**.
   *
   * Two defects shipped here and neither was visible to a formula-string test, because the
   * generator emitted exactly the string it intended — the string was right and Excel's reading of
   * it was wrong:
   *
   * - `TEXTJOIN` stored without `_xlfn.` is an unrecognised function: `#NAME?` in all 648 cells.
   * - the criteria-based form `TEXTJOIN(...,IF(ids=x,texts,""))` is silently mis-attributing.
   *   Excel applies implicit intersection to the `IF` condition, collapsing it to the row matching
   *   the formula's own row number. Measured: Health Plan Administration's notes cell returned
   *   `HPA note | CLAIMS note`, having swallowed a different area's note, while that area's own
   *   cell read empty.
   *
   * So the presence of `IF` in one of these formulas is itself the defect, and is asserted against
   * directly. `workbook.raw.test.ts` guards the `_xlfn.` prefix at the file-format level.
   */
  it('concatenates text with functions that exist in Excel 2007', () => {
    let checked = 0;
    for (const row of profile().rows) {
      for (const key of ['notes', 'barriers', 'plans']) {
        const expression = formulaOf(row, key);
        if (!expression.startsWith('MID(')) {
          continue;
        }
        checked += 1;
        const label = `${String(row.areaId)}.${key}`;

        // No TEXTJOIN: it needs Excel 2019 and does not exist in 2016 or earlier.
        expect(expression, label).not.toContain('TEXTJOIN');
        // Each term guards its own cell, so an empty cell contributes nothing rather than a
        // stray separator.
        expect(expression, label).toContain('IF(');
        expect(expression, label).toContain('," | "&');
        // The leading separator is dropped by starting at character 4, derived from the separator
        // length rather than hardcoded.
        expect(expression, label).toMatch(/,4,32767\)$/);
      }
    }
    // 192 entered rows plus 3 organizational sections, three text columns each. The aggregate rows
    // carry "Not applicable" rather than a formula.
    expect(checked).toBe(195 * 3);
  });

  /**
   * Each text range covers exactly its own group's rows.
   *
   * The complement of the assertion above: a plain range with no `IF` is only correct if the range
   * is the right one. A sheet-wide range would concatenate every area's text into every cell —
   * which is the same wrong output the `IF` form produced, by a different route.
   */
  it('references exactly its own group of rows, one term per row', () => {
    const input = buildAssessmentInputRows();
    const organizational = buildOrganizationalInputRows();
    let checked = 0;

    for (const row of profile().rows) {
      for (const key of ['notes', 'barriers', 'plans']) {
        const expression = formulaOf(row, key);
        if (!expression.startsWith('MID(')) {
          continue;
        }
        checked += 1;
        const label = `${String(row.areaId)}.${key}`;

        // Every cell the formula touches, in the order it touches them.
        const cells = [...expression.matchAll(/'([^']+)'!\$[A-Z]+\$(\d+)/g)];
        const sheet = cells[0]?.[1];
        expect(sheet, label).toBeDefined();

        const owned = (sheet === SHEET_NAMES.ORGANIZATIONAL_INPUT ? organizational : input).flatMap(
          (candidate, index) => {
            const matches =
              sheet === SHEET_NAMES.ORGANIZATIONAL_INPUT
                ? candidate.sectionId === row.dimensionId
                : candidate.areaId === row.areaId && candidate.dimensionId === row.dimensionId;
            return matches ? [FIRST_DATA_ROW + index] : [];
          }
        );

        expect(owned.length, label).toBeGreaterThan(0);
        // Two references per row — the guard and the value — and nothing outside the group.
        expect(new Set(cells.map(([, , rowNumber]) => Number(rowNumber))), label).toEqual(
          new Set(owned)
        );
        expect(cells.length, `${label} term count`).toBe(owned.length * 2);
        // And every reference is to the same sheet, so a block cannot straddle two input sheets.
        expect(new Set(cells.map(([, sheetName]) => sheetName)), label).toEqual(new Set([sheet]));
      }
    }
    expect(checked).toBe(195 * 3);
  });

  it('scores an organizational section against the organizational input sheet', () => {
    const row = profile().rows.find(
      (candidate) => candidate.dimensionId === ORGANIZATIONAL_SECTIONS[0]
    ) as ComputedRow;
    expect(formulaOf(row, 'currentScore')).toBe(
      'IFERROR(ROUND(AVERAGEIFS(' +
        "'05_Organizational_Input'!$D$3:$D$17," +
        '\'05_Organizational_Input\'!$J$3:$J$17,"outcomes",' +
        '\'05_Organizational_Input\'!$D$3:$D$17,">0"),1),"")'
    );
  });

  /**
   * The rounded and unrounded columns must differ by exactly the `ROUND` call. Both are live and
   * consumed by different roll-ups, so a change that made them identical would silently move the
   * organizational area's rounding point.
   */
  it('keeps the unrounded column free of ROUND on every row that has one', () => {
    const rows = profile().rows;
    let checked = 0;
    for (const row of rows) {
      const unrounded = formulaOf(row, 'currentUnrounded');
      if (unrounded.startsWith('(literal')) {
        continue;
      }
      checked += 1;
      expect(unrounded, String(row.areaId)).not.toContain('ROUND');
    }
    // Every row has an unrounded formula, so the filter should exclude nothing at all.
    expect(checked).toBe(rows.length);
  });
});

describe('formula snapshots: 07, 08 and 09', () => {
  /**
   * The rounding-point distinction, made concrete. A standard area averages the **rounded**
   * dimension scores in column E; the organizational area averages the **unrounded** section
   * means in column H. Reading the wrong column is a silent tenth adrift, and 5.4 is the only
   * place that difference is written down.
   */
  it('averages rounded dimension scores for a standard area', () => {
    const rows = buildAreaScoreRows(profile());
    const standard = rows.find((row) => row.areaId !== ORGANIZATIONAL_ASSESSMENT_AREA_ID);
    const expression = formulaOf(standard as ComputedRow, 'currentScore');

    expect(expression).toContain("'06_Maturity_Profile'!$E$");
    expect(expression).not.toContain("'06_Maturity_Profile'!$H$");
  });

  it('averages unrounded section means for the organizational area', () => {
    const rows = buildAreaScoreRows(profile());
    const organizational = rows.find(
      (row) => row.areaId === ORGANIZATIONAL_ASSESSMENT_AREA_ID
    ) as ComputedRow;
    const expression = formulaOf(organizational, 'currentScore');

    expect(expression).toBe(
      'IF(SUM(' +
        "'06_Maturity_Profile'!$G$216," +
        "'06_Maturity_Profile'!$G$217," +
        '\'06_Maturity_Profile\'!$G$218)=0,"",' +
        'IFERROR(ROUND(AVERAGE(' +
        "'06_Maturity_Profile'!$H$216," +
        "'06_Maturity_Profile'!$H$217," +
        '\'06_Maturity_Profile\'!$H$218),1),""))'
    );
    expect(expression).not.toContain("'06_Maturity_Profile'!$E$");
  });

  /**
   * An area with nothing entered scores blank, even when its aggregated dimension is non-empty.
   *
   * Found by evaluating the workbook in Excel, not by any string assertion: an aggregate is
   * computed domain-wide from *other* domains' areas, so seeding one Information level in any
   * ordinary area gave all ten Data Management areas a score and pulled 21 untouched areas into
   * the domain and overall averages — moving the overall figure from 2.8 to 3.6.
   *
   * The guard is on As-Is only. To-Be needs none, because an aggregate row's To-Be is the text
   * "Not applicable" rather than a number.
   */
  it('blanks an area score until the state has entered something for that area', () => {
    for (const row of buildAreaScoreRows(profile())) {
      const score = formulaOf(row, 'currentScore');
      const dimensionsScored = formulaOf(row, 'dimensionsScored');
      expect(score, String(row.areaId)).toMatch(/^IF\(SUM\(/);
      expect(score, String(row.areaId)).toContain('=0,"",');
      expect(dimensionsScored, String(row.areaId)).toMatch(/^IF\(SUM\(/);
    }
  });

  /**
   * The guard and the completion numerator must count the same cells.
   *
   * If they drift apart the workbook can report a score for an area it simultaneously calls 0%
   * complete, or blank a score for an area showing progress — either way the two figures on the
   * same row contradict each other, and a state has no way to tell which one to trust.
   */
  it('gates the score on the same cells completion counts', () => {
    const rows = buildAreaScoreRows(profile());
    for (const row of rows) {
      const guardSum = /^IF\((SUM\(.*?\))=0,""/.exec(formulaOf(row, 'currentScore'))?.[1];
      expect(guardSum, String(row.areaId)).toBeDefined();
      expect(formulaOf(row, 'aspectsAssessed'), String(row.areaId)).toBe(guardSum);
      expect(formulaOf(row, 'completion'), String(row.areaId)).toBe(
        `ROUND(${String(guardSum)}/${String(row.aspectsAssessable)}*100,0)`
      );
    }
  });

  /**
   * Completion divides by the area's assessable count — 26, 16, 15 or 15 — and counts entered
   * cells including `N/A`, which is the one figure where N/A counts (5.4.1).
   */
  it('divides completion by the area-specific assessable count', () => {
    const rows = buildAreaScoreRows(profile());
    const organizational = rows.find(
      (row) => row.areaId === ORGANIZATIONAL_ASSESSMENT_AREA_ID
    ) as ComputedRow;
    expect(formulaOf(organizational, 'completion')).toContain('/15*100');
    expect(organizational.aspectsAssessable).toBe(15);

    const dataManagement = rows.find((row) => row.domainId === 'data-management') as ComputedRow;
    expect(formulaOf(dataManagement, 'completion')).toContain('/16*100');
    expect(dataManagement.aspectsAssessable).toBe(16);

    const ordinary = rows.find((row) => row.domainId === 'provider-management') as ComputedRow;
    expect(formulaOf(ordinary, 'completion')).toContain('/26*100');
    expect(ordinary.aspectsAssessable).toBe(26);
  });

  /**
   * The overall row averages **area** scores, not the 14 domain scores above it. `getOverallScore`
   * pools every area equally, so averaging domain scores would weight a 3-area domain the same as
   * an 11-area one and give a different number (5.4.1).
   */
  it('computes the overall row from area scores, not domain scores', () => {
    const rows = buildDomainScoreRows(74);
    const overall = rows[14] as ComputedRow;
    expect(formulaOf(overall, 'currentScore')).toBe(
      'IFERROR(ROUND(AVERAGE(\'07_Area_Scores\'!$D$3:$D$74),1),"")'
    );
    expect(formulaOf(overall, 'currentScore')).not.toContain('08_Domain_Scores');
  });

  it('averages one domain from its own areas only', () => {
    const rows = buildDomainScoreRows(74);
    const domain = rows.find((row) => row.domainId === 'provider-management') as ComputedRow;
    expect(formulaOf(domain, 'currentScore')).toBe(
      'IFERROR(ROUND(AVERAGEIFS(' +
        "'07_Area_Scores'!$D$3:$D$74," +
        '\'07_Area_Scores\'!$J$3:$J$74,"provider-management"),1),"")'
    );
  });

  /**
   * The enterprise-wide figure excludes aggregate rows. An aggregate derives from these same
   * per-area scores, so including the 21 aggregate rows would count those areas twice — the tool
   * avoids it by accident, the workbook has to do it on purpose.
   */
  it('excludes aggregate rows from the enterprise-wide dimension figure', () => {
    const rows = buildDimensionScoreRows(218);
    for (const row of rows) {
      const expression = formulaOf(row, 'currentScore');
      expect(expression, String(row.dimensionId)).toContain(`"${SCORE_SOURCES.entered}"`);
    }

    expect(formulaOf(rows[0] as ComputedRow, 'currentScore')).toBe(
      'IFERROR(ROUND(AVERAGEIFS(' +
        "'06_Maturity_Profile'!$E$3:$E$218," +
        '\'06_Maturity_Profile\'!$S$3:$S$218,"businessArchitecture",' +
        '\'06_Maturity_Profile\'!$D$3:$D$218,"Entered"),1),"")'
    );
  });

  it('shows a visible Areas denominator on each dimension row', () => {
    const rows = buildDimensionScoreRows(218);
    for (const row of rows) {
      expect(formulaOf(row, 'areaCount'), String(row.dimensionId)).toContain('COUNTIFS(');
    }
  });
});

describe('every formula is criteria-based, never offset-based', () => {
  /**
   * Sorting is deliberately enabled on the input sheets, so a state can reorder 1,625 rows. Any
   * formula that reached into the input sheet by row position would then read the wrong area's
   * data — silently, and only for states who sorted.
   *
   * Checked by asserting that no formula referencing an input sheet uses a single-cell reference
   * into it. Ranges are fine; a bare `'04_Assessment_Input'!$H$57` would not be.
   */
  it('never references a single cell on an input sheet', () => {
    const built = profile();
    const everyRow = [
      ...built.rows,
      ...buildAreaScoreRows(built),
      ...buildDomainScoreRows(74),
      ...buildDimensionScoreRows(built.lastRow),
    ];

    // No `g` flag. `RegExp.test` on a global regex advances `lastIndex` and resumes from it on
    // the next call, so a shared global instance reused across 300-odd formulas would start
    // mid-string and miss offenders — and only once there was an offender to miss, which is
    // precisely when this assertion has to work.
    //
    // The trailing `(?![\d:])` has to exclude a digit as well as a colon. With a bare `(?!:)` the
    // engine backtracks — `\d+` matches `39` of `$J$393:`, the next character is `3` rather than
    // `:`, and a perfectly good range reports as a single-cell reference.
    const singleInputCell = new RegExp(
      `'(${SHEET_NAMES.ASSESSMENT_INPUT}|${SHEET_NAMES.ORGANIZATIONAL_INPUT})'!\\$[A-Z]+\\$\\d+(?![\\d:])`
    );

    // The three text roll-ups are deliberately range-based — see `rowBlockOf`. Their addressing is
    // checked instead by the contiguity assertion above, which pins each range to exactly the rows
    // of its own group. Named explicitly so a *score* column cannot quietly join the exemption.
    const RANGE_BASED_KEYS = new Set(['notes', 'barriers', 'plans']);

    const offenders: string[] = [];
    let scoreFormulasChecked = 0;
    for (const row of everyRow) {
      for (const [key, value] of Object.entries(row)) {
        if (typeof value !== 'object' || value === null || !('formula' in value)) {
          continue;
        }
        if (RANGE_BASED_KEYS.has(key)) {
          continue;
        }
        scoreFormulasChecked += 1;
        if (singleInputCell.test(value.formula)) {
          offenders.push(`${String(row.areaId ?? row.domainId ?? row.dimensionId)}.${key}`);
        }
      }
    }

    // Guards the exemption: if the filter above ever excluded everything, this test would pass
    // having examined nothing.
    expect(scoreFormulasChecked).toBeGreaterThan(1000);

    expect(offenders).toEqual([]);
  });

  it('addresses input data by ID column on every profile row that reads it', () => {
    let checked = 0;
    for (const row of profile().rows) {
      const expression = formulaOf(row, 'currentScore');
      if (!expression.includes(SHEET_NAMES.ASSESSMENT_INPUT)) {
        continue;
      }
      checked += 1;
      // Column N is the area ID and O the dimension ID on `04`; both must appear as criteria.
      expect(expression, String(row.areaId)).toContain('$N$3:$N$1627');
      expect(expression, String(row.areaId)).toContain('$O$3:$O$1627');
    }
    // The 192 entered rows minus the 60 Technology ones, which read their own sub-dimension mean
    // cells on `06` instead. Pinned so the filter cannot quietly exclude everything.
    expect(checked).toBe(132);
  });
});
