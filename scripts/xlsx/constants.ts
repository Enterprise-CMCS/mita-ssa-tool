/**
 * Declarative layout model for the workbook: sheet names, column definitions,
 * widths, and the row geometry every sheet shares.
 *
 * Layout is configuration rather than code on purpose. Shelley's team may edit the
 * generated workbook and send it back for folding into the generator
 * (`[20:03]`-`[20:29]` in the September 9 transcript), so a column reorder or a
 * header rewording should be a data change here, not a rewrite of the builder.
 *
 * Carried forward from the reference implementation at
 * `feat-xlsx-workbook-generation` @ `b0fc55d`. Deliberately **not** carried
 * forward: the `categoryName` / `categoryId` columns, because the Domain → Category
 * → Area tier was deleted in v4 (the metamodel is strictly Domain → Area), and the
 * three-separate-organizational-types column model, because v4 has one combined
 * area with a section column.
 */

// =============================================================================
// Sheet names
// =============================================================================

/**
 * Workbook sheet names. The numeric prefix fixes Excel's tab order and gives each
 * tab a descriptive name, which 5.3 requires (underscores are acceptable).
 *
 * Sheets `06`-`09` are built in Wave 7. They are named here because `00_README`
 * carries the sheet index and has to list them, and because Wave 7's formulas
 * reference these names as strings — one misspelling in a formula is a `#REF!` that
 * no test can catch, so there is exactly one spelling of each name in the codebase.
 */
export const SHEET_NAMES = {
  README: '00_README',
  MATURITY_LEVELS: '01_Maturity_Levels',
  CAPABILITY_REFERENCE: '02_Capability_Reference',
  CRITERIA_REFERENCE: '03_ORBIT_Criteria_Reference',
  ASSESSMENT_INPUT: '04_Assessment_Input',
  ORGANIZATIONAL_INPUT: '05_Organizational_Input',
  MATURITY_PROFILE: '06_Maturity_Profile',
  AREA_SCORES: '07_Area_Scores',
  DOMAIN_SCORES: '08_Domain_Scores',
  DIMENSION_SCORES: '09_Dimension_Scores',
} as const;

/**
 * Every sheet the generator builds.
 *
 * Wave 6 built `00`-`05` and this list named only those, so the README could honestly mark
 * `06`-`09` as not yet included and a test could pin that exact four-name list. Wave 7 completed
 * the set, so the distinction is gone and the list is simply all of them — which is why the
 * README no longer carries a "not included" caveat.
 */
export const BUILT_SHEET_NAMES: readonly string[] = Object.values(SHEET_NAMES);

/**
 * One-line purpose for each sheet, for the README's sheet index.
 *
 * Sheets not yet built are marked so a pilot reviewer opening the Wave 6 artifact
 * is not left hunting for a tab that does not exist.
 */
export const SHEET_DESCRIPTIONS: Readonly<Record<string, string>> = {
  [SHEET_NAMES.README]:
    'This sheet. Notices, versions, how to use the workbook, and the guidance that the tool shows on screen.',
  [SHEET_NAMES.MATURITY_LEVELS]:
    'The five maturity levels and Not Applicable, with the general definition of each.',
  [SHEET_NAMES.CAPABILITY_REFERENCE]:
    'All 14 capability domains and 72 capability areas, with descriptions and topics.',
  [SHEET_NAMES.CRITERIA_REFERENCE]:
    'The maturity criteria: every aspect at every level, with suggested documentation.',
  [SHEET_NAMES.ASSESSMENT_INPUT]:
    'Enter your As-Is and To-Be levels here, one row per aspect per capability area.',
  [SHEET_NAMES.ORGANIZATIONAL_INPUT]:
    'Enter your As-Is and To-Be levels for the 15 organizational aspects of Enterprise Governance.',
  [SHEET_NAMES.MATURITY_PROFILE]:
    'Your maturity profile, calculated: one row per capability area per dimension, with the ' +
    'Technology sub-dimension means shown separately. Updates as you type.',
  [SHEET_NAMES.AREA_SCORES]:
    'One row per capability area: overall score, To-Be score, and how much of it you have completed.',
  [SHEET_NAMES.DOMAIN_SCORES]:
    'One row per capability domain, plus an overall row across every capability area.',
  [SHEET_NAMES.DIMENSION_SCORES]:
    'Your enterprise-wide score for each ORBIT dimension, with the number of capability areas ' +
    'each figure is averaged over.',
};

