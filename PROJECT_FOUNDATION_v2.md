# MITA 4.0 State Self-Assessment Tool — Project Foundation v2

## Overview

A Progressive Web App (PWA) enabling State Medicaid Agencies (SMAs) to self-assess their Medicaid Enterprise maturity using the **MITA 4.0 ORBIT Maturity Model**. The application is fully client-side, offline-first, and stores all data locally in the browser.

**Version:** 4.0  
**Last Updated:** July 30, 2026  
**Target Deployment:** GitHub Pages

> **Note:** This document (v2) reflects the current implementation: the May 3, 2026 PRA submission is the maturity model source, and the July 2026 BA working group capability model (slides 4–6) is the capability reference model source. See `docs/decisions/CAPABILITY_MODEL_UPDATE_PLAN.md` for the v4 change record.

---

## Core Principles

1. **Privacy First**: All data stays in the browser. No data transmitted or stored remotely.
2. **Offline First**: Two independent halves, worth keeping distinct because for most of this
   project's life only the first was true (OBS-22). **Storage** is local — IndexedDB, no network
   involved in saving. **Delivery** is cached — a service worker precaches the app shell and the
   offline workbook, so a reload with no network succeeds. The service worker landed in Wave 8;
   before that the app claimed offline support and a reload without network failed.
3. **Maintainability**: Capability and ORBIT data in separate, easily-editable JSON files.
4. **Accessibility**: Built and tested against WCAG 2.1 AA — a superset of the WCAG 2.0 AA that the
   Revised Section 508 Standards incorporate by reference, and which they apply to non-web content
   too, so the Excel workbook is in scope alongside the app. **Stated as a target and a test result,
   not as compliance:** the position is "no known open AA failure, and no assistive-technology
   testing to confirm it." Earlier revisions of this line claimed "WCAG 2.1 AA compliant UI", which
   the project's own audit record contradicts. Method, findings and nine limitations are in the Wave
   4 Accessibility Audit Record in `docs/decisions/PILOT_CLEARANCE_PLAN.md`; no ACR/VPAT is
   published, by decision (P2).
5. **Simplicity**: Clean architecture, minimal dependencies, clear code.

---

## Tech Stack

| Layer            | Technology                         |
| ---------------- | ---------------------------------- |
| Build Tool       | Vite 6                             |
| Framework        | React 18                           |
| Language         | TypeScript (strict mode)           |
| Routing          | React Router v7                    |
| UI Library       | Material UI (MUI) v6               |
| State Management | React Hooks + Dexie React Hooks    |
| Client Storage   | Dexie.js (IndexedDB)               |
| PDF Export       | jsPDF + jsPDF-AutoTable            |
| ZIP Export       | JSZip                              |
| Charts           | Chart.js + react-chartjs-2         |
| Testing          | Vitest + React Testing Library     |
| PWA              | vite-plugin-pwa (prompt-on-update) |
| CI/CD            | GitHub Actions                     |

---

## Application Structure

```
mita-4.0/
├── src/
│   ├── components/
│   │   ├── assessment/       # ORBIT assessment workflow components
│   │   ├── dashboard/        # Dashboard and capability management
│   │   ├── export/           # Import/export dialogs
│   │   ├── layout/           # Header, footer, navigation
│   │   └── results/          # Results visualization components
│   ├── constants/            # Application constants
│   ├── data/
│   │   ├── capabilities.json # Capability domains and areas (72 areas)
│   │   └── orbit-model.json  # ORBIT maturity criteria (41 aspects)
│   ├── hooks/                # Custom React hooks
│   ├── pages/                # Route page components
│   ├── services/
│   │   ├── db.ts             # Dexie database setup
│   │   ├── capabilities.ts   # Capability data utilities
│   │   ├── orbit.ts          # ORBIT model utilities
│   │   ├── scoring.ts        # Score calculations
│   │   └── export/           # Export/import services
│   ├── styles/               # Global CSS utilities
│   ├── test/                 # Test setup
│   ├── theme/                # MUI theme customization
│   ├── types/                # TypeScript interfaces
│   ├── utils/                # Utility functions
│   ├── App.tsx               # Root component with routing
│   └── main.tsx              # Entry point
├── .github/
│   ├── ISSUE_TEMPLATE/       # Bug, feature, docs templates
│   ├── workflows/            # CI and deploy workflows
│   └── PULL_REQUEST_TEMPLATE.md
├── docs/
│   ├── source-documents/     # Source MITA documents archived by date
│   ├── reference/            # Reference snapshots of capability and maturity models
│   └── decisions/            # Historic spec/decision records
├── CHANGELOG.md
├── CONTRIBUTING.md
├── README.md
└── SECURITY.md
```

