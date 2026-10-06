/**
 * Content-fidelity tests for the row builders — mitigation step 3 in Section 5.4,
 * and the checks promised to Shelley at `[19:39]`.
 *
 * These assert that every domain, area, dimension, sub-dimension, and aspect the model
 * defines reaches the workbook with the right identity. They deliberately derive their
 * expectations from the model rather than from literals, so a model update fails with
 * a useful diff instead of requiring both files to be edited in step.
 *
 * On assertion strength: a bare "the workbook contains the string X" is close to
 * worthless on a 1,625-row sheet, because almost any string is reachable through some
 * other row. Wave 5 shipped three such assertions that could not fail. Everything here
 * asserts a set equality, an exact count, or a specific row's specific column.
 */

import { describe, expect, it } from 'vitest';

import {
  getAllAreasWithDomains,
  getAllDomains,
  getAllOrganizationalAspectLocations,
  getAllStandardAspectLocations,
  getAspectLocationsForDimension,
  getStandardAreasWithDomains,
  ORBIT_DIMENSION_IDS,
  ORGANIZATIONAL_ASSESSMENT_AREA_ID,
} from './model.ts';
import {
  assessmentRowBlock,
  buildAssessmentInputRows,
  buildCapabilityReferenceRows,
  buildCriteriaReferenceRows,
  buildMaturityLevelRows,
  buildOrganizationalInputRows,
  organizationalRowBlock,
  rowBlockOf,
  type SheetCellValue,
  type SheetRow,
} from './rows.ts';

/** Distinct values of one column across a set of rows. */
function distinct(rows: readonly SheetRow[], key: string): Set<string> {
  return new Set(rows.map((row) => String(row[key] ?? '')));
}

describe('01_Maturity_Levels rows', () => {
  it('has 6 rows: levels 1-5 then Not Applicable', () => {
    const rows = buildMaturityLevelRows();
    expect(rows).toHaveLength(6);
    expect(rows.map((row) => row.entryValue)).toEqual([1, 2, 3, 4, 5, 'N/A']);
  });

  it('names the levels in model order', () => {
    expect(buildMaturityLevelRows().map((row) => row.name)).toEqual([
      'Initial',
      'Developing',
      'Defined',
      'Managed',
      'Optimized',
      'Not Applicable',
    ]);
  });

  it('gives every level a non-empty description', () => {
    for (const row of buildMaturityLevelRows()) {
      expect(String(row.description).length).toBeGreaterThan(20);
    }
  });

  /**
   * The tool's internal encoding is -1 for N/A and 0 for unassessed. Neither should
   * ever be presented to a state as something to type: 0 in a level cell would be
   * included by a careless average, and -1 is an implementation detail.
   */
  it('never offers a numeric sentinel as a value to enter', () => {
    const entryValues = buildMaturityLevelRows().map((row) => row.entryValue);
    expect(entryValues).not.toContain(0);
    expect(entryValues).not.toContain(-1);
  });
});

describe('02_Capability_Reference rows', () => {
  const rows = buildCapabilityReferenceRows();

  it('has exactly one row per capability area, all 72', () => {
    expect(rows).toHaveLength(72);
    expect(distinct(rows, 'areaId').size).toBe(72);
  });

  it('carries every domain id and every area id from the model', () => {
    const expectedAreaIds = new Set(getAllAreasWithDomains().map(({ area }) => area.id));
    const expectedDomainIds = new Set(getAllDomains().map((domain) => domain.id));

    expect(distinct(rows, 'areaId')).toEqual(expectedAreaIds);
    expect(distinct(rows, 'domainId')).toEqual(expectedDomainIds);
  });

  it('names all 14 domains', () => {
    expect(distinct(rows, 'domainName')).toEqual(
      new Set(getAllDomains().map((domain) => domain.name))
    );
  });

  it('labels layers in title case', () => {
    expect(distinct(rows, 'layer')).toEqual(new Set(['Strategic', 'Core', 'Support']));
  });

  it('flags exactly the 11 Information Management areas', () => {
    const flagged = rows.filter((row) => row.informationManagement === 'Yes');
    expect(flagged).toHaveLength(11);

    const expected = new Set(
      getAllAreasWithDomains()
        .filter(({ area }) => area.informationManagement)
        .map(({ area }) => area.id)
    );
    expect(new Set(flagged.map((row) => String(row.areaId)))).toEqual(expected);
  });

  it('answers the flag column with Yes or No on every row, never blank', () => {
    expect(distinct(rows, 'informationManagement')).toEqual(new Set(['Yes', 'No']));
  });

  /**
   * The aggregate-domain rows are the ones a reviewer is most likely to read as
   * missing data, so they say which dimension is aggregated rather than just omitting
   * it. Asserted on the specific row, not by searching the sheet.
   */
  it('explains the aggregated dimension on Data Management rows', () => {
    const row = rows.find((candidate) => candidate.domainId === 'data-management');
    expect(row).toBeDefined();
    expect(row?.assessedDimensions).toBe(
      'Business Architecture; Technology (Information is an aggregate for this domain, not entered here)'
    );
  });

  it('explains the aggregated dimension on Technology Management rows', () => {
    const row = rows.find((candidate) => candidate.domainId === 'technical');
    expect(row).toBeDefined();
    expect(row?.assessedDimensions).toBe(
      'Business Architecture; Information (Technology is an aggregate for this domain, not entered here)'
    );
  });

  it('lists all three dimensions on an ordinary area', () => {
    const row = rows.find((candidate) => candidate.domainId === 'provider-management');
    expect(row?.assessedDimensions).toBe('Business Architecture; Information; Technology');
  });

  it('points the organizational area at its own sheet', () => {
    const row = rows.find((candidate) => candidate.areaId === ORGANIZATIONAL_ASSESSMENT_AREA_ID);
    expect(row?.assessedDimensions).toBe(
      'Organizational sections only — see 05_Organizational_Input'
    );
  });

  it('leaves no reference cell empty', () => {
    for (const row of rows) {
      for (const [key, value] of Object.entries(row)) {
        expect(String(value), `${String(row.areaId)}.${key}`).not.toBe('');
      }
    }
  });
});