// =============================================================================
// Row geometry
// =============================================================================

/**
 * The row carrying the predecisional notice, on every sheet.
 *
 * Every sheet opens with the notice in `A1` so that Ctrl+Home — where a keyboard or
 * screen reader user lands — reaches it before any data. Putting the table header
 * on row 1 instead would mean a reviewer who opens the workbook on a data sheet
 * (Excel restores the last active sheet) never encounters a notice at all.
 */
export const NOTICE_ROW = 1;

/**
 * The single header row of every table sheet.
 *
 * Row 2, directly under the notice, with **no blank row between them**. 5.3 forbids
 * blank rows inside tables, and a spacer row here would also be the first thing
 * Excel's Accessibility Checker flags in the used range. The cost is a slightly
 * cramped look; the benefit is that "this workbook contains no blank rows at all"
 * is true without qualification and is a testable claim.
 *
 * **Wave 7 must derive its formula ranges from this constant.** Data starts at
 * `FIRST_DATA_ROW`, so a range over 1,625 rows is rows 3 to 1,627, not 2 to 1,626.
 * Hardcoding row numbers in a formula string is how a range silently shifts by one.
 */
export const HEADER_ROW = 2;

/** The first row of data on a table sheet. */
export const FIRST_DATA_ROW = HEADER_ROW + 1;

// =============================================================================
// Level entry
// =============================================================================

/**
 * The token a state enters for "not applicable".
 *
 * Text rather than the tool's internal `-1`, because a reviewer typing a level into
 * a spreadsheet should not have to know the storage encoding, and because `-1`
 * inside a numeric column would be included by a careless `AVERAGE` where a text
 * token is skipped. Wave 7's formulas use `AVERAGEIF(range, ">0")`, which excludes
 * both this token and empty cells.
 */
export const NA_TOKEN = 'N/A';

/** Allowed values in a level cell. Blank is also allowed, and means not yet assessed. */
export const LEVEL_DROPDOWN_VALUES: readonly string[] = [NA_TOKEN, '1', '2', '3', '4', '5'];

// =============================================================================
// Column model
// =============================================================================

/**
 * A single column definition.
 *
 * `editable` drives three things at once: the header suffix, the unlocked cell
 * protection, and the input fill. They are deliberately coupled — 5.3 requires that
 * editability is conveyed in text and not by fill colour alone, and deriving the
 * suffix from the same flag as the fill makes it impossible to add a yellow column
 * with no textual signal.
 *
 * `wrap` marks prose columns that need `wrapText`. `identifier` marks the stable-ID
 * columns that sit at the far right, outside the table's named range.
 */
export interface ColumnDefinition {
  key: string;
  header: string;
  width: number;
  editable?: boolean;
  wrap?: boolean;
  identifier?: boolean;
}

/**
 * Suffix appended to every editable column's header.
 *
 * This is the 5.3 requirement that information must not be conveyed by colour
 * alone: the input columns are filled pale yellow, and a reviewer who cannot see
 * the fill — screen reader, high-contrast mode, monochrome print — needs the
 * header to say so.
 */
export const EDITABLE_HEADER_SUFFIX = ' (enter value)';

/**
 * Column widths, in Excel's character-width units.
 *
 * **Every width has to leave room for the autofilter button**, which Excel draws over the
 * bottom-right corner of the header cell and which overlaps the text rather than reflowing
 * it. Headers wrap to two lines, so the constraint is that the longest wrapped line plus
 * roughly three characters of button still fits. `flag` and `level` exist as their own sizes
 * because their headers are long relative to any sensible data width — "Information
 * Management Area" and "As-Is Level (enter value)" were both being clipped at the earlier
 * widths, found by looking at the sheet in Excel.
 */
