/**
 * Content of the `00_README` sheet.
 *
 * Kept apart from `rows.ts` because this sheet is not a table: it is a two-column
 * label/value list with heading rows, so it has its own row shape and its own rules.
 * It is also where the workbook's honesty lives — the predecisional notice, the
 * scoring rules, and the places the workbook cannot match the online tool.
 *
 * There are no blank spacer rows. Sections are delimited by heading rows, which a
 * screen reader announces as content; an empty row announces nothing and is the
 * first thing Excel's Accessibility Checker flags inside a used range.
 */

import { readFileSync } from 'node:fs';

import { DRAFT_NOTICE_FULL_BODY, DRAFT_NOTICE_LABEL } from '../../src/constants/draftNotice.ts';
import { isDraft } from './env.ts';
import { fromRepoRoot, getBuildTimestamp } from './paths.ts';
import {
  getAllOrganizationalAspectLocations,
  getAllStandardAspectLocations,
  getAllAreasWithDomains,
  getAllDomains,
  getCapabilityModel,
  getOrbitModel,
} from './model.ts';
import { BUILT_SHEET_NAMES, NA_TOKEN, SHEET_DESCRIPTIONS, SHEET_NAMES } from './constants.ts';
import { buildAssessmentInputRows, buildCriteriaReferenceRows } from './rows.ts';

/**
 * A README row.
 *
 * `heading` rows carry only a label and are rendered bold. `entry` rows are a
 * label/value pair. `note` rows carry prose in the value column with an empty label,
 * for continuation text under a heading.
 */
export interface ReadmeRow {
  kind: 'heading' | 'entry' | 'note';
  label: string;
  value: string;
}

function heading(label: string): ReadmeRow {
  return { kind: 'heading', label, value: '' };
}

function entry(label: string, value: string): ReadmeRow {
  return { kind: 'entry', label, value };
}

function note(value: string): ReadmeRow {
  return { kind: 'note', label: '', value };
}

/** The app version, from `package.json` — the single source of truth per Section 13. */
export function getAppVersion(): string {
  const pkg = JSON.parse(readFileSync(fromRepoRoot('package.json'), 'utf8')) as {
    version: string;
  };
  return pkg.version;
}

/**
 * Guidance shown in the tool on every Information Management capability area.
 *
 * Reproduced so a state filling in the workbook produces the same input as the same
 * state using the tool. Without it, 11 areas silently collect different data:
 * a workbook user has no way to know they were expected to assess information
 * maturity once per domain rather than once per area. Kept close to the wording in
 * `src/components/assessment/InformationManagementNotice.tsx`.
 */
export const INFORMATION_MANAGEMENT_GUIDANCE =
  'Complete the Information Management capability area when you are assessing multiple ' +
  'capability areas within a domain — assess your information maturity once there, and skip ' +
  "the Information dimension in that domain's other capability areas. If you are assessing " +
  'only a single capability area, assess the Information dimension within that area instead. ' +
  'The Information Management Area column on sheets 02 and 04 marks which areas these are.';

/**
 * One line describing a sheet, for the README's index.
 *
 * Throws on a built sheet with no description rather than falling back to an empty
 * string. The fallback was the bug, and the case it guarded against then happened: Wave 7
 * promoted `06`-`09` into the built list, and without a description each would have produced
 * a blank value cell that nothing would have caught — the no-blank-rows assertion is
 * satisfied by the label in column A,
 * and heading rows legitimately have an empty value column.
 */
function describeSheet(sheetName: string): string {
  if (!BUILT_SHEET_NAMES.includes(sheetName)) {
    return 'Not included in this draft of the workbook.';
  }

  const description = SHEET_DESCRIPTIONS[sheetName];
  if (!description) {
    throw new Error(
      `Sheet ${sheetName} is built but has no entry in SHEET_DESCRIPTIONS. Add one, or the ` +
        "README's sheet index will show a blank cell for it."
    );
  }
  return description;
}

/**
 * Build every row of the README.
 *
 * Row counts are computed from the row builders rather than written as literals, so
 * the README cannot claim a figure the workbook does not contain. That mattered
 * during this wave: the plan's own text described 1,625 rows in a way that read as a
 * whole-workbook total when it is the standard-area total.
 */