---

## Data Architecture

### Two Primary Data Files

#### 1. `src/data/capabilities.json` — Capability Reference Model

Defines **what** can be assessed. Contains 72 capability areas across 14 domains organized into three layers. The metamodel is strictly two levels (Domain → Area); there is no category tier.

**Domain Structure:**

```typescript
interface CapabilityDomain {
  id: string;
  name: string;
  layer: 'strategic' | 'core' | 'support';
  description: string;
  areas: CapabilityArea[];
}

interface CapabilityArea {
  id: string;
  name: string;
  description: string;
  topics: string[];
  informationManagement?: boolean; // Drives the Info Mgmt assessment guidance banner
}
```

**Capability Model Summary:**

| Layer     | Domains | Capability Areas |
| --------- | ------- | ---------------- |
| Strategic | 3       | 10               |
| Core      | 7       | 33               |
| Support   | 4       | 29               |
| **Total** | **14**  | **72**           |

Eleven business domains each contain an `<X> Information Management` area
(flagged `informationManagement: true`). These show an in-app guidance banner:
assess information maturity once per domain there, or per-area via the
Information dimension when assessing a single capability area.

#### 2. `src/data/orbit-model.json` — ORBIT Maturity Criteria

Defines **how** assessments are conducted. Each business capability area is assessed against the three required dimensions; three additional organizational assessments evaluate enterprise-level maturity.

**Standard Dimensions (assessed per capability area):**

| Dimension             | Required | Aspects                      |
| --------------------- | -------- | ---------------------------- |
| Business Architecture | Yes      | 5                            |
| Information           | Yes      | 10                           |
| Technology            | Yes      | 11 (across 2 sub-dimensions) |
| **Total**             |          | **26**                       |

**Technology Sub-Dimensions:**

1. Technical Infrastructure Management (6 aspects)
2. Application Management (5 aspects)

**Organizational Assessment (assessed once per organization):**

The single **Enterprise Governance** capability area (Enterprise Architecture
domain, Strategic layer) hosts all organizational aspects in three sections:

| Section                                | Aspects |
| -------------------------------------- | ------- |
| Organizational Outcomes                | 6       |
| Organizational Roles                   | 5       |
| Organizational Enterprise Architecture | 4       |
| **Total**                              | **15**  |

Its overall score is the average of the section averages (sections with no
assessed aspects are excluded), mirroring how standard assessments average
their dimension scores.

**Grand total aspects: 41 (26 standard + 15 organizational)**

**Enterprise Domains with Aggregate Dimensions:**

Two domains have special aggregate dimension handling:

| Domain                | Assessment Model | Aggregate Dimension |
| --------------------- | ---------------- | ------------------- |
| Data Management       | B-T              | Information         |
| Technology Management | B-I              | Technology          |

For these enterprise domains:

- The aggregate dimension score is calculated from all finalized assessments in other domains
- Users cannot manually assess the aggregate dimension
- The aggregate score IS included in the overall capability score
- Enterprise domains are excluded from each other's aggregate calculations

**Maturity Levels:**

| Level | Name           | Description                                                |
| ----- | -------------- | ---------------------------------------------------------- |
| 1     | Initial        | Unstructured, reactive, inconsistent processes             |
| 2     | Developing     | Basic processes exist, not fully standardized              |
| 3     | Defined        | Standardized, documented, aligned processes                |
| 4     | Managed        | Performance monitored, thought-leader collaboration        |
| 5     | Optimized      | Data-driven, nationally recognized, continuous improvement |
| N/A   | Not Applicable | Does not apply to this capability                          |