export const COL_WIDTHS = {
  id: 22,
  /** Short headers with short values: "Layer", "Level", "Level Name". */
  short: 16,
  /** Yes/No flag columns, sized for the header rather than the value. */
  flag: 22,
  medium: 30,
  long: 46,
  /** Level entry. Sized for "As-Is Level (enter value)" wrapped over two lines. */
  level: 26,
  notes: 40,
  description: 62,
} as const;

/**
 * Height of the header row, in points.
 *
 * Three wrapped lines at 11pt. Two was not enough once the editable columns gained their
 * "(enter value)" suffix, and a clipped header defeats the point of having the suffix — it
 * is there so editability is conveyed in words rather than by fill colour alone.
 */
export const HEADER_ROW_HEIGHT = 44;

/**
 * Resolve a column's rendered header text, appending the editable signal.
 *
 * Single place this suffix is applied, so a test can assert the invariant "every
 * editable column's header ends with the suffix" against the same definitions the
 * builder writes.
 */
export function renderHeader(column: ColumnDefinition): string {
  return column.editable ? `${column.header}${EDITABLE_HEADER_SUFFIX}` : column.header;
}

/**
 * `02_Capability_Reference` — one row per capability area.
 *
 * Domain fields repeat on every row rather than being merged or written once: 5.3
 * forbids merged cells, and a repeated value is also what makes autofilter and any
 * future import work on a flat table.
 */
export const CAPABILITY_REFERENCE_COLUMNS: readonly ColumnDefinition[] = [
  { key: 'layer', header: 'Layer', width: COL_WIDTHS.short },
  { key: 'domainName', header: 'Capability Domain', width: COL_WIDTHS.medium },
  {
    key: 'domainDescription',
    header: 'Domain Description',
    width: COL_WIDTHS.description,
    wrap: true,
  },
  { key: 'areaName', header: 'Capability Area', width: COL_WIDTHS.medium },
  {
    key: 'areaDescription',
    header: 'Capability Area Description',
    width: COL_WIDTHS.description,
    wrap: true,
  },
  { key: 'topics', header: 'Topics', width: COL_WIDTHS.long, wrap: true },
  {
    key: 'informationManagement',
    header: 'Information Management Area',
    width: COL_WIDTHS.flag,
  },
  {
    key: 'assessedDimensions',
    header: 'Dimensions Assessed In This Area',
    width: COL_WIDTHS.medium,
    wrap: true,
  },
  { key: 'domainId', header: 'Domain ID', width: COL_WIDTHS.id, identifier: true },
  { key: 'areaId', header: 'Capability Area ID', width: COL_WIDTHS.id, identifier: true },
];

/** `01_Maturity_Levels` — six rows: levels 1-5 plus Not Applicable. */
export const MATURITY_LEVEL_COLUMNS: readonly ColumnDefinition[] = [
  { key: 'entryValue', header: 'Value To Enter', width: COL_WIDTHS.level },
  { key: 'name', header: 'Maturity Level', width: COL_WIDTHS.medium },
  {
    key: 'description',
    header: 'General Definition',
    width: COL_WIDTHS.description,
    wrap: true,
  },
  { key: 'levelKey', header: 'Level Key', width: COL_WIDTHS.id, identifier: true },
];

/**
 * `03_ORBIT_Criteria_Reference` — 205 rows, one per aspect per level.
 *
 * No "Question" column. All 205 per-level `questions` arrays in the model are empty
 * (OBS-23), so the column would be blank on every row and would fail 5.3's own
 * no-empty-columns rule. The aspect-level question survives as
 * `Aspect Question`, which is what the tool renders — `aspect.description` is
 * phrased as a question.
 */