describe('03_ORBIT_Criteria_Reference rows', () => {
  const rows = buildCriteriaReferenceRows();

  it('has 205 rows: 41 aspects at 5 levels each', () => {
    expect(rows).toHaveLength(205);
  });

  it('covers all 41 aspect ids, 5 rows each', () => {
    const expectedAspectIds = new Set([
      ...getAllStandardAspectLocations().map((location) => location.aspect.id),
      ...getAllOrganizationalAspectLocations().map((location) => location.aspect.id),
    ]);
    // 41 aspects but `enterprise-architecture` is also a section id; ids are unique
    // within the aspect namespace.
    expect(expectedAspectIds.size).toBe(41);

    const byAspect = new Map<string, number>();
    for (const row of rows) {
      const key = `${String(row.dimensionId)}|${String(row.subDimensionId)}|${String(row.aspectId)}`;
      byAspect.set(key, (byAspect.get(key) ?? 0) + 1);
    }
    expect(byAspect.size).toBe(41);
    for (const [key, count] of byAspect) {
      expect(count, key).toBe(5);
    }
  });

  it('covers the three standard dimensions and the three organizational sections', () => {
    expect(distinct(rows, 'dimensionId')).toEqual(
      new Set([
        'businessArchitecture',
        'information',
        'technology',
        'outcomes',
        'roles',
        'enterprise-architecture',
      ])
    );
  });

  /**
   * Grouped per aspect, not as a union across all 205 rows. The union form passes on a
   * bug that emits `1,1,2,3,4` for one aspect and `1..5` for the rest, because every
   * value still appears somewhere — and the sibling test only counts five rows per
   * aspect without looking at what those rows say.
   */
  it('numbers levels 1 to 5 in order within every aspect', () => {
    const byAspect = new Map<string, SheetCellValue[]>();
    for (const row of rows) {
      const key = `${String(row.dimensionId)}|${String(row.subDimensionId)}|${String(row.aspectId)}`;
      byAspect.set(key, [...(byAspect.get(key) ?? []), row.level ?? 'missing']);
    }

    expect(byAspect.size).toBe(41);
    for (const [key, levels] of byAspect) {
      expect(levels, key).toEqual([1, 2, 3, 4, 5]);
    }
  });

  /**
   * Level is written as a number, not a string. Pinned because `distinct()` stringifies,
   * so no other assertion here can tell `1` from `'1'`, and Wave 7 may `MATCH` against
   * this column.
   */
  it('writes the level as a number', () => {
    for (const row of rows) {
      expect(typeof row.level, `${String(row.aspectId)} level`).toBe('number');
    }
  });

  it('has 55 Technology rows: 11 aspects at 5 levels', () => {
    const technologyRows = rows.filter((row) => row.dimensionId === 'technology');
    expect(technologyRows).toHaveLength(55);
    expect(distinct(technologyRows, 'subDimensionId')).toEqual(
      new Set(['technologyInfrastructureManagement', 'applicationManagement'])
    );
  });

  it('has 75 organizational rows: 15 aspects at 5 levels', () => {
    const organizationalRows = rows.filter((row) =>
      ['outcomes', 'roles', 'enterprise-architecture'].includes(String(row.dimensionId))
    );
    expect(organizationalRows).toHaveLength(75);
  });

  it('carries criteria text on every row', () => {
    for (const row of rows) {
      expect(
        String(row.criteria).length,
        `${String(row.aspectId)} level ${String(row.level)}`
      ).toBeGreaterThan(10);
    }
  });

  /**
   * There is no "Question" column, because all 205 per-level `questions` arrays are
   * empty (OBS-23) and the column would be blank on every row — failing 5.3's
   * no-empty-columns rule. This asserts both halves: the model really is empty, and
   * the aspect-level question survives instead.
   */
  it('carries the aspect-level question, having dropped the always-empty per-level questions', () => {
    const columnKeys = new Set(Object.keys(rows[0] ?? {}));
    expect(columnKeys.has('questions')).toBe(false);
    expect(columnKeys.has('aspectQuestion')).toBe(true);

    for (const row of rows) {
      expect(String(row.aspectQuestion).length).toBeGreaterThan(10);
    }

    const modelLevelQuestions = [
      ...getAllStandardAspectLocations(),
      ...getAllOrganizationalAspectLocations(),
    ].flatMap((location) => Object.values(location.aspect.levels).map((level) => level.questions));
    expect(modelLevelQuestions).toHaveLength(205);
    expect(modelLevelQuestions.every((questions) => questions.length === 0)).toBe(true);
  });

  it('fills the suggested-documentation column even where the model lists none', () => {
    const empty = rows.filter((row) => String(row.suggestedDocumentation) === '');
    expect(empty).toHaveLength(0);

    const placeholder = rows.filter(
      (row) => row.suggestedDocumentation === 'None suggested at this level'
    );
    // 56 of the 205 level entries have no evidence listed. Pinned so a model update
    // that starts populating them is noticed.
    expect(placeholder).toHaveLength(56);
  });

  it('leaves no cell empty', () => {
    for (const row of rows) {
      for (const [key, value] of Object.entries(row)) {
        expect(String(value), `${String(row.aspectId)}.${key}`).not.toBe('');
      }
    }
  });
});

