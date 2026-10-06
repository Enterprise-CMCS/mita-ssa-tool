# MITA 4.0 Capability Model Update — Implementation Plan

**Created:** July 30, 2026
**Status:** Ready for implementation — independently reviewed against all sources (see Section 12)
**Previous App Version:** 3.0.0
**Target App Version:** 4.0.0
**Branch:** `feature/capability-model-v4`

> This document is both the scope record and the working implementation plan for the
> July 2026 Capability Reference Model update presented by the BA working group. It
> captures the sources, the decisions made, the authoritative target model, and the
> implementation waves. Check off tasks as they are completed; reviewers can use
> Section 4 as the source of truth for what the tool should contain.

---

## 1. Executive Summary

The BA working group revised the MITA 4.0 Capability Reference Model. This release
aligns the tool with that model. **The ORBIT maturity criteria are unchanged** — all
41 aspects, level definitions, and B-I-T assessment mechanics stay exactly as they
are in v3.0.0. What changes is the capability catalog (what can be assessed) and how
the organizational assessments are packaged.

| Metric                     | v3.0.0 (current)          | v4.0.0 (target)                          |
| -------------------------- | ------------------------- | ---------------------------------------- |
| Capability domains         | 16                        | 14                                       |
| Capability areas           | 66                        | 72                                       |
| ORBIT aspects              | 41 (26 standard + 15 org) | 41 (unchanged)                           |
| Organizational assessments | 3 areas across 2 domains  | 1 combined area (15 aspects, 3 sections) |

Headline changes:

1. **Domains removed:** Business Relationship Management; Enterprise Governance
   (dissolved — its contents move into the combined organizational area)
2. **Enterprise Architecture domain** moves Support → Strategic and contains exactly
   one capability area: **Enterprise Governance**, an organizational assessment with
   all 15 organizational aspects in 3 sections (Outcomes, Roles, Enterprise Architecture)
3. **Renamed + flattened domains:** Enterprise Data Management → **Data Management**,
   Enterprise Technology → **Technology Management**; the category tier (Foundational/
   Lifecycle, Infrastructure/Application) is removed from the capability model entirely
4. **"Information Management" pattern:** every business domain has an
   `<X> Information Management` capability area (11 areas follow the pattern;
   9 are new — Contract and Financial already exist)
5. **New disclaimer feature** on Information Management areas (per meeting decision)
6. **Clean break:** database schema v4 clears all data (established v2/v3 pattern)

No backwards compatibility is required for stored data. Imports of older exports
skip assessments whose capability areas no longer exist (see Section 9).

---

## 2. Sources & Provenance

| Source                                           | Authority                                                                                                                              |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `Business Architecture Capability Overview.pptx` | **Slides 4–6 only** are authoritative (per Chris). Slides 7+ are stale content from earlier decks.                                     |
| Meeting transcript (`transcript.md`)             | Decisions: EA/Enterprise Governance restructure, Information Management disclaimer, consistency requirement across tool/results/export |
| Chris's follow-up answers (relayed by Nick)      | Resolved all open questions (see Decision Log)                                                                                         |

Archived under `docs/source-documents/2026-07-30/` (Wave 1 task):
the PPTX, the transcript, and the extracted slide content
(`extracted/capability-model-slides.md`). Extraction script: `scripts/extract-pptx.py`.

The NextGen team is producing an updated **Capability Reference Model document** with
descriptions for all capability areas. It is NOT available yet — new areas ship with
marked placeholder descriptions and are trued up in a follow-up release (see Section 10).

---

## 3. Decision Log

