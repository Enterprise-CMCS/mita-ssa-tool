/**
 * Predecisional pilot disclaimer copy.
 *
 * **This wording is supplied by CMS and is reproduced verbatim.** Do not edit it for
 * length, tone, or consistency, and do not derive one notice from the other — the two
 * bodies genuinely differ in wording, not just in length. The top notice says "in
 * support of MITA 4.0 pilot activities"; the bottom one says "in support of pilot
 * activities" and then adds the Paperwork Reduction Act statement. Deriving the short
 * body by truncating the long one would silently change the approved text.
 *
 * Deliberately separate from `constants/index.ts` and deliberately free of any
 * `import.meta` reference. `import.meta.env` is `undefined` in plain Node ESM and
 * touching it throws, so a module that reads it cannot be imported by build-time
 * tooling. The XLSX generator runs under Node and has to stamp this same wording
 * into the workbook, so the copy has to live somewhere Node can reach.
 *
 * Keep this file dependency-free. The `IS_DRAFT` flag stays in `constants/index.ts`
 * because it is environment-dependent; Node consumers derive it from
 * `process.env.VITE_DRAFT_MODE` instead.
 */

/**
 * Emphasised lead-in, shared by both notices.
 *
 * Note this is no longer suitable as a document-title suffix — see
 * `DRAFT_TITLE_MARKER`, which exists because this string is 29 characters.
 */
export const DRAFT_NOTICE_LABEL = 'Predecisional Pilot Materials';

/**
 * Body of the **top** notice. Verbatim CMS wording.
 *
 * Note "MITA 4.0 pilot activities" here, against plain "pilot activities" in
 * `DRAFT_NOTICE_FULL_BODY`. That difference is in the approved text, not a typo.
 */
export const DRAFT_NOTICE_BODY =
  'These materials are preliminary and are being made available for limited review ' +
  'and testing in support of MITA 4.0 pilot activities.';

/**
 * Body of the **bottom** notice, including the Paperwork Reduction Act statement.
 * Verbatim CMS wording.
 *
 * This is the substantive version: it is the one that says the materials are not final
 * agency policy and may not be used for a PRA-subject information collection. Any
 * artifact that leaves the tool — PDF, CSV, JSON, ZIP — carries this one rather than the
 * short body, because an export circulating without the PRA statement is the specific
 * risk the disclaimer exists to cover.
 */
export const DRAFT_NOTICE_FULL_BODY =
  'These materials are preliminary and are being made available for limited review ' +
  'and testing in support of pilot activities. They do not represent final agency ' +
  'policy or requirements and may not be used to conduct an information collection ' +
  'subject to the Paperwork Reduction Act (PRA) unless and until applicable PRA ' +
  'requirements, including OMB approval where required, have been satisfied.';

/**
 * The full notice as a single line, for surfaces with no rich text: the CSV maturity
 * profile, the ZIP manifest, the JSON envelope, and the PDF cover.
 *
 * **The `Predecisional Pilot Materials:` prefix is a wire format, not just
 * presentation.** It is what `parseMaturityProfileCsv` matches on to skip the notice
 * row. Because the parser derives its prefix from `DRAFT_NOTICE_LABEL`, renaming the
 * label would keep the whole test suite green while making CSVs already exported in the
 * field unparseable — so there is a test asserting the literal string rather than the
 * derived value. Do not "fix" that test to use the constant. The parser also still
 * recognises the earlier `DRAFT:` prefix for the same reason.
 */
export const DRAFT_NOTICE_LINE = `${DRAFT_NOTICE_LABEL}: ${DRAFT_NOTICE_FULL_BODY}`;

/**
 * The short notice as a single line, for space-constrained surfaces.
 *
 * Used for the PDF's per-page footer, where the full PRA statement would wrap to four
 * lines at 7pt and collide with the page number. The cover carries the full text, so
 * the complete statement is still present in every report.
 */
export const DRAFT_NOTICE_SHORT_LINE = `${DRAFT_NOTICE_LABEL}: ${DRAFT_NOTICE_BODY}`;

/**
 * Short marker appended to `document.title`.
 *
 * Separate from `DRAFT_NOTICE_LABEL` purely because of length: the label is 29
 * characters and would push the title past anything a browser tab or a screen reader
 * summary usefully renders. "Predecisional" carries the same meaning in one word and
 * keeps the terminology consistent with the banners.
 *
 * The title is marked because the skip link jumps past the top banner to
 * `#main-content`, so a skip-link user never encounters the notice; the title is
 * announced on load regardless.
 */
export const DRAFT_TITLE_MARKER = 'Predecisional';