export const CRITERIA_REFERENCE_COLUMNS: readonly ColumnDefinition[] = [
  { key: 'dimensionName', header: 'Dimension', width: COL_WIDTHS.medium },
  { key: 'subDimensionName', header: 'Sub-Dimension', width: COL_WIDTHS.medium },
  { key: 'aspectName', header: 'Aspect', width: COL_WIDTHS.medium },
  {
    key: 'aspectQuestion',
    header: 'Aspect Question',
    width: COL_WIDTHS.description,
    wrap: true,
  },
  { key: 'level', header: 'Level', width: COL_WIDTHS.short },
  { key: 'levelName', header: 'Level Name', width: COL_WIDTHS.short },
  {
    key: 'criteria',
    header: 'Maturity Criteria',
    width: COL_WIDTHS.description,
    wrap: true,
  },
  {
    key: 'suggestedDocumentation',
    header: 'Suggested Documentation',
    width: COL_WIDTHS.long,
    wrap: true,
  },
  { key: 'dimensionId', header: 'Dimension ID', width: COL_WIDTHS.id, identifier: true },
  {
    key: 'subDimensionId',
    header: 'Sub-Dimension ID',
    width: COL_WIDTHS.id,
    identifier: true,
  },
  { key: 'aspectId', header: 'Aspect ID', width: COL_WIDTHS.id, identifier: true },
];

/**
 * `04_Assessment_Input` — 1,625 rows, one per assessable aspect per standard area.
 *
 * Real `Capability Domain` / `Capability Area` / `Dimension` columns replace the
 * reference implementation's merged label rows and blank spacers. That is
 * simultaneously the 508 fix, better for screen readers (every row states its own
 * context instead of depending on a heading rows above it), and what makes a future
 * XLSX import possible.
 */
export const ASSESSMENT_INPUT_COLUMNS: readonly ColumnDefinition[] = [
  { key: 'domainName', header: 'Capability Domain', width: COL_WIDTHS.medium },
  { key: 'areaName', header: 'Capability Area', width: COL_WIDTHS.medium },
  {
    key: 'informationManagement',
    header: 'Information Management Area',
    width: COL_WIDTHS.flag,
  },
  { key: 'dimensionName', header: 'Dimension', width: COL_WIDTHS.medium },
  { key: 'subDimensionName', header: 'Sub-Dimension', width: COL_WIDTHS.medium },
  { key: 'aspectName', header: 'Aspect', width: COL_WIDTHS.medium },
  {
    key: 'aspectQuestion',
    header: 'Aspect Question',
    width: COL_WIDTHS.description,
    wrap: true,
  },
  { key: 'currentLevel', header: 'As-Is Level', width: COL_WIDTHS.level, editable: true },
  { key: 'targetLevel', header: 'To-Be Level', width: COL_WIDTHS.level, editable: true },
  {
    key: 'notes',
    header: 'Notes',
    width: COL_WIDTHS.notes,
    editable: true,
    wrap: true,
  },
  {
    key: 'barriers',
    header: 'Barriers and Challenges',
    width: COL_WIDTHS.notes,
    editable: true,
    wrap: true,
  },
  {
    key: 'plans',
    header: 'Advancement Plans',
    width: COL_WIDTHS.notes,
    editable: true,
    wrap: true,
  },
  { key: 'domainId', header: 'Domain ID', width: COL_WIDTHS.id, identifier: true },
  { key: 'areaId', header: 'Capability Area ID', width: COL_WIDTHS.id, identifier: true },
  { key: 'dimensionId', header: 'Dimension ID', width: COL_WIDTHS.id, identifier: true },
  {
    key: 'subDimensionId',
    header: 'Sub-Dimension ID',
    width: COL_WIDTHS.id,
    identifier: true,
  },
  { key: 'aspectId', header: 'Aspect ID', width: COL_WIDTHS.id, identifier: true },
];

/**
 * `05_Organizational_Input` — 15 rows, the aspects of Enterprise Governance.
 *
 * One sheet with a `Section` column, not three sheets. v4 collapsed Outcomes, Roles
 * and Enterprise Architecture into three sections of a single capability area, and
 * the reference implementation's three-separate-types model predates that.
 */