| #   | Decision                                                                                                                                                                                                                                                | Decided by / where                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| 1   | Slides 4–6 are the authoritative capability model; ignore the rest of the deck                                                                                                                                                                          | Chris (follow-up)                        |
| 2   | EA domain: Strategic layer, exactly **one** area (Enterprise Governance) with all 15 org aspects in 3 sections. Slide 6's five EA lifecycle areas (Planning/Analysis/Design/Assessment/Maintenance) are reference-document content only, NOT tool areas | Chris (follow-up)                        |
| 3   | Provider Screening → **Provider Eligibility**. Slide 5 is authoritative (Decision 1); treating this as a rename of the same concept is the plan's inference. Gets a placeholder description (4.5). Flagged for staging confirmation                     | Inference from Decision 1                |
| 4   | Information Management areas get a simple disclaimer (yellow/warning callout); the conditional/aggregate workflow is explicitly deferred                                                                                                                | Meeting (12:54–16:57)                    |
| 5   | Naming: keep the app's "and" convention where the slide differs only in punctuation ("&", Oxford commas, hyphens); adopt slide wording where words actually change. New areas normalize "&" → "and"                                                     | Nick                                     |
| 6   | New areas ship with placeholder descriptions carrying an explicit "Placeholder" marker so reviewers know they are not final                                                                                                                             | Nick                                     |
| 7   | Clean break: DB version 4 clears all tables (same mechanism as v2/v3). No data migration                                                                                                                                                                | Nick                                     |
| 8   | Fix source typos/duplicates silently: "Networking & Technical Recover" → Recovery; deduplicate "Reference Data Management"                                                                                                                              | Chris (follow-up)                        |
| 9   | Enterprise aggregate behavior unchanged (Data Management aggregates Information; Technology Management aggregates Technology). Domain ids `data-management` and `technical` retained for stability (v3 precedent)                                       | Established pattern; no change requested |
| 10  | Combined org area overall score = **average of the 3 section averages** (mirrors B-I-T dimension averaging; Chris called the sections "dimensions"). Flagged for group affirmation in staging                                                           | Nick (default, pending staging review)   |
| 11  | ORBIT criteria (aspects/levels/questions/evidence) untouched                                                                                                                                                                                            | Scope boundary                           |
| 12  | Consistency required across assessment flow, results pages, and import/export                                                                                                                                                                           | Meeting (10:41–11:01)                    |

---

## 4. Target Capability Model (authoritative)

ID policy: areas that persist keep their existing ids; renamed areas get new
kebab-case ids matching their final names (v3 precedent: ids follow names); new
areas get kebab-case ids. Domain ids are unchanged except where noted. The clean
break means id changes have no stored-data cost.

### 4.1 Strategic Layer (3 domains, 10 areas)

**Plan and Policy Management** (`plan-policy-management`) — 5 areas

| Area                           | ID                               | Disposition                                  |
| ------------------------------ | -------------------------------- | -------------------------------------------- |
| Health Plan Administration     | `health-plan-administration`     | Keep                                         |
| Health Benefits Administration | `health-benefits-administration` | Keep                                         |
| Program Administration         | `program-administration`         | **New** (placeholder description)            |
| Waiver Management              | `waiver-management`              | **Moved** from Care and Service Coordination |
| Plan Information Management    | `plan-information-management`    | **New** (Info Mgmt pattern)                  |

**Strategy and Planning Management** (`strategy-planning-management`) — 4 areas

| Area                                  | ID                                      | Disposition                              |
| ------------------------------------- | --------------------------------------- | ---------------------------------------- |
| Strategic Plan Maintenance            | `strategic-plan-maintenance`            | **Renamed** from Maintain Strategic Plan |
| Strategic Roadmap Management          | `strategic-roadmap-management`          | **Renamed** from Develop Agency Roadmap  |
| Strategy Oversight and Accountability | `strategy-oversight-and-accountability` | **New** (slide "&" normalized to "and")  |
| Strategy Information Management       | `strategy-information-management`       | **New** (Info Mgmt pattern)              |

Removed from this domain: State Plan Administration (`state-plan-administration`).

**Enterprise Architecture** (`enterprise-architecture-domain`) — 1 area — **moved from Support layer**

| Area                  | ID                      | Disposition                                                                                                                                                                         |
| --------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Enterprise Governance | `enterprise-governance` | **Restructured** — replaces Organizational Enterprise Architecture; organizational assessment hosting all 15 aspects in 3 sections (Outcomes 6, Roles 5, Enterprise Architecture 4) |

### 4.2 Core Layer (7 domains, 33 areas)

**Provider Management** (`provider-management`) — 5 areas