---

## Database Schema (Dexie.js / IndexedDB)

### Core Tables

#### CapabilityAssessment

One record per capability area being assessed. "Not started" is implied by no record existing.

```typescript
interface CapabilityAssessment {
  id: string; // UUID
  capabilityDomainId: string; // e.g., "provider-management"
  capabilityDomainName: string; // e.g., "Provider Management"
  capabilityAreaId: string; // e.g., "provider-enrollment"
  capabilityAreaName: string; // e.g., "Provider Enrollment"
  status: 'in_progress' | 'finalized';
  tags: string[]; // User-defined tags
  createdAt: Date;
  updatedAt: Date;
  finalizedAt?: Date;
  overallScore?: number; // Calculated when finalized
}
```

**Indexes:** `id, capabilityAreaId, capabilityDomainId, status, updatedAt, *tags`

#### OrbitRating

One record per aspect per capability assessment.

```typescript
interface OrbitRating {
  id: string; // UUID
  capabilityAssessmentId: string; // FK to CapabilityAssessment
  dimensionId: RatingDimensionId; // see types below
  subDimensionId?: TechnologySubDimensionId; // Only for technology dimension
  aspectId: string; // e.g., "information-quality"
  currentLevel: MaturityLevelWithNA; // -1 (N/A), 0 (not assessed), 1-5
  targetLevel?: MaturityLevelWithNA; // "To Be" target level
  previousLevel?: MaturityLevelWithNA; // Carry-forward hint
  questionResponses: QuestionResponse[];
  evidenceResponses: EvidenceResponse[];
  notes: string;
  barriers: string;
  plans: string;
  carriedForward: boolean;
  attachmentIds: string[]; // FK references to Attachment
  updatedAt: Date;
}

// Standard ORBIT dimensions (assessed per capability area)
type OrbitDimensionId = 'businessArchitecture' | 'information' | 'technology';

// Organizational assessments (assessed once per organization)
type OrganizationalAssessmentId = 'outcomes' | 'roles' | 'enterprise-architecture';

// dimensionId in OrbitRating accepts both
type RatingDimensionId = OrbitDimensionId | OrganizationalAssessmentId;

type TechnologySubDimensionId = 'technologyInfrastructureManagement' | 'applicationManagement';

type MaturityLevelWithNA = -1 | 0 | 1 | 2 | 3 | 4 | 5;
```

**Indexes:** `id, capabilityAssessmentId, [capabilityAssessmentId+dimensionId+aspectId], [capabilityAssessmentId+dimensionId+subDimensionId+aspectId]`

#### Attachment

File attachments stored as Blobs in IndexedDB.

```typescript
interface Attachment {
  id: string;
  capabilityAssessmentId: string;
  orbitRatingId: string;
  fileName: string;
  fileType: string; // MIME type
  fileSize: number; // Bytes
  blob: Blob; // Actual file data
  description?: string;
  uploadedAt: Date;
}
```

**Indexes:** `id, capabilityAssessmentId, orbitRatingId, uploadedAt`

#### AssessmentHistory

Snapshots of finalized assessments for history tracking.

```typescript
interface AssessmentHistory {
  id: string;
  capabilityAssessmentId: string;
  capabilityAreaId: string;
  snapshotDate: Date;
  tags: string[];
  overallScore: number;
  dimensionScores: Record<string, number>;
  ratings: HistoricalRating[]; // Lightweight snapshot (no blobs)
}

interface HistoricalRating {
  dimensionId: RatingDimensionId;
  subDimensionId?: TechnologySubDimensionId;
  aspectId: string;
  currentLevel: MaturityLevelWithNA;
  targetLevel?: MaturityLevelWithNA;
  questionResponses: QuestionResponse[];
  evidenceResponses: EvidenceResponse[];
  notes: string;
  barriers: string;
  plans: string;
}
```

**Indexes:** `id, capabilityAssessmentId, capabilityAreaId, snapshotDate`

#### Tag