export function buildReadmeRows(): ReadmeRow[] {
  const capabilityModel = getCapabilityModel();
  const orbitModel = getOrbitModel();
  const domains = getAllDomains();
  const areas = getAllAreasWithDomains();
  const assessmentRowCount = buildAssessmentInputRows().length;
  const criteriaRowCount = buildCriteriaReferenceRows().length;
  const standardAspectCount = getAllStandardAspectLocations().length;
  const organizationalAspectCount = getAllOrganizationalAspectLocations().length;

  return [
    // Conditional, and this is the one place it was missed. The `A1` row, the print
    // footer, the title and the `description` property were all correctly gated on
    // `isDraft()` while this section was not — so the go-live artifact still carried the
    // full PRA statement here, and the test covering go-live checked only those four
    // places and passed. The README is the workbook's most substantive copy of the
    // notice; it has to be the most carefully gated, not the least.
    ...(isDraft()
      ? [heading('Predecisional notice'), entry(DRAFT_NOTICE_LABEL, DRAFT_NOTICE_FULL_BODY)]
      : []),

    heading('About this workbook'),
    entry(
      'Purpose',
      'An offline alternative to the MITA 4.0 State Self-Assessment Tool. It contains the same ' +
        'capability model and the same maturity criteria as the online tool, so an assessment ' +
        'recorded here is the same assessment.'
    ),
    entry(
      'Scores update as you type',
      `Sheets ${SHEET_NAMES.MATURITY_PROFILE} through ${SHEET_NAMES.DIMENSION_SCORES} calculate ` +
        'themselves from what you enter. You do not need to do anything to refresh them, and ' +
        'there is nothing on those sheets for you to fill in.'
    ),
    entry('Capability Reference Model version', capabilityModel.version),
    entry('Maturity Model version', orbitModel.version),
    entry('Maturity Model source', orbitModel.source),
    entry('Self-Assessment Tool version', getAppVersion()),
    entry('Workbook generated', getBuildTimestamp().toISOString().slice(0, 10)),
    entry(
      'Scope',
      `${domains.length} capability domains and ${areas.length} capability areas. Most ` +
        `capability areas are assessed against ${standardAspectCount} maturity aspects; the ` +
        'Data Management and Technology Management areas are assessed against fewer, because ' +
        'one of their dimensions is an aggregate rather than something you enter. Enterprise ' +
        `Governance is assessed against ${organizationalAspectCount} organizational aspects ` +
        'instead. The Dimensions Assessed In This Area column on sheet 02 states this per area.'
    ),

    heading('How to use this workbook'),
    entry(
      'Step 1',
      `Read ${SHEET_NAMES.MATURITY_LEVELS} to understand what each maturity level means, and ` +
        `${SHEET_NAMES.CAPABILITY_REFERENCE} to find the capability areas you are assessing.`
    ),
    entry(
      'Step 2',
      `For each aspect you are assessing, read its maturity criteria on ` +
        `${SHEET_NAMES.CRITERIA_REFERENCE} and decide which level your organization has reached.`
    ),
    entry(
      'Step 3',
      `Enter your levels on ${SHEET_NAMES.ASSESSMENT_INPUT}. Every column whose header says ` +
        '"(enter value)" is yours to fill in; the rest are reference and are locked.'
    ),
    entry(
      'Step 4',
      `Enter your organizational levels on ${SHEET_NAMES.ORGANIZATIONAL_INPUT}. These are ` +
        'assessed once for your organization, not once per capability area.'
    ),
    entry(
      'As-Is and To-Be',
      'As-Is Level is where you are today. To-Be Level is where you intend to be. Both are ' +
        'optional, and either may be left blank.'
    ),
    entry(
      'Values you can enter',
      `1, 2, 3, 4, 5, or ${NA_TOKEN}. Choose from the dropdown in the cell. Leave a cell blank ` +
        'if you have not assessed that aspect yet.'
    ),
    entry(
      `What ${NA_TOKEN} means`,
      `${NA_TOKEN} means the aspect does not apply to your organization. It is not the same as ` +
        'a blank cell, which means not yet assessed. Neither one counts toward a score.'
    ),
    entry(
      'Attachments',
      'This workbook cannot hold supporting documents. Use the online tool if you need to ' +
        'attach evidence files.'
    ),

    heading('Sheets in this workbook'),
    ...Object.values(SHEET_NAMES).map((sheetName) => entry(sheetName, describeSheet(sheetName))),

    heading('Information Management guidance'),
    note(INFORMATION_MANAGEMENT_GUIDANCE),

    heading('How scores are calculated'),
    entry(
      'Excluded values',
      `Blank cells and ${NA_TOKEN} are both left out of every average. An aspect you have not ` +
        'assessed does not count as zero.'
    ),
    entry(
      'Dimension score',
      'The average of the assessed aspect levels in that dimension, rounded to one decimal place.'
    ),
    entry(
      'Technology dimension score',
      'The average of the two sub-dimension averages — not the average of all 11 Technology ' +
        'aspects. Technical Infrastructure Management has 6 aspects and Application Management ' +
        'has 5, so averaging all 11 together would weight Infrastructure more heavily. The two ' +
        'sub-dimension averages are not rounded before being averaged.'
    ),
    entry(
      'Capability area score',
      "The average of that area's dimension scores. A dimension with nothing assessed is left " +
        'out rather than counted as zero, so an area with only one dimension filled in scores ' +
        'that dimension. An area where you have entered nothing shows no score at all.'
    ),
    entry(
      'Enterprise Governance score',
      'The average of the three organizational section averages. Sections with nothing assessed ' +
        'are left out, so each section that is assessed counts equally even though they have 6, ' +
        '5, and 4 aspects.'
    ),
    entry(
      'Aggregate dimensions',
      'The Data Management domain does not assess Information directly; its Information score ' +
        'is the average of the Information scores of the other domains\u2019 capability areas. ' +
        'The Technology Management domain works the same way for Technology. Those dimensions ' +
        'have no input rows on sheet 04, which is why some areas have fewer rows than others.'
    ),
    entry(
      'Aggregate rows before you start',
      `Because an aggregate is drawn from other domains\u2019 areas, sheet ` +
        `${SHEET_NAMES.MATURITY_PROFILE} can show an aggregate figure for a Data Management or ` +
        'Technology Management area before you have entered anything for that area. Sheet ' +
        `${SHEET_NAMES.AREA_SCORES} leaves such an area blank until you do, so an area you have ` +
        'not worked on does not count toward your domain or overall scores. Aggregate rows also ' +
        'have no To-Be figure, because the online tool does not set a target for a derived score.'
    ),

    heading('Known differences from the online tool'),
    entry(
      'Finalized assessments',
      'The online tool distinguishes an in-progress assessment from a finalized one, and counts ' +
        'only finalized assessments toward domain scores and aggregate dimensions. A workbook ' +
        'has no equivalent, so it counts everything you have entered. Your workbook scores and ' +
        'your online tool scores can therefore differ while an assessment is still in progress, ' +
        'even though both apply the same rules.'
    ),
    entry(
      'Rounding',
      'Excel and the online tool round a value that falls exactly halfway between two decimals ' +
        'in slightly different ways, so a score can differ by 0.1. Where they differ, the online ' +
        'tool is the authority: it produces the score you see on screen and the score in the CSV ' +
        'profile you submit. The difference is never more than 0.1. It cannot happen at all in a ' +
        'dimension score, nor in a capability area score built from three ORBIT dimensions. It ' +
        'can happen in two places: the Enterprise Governance score, which averages the three ' +
        'section averages before rounding, and a capability area score where only two of the ' +
        'three dimensions have been assessed.'
    ),
    entry(
      'Row counts',
      `Sheet ${SHEET_NAMES.ASSESSMENT_INPUT} has ${assessmentRowCount.toLocaleString('en-US')} ` +
        `rows and sheet ${SHEET_NAMES.CRITERIA_REFERENCE} has ` +
        `${criteriaRowCount.toLocaleString('en-US')} rows. If you add or remove rows, the scores ` +
        'will not calculate correctly.'
    ),
    entry(
      'Excel version',
      'Every formula in this workbook uses functions available in Excel 2007 and later, so it ' +
        'calculates the same way in older and current versions of Excel. It needs no add-ins, no ' +
        'macros, and no internet connection.'
    ),
    entry(
      'Filtering and sorting',
      'Use the filter buttons on the header row freely — filtering only hides rows, and every ' +
        'score is calculated over your whole sheet regardless of what is on screen. ' +
        'Do not reorder rows. Every sheet in this workbook is protected, which prevents sorting, ' +
        'and the calculated sheets identify your data partly by row position. If you unprotect a ' +
        'sheet and sort it, the scores will still be correct but the Notes, Barriers and ' +
        'Advancement Plans columns on ' +
        `${SHEET_NAMES.MATURITY_PROFILE} will show text from the wrong capability areas.`
    ),

    heading('Accessibility'),
    entry(
      'Structure',
      'Every sheet has a single header row on row 2, directly under row 1. There are no merged ' +
        'cells, no images, and no blank rows. Every reference column is populated on every row; ' +
        'the columns you fill in are empty by design.'
    ),
    entry(
      'Editable cells',
      'Editable columns are named "(enter value)" in the header as well as being shaded, so the ' +
        'shading is never the only signal.'
    ),
    entry(
      'Locked cells',
      'Reference cells are locked against editing but remain selectable, so a keyboard or ' +
        'screen reader user can still read them.'
    ),
  ];
}