| Area                            | ID                                | Disposition                                                            |
| ------------------------------- | --------------------------------- | ---------------------------------------------------------------------- |
| Provider Enrollment             | `provider-enrollment`             | Keep                                                                   |
| Provider Eligibility            | `provider-eligibility`            | **Renamed** from Provider Screening (placeholder description, see 4.5) |
| Provider Monitoring             | `provider-monitoring`             | Keep                                                                   |
| Provider Support Management     | `provider-support-management`     | Keep                                                                   |
| Provider Information Management | `provider-information-management` | **New** (Info Mgmt pattern)                                            |

**Claims and Encounter Management** (`claims-encounter-management`) — 6 areas

| Area                                       | ID                                           | Disposition                                              |
| ------------------------------------------ | -------------------------------------------- | -------------------------------------------------------- |
| Claims and Encounter Submission Management | `claims-encounter-submission`                | Keep                                                     |
| Claims Adjudication                        | `claims-adjudication`                        | Keep                                                     |
| Encounter Processing                       | `encounter-processing`                       | Keep                                                     |
| Claims and Encounters Adjustments          | `claims-encounters-adjustments`              | Keep                                                     |
| Claims and Encounters Lifecycle Management | `claims-encounters-lifecycle`                | Keep                                                     |
| Claim and Encounter Information Management | `claim-and-encounter-information-management` | **New** (Info Mgmt pattern; slide wording kept verbatim) |

**Care and Service Coordination** (`care-service-coordination`) — 5 areas

| Area                              | ID                            | Disposition                 |
| --------------------------------- | ----------------------------- | --------------------------- |
| Long-Term Care Support Management | `long-term-care-support`      | Keep                        |
| Visit Verification Monitoring     | `visit-verification`          | Keep                        |
| Case Management                   | `case-management`             | Keep                        |
| Prior Authorization               | `prior-authorization`         | Keep                        |
| Care Information Management       | `care-information-management` | **New** (Info Mgmt pattern) |

Removed from this domain: Waiver Management (moved to Plan and Policy Management).

**Contract Management** (`contract-management`) — 4 areas

| Area                            | ID                                | Disposition                                            |
| ------------------------------- | --------------------------------- | ------------------------------------------------------ |
| Contract Lifecycle Management   | `contract-lifecycle-management`   | Keep                                                   |
| Contractor Management           | `contractor-management`           | Keep                                                   |
| Contractor Support Management   | `contractor-support-management`   | **New** (terminology standardization)                  |
| Contract Information Management | `contract-information-management` | Keep (already exists; counts toward Info Mgmt pattern) |

**Pharmacy Management** (`pharmacy-management`) — 3 areas

| Area                            | ID                                | Disposition                 |
| ------------------------------- | --------------------------------- | --------------------------- |
| Pharmacy Benefit Administration | `pharmacy-benefit-administration` | Keep                        |
| Drug Monitoring Oversight       | `drug-monitoring-oversight`       | Keep                        |
| Pharmacy Information Management | `pharmacy-information-management` | **New** (Info Mgmt pattern) |

**Financial Management** (`financial-management`) — 6 areas

| Area                             | ID                                 | Disposition                                            |
| -------------------------------- | ---------------------------------- | ------------------------------------------------------ |
| Accounts Receivable Management   | `accounts-receivable-management`   | **Renamed** from Accounts Receivable                   |
| Accounts Payable Management      | `accounts-payable-management`      | **Renamed** from Accounts Payable                      |
| Fiscal / Budget Management       | `fiscal-budget-management`         | Keep (slide "Fiscal/Budget" is punctuation-only)       |
| Fund Management                  | `fund-management`                  | Keep                                                   |
| Third-Party Liability            | `third-party-liability`            | Keep (slide "Third Party" is punctuation-only)         |
| Financial Information Management | `financial-information-management` | Keep (already exists; counts toward Info Mgmt pattern) |

**Member Management** (`member-management`) — 4 areas