Tags for autocomplete functionality.

```typescript
interface Tag {
  id: string;
  name: string;
  usageCount: number;
  lastUsed: Date;
}
```

**Indexes:** `id, name, usageCount, lastUsed`

---

## Scoring Logic

Scoring uses simple averages throughout (no weighting, per stakeholder decision).

```typescript
interface AspectScore {
  aspectId: string;
  aspectName: string;
  dimensionId: OrbitDimensionId;
  subDimensionId?: TechnologySubDimensionId;
  currentLevel: MaturityLevelWithNA;
  isAssessed: boolean;
}

interface DimensionScore {
  dimensionId: OrbitDimensionId;
  dimensionName: string;
  required: boolean;
  averageLevel: number | null; // null if no aspects assessed
  aspectScores: AspectScore[];
  subDimensionScores?: SubDimensionScore[]; // Only for Technology
}

interface SubDimensionScore {
  subDimensionId: TechnologySubDimensionId;
  subDimensionName: string;
  averageLevel: number | null;
  aspectScores: AspectScore[];
}
```

**Calculation Rules:**

- N/A ratings are excluded from averages
- Unassessed aspects (level 0) are excluded from averages
- Scores are rounded to 1 decimal place
- Dimension score = average of aspect scores
- Capability area score = average of dimension scores
- Domain score = average of capability area scores

---

## Routes

| Route                        | Page          | Purpose                                           |
| ---------------------------- | ------------- | ------------------------------------------------- |
| `/`                          | Landing       | Introduction, privacy statement, feature overview |
| `/dashboard`                 | Dashboard     | Central hub for viewing/managing assessments      |
| `/assessment/:assessmentId`  | Assessment    | ORBIT assessment workflow                         |
| `/history/:historyId`        | HistoryView   | View historical assessment snapshots              |
| `/results`                   | Results       | Overall maturity results                          |
| `/results/:domainId`         | DomainResults | Domain-level results                              |
| `/results/:domainId/:areaId` | AreaResults   | Capability area results                           |
| `/import-export`             | ImportExport  | Data import/export management                     |
| `/guide`                     | About         | Tool usage guide and information                  |

---

## Custom Hooks

| Hook                              | Purpose                                          |
| --------------------------------- | ------------------------------------------------ |
| `useCapabilityAssessments()`      | CRUD operations for assessments, status tracking |
| `useOrbitRatings(assessmentId)`   | Rating management, dimension/aspect queries      |
| `useScores()`                     | Score calculations at all levels                 |
| `useTags()`                       | Tag management and autocomplete                  |
| `useHistory()`                    | Assessment history queries and management        |
| `useAttachments(assessmentId)`    | File upload/download/delete                      |
| `useDebounce(value, delay)`       | Debounced value for delayed updates              |
| `useDebouncedCallback(fn, delay)` | Debounced function execution                     |
| `useDebouncedSave(saveFn, delay)` | Auto-save with debouncing and dirty tracking     |

---

## Export Formats

Five artifacts leave the tool. The first four are generated in the browser from the state's own
data; the fifth is a static build output and is the odd one out in every respect.

| Format | Purpose              | Contents                                  | Generated      | Carries the draft notice                                                        |
| ------ | -------------------- | ----------------------------------------- | -------------- | ------------------------------------------------------------------------------- |
| PDF    | Stakeholder reports  | Scores, charts, dimension breakdowns      | In the browser | Cover band + page footer                                                        |
| CSV    | CMS Maturity Profile | Standard format for MESH upload           | In the browser | A notice row                                                                    |
| JSON   | Data backup          | Full assessment data (no blobs)           | In the browser | A `draftNotice` field                                                           |
| ZIP    | Complete backup      | JSON + PDF + all attachments              | In the browser | In `manifest.json`                                                              |
| XLSX   | Offline assessment   | **Blank** — the whole model, no user data | At build time  | `A1` on every sheet, the print footer, the document properties, and `00_README` |

The XLSX row is worth reading twice: it contains **no assessment data**, so it is not an export of
anything. It is downloaded, not generated on demand, from three links — Import & Export, the landing
page and the Guide — all pointing at one static file under the deployment base path.

