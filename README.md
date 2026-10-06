# MITA 4.0 State Self-Assessment Tool

A Progressive Web App (PWA) enabling State Medicaid Agencies (SMAs) to self-assess their Medicaid Enterprise maturity using the **MITA 4.0 Maturity Model**.

## Overview

The MITA 4.0 State Self-Assessment Tool helps State Medicaid Agencies evaluate their Medicaid Enterprise Systems (MES) maturity across **72 capability areas** using the standardized **ORBIT Maturity Model**. The tool is:

- **Privacy-First**: All data stays in your browser. No data is transmitted or stored remotely.
- **Offline-capable**: A service worker caches the app on first visit, so it loads and runs with no
  network afterwards — including the offline Excel workbook, which is precached too. Updates are
  offered by prompt rather than applied silently, so a pilot user is never moved to a new build
  mid-assessment.
- **Accessible**: Built and tested against WCAG 2.1 AA. No known open AA failure, and no
  assistive-technology testing to confirm it — see [Accessibility](#accessibility) for what that
  means and what it does not.

### What is ORBIT?

ORBIT is the MITA 4.0 maturity assessment framework. Each business capability area is assessed against three required dimensions:

| Dimension                 | Aspects                      |
| ------------------------- | ---------------------------- |
| **B**usiness Architecture | 5                            |
| **I**nformation           | 10                           |
| **T**echnology            | 11 (across 2 sub-dimensions) |

The combined **Enterprise Governance** capability area (Enterprise Architecture domain, Strategic layer) evaluates enterprise-level maturity once per organization across three sections:

| Organizational Section                 | Aspects |
| -------------------------------------- | ------- |
| Organizational Outcomes                | 6       |
| Organizational Roles                   | 5       |
| Organizational Enterprise Architecture | 4       |

> Outcomes and Roles ("O" and "R" in the original ORBIT acronym) describe organizational maturity rather than per-capability maturity, so they are assessed once in the combined Enterprise Governance assessment rather than per capability area.

Each aspect is rated on a 5-level maturity scale:

- **Level 1**: Initial
- **Level 2**: Developing
- **Level 3**: Defined
- **Level 4**: Managed
- **Level 5**: Optimized
- **N/A**: Not Applicable

## Features

### Dashboard

- Hierarchical view of all 14 capability domains and 72 areas grouped by layer (Strategic, Core, Support)
- Progress tracking with visual indicators
- Tag-based organization and filtering
- Assessment history with snapshots

### Assessment Workflow

- Guided assessment through all ORBIT dimensions
- Question checklists and evidence tracking per maturity level
- File attachment support (PDF, DOC, XLS, images)
- Auto-save with debounced updates
- Notes, barriers, and advancement plans per aspect

### Results & Reporting

- Overall maturity scores and visualizations
- Domain and capability area breakdowns
- Strengths and gaps analysis
- Radar charts and comparison views

### Import/Export

- **PDF**: Professional reports for stakeholders
- **CSV**: CMS Maturity Profile standard format
- **JSON**: Full data backup and restore
- **ZIP**: Complete package with attachments

## Quick Start

### Prerequisites

- **Node.js 22.18 or newer** — enforced in `engines`, and pinned in `.nvmrc`. The offline workbook
  generator is a TypeScript file Node runs directly, which needs native type stripping; on an older
  Node it fails with an unknown-file-extension error while `npm test` still passes, so a too-old
  Node fails in a confusing place
- npm 9+

### Installation

```bash
# Clone the repository
git clone https://github.com/Enterprise-CMCS/mita-ssa-tool.git
cd mita-ssa-tool

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production

```bash
# Build
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
mita-4.0/
├── src/
│   ├── components/       # React components by feature
│   │   ├── assessment/   # ORBIT assessment UI
│   │   ├── dashboard/    # Dashboard components
│   │   ├── export/       # Import/export dialogs
│   │   ├── layout/       # Header, footer, navigation
│   │   └── results/      # Results visualization
│   ├── data/             # Static JSON data files
│   │   ├── capabilities.json   # 75 capability areas
│   │   └── orbit-model.json    # ORBIT maturity criteria
│   ├── hooks/            # Custom React hooks
│   ├── pages/            # Route page components
│   ├── services/         # Business logic & utilities
│   │   └── export/       # Export handlers
│   ├── types/            # TypeScript interfaces
│   ├── theme/            # MUI theme customization
│   └── utils/            # Utility functions
├── docs/                 # MITA 4.0 reference documents
└── public/               # Static assets
```

## Tech Stack

| Layer      | Technology                      |
| ---------- | ------------------------------- |
| Build      | Vite 6                          |
| Framework  | React 18                        |
| Language   | TypeScript (strict mode)        |
| Routing    | React Router v7                 |
| UI         | Material UI v6                  |
| State      | React Hooks + Dexie React Hooks |
| Storage    | Dexie.js (IndexedDB)            |
| PDF Export | jsPDF + jsPDF-AutoTable         |
| ZIP Export | JSZip                           |
| Charts     | Chart.js + react-chartjs-2      |
| Testing    | Vitest + React Testing Library  |

## Available Scripts

```bash
# Development
npm run dev          # Start dev server
npm run build        # Production build
npm run preview      # Preview production build

# Code Quality
npm run lint         # ESLint check
npm run lint:fix     # ESLint auto-fix
npm run format       # Prettier format
npm run format:check # Prettier check
npm run typecheck    # TypeScript type check
npm run audit:code   # Detect unused code (knip)

# Testing
npm test             # Run tests once
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report

# Offline workbook (see "Offline Excel Workbook" below)
# Generated automatically by `npm run build` and `npm run dev`; these are for running it alone.
npm run generate:workbook         # Generate public/mita-4.0-self-assessment-workbook.xlsx
npm run verify:workbook-artifact  # Check the workbook that shipped into dist/
npm run verify:workbook-excel     # Verify its formulas by driving Excel (macOS + Excel only)
```

## Offline Excel Workbook

States that cannot use a browser-based tool can complete the same assessment in an Excel
workbook generated from the same `capabilities.json` and `orbit-model.json` the app uses, so both
artifacts are built from one model. Whether they always _compute_ identically is a narrower claim —
the workbook's scoring is a second implementation in Excel formulas, and no test here can evaluate a
formula. See "Verifying it" below.

The workbook has ten sheets: a README, three reference sheets, two input sheets covering all
14 capability domains, 72 capability areas and 41 maturity aspects, and four calculated sheets
that compute dimension, capability area, domain and enterprise-wide scores with Excel formulas
mirroring the app's own scoring rules. It is built for Section 508 conformance — no merged
cells, one header row per table, no blank rows, no images, and editable columns labelled in
text rather than signalled by fill colour alone.

It is generated at build time by a Node script under `scripts/`, so it adds nothing to the
browser bundle, and it is gitignored as a build output. `npm run build` and `npm run dev` both
generate it automatically, so a fresh clone needs no extra step — just `npm install` and either
command.

Users reach it from three places in the app: the Import & Export page, the home page, and the
Guide. All three link to the same static file under the deployment base path.

> Use `npm run dev`, not a bare `vite`. Generation is wired to the `predev` script, so invoking
> Vite directly starts a server with no workbook and the three download links 404. The same is
> true if the file is deleted while a dev server is already running — regenerate with
> `npm run generate:workbook`.

### Verifying it

`npm test` covers the generator's output as data and as raw OOXML, but no test can evaluate an
Excel formula. `npm run verify:workbook-excel` closes that gap by driving Microsoft Excel over
AppleScript: it copies the workbook, enters maturity levels and notes, reads the calculated
cells back, and compares them against the app's scoring rules. It needs macOS and a licensed
Excel, so it is a manual gate before shipping a workbook change rather than part of CI.

`npm run verify:workbook-artifact` checks a third thing: the copy that actually ships. The test
suite builds a workbook in memory and never reads a file, and the Excel gate reads the `public/`
copy, so neither would notice a build that failed to put the workbook into `dist/` — which is
what the in-app download links serve. Both CI and the deploy workflow run it after the build.

`node scripts/xlsx/prove-assertions.ts` is a mutation harness that breaks the generator in
turn and confirms the relevant test fails, so the accessibility and scoring assertions are
known to be capable of failing. It rewrites source files in place and restores them, so run it
on a clean tree.

## Data Architecture

The application uses two primary JSON files that can be edited to update capabilities or ORBIT criteria:

### Capability Reference Model (`capabilities.json`)

Defines **what** can be assessed:

- 14 capability domains across 3 layers (Strategic, Core, Support)
- 72 capability areas with descriptions and topics (strictly Domain → Area, no category tier)
- 11 "Information Management" areas flagged for in-app assessment guidance
- Sourced from the BA working group capability model (July 2026, slides 4–6)
- No maturity questions—just metadata

### ORBIT Model (`orbit-model.json`)

Defines **how** assessments are conducted:

- 3 standard dimensions (B, I, T) with 26 total aspects applied to every capability area
- 3 organizational assessments (Outcomes, Roles, Enterprise Architecture) with 15 total aspects assessed once per organization
- Standardized maturity criteria with descriptions and "Suggested Documentation" per maturity level
- Sourced verbatim from the May 3, 2026 PRA submission

### Local Storage (IndexedDB)

All user data is stored locally:

- Capability assessments (one per area)
- ORBIT ratings (one per aspect per assessment)
- File attachments (stored as Blobs)
- Assessment history (snapshots)
- Tags for organization

## Accessibility

**The honest statement: no known open AA failure, and no assistive-technology testing to confirm
it.** That is deliberately narrower than "WCAG 2.1 AA compliant", which earlier versions of this
README claimed. The two are not the same thing, and the difference is the point of this section.

The target is **WCAG 2.1 Level AA**. That is a superset of the WCAG 2.0 Level AA that the
[Revised Section 508 Standards incorporate by reference](https://www.section508.gov/develop/applicability-conformance/),
which they apply to non-web electronic content as well as web — so the offline Excel workbook is in
scope too, not just the app.

What has been done:

- **axe-core 4.11.1 in real Chromium**, driven by Playwright over 12 routes and 9 interaction
  states, with IndexedDB seeded so data-dependent pages actually render. Zero violations under
  `wcag2a`, `wcag2aa`, `wcag21a` and `wcag21aa`. The sweep also runs `best-practice`, where one
  finding is open: `/results` renders no heading at all in its empty state (OBS-36). That rule is
  not WCAG-tagged, so it is not an AA failure, but it is the state a new user sees first.
- **Manual keyboard-only testing**, focus-indicator measurement and dialog focus-trap checks. This
  found the most serious defect in the project's history — WCAG 2.4.7 Focus Visible was failing
  across essentially the whole application, and axe never reported it.
- **Contrast pinned by unit tests that compute WCAG ratios in JS**, because axe cannot evaluate
  contrast under jsdom: it samples rendered pixels and needs a canvas.
- For the workbook, the Section 508 structural requirements are **assertions in the test suite**
  (there is no axe for XLSX), each one proved capable of failing by a mutation harness, plus
  Excel's own Accessibility Checker reporting no issues in any category.

What has **not** been done, and matters most:

- **No screen reader has been used**, on the app or the workbook. Every screen-reader claim is
  inferred from the accessibility tree, not heard. Automated tooling cannot close this gap.
- Automated rules cover a minority of WCAG, so a clean axe run is a floor, not a pass.
- **axe's `experimental` rules are not in the tag set, and two Level A criteria have had real
  failures behind that.** `label-content-name-mismatch` (2.5.3 Label in Name) and `p-as-heading`
  (1.3.1) are both tagged `experimental`, which excludes them from a tag-filtered run. The 2.5.3
  failures were found and fixed (OBS-41); nine `p-as-heading` nodes across three routes are open
  (OBS-45). Assume other gaps of the same shape.
- Chromium only. No Firefox or Safari pass, and `:focus-visible` heuristics differ between engines.
- Zoom and reflow (1.4.10), text spacing (1.4.12) and viewports below 768px are untested. At 375px
  wide the app chrome leaves only ~287px of content (OBS-46).
- The workbook has been opened only in Excel 16 on macOS — never on Windows, which is where the
  screen readers a federal reviewer is most likely to use (JAWS, NVDA) actually run.

**No Accessibility Conformance Report (ACR/VPAT) is published for this tool**, deliberately: an ACR
asserts per-criterion conformance, and the gaps above mean several criteria could only honestly be
marked "Not Evaluated". The full record — method, every finding and its disposition, and nine
numbered limitations — is the **Wave 4 Accessibility Audit Record** in
[docs/decisions/PILOT_CLEARANCE_PLAN.md](docs/decisions/PILOT_CLEARANCE_PLAN.md), and open
accessibility items are tracked as `OBS-*` entries in
[docs/CODEBASE_OBSERVATIONS.md](docs/CODEBASE_OBSERVATIONS.md).

## Browser Support

- Chrome 90+
- Firefox 90+
- Safari 15+
- Edge 90+

IndexedDB is required — it is where assessments are stored, so the tool cannot run without it.
Service Worker support is what makes the app load without a network; where it is unavailable or
blocked by policy, everything still works while online and saving is unaffected.

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`npm test`)
5. Run linting (`npm run lint`)
6. Commit with conventional commits (`git commit -m 'feat: add amazing feature'`)
7. Push to your branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

## Documentation

- [PROJECT_FOUNDATION_v2.md](PROJECT_FOUNDATION_v2.md) - Architecture and design decisions
- [CHANGELOG.md](CHANGELOG.md) - Version history
- [docs/source-documents/](docs/source-documents/) - Source MITA documents archived by date
- [docs/reference/](docs/reference/) - Reference snapshots of the capability model and maturity criteria
- [docs/decisions/](docs/decisions/) - Historic spec/decision records

## License

This project is licensed under the GPLv3 (GNU General Public License Version 3) License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- MITA Governance Board
- MITA 4.0 Workgroup
- Centers for Medicare & Medicaid Services (CMS)