| Area                          | ID                              | Disposition                                    |
| ----------------------------- | ------------------------------- | ---------------------------------------------- |
| Member Eligibility            | `member-eligibility`            | **Renamed** from Member Eligibility Management |
| Member Enrollment             | `member-enrollment`             | **Renamed** from Member Enrollment Management  |
| Member Support Management     | `member-support-management`     | Keep                                           |
| Member Information Management | `member-information-management` | **New** (Info Mgmt pattern)                    |

### 4.3 Support Layer (4 domains, 29 areas)

**Compliance Management** (`compliance-management`) — 3 areas

| Area                              | ID                                  | Disposition                 |
| --------------------------------- | ----------------------------------- | --------------------------- |
| Program Monitoring Management     | `program-monitoring-management`     | Keep                        |
| Program Performance Evaluation    | `program-performance-evaluation`    | Keep                        |
| Compliance Information Management | `compliance-information-management` | **New** (Info Mgmt pattern) |

**Communication Management** (`communication-management`) — 5 areas

| Area                                 | ID                                     | Disposition                 |
| ------------------------------------ | -------------------------------------- | --------------------------- |
| Communication Development            | `communication-development`            | Keep                        |
| Communication Intake                 | `communication-intake`                 | Keep                        |
| Communication Dissemination          | `communication-dissemination`          | Keep                        |
| Public Affairs                       | `public-affairs`                       | Keep                        |
| Communication Information Management | `communication-information-management` | **New** (Info Mgmt pattern) |

**Data Management** (`data-management`) — 10 areas — **renamed** from Enterprise Data Management, **flattened** (categories removed)

| Area                                      | ID                                    | Disposition                                                 |
| ----------------------------------------- | ------------------------------------- | ----------------------------------------------------------- |
| Data Governance                           | `data-governance`                     | Keep                                                        |
| Data Storage, Operations, and Warehousing | `data-storage-operations-warehousing` | **Renamed** from Data Storage and Warehousing ("&" → "and") |
| Data Architecture, Modeling, and Design   | `data-architecture-modeling-design`   | Keep (punctuation-only diff)                                |
| Master Data Management                    | `master-data-management`              | Keep                                                        |
| Reference Data Management                 | `reference-data-management`           | Keep (slide duplicate line removed per Decision 8)          |
| Document and Content Management           | `document-content-management`         | Keep (punctuation-only diff)                                |
| Data Integration and Interoperability     | `data-integration-interoperability`   | Keep (punctuation-only diff)                                |
| Data Quality Management                   | `data-quality-management`             | **Renamed** from Data Quality                               |
| Data Security & Privacy                   | `data-security-privacy`               | Keep (existing name matches slide)                          |
| Metadata Management                       | `metadata-management`                 | Keep                                                        |

Removed from this domain: Business Intelligence & Data Science
(`business-intelligence-data-science`).

**Technology Management** (`technical`) — 11 areas — **renamed** from Enterprise Technology, **flattened** (categories removed). All areas keep current names and ids (slide diffs are punctuation-only; "Recover" typo fixed per Decision 8). These stay 1:1 with the Technology dimension aspects.

| Area (unchanged)                                      | ID (unchanged)                                        |
| ----------------------------------------------------- | ----------------------------------------------------- |
| Compute and Storage                                   | `compute-and-storage`                                 |
| Networking and Technical Recovery                     | `networking-and-technical-recovery`                   |
| Identity, Access and Consent                          | `identity-access-and-consent`                         |
| Security Protection and Monitoring                    | `security-protection-and-monitoring`                  |
| System Operations and Monitoring                      | `system-operations-and-monitoring`                    |
| Development, Testing, Release and Security Compliance | `development-testing-release-and-security-compliance` |
| API, Messaging, and Integration                       | `api-messaging-and-integration`                       |
| Application Hosting and Platform Services             | `application-hosting-and-platform-services`           |
| Business Rules and Workflows                          | `business-rules-and-workflows`                        |
| Modular Architecture                                  | `modular-architecture`                                |
| User Interfaces and Session Management                | `user-interfaces-and-session-management`              |

### 4.4 Removed Entirely