describe('04_Assessment_Input rows', () => {
  const rows = buildAssessmentInputRows();

  it('has 1,625 rows', () => {
    expect(rows).toHaveLength(1625);
  });

  it('covers all 71 standard areas and excludes the organizational area', () => {
    const expected = new Set(getStandardAreasWithDomains().map(({ area }) => area.id));
    expect(distinct(rows, 'areaId')).toEqual(expected);
    expect(distinct(rows, 'areaId').size).toBe(71);
    expect(distinct(rows, 'areaId').has(ORGANIZATIONAL_ASSESSMENT_AREA_ID)).toBe(false);
  });

  /**
   * Row count per area, checked against the model's own denominator for every one of
   * the 71 areas rather than spot-checked. This is the assertion that would catch an
   * aggregate-omission bug in either direction.
   */
  it('emits exactly the assessable aspect count for each of the 71 areas', () => {
    const byArea = new Map<string, number>();
    for (const row of rows) {
      const key = String(row.areaId);
      byArea.set(key, (byArea.get(key) ?? 0) + 1);
    }

    for (const { domain, area } of getStandardAreasWithDomains()) {
      const expected = domain.id === 'data-management' ? 16 : domain.id === 'technical' ? 15 : 26;
      expect(byArea.get(area.id), `${domain.id}/${area.id}`).toBe(expected);
    }
  });

  it('emits no Information rows for Data Management areas', () => {
    const dataManagementRows = rows.filter((row) => row.domainId === 'data-management');
    expect(dataManagementRows).toHaveLength(160);
    expect(distinct(dataManagementRows, 'dimensionId')).toEqual(
      new Set(['businessArchitecture', 'technology'])
    );
  });

  it('emits no Technology rows for Technology Management areas', () => {
    const technicalRows = rows.filter((row) => row.domainId === 'technical');
    expect(technicalRows).toHaveLength(165);
    expect(distinct(technicalRows, 'dimensionId')).toEqual(
      new Set(['businessArchitecture', 'information'])
    );
  });

  it('carries both As-Is and To-Be level columns on every row, both blank', () => {
    for (const row of rows) {
      expect(row).toHaveProperty('currentLevel');
      expect(row).toHaveProperty('targetLevel');
      expect(row.currentLevel).toBe('');
      expect(row.targetLevel).toBe('');
    }
  });

  it('carries blank notes, barriers and plans columns on every row', () => {
    for (const row of rows) {
      expect(row.notes).toBe('');
      expect(row.barriers).toBe('');
      expect(row.plans).toBe('');
    }
  });

  it('flags the Information Management areas', () => {
    const flaggedAreaIds = new Set(
      rows.filter((row) => row.informationManagement === 'Yes').map((row) => String(row.areaId))
    );
    const expected = new Set(
      getStandardAreasWithDomains()
        .filter(({ area }) => area.informationManagement)
        .map(({ area }) => area.id)
    );
    expect(flaggedAreaIds).toEqual(expected);
    expect(flaggedAreaIds.size).toBe(11);
  });

  it('attributes every Technology row to a sub-dimension and no other row to one', () => {
    for (const row of rows) {
      if (row.dimensionId === 'technology') {
        expect(['technologyInfrastructureManagement', 'applicationManagement']).toContain(
          row.subDimensionId
        );
      } else {
        expect(row.subDimensionId).toBe('Not applicable');
      }
    }
  });

  /**
   * Every row is uniquely addressable by the four-part key, which is what Wave 7's
   * formulas will match on. A duplicate would double-count in a score.
   */
  it('has a unique area + dimension + sub-dimension + aspect key on every row', () => {
    const keys = rows.map(
      (row) =>
        `${String(row.areaId)}|${String(row.dimensionId)}|${String(row.subDimensionId)}|${String(row.aspectId)}`
    );
    expect(new Set(keys).size).toBe(rows.length);
  });

  it('leaves no reference cell empty', () => {
    const referenceKeys = [
      'domainName',
      'areaName',
      'informationManagement',
      'dimensionName',
      'subDimensionName',
      'aspectName',
      'aspectQuestion',
      'domainId',
      'areaId',
      'dimensionId',
      'subDimensionId',
      'aspectId',
    ];
    for (const row of rows) {
      for (const key of referenceKeys) {
        expect(String(row[key]), `${String(row.areaId)}.${key}`).not.toBe('');
      }
    }
  });
});