### The draft-mode flag

Every notice above, in the app and in all five artifacts, derives from a single build variable.
Setting `VITE_DRAFT_MODE=false` removes all of them in one change (Decision 13); the procedure and
what exactly disappears are documented in `.github/workflows/deploy.yml`, where the line sits
commented out ready to enable.

Three properties make it safe to rely on:

- **Default-on.** Only the literal string `'false'` disables it, so a typo, an empty value or a
  forgotten variable all fail toward _showing_ the notice.
- **One copy of the wording.** `src/constants/draftNotice.ts` holds the CMS-supplied text and is
  deliberately free of `import.meta`, so build-time tooling can import the same strings. Browser
  code reads `IS_DRAFT` from `src/constants/index.ts` (`import.meta.env`); the workbook generator
  reads `isDraft()` from `scripts/xlsx/env.ts` (`process.env`). Both are set by the same `env:`
  block in the deploy workflow, so the app and the workbook cannot disagree.
- **Build-time, not runtime.** Because the value resolves during the build, disabling it
  tree-shakes the banner and its copy out of the bundle rather than merely hiding them.

The static `<title>` and `<meta name="description">` in `index.html` are marked by a Vite transform
rather than hardcoded, for the same reason — hardcoding would survive go-live. Those two are what a
crawler and a link unfurler read, which the runtime title suffix never reaches.

---

## Offline Excel Workbook

An `.xlsx` equivalent of the whole assessment, for states that cannot use a browser-based tool.
Generated from the same two data files the app reads, so the workbook and the app are built from one
model. Whether they always _compute_ identically is a narrower claim — see "Scoring parity, and its
limits" below.

### Where it lives

| Path                                  | Role                                                             |
| ------------------------------------- | ---------------------------------------------------------------- |
| `scripts/generate-xlsx-workbook.ts`   | Entry point. `npm run generate:workbook`                         |
| `scripts/xlsx/model.ts`               | Reads `capabilities.json` / `orbit-model.json`                   |
| `scripts/xlsx/rows.ts`                | Row builders for the reference and input sheets                  |
| `scripts/xlsx/profile-rows.ts`        | Row builders for the four calculated sheets                      |
| `scripts/xlsx/scoring-spec.ts`        | The scoring rules, as JS functions **and** as Excel formula text |
| `scripts/xlsx/workbook.ts`            | Sheet assembly, styling, protection, 508 treatment               |
| `scripts/verify-workbook-in-excel.ts` | Arithmetic verification by driving Excel (macOS + Excel only)    |

**A build-time Node script, not application code.** It runs directly under Node — which is why
the project has a Node 22.18 floor, for native TypeScript type stripping — and `exceljs` is a
devDependency. Nothing here reaches the browser bundle.

### Sheets

| Sheet                         | Rows  | Contents                                                    |
| ----------------------------- | ----- | ----------------------------------------------------------- |
| `00_README`                   | —     | Guidance, scoring rules, known differences from the tool    |
| `01_Maturity_Levels`          | 6     | Level definitions                                           |
| `02_Capability_Reference`     | 72    | Every capability area                                       |
| `03_ORBIT_Criteria_Reference` | 205   | Maturity criteria per aspect and level                      |
| `04_Assessment_Input`         | 1,625 | One row per assessable aspect. **State enters levels here** |
| `05_Organizational_Input`     | 15    | Enterprise Governance aspects                               |
| `06_Maturity_Profile`         | 216   | Per area and dimension: score, count, text roll-ups         |
| `07_Area_Scores`              | 72    | Per capability area, with completion %                      |
| `08_Domain_Scores`            | 15    | 14 domains plus an overall row                              |
| `09_Dimension_Scores`         | 3     | Enterprise-wide ORBIT figure                                |

### Scoring parity, and its limits

The Excel formulas mirror `calculateDimensionScore` and the roll-ups above it, including the four
rounding points that are deliberately not the same (see **Scoring Logic**). `scoring-spec.ts`
expresses each rule twice — as a JS function tested against the app's canonical scorer, and as the
generated formula string — so the rule and the formula cannot drift independently.