| Item                                                                                           | Notes                                                                                         |
| ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Business Relationship Management domain (`business-relationship-management`) + its 2 areas     | Not in the new model                                                                          |
| Enterprise Governance domain (`enterprise-governance`)                                         | Dissolved; Outcomes/Roles move into the combined area (the id is reused for the new **area**) |
| Organizational Outcomes area (`organizational-outcomes`)                                       | Aspects live on in the combined area                                                          |
| Organizational Roles area (`organizational-roles`)                                             | Aspects live on in the combined area                                                          |
| Organizational Enterprise Architecture area (`organizational-enterprise-architecture`)         | Aspects live on in the combined area                                                          |
| State Plan Administration, Business Intelligence & Data Science, Waiver Management (from Care) | See domain tables                                                                             |
| The `categories` tier (both categorized domains)                                               | Metamodel is strictly Domain → Area                                                           |

### 4.5 Placeholder Descriptions

All **New** areas (and the Enterprise Governance area) get a description of the form:

> `[Placeholder — pending updated Capability Reference Model] <one-sentence provisional description>`

and `topics: []`. The UI already tolerates empty topics. Renamed areas keep their
existing descriptions (adjusted only if they reference the old name) — except
**Provider Eligibility**, which gets a placeholder: the old Provider Screening
description describes screening, not eligibility. The Data Management and
Technology Management domain descriptions are updated to drop "Enterprise"
phrasing.

### 4.6 Information Management Flag

The 11 Info-Mgmt-pattern areas (all areas named `* Information Management`, including
the pre-existing Contract and Financial ones) get a new optional field in
`capabilities.json`: `"informationManagement": true`. This drives the disclaimer
(Section 8) in a data-driven way — no name matching in code.

---

## 5. ORBIT Model Changes (`orbit-model.json`)

Minimal. Aspect criteria untouched.

- `organizationalAssessments.outcomes.capabilityAreaId`: `organizational-outcomes` → `enterprise-governance`
- `organizationalAssessments.roles.capabilityAreaId`: `organizational-roles` → `enterprise-governance`
- `organizationalAssessments['enterprise-architecture'].capabilityAreaId`: `organizational-enterprise-architecture` → `enterprise-governance`
- `lastUpdated` → `2026-07-30`; `version` stays `4.0` (tracks the MITA model version)

`capabilities.json` gets the same `lastUpdated`; `version` stays `4.0`.

---

## 6. Combined Organizational Area — Behavior Spec

One assessment record for the `enterprise-governance` area covers all three
organizational assessment types. Ratings need no schema change: each rating already
carries `dimensionId` (`outcomes` | `roles` | `enterprise-architecture`).

| Concern             | Behavior                                                                                                                                                                                                                                                                                                                                             |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Constants           | `ORGANIZATIONAL_ASSESSMENT_AREA_ID = 'enterprise-governance'`; `ORGANIZATIONAL_SECTIONS = ['outcomes', 'roles', 'enterprise-architecture']`; `isOrganizationalAssessmentArea(areaId)` checks the single id; `getOrganizationalAssessmentType(areaId)` (1:1) is replaced by `getOrganizationalSections(areaId): OrganizationalAssessmentId[] \| null` |
| Assessment sidebar  | 3 section headers (Organizational Outcomes, Organizational Roles, Organizational Enterprise Architecture) with their aspects listed beneath; aspect-level navigation preserved                                                                                                                                                                       |
| Progress            | 15-aspect denominator for this area (assessment page: Wave 2; dashboard completion fix: Wave 3)                                                                                                                                                                                                                                                      |
| Finalize scoring    | Section score = mean of assessed aspects (level > 0) in that section; sections with zero assessed aspects produce no score and are excluded; **overall = mean of the non-null section scores**, rounded to 1 decimal (mirrors how B-I-T finalize averages only dimensions that have scores). Decision 10                                             |
| Results (Area page) | One table/chart per section; overall score displayed as stored                                                                                                                                                                                                                                                                                       |
| History             | `dimensionScores` keyed by `outcomes` / `roles` / `enterprise-architecture` (existing mechanism, unchanged)                                                                                                                                                                                                                                          |
| CSV export          | Single area section using the `Aspect` header format, with a label row per section grouping its aspects                                                                                                                                                                                                                                              |
| PDF export          | Organizational details rendered per section                                                                                                                                                                                                                                                                                                          |