export const ORGANIZATIONAL_INPUT_COLUMNS: readonly ColumnDefinition[] = [
  { key: 'sectionName', header: 'Organizational Section', width: COL_WIDTHS.medium },
  { key: 'aspectName', header: 'Aspect', width: COL_WIDTHS.medium },
  {
    key: 'aspectQuestion',
    header: 'Aspect Question',
    width: COL_WIDTHS.description,
    wrap: true,
  },
  { key: 'currentLevel', header: 'As-Is Level', width: COL_WIDTHS.level, editable: true },
  { key: 'targetLevel', header: 'To-Be Level', width: COL_WIDTHS.level, editable: true },
  {
    key: 'notes',
    header: 'Notes',
    width: COL_WIDTHS.notes,
    editable: true,
    wrap: true,
  },
  {
    key: 'barriers',
    header: 'Barriers and Challenges',
    width: COL_WIDTHS.notes,
    editable: true,
    wrap: true,
  },
  {
    key: 'plans',
    header: 'Advancement Plans',
    width: COL_WIDTHS.notes,
    editable: true,
    wrap: true,
  },
  { key: 'areaId', header: 'Capability Area ID', width: COL_WIDTHS.id, identifier: true },
  { key: 'sectionId', header: 'Section ID', width: COL_WIDTHS.id, identifier: true },
  { key: 'aspectId', header: 'Aspect ID', width: COL_WIDTHS.id, identifier: true },
];

/**
 * How a score cell on `06_Maturity_Profile` was arrived at.
 *
 * Not decoration — `09_Dimension_Scores` filters on it. The enterprise-wide figure must average
 * only directly measured dimension scores, because an aggregate is itself derived from those
 * same scores and folding it in would count those areas twice. The tool gets that exclusion by
 * accident (an enterprise area simply has no ratings for its aggregated dimension); the workbook
 * has to state it, because the aggregate value really is sitting in that cell.
 */
export const SCORE_SOURCES = {
  /** Computed from levels a state entered on an input sheet. */
  entered: 'Entered',
  /** The domain's aggregate, derived from other domains' areas. Has no To-Be. */
  aggregate: 'Aggregate',
  /** One of the three Enterprise Governance sections. */
  organizational: 'Organizational section',
} as const;

/**
 * `06_Maturity_Profile` — one row per capability area per dimension. 216 rows.
 *
 * Two things about this column set look redundant and are not.
 *
 * **Both a rounded and an unrounded score column.** The roll-ups above this sheet consume
 * different ones: a standard area averages the **rounded** dimension scores, while the
 * organizational area averages the **unrounded** section means. That inconsistency is the app's,
 * deliberately, and 5.4's rounding table is where it is written down. One column could not serve
 * both.
 *
 * **Four sub-dimension mean columns.** Technology is the mean of its two sub-dimension means with
 * the inner means unrounded, and a sub-dimension with nothing assessed is dropped rather than
 * zeroed. That drop cannot be expressed inline: `AVERAGE` ignores text inside a cell reference
 * but returns `#VALUE!` for text passed directly, so `AVERAGE(IFERROR(a,""),IFERROR(b,""))`
 * breaks the moment one sub-dimension is empty — a common partial state. Writing the means into
 * cells and averaging *those* gets the drop for free. They are also genuinely useful to read.
 */