Two accepted divergences, both documented on `00_README`:

- **Finalized status is unrepresentable.** The app counts only finalized areas toward domain and
  aggregate figures. The workbook has no status concept, so it counts anything entered. The closest
  available analogue is applied: an area scores blank until at least one level is entered for it.
- **Excel rounds halfway values differently.** `Math.round(x * 10) / 10` and Excel's `ROUND`
  disagree on decimal halfway values, measured and confirmed. The app is authoritative; the gap is
  always 0.1 and is reachable only in the Enterprise Governance score and a capability area with
  only two dimensions assessed.

### Minimum Excel version: 2007

Every emitted function — `AVERAGE`, `AVERAGEIFS`, `COUNT`, `COUNTIFS`, `IF`, `IFERROR`, `MID`,
`ROUND`, `SUM` — is available in Excel 2007. No add-ins, no macros, no array formulas.

**This is enforced, not asserted.** `workbook.raw.test.ts` scans every `<f>` element in the archive
and fails on any function name outside an allowlist of pre-2007 functions. Adding a newer function
therefore fails the build rather than a state's copy of Excel.

The three text roll-up columns on `06_Maturity_Profile` originally used `TEXTJOIN`, which requires
Excel 2019 or later and does not exist in Excel 2016. They now concatenate explicitly —
`MID(IF(a="","", " | "&a) & … , 4, 32767)` — which is verbose in the formula bar and identical in
the result. Two hazards travel with any post-2007 function and the allowlist covers both: it must be
_stored_ with an `_xlfn.` prefix that ExcelJS does not add, and it must exist in the reader's Excel.

**CSV Maturity Profile Format (standard capability area):**

```csv
MITA 4.0 Maturity Profile: <state name>,,,
,,,
Capability Domain: <Domain Name>,,,
ORBIT,As Is,To Be,Notes:
Business Architecture,<level>,<target>,<notes>
Information,<level>,<target>,<notes>
Technology,<level>,<target>,<notes>
```

For organizational assessments (Outcomes, Roles, Enterprise Architecture), each aspect appears as its own row under an `Aspect` header instead of a dimension row.

---

## Import/Export Data Format

```json
{
  "exportVersion": "1.0",
  "exportDate": "2026-01-24T12:00:00Z",
  "appVersion": "0.1.0",
  "data": {
    "assessments": [],
    "ratings": [],
    "history": [],
    "tags": [],
    "attachments": []
  },
  "metadata": {
    "totalAssessments": 5,
    "totalAttachments": 12,
    "capabilities": ["provider-management/provider-enrollment", ...]
  }
}
```

**ZIP Structure:**

```
export-2026-01-24.zip
├── data.json
├── report.pdf
├── attachments/
│   └── <domain>/<area>/<dimension>/<aspect>/
│       └── filename.pdf
└── manifest.json
```

---

## Key Terminology

| Term                  | Definition                                                                                                                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Capability Domain** | High-level capability grouping (e.g., "Provider Management")                                                                                                                                            |
| **Capability Area**   | Specific capability being assessed (e.g., "Provider Enrollment")                                                                                                                                        |
| **Dimension**         | Standard ORBIT assessment category (Business Architecture, Information, Technology). Outcomes, Roles, and Enterprise Architecture are organizational assessments rather than per-capability dimensions. |
| **Sub-Dimension**     | Only applies to Technology (e.g., "Infrastructure", "Integration")                                                                                                                                      |
| **Aspect**            | Individual assessment criteria within a dimension (e.g., "Data Governance")                                                                                                                             |
| **Maturity Level**    | Rating from 1 (Initial) to 5 (Optimized), or N/A                                                                                                                                                        |

---

## References

- [Source documents archived by date](docs/source-documents/)
- [Capability Reference Model snapshot](docs/reference/MITA_4.0_Capability_Reference_Model.md)
- [Maturity Model List Format snapshot](docs/reference/MITA_4.0_Maturity_Model_List_Format.md)
- [Historic spec records](docs/decisions/)