Domain score for the EA domain = the single area's overall score (existing math).

---

## 7. Database

`db.version(4)` with the established clean-break upgrade (identical schema, clear all
five tables), documented in the version comment: capability model restructure —
area/domain ids changed, organizational areas merged; existing data incompatible.

---

## 8. Information Management Disclaimer (new feature)

- Trigger: assessment page for any area with `informationManagement: true`
- Placement: persistent banner below the context bar, visible on all dimension views
  for that area; MUI `Alert severity="warning"` (the "little yellow hazard sign"
  from the meeting), accessible (role/status semantics per MUI defaults)
- Draft copy (flagged for group review in staging):

  > **Information Management guidance:** Complete this capability area when you are
  > assessing multiple capability areas within this domain — assess your information
  > maturity once here, and skip the Information dimension in this domain's other
  > capability areas. If you are assessing only a single capability area, assess the
  > Information dimension within that area instead.

- Explicitly out of scope: conditional/aggregate Information workflow (deferred in
  the meeting as "more complicated"; disclaimer is the agreed v1)

---

## 9. Import/Export Handling

- Export shape and `EXPORT_VERSION` (`1.0`) unchanged
- **New import validation:** `processAssessmentImport` skips assessments whose
  `capabilityAreaId` does not exist in the current model, with reason
  `"Capability area not in current model"` (mirrors the existing orphaned-aspect
  filter). Old exports referencing removed/renamed areas (e.g.
  `organizational-outcomes`, `provider-screening`) are skipped gracefully rather
  than imported as invisible orphans
- **The same area-existence filter applies to imported history entries** in
  `processImport`: history rows whose `capabilityAreaId` is not in the current model
  are skipped (they would otherwise be inserted as permanently unreachable rows,
  since history is only reachable from current-area rows)
- Existing aspect-level filtering already accepts all three organizational dimension
  ids and is unaffected
- `src/data/templates/maturity-profile-template.csv` is generic (no area names) — no
  change; revisit when the official updated template lands (Section 10)

---

## 10. Out of Scope / Follow-ups

| Item                                                                      | Disposition                                                                                                                              |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Five EA lifecycle areas (Planning/Analysis/Design/Assessment/Maintenance) | Reference-document content only; NOT tool areas (Decision 2)                                                                             |
| Real descriptions for new areas                                           | Follow-up release when NextGen's Capability Reference Model document arrives (Decision on placeholders: 6)                               |
| Updated official maturity profile template                                | Align CSV export/template when it lands (in progress externally)                                                                         |
| Landing page change from CMS review                                       | Separate change; awaiting Chris's screenshot. NOT to be confused with the in-scope Wave 5 task fixing stale counts/copy in Landing/About |
| Conditional Information Management workflow                               | Explicitly deferred in the meeting                                                                                                       |
| Possible late capability tweaks from business-process development         | Chris: model is "95%" settled; all model content stays data-driven in JSON to absorb follow-ups                                          |

---

## 11. Implementation Waves

Each wave ends with the repo green: `npm run typecheck && npm run lint && npm test`
all passing. Check off tasks as completed.

### Wave 1 — Sources, data files, and foundation

Everything through the service layer, plus mechanical call-site updates so the app
compiles and behaves correctly at the data level.

- [x] Archive sources: move the PPTX and `transcript.md` from the repo root to
      `docs/source-documents/2026-07-30/`; add `extracted/capability-model-slides.md`
      (slides 4–6 extraction)
- [x] Rebuild `src/data/capabilities.json` exactly per Section 4 (flat domains, no
      `categories` anywhere, placeholder descriptions per 4.5, `informationManagement`
      flags per 4.6)
- [x] Update `src/data/orbit-model.json` per Section 5
- [x] Types (`src/types/index.ts`): remove `CapabilityCategory`,
      `CategorizedCapabilityDomain`, `StandardCapabilityDomain` union,
      `isCategorizedDomain`, `getAreasFromDomain`; `CapabilityDomain` becomes a single
      interface with `areas: CapabilityArea[]`; add `informationManagement?: boolean`
      to `CapabilityArea`