describe('05_Organizational_Input rows', () => {
  const rows = buildOrganizationalInputRows();

  it('has 15 rows, one per organizational aspect', () => {
    expect(rows).toHaveLength(15);
  });

  it('splits 6 / 5 / 4 across the three sections in display order', () => {
    expect(rows.map((row) => row.sectionId)).toEqual([
      ...Array.from({ length: 6 }, () => 'outcomes'),
      ...Array.from({ length: 5 }, () => 'roles'),
      ...Array.from({ length: 4 }, () => 'enterprise-architecture'),
    ]);
  });

  it('carries every organizational aspect id exactly once', () => {
    const expected = getAllOrganizationalAspectLocations().map((location) => location.aspect.id);
    expect(rows.map((row) => row.aspectId)).toEqual(expected);
    expect(new Set(rows.map((row) => row.aspectId)).size).toBe(15);
  });

  it('attributes every row to the Enterprise Governance area', () => {
    expect(distinct(rows, 'areaId')).toEqual(new Set([ORGANIZATIONAL_ASSESSMENT_AREA_ID]));
  });

  it('names the three sections as the model does', () => {
    expect(distinct(rows, 'sectionName')).toEqual(
      new Set([
        'Organizational Outcomes',
        'Organizational Roles',
        'Organizational Enterprise Architecture',
      ])
    );
  });

  it('carries both As-Is and To-Be level columns, both blank', () => {
    for (const row of rows) {
      expect(row.currentLevel).toBe('');
      expect(row.targetLevel).toBe('');
    }
  });

  it('leaves no reference cell empty', () => {
    for (const key of [
      'sectionName',
      'aspectName',
      'aspectQuestion',
      'areaId',
      'sectionId',
      'aspectId',
    ]) {
      for (const row of rows) {
        expect(String(row[key]), `${String(row.aspectId)}.${key}`).not.toBe('');
      }
    }
  });
});