export const MATURITY_PROFILE_COLUMNS: readonly ColumnDefinition[] = [
  { key: 'domainName', header: 'Capability Domain', width: COL_WIDTHS.medium },
  { key: 'areaName', header: 'Capability Area', width: COL_WIDTHS.medium },
  { key: 'dimensionName', header: 'Dimension', width: COL_WIDTHS.medium },
  { key: 'source', header: 'Score Source', width: COL_WIDTHS.flag, wrap: true },
  { key: 'currentScore', header: 'As-Is Score', width: COL_WIDTHS.level },
  { key: 'targetScore', header: 'To-Be Score', width: COL_WIDTHS.level },
  { key: 'aspectsAssessed', header: 'Aspects Assessed', width: COL_WIDTHS.flag },
  {
    key: 'currentUnrounded',
    header: 'As-Is Unrounded',
    width: COL_WIDTHS.level,
  },
  { key: 'targetUnrounded', header: 'To-Be Unrounded', width: COL_WIDTHS.level },
  {
    key: 'infrastructureCurrent',
    header: 'Technical Infrastructure Management Mean (As-Is)',
    width: COL_WIDTHS.medium,
    wrap: true,
  },
  {
    key: 'applicationCurrent',
    header: 'Application Management Mean (As-Is)',
    width: COL_WIDTHS.medium,
    wrap: true,
  },
  {
    key: 'infrastructureTarget',
    header: 'Technical Infrastructure Management Mean (To-Be)',
    width: COL_WIDTHS.medium,
    wrap: true,
  },
  {
    key: 'applicationTarget',
    header: 'Application Management Mean (To-Be)',
    width: COL_WIDTHS.medium,
    wrap: true,
  },
  { key: 'notes', header: 'Notes', width: COL_WIDTHS.notes, wrap: true },
  { key: 'barriers', header: 'Barriers and Challenges', width: COL_WIDTHS.notes, wrap: true },
  { key: 'plans', header: 'Advancement Plans', width: COL_WIDTHS.notes, wrap: true },
  { key: 'domainId', header: 'Domain ID', width: COL_WIDTHS.id, identifier: true },
  { key: 'areaId', header: 'Capability Area ID', width: COL_WIDTHS.id, identifier: true },
  { key: 'dimensionId', header: 'Dimension ID', width: COL_WIDTHS.id, identifier: true },
];

/** `07_Area_Scores` — one row per capability area. 72 rows. */
export const AREA_SCORES_COLUMNS: readonly ColumnDefinition[] = [
  { key: 'layer', header: 'Layer', width: COL_WIDTHS.short },
  { key: 'domainName', header: 'Capability Domain', width: COL_WIDTHS.medium },
  { key: 'areaName', header: 'Capability Area', width: COL_WIDTHS.medium },
  { key: 'currentScore', header: 'As-Is Score', width: COL_WIDTHS.level },
  { key: 'targetScore', header: 'To-Be Score', width: COL_WIDTHS.level },
  { key: 'completion', header: 'Completion %', width: COL_WIDTHS.flag },
  { key: 'aspectsAssessed', header: 'Aspects Assessed', width: COL_WIDTHS.flag },
  { key: 'aspectsAssessable', header: 'Aspects Assessable', width: COL_WIDTHS.flag },
  { key: 'dimensionsScored', header: 'Dimensions Scored', width: COL_WIDTHS.flag },
  { key: 'domainId', header: 'Domain ID', width: COL_WIDTHS.id, identifier: true },
  { key: 'areaId', header: 'Capability Area ID', width: COL_WIDTHS.id, identifier: true },
];

/**
 * `08_Domain_Scores` — 14 domain rows plus one overall row. 15 rows.
 *
 * The overall row averages the **area** scores on `07`, not the 14 domain scores above it.
 * `getOverallScore` pools every finalized area equally, so averaging domain scores instead would
 * weight a 3-area domain the same as an 11-area one and give a different number. See 5.4.1.
 */
export const DOMAIN_SCORES_COLUMNS: readonly ColumnDefinition[] = [
  { key: 'layer', header: 'Layer', width: COL_WIDTHS.short },
  { key: 'domainName', header: 'Capability Domain', width: COL_WIDTHS.medium },
  { key: 'currentScore', header: 'As-Is Score', width: COL_WIDTHS.level },
  { key: 'targetScore', header: 'To-Be Score', width: COL_WIDTHS.level },
  // Named for the column it counts, because it counts As-Is scores only and sits beside a To-Be
  // score whose own divisor differs whenever a state's To-Be coverage differs from its As-Is.
  { key: 'areasScored', header: 'Areas Scored (As-Is)', width: COL_WIDTHS.flag },
  { key: 'areasInDomain', header: 'Areas In Domain', width: COL_WIDTHS.flag },
  { key: 'domainId', header: 'Domain ID', width: COL_WIDTHS.id, identifier: true },
];