- [x] Constants (`src/constants/index.ts`): replace `ORGANIZATIONAL_ASSESSMENT_AREAS`
      map with the single-area model per Section 6; keep `ENTERPRISE_DOMAIN_IDS` /
      `DOMAIN_AGGREGATE_DIMENSIONS` untouched
- [x] Services: simplify `capabilities.ts` (drop category functions and category
      returns from `getAreaWithDomain` / `searchAreas`); update all
      `getAreasFromDomain` / `getOrganizationalAssessmentType` call sites across the
      app (`grep` for both) to the new helpers
- [x] Finalize scoring in `useCapabilityAssessments`: combined-area scoring per
      Section 6 (all three sections included; average of section averages)
- [x] `db.ts`: add version 4 clean-break migration per Section 7
- [x] Update affected tests — known breakages: `capabilities.test.ts` (16 domains /
      66 areas / category assertions), `orbit.test.ts` (organizationalAssessments
      `capabilityAreaId` assertions), `useScores.test.ts` (66 total,
      `provider-screening` fixture), constants and scoring tests
- [x] Verify: typecheck, lint, full test suite green

### Wave 2 — Assessment flow UI

- [x] `Assessment.tsx`: build org nav from all three sections with section grouping;
      per-aspect navigation within sections; 15-aspect progress denominator
- [x] `AssessmentSidebar`: render section headers for organizational mode
- [x] Information Management disclaimer banner per Section 8 (new small component or
      inline Alert; data-driven off the area flag)
- [x] `AssessmentContextBar`: remove `categoryName` prop and rendering
- [x] `HistoryView.tsx`: add an organizational branch to `buildNavItems` (it currently
      renders only B-I-T nav items, so a snapshot of the combined area would show
      empty dimension pages — pre-existing gap for v3 org areas that v4 makes
      prominent); mirror Assessment.tsx's organizational navigation for historical
      ratings
- [x] Component tests: combined org navigation, disclaimer renders only on flagged
      areas, accessibility check (vitest-axe) on the banner, HistoryView org rendering
- [x] Verify: typecheck, lint, tests green; manual smoke of the combined assessment
      page and one Info Mgmt area

### Wave 3 — Results & scores

- [x] `useScores`: `getOrganizationalScoresForAssessment` returns one `DimensionScore`
      per section (3 for the combined area); completion percentage uses per-area
      aspect totals (26 standard / 15 organizational) — fixes the existing 26-divisor
      inaccuracy for org areas
- [x] `AreaResults.tsx`: render 3 section tables + grouped aspect chart for the
      combined area
- [x] `ResultsMasterDetail` / `DomainResults` / `DomainTable`: remove category
      rendering; verify EA-under-Strategic and renamed domains display correctly
- [x] Update affected tests
- [x] Verify: typecheck, lint, tests green

### Wave 4 — Export & import

- [x] `exportService.ts`: `generateOrganizationalAreaProfile` iterates all three
      sections with section label rows
- [x] `csvExport.ts`: section labels within the `Aspect` block; parser tolerant of
      section label rows
- [x] `pdfExport.ts`: `generateOrganizationalDetails` renders per section
- [x] `importService.ts`: area-existence validation per Section 9 — both
      `processAssessmentImport` (assessments) and the history-entry loop in
      `processImport`
- [x] Update affected tests (`importService.test.ts` has enterprise-governance
      domain and organizational-outcomes/roles fixtures); add: import of a
      v3-shaped export skips removed-area assessments AND history entries with the
      documented reason
- [x] Verify: typecheck, lint, tests green

### Wave 5 — Docs, version, release

- [x] `CHANGELOG.md`: 4.0.0 entry (Restructured/Added/Changed/Removed, including the
      scoring method for the combined area and the disclaimer feature)
- [x] `PROJECT_FOUNDATION_v2.md`: capability model summary tables, org assessment
      description, layer counts, routes/hooks unchanged