describe('cross-sheet consistency', () => {
  /**
   * Every aspect a state is asked to rate must have criteria to rate it against. A
   * mismatch here means either an input row with no guidance, or criteria for
   * something the workbook never asks about.
   */
  it('gives every input row a matching criteria row on sheet 03', () => {
    const criteriaKeys = new Set(
      buildCriteriaReferenceRows().map(
        (row) => `${String(row.dimensionId)}|${String(row.subDimensionId)}|${String(row.aspectId)}`
      )
    );

    for (const row of buildAssessmentInputRows()) {
      const key = `${String(row.dimensionId)}|${String(row.subDimensionId)}|${String(row.aspectId)}`;
      expect(criteriaKeys.has(key), key).toBe(true);
    }

    for (const row of buildOrganizationalInputRows()) {
      const key = `${String(row.sectionId)}|Not applicable|${String(row.aspectId)}`;
      expect(criteriaKeys.has(key), key).toBe(true);
    }
  });

  it('gives every input row an area that exists on sheet 02', () => {
    const referenceAreaIds = new Set(
      buildCapabilityReferenceRows().map((row) => String(row.areaId))
    );
    for (const row of buildAssessmentInputRows()) {
      expect(referenceAreaIds.has(String(row.areaId))).toBe(true);
    }
    for (const row of buildOrganizationalInputRows()) {
      expect(referenceAreaIds.has(String(row.areaId))).toBe(true);
    }
  });

  it('accounts for all 72 areas across the two input sheets', () => {
    const covered = new Set([
      ...buildAssessmentInputRows().map((row) => String(row.areaId)),
      ...buildOrganizationalInputRows().map((row) => String(row.areaId)),
    ]);
    expect(covered.size).toBe(72);
    expect(covered).toEqual(new Set(getAllAreasWithDomains().map(({ area }) => area.id)));
  });

  it('asks for every dimension the model defines somewhere on sheet 04', () => {
    const dimensionsAsked = distinct(buildAssessmentInputRows(), 'dimensionId');
    expect(dimensionsAsked).toEqual(new Set(ORBIT_DIMENSION_IDS));

    for (const dimensionId of ORBIT_DIMENSION_IDS) {
      const aspectIdsAsked = new Set(
        buildAssessmentInputRows()
          .filter((row) => row.dimensionId === dimensionId)
          .map((row) => String(row.aspectId))
      );
      const aspectIdsDefined = new Set(
        getAspectLocationsForDimension(dimensionId).map((location) => location.aspect.id)
      );
      expect(aspectIdsAsked, dimensionId).toEqual(aspectIdsDefined);
    }
  });
});

/**
 * Row blocks, which the text roll-ups on `06_Maturity_Profile` address by position.
 *
 * `TEXTJOIN` has no `IFS` variant and its criteria-based form is silently wrong — Excel applies
 * implicit intersection to the `IF` condition, so a cell reads a neighbouring area's text. The
 * roll-ups therefore use a contiguous range, which is only safe because the builders happen to emit
 * each group consecutively. That is an invariant nothing else enforces, so it is enforced here and
 * at generation time.
 */
describe('row blocks for the text roll-ups', () => {
  it('finds a contiguous block for every area and dimension on sheet 04', () => {
    const rows = buildAssessmentInputRows();
    const groups = new Set(rows.map((row) => `${String(row.areaId)}|${String(row.dimensionId)}`));
    expect(groups.size).toBe(192);

    let checked = 0;
    for (const group of groups) {
      const [areaId = '', dimensionId = ''] = group.split('|');
      const block = assessmentRowBlock(areaId, dimensionId);
      const owned = rows.filter(
        (row) => row.areaId === areaId && row.dimensionId === dimensionId
      ).length;
      // The span must contain exactly the group's own rows — no more, no fewer.
      expect(block.lastRow - block.firstRow + 1, group).toBe(owned);
      checked += 1;
    }
    expect(checked).toBe(192);
  });

  it('finds a contiguous block for each organizational section on sheet 05', () => {
    const rows = buildOrganizationalInputRows();
    for (const sectionId of new Set(rows.map((row) => String(row.sectionId)))) {
      const block = organizationalRowBlock(sectionId);
      const owned = rows.filter((row) => row.sectionId === sectionId).length;
      expect(block.lastRow - block.firstRow + 1, sectionId).toBe(owned);
    }
  });

  /**
   * The guard that makes range addressing safe. Without it, a builder reorder would emit a range
   * spanning a neighbouring group and the mis-attribution would be silent — which is exactly the
   * defect this whole approach replaced.
   */
  it('refuses a non-contiguous block instead of guessing a range', () => {
    const scattered: SheetRow[] = [
      { areaId: 'a', dimensionId: 'x' },
      { areaId: 'b', dimensionId: 'x' },
      { areaId: 'a', dimensionId: 'x' },
    ];
    expect(() => rowBlockOf(scattered, (row) => row.areaId === 'a', 'area a')).toThrow(
      /not contiguous/
    );

    // And a contiguous selection from the same data is accepted, so the guard is not simply
    // rejecting everything.
    expect(rowBlockOf(scattered, (row) => row.areaId === 'b', 'area b')).toEqual({
      firstRow: 4,
      lastRow: 4,
    });
  });

  it('throws for a group that does not exist rather than returning an empty range', () => {
    expect(() => assessmentRowBlock('no-such-area', 'information')).toThrow(/No input rows match/);
  });
});