/**
 * `09_Dimension_Scores` — the enterprise-wide ORBIT figure. 3 rows (Decision 17).
 *
 * Mirrors the PDF executive summary's ORBIT Dimension Summary, including its visible `Areas`
 * denominator, so the two artifacts agree in shape as well as in rule. Averages only
 * `Entered` rows on `06`; see `SCORE_SOURCES`.
 */
export const DIMENSION_SCORES_COLUMNS: readonly ColumnDefinition[] = [
  { key: 'dimensionName', header: 'ORBIT Dimension', width: COL_WIDTHS.medium },
  { key: 'currentScore', header: 'As-Is Score', width: COL_WIDTHS.level },
  { key: 'targetScore', header: 'To-Be Score', width: COL_WIDTHS.level },
  // As-Is only, same as `areasScored` on `08`. See the note there.
  { key: 'areaCount', header: 'Areas (As-Is)', width: COL_WIDTHS.flag },
  { key: 'dimensionId', header: 'Dimension ID', width: COL_WIDTHS.id, identifier: true },
];

// =============================================================================
// Named ranges
// =============================================================================

/**
 * Defined-name for each table's data range, excluding the identifier columns.
 *
 * 5.3 asks for defined table ranges to aid navigation and formulas. The identifier
 * columns are deliberately outside the range: they are reference metadata, not part
 * of what a state fills in, and the alternative — hiding them — conceals content
 * from assistive technology and is exactly what 508 review flags.
 */
export const NAMED_RANGES: Readonly<Record<string, string>> = {
  [SHEET_NAMES.MATURITY_LEVELS]: 'MaturityLevels',
  [SHEET_NAMES.CAPABILITY_REFERENCE]: 'CapabilityReference',
  [SHEET_NAMES.CRITERIA_REFERENCE]: 'OrbitCriteria',
  [SHEET_NAMES.ASSESSMENT_INPUT]: 'AssessmentInput',
  [SHEET_NAMES.ORGANIZATIONAL_INPUT]: 'OrganizationalInput',
};

// =============================================================================
// Styling
// =============================================================================

/**
 * Palette. USWDS-derived, matching the app's theme.
 *
 * ARGB with a leading `FF` alpha, which is what ExcelJS expects. Contrast is not
 * decorative here — the workbook is a 508 deliverable, so every foreground and
 * background pair below is checked in `workbook.test.ts` against WCAG AA.
 */
export const COLORS = {
  /** Header row background. USWDS primary-darker. */
  headerFill: 'FF1A4480',
  /** Header row text. */
  headerFont: 'FFFFFFFF',
  /** Editable cell background. Pale yellow; a redundant signal, never the only one. */
  inputFill: 'FFFFF9E6',
  /**
   * Cell border on the editable columns.
   *
   * **A solid fill covers Excel's gridlines**, so the input block lost all row and column
   * separation while the unfilled reference columns kept theirs — on `04` that left Notes,
   * Barriers and Plans as three adjacent yellow columns with no visible boundary. These
   * borders put the ruling back.
   *
   * `#8C8C8C` measures 3.19:1 against the input fill, chosen so it clears the WCAG 1.4.11
   * non-text threshold. Strictly it need not: the row and column structure is available
   * programmatically through the cells and headers, so a border duplicating it is a
   * redundant visual aid rather than a meaningful graphic — Excel's own gridlines are only
   * about 1.48:1. Clearing 3:1 anyway costs nothing and removes the argument.
   */
  inputBorder: 'FF8C8C8C',
  /** Notice row text. USWDS-derived dark red, 7.03:1 on white — same value as the app banner. */
  noticeFont: 'FFB0142F',
} as const;

// Note: there is deliberately no dimension-order constant here. Display order comes from
// `ORBIT_DIMENSION_IDS` in `model.ts`, which is parity-tested against the app's
// `getAllDimensionIds()`. A second copy would be a third source of truth for the same
// ordering, untested against either.