- [x] In-app static copy: `Landing.tsx` ("all 66 capability areas"), `About.tsx`
      ("66 capability areas" and the Outcomes/Roles/"separate Enterprise
      Architecture assessment" paragraph) — update to 72 areas and the combined
      Enterprise Governance assessment; grep `src/` for `66` to catch stragglers
- [x] `README.md` + `docs/reference/MITA_4.0_Capability_Reference_Model.md`: update
      counts/structure snapshot
- [x] `package.json` 3.0.0 → 4.0.0; `npm install --package-lock-only`
- [x] Full verification: `npm run typecheck && npm run lint && npm test && npm run build`
- [ ] Manual staging checklist (below), then push branch and open PR for the working
      group's staging review (per the meeting plan)

### Staging review checklist (manual)

- [ ] Dashboard: 14 domains grouped Strategic (3) / Core (7) / Support (4); 72 areas; EA under Strategic
- [ ] Combined Enterprise Governance assessment: 3 sections, 15 aspects, finalize produces a score
- [ ] Disclaimer visible on all 11 Information Management areas, absent elsewhere
- [ ] Results: overall → domain → area drill-down for a standard area and the combined area
- [ ] Aggregates: Data Management (Information) and Technology Management (Technology) aggregate views work
- [ ] Export JSON/CSV/PDF/ZIP with a finalized standard + combined assessment; re-import round-trips
- [ ] Import a v3 export: removed-area assessments AND history entries skipped with visible reason
- [ ] Edit a finalized combined assessment, then view its history snapshot (HistoryView renders 3 sections)
- [ ] Fresh load over a v3 database: v4 clears data without errors
- [ ] Confirm with the working group: Provider Eligibility rename (Decision 3), "Claim and Encounter" singular wording, combined-area scoring method (Decision 10) including that the three sections weigh equally despite 6/5/4 aspect counts and that the former three separate org scores become one combined score in domain/overall rollups

---

## 12. Pre-Implementation Review Record

An independent sub-agent review (July 30, 2026) checked this plan against the PPTX
extraction (slides 4–6), the meeting transcript, Chris's follow-up answers, Nick's
decisions, and the full v3.0.0 codebase. Verdict: **ready-with-corrections** — all
corrections have been applied to this document.

**Positively verified (unchanged by review):**

- Section 4 model fidelity: all 14 domains and 72 areas match slides 4–6 exactly
  (names, layers, per-domain counts, dispositions); every Keep id/name matches
  v3 `capabilities.json` verbatim; area math 66 − 7 removed + 13 added = 72
- Naming rule (Decision 5) applied consistently across all 72 names; the only
  source typos/duplicates are the two covered by Decision 8
- All planned behaviors trace to the transcript, Chris's answers, or flagged
  defaults; aggregate behavior survives untouched (keyed by retained domain ids;
  layer rendering is data-driven, so EA-under-Strategic needs zero layout code)
- Technical soundness: orbitRatings compound indexes disambiguate three org
  dimensionIds within one assessment; org aspect ids are globally unique;
  `orbit-model.json` `capabilityAreaId` fields are not consumed by logic

**Corrections applied from the review:**

| Finding                                                                                  | Fix                                                         |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| "11 new areas" overstated (Contract/Financial Info Mgmt already exist; 9 are new)        | Exec summary corrected                                      |
| HistoryView renders only B-I-T nav — combined-area snapshots would show empty pages      | New Wave 2 task + staging item                              |
| Landing/About hardcode "66 capability areas" and the old org-assessment structure        | New Wave 5 task                                             |
| Imported v3 history entries for removed areas would become unreachable orphan rows       | Section 9 + Wave 4 extended to filter history by area       |
| Combined-area scoring didn't define partially assessed sections                          | Section 6: mean of **non-null** section scores              |
| Decision 3 (Provider Eligibility rename) was attributed to Chris but is an inference     | Reattributed; placeholder description; staging confirm item |
| Wrong wave cross-reference in Section 6 progress row; orbit.test.ts breakage unlisted    | Corrected; known test breakages enumerated in Wave 1        |
| Scoring semantics shift (3 separate org scores → 1 combined) should be surfaced to group | Added to staging confirmation item                          |
