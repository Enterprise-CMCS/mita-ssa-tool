# Codebase Observations

**Audited:** September 9, 2026
**Against:** `feature/capability-model-v4` @ `33e7963` (v4.0.0), 6 commits ahead of `origin/main`
**Baseline at audit time:** 514 tests / 28 files passing, `typecheck` clean, `lint` clean, `knip` reports no unused exports

A running backlog of things noticed while reading the codebase. Nothing here is a
committed decision — it is raw material for prioritization. Each item has an ID so it
can be referenced in conversation ("let's do OBS-3").

Every item is marked **Confirmed** (verified by reading the cited code, running it, or
reproducing in a browser) or **Inferred** (reasoned from surrounding code but not
directly exercised). Cited line numbers are from the commit above and will drift.

---

## Orientation

Kept here so this document is useful on its own.

**The data files are the product.** Almost no domain content is hardcoded:

| File                         | Contents                                                                                                                                                   |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/data/capabilities.json` | 14 domains / 72 areas; strategic 3, core 7, support 4. Strictly Domain → Area (no category tier)                                                           |
| `src/data/orbit-model.json`  | 41 aspects: 26 standard (BA 5, Information 10, Technology 11 across 2 sub-dimensions) + 15 organizational (Outcomes 6, Roles 5, Enterprise Architecture 4) |

**Three special cases fork through every layer.** These are where change costs
concentrate, because detection is centralized but rendering is not:

1. **Organizational assessment** — the single `enterprise-governance` area hosts all 15
   organizational aspects as three sections. Sections are stored in
   `orbitRatings.dimensionId`, hence `RatingDimensionId = OrbitDimensionId | OrganizationalAssessmentId`.
   Detected via `isOrganizationalAssessmentArea` / `getOrganizationalSections`
   (`src/constants/index.ts`); rendered by separate branches in `AssessmentSidebar`,
   `ResultsMasterDetail`, `AreaResults`, `csvExport`, `pdfExport`, and `importService`.
2. **Aggregate dimensions** — `data-management` aggregates Information, `technical`
   aggregates Technology, computed from finalized _non_-enterprise assessments to avoid
   circularity. Mapped in `DOMAIN_AGGREGATE_DIMENSIONS`.
3. **`informationManagement: true`** — a pure data flag on 11 areas driving a warning
   banner. The cleanest of the three; a good model for future flags.

**Persistence:** Dexie/IndexedDB, schema v4. Versions 2, 3, and 4 are all clean-break
migrations that clear all five tables. Model restructures have precedent for doing this
rather than migrating.

**Ownership:** `src/pages/Assessment.tsx` is a single smart container owning all state
and every DB write; the nine components in `src/components/assessment/` are controlled
and callback-only. Reads use `useLiveQuery`, so writes re-render automatically.
Debounced text saves (500ms) live in the leaf `AspectCard`, not the page.

---

## Correctness

### OBS-1 — Organizational Enterprise Architecture aspects render as raw IDs

**Confirmed** (reproduced in the deployed app).

Both dimension tables branch on only two of the three organizational sections:

- `src/components/results/DimensionScoresTableWithTarget.tsx:118`
- `src/components/results/DimensionScoresTable.tsx:89`

```ts
if (rating.dimensionId === 'outcomes' || rating.dimensionId === 'roles') {
```

`'enterprise-architecture'` falls through to `getAspect('enterprise-architecture' as OrbitDimensionId, ...)`,
which resolves `orbitModel.dimensions['enterprise-architecture']` → `undefined` and
returns `undefined`. The name then falls back to `rating.aspectId`.

Reproduced: expanding the Organizational Enterprise Architecture section in Results
shows `enterprise-architecture`, `strategic-planning`, `business-capability`,
`policy-management` where Outcomes and Roles correctly show "Use of Metrics",
"Capability", etc.

This affects the live UI (`ResultsMasterDetail`), not just the legacy route. It is a
missed spot from the v4 consolidation — when the third section was added, these two
call sites were not updated. Fix should use `getOrganizationalAssessmentTypes()` or the
`ORGANIZATIONAL_SECTIONS` constant instead of a hand-written literal union, so a fourth
section cannot reintroduce it.

**Resolved in Wave 1.** Both call sites now go through `isOrganizationalDimensionId`,
a type guard derived from `ORGANIZATIONAL_SECTIONS`, so the false branch narrows to
`OrbitDimensionId` with no cast and a fourth section cannot reintroduce the bug. A
regression test covers all three sections, `enterprise-architecture` included.

### OBS-2 — PDF export mislabels unassessed aspects as "N/A"

**Confirmed** by reading both branches.

`src/services/export/pdfExport.ts` disagrees with itself on the N/A sentinel:

- `generateDimensionDetails` treats `currentLevel === 0` as N/A ("Not applicable to this capability area")
- `generateOrganizationalDetails` treats `currentLevel === -1` as N/A ("Not applicable")

Project convention is `-1` = N/A, `0` = not assessed. So in the standard B-I-T path an
_unassessed_ aspect is reported to stakeholders as "not applicable", and a genuinely
N/A aspect (`-1`) falls through to "Not Rated". The organizational path is correct.

Since PDFs are the stakeholder- and CMS-facing artifact, this one misreports.

**Resolved.** The branch condition was corrected in Wave 2, pulled forward because the
OBS-6 fix makes notes-only rows (level 0) a common case rather than a corner one. The
export-boundary tests landed in Wave 5 and are confirmed in a generated PDF: an
unassessed aspect prints "Not Rated", and only a genuine `-1` prints "N/A / Not
applicable to this capability area".

### OBS-3 — Aggregate dimensions are absent from the PDF

**Inferred** from the code path; not reproduced.

`generateCapabilityAreaSection` groups _actual ratings_ by dimension. Aggregate
dimensions have no ratings by design, so for enterprise-domain areas the aggregated
dimension is silently omitted from the report. A Data Management area's PDF shows
Business Architecture and Technology but no Information row at all.

CSV handles this (`(Aggregate from N assessments)` note in `exportService.ts`) and the
results UI handles it (`Aggregate (N areas)` chip). PDF is the gap.

**Resolved in Wave 5**, and confirmed by reading a generated PDF rather than by test
alone: a Data Management area's report now carries `Information (Avg: 3.0)` followed by
`(Aggregate from 1 assessment). This dimension is computed from finalized assessments in
other domains rather than assessed directly in this area.`

Two details worth keeping:

- The new block reads `ExportData.enterpriseAggregates`, which `collectExportData`
  already populated — nothing new had to be computed, the data was being carried and
  discarded.
- It fires only when the aggregated dimension has **no** ratings of its own. Without that
  guard an enterprise area holding stray Information ratings would print the dimension
  twice with two different scores. A test covers it.

The "Inferred" status above is now moot — the omission was reproduced in a real export
before being fixed.

### OBS-4 — ZIP import skips the export-version check

**Confirmed** by reading both entry points.

`importFromJson` gates on `SUPPORTED_VERSIONS` (`src/services/export/importService.ts`).
`importFromZip` validates structure but never checks `exportVersion`, so an unsupported
version is rejected as `.json` and accepted as `.zip`.

Also note `SUPPORTED_VERSIONS = ['1.0', '2.0']` while exports only ever emit `'1.0'` —
`'2.0'` is accepted but never produced.

### OBS-5 — Stored enterprise-domain scores go stale

**Confirmed** as a design consequence; the specific drift I first saw in a browser was
contaminated by my own seed data, so treat the magnitude as unverified.

At finalize time, `useCapabilityAssessments.finalizeAssessment` correctly folds the
aggregate into the overall score (`dimensionScores.set(aggregatedDimension, aggregateScore)`).
But `overallScore` is then _stored_, while the results table recomputes the aggregate
live from current data. Finalizing more non-enterprise assessments afterward changes the
aggregate and leaves the stored score behind — so the header score and the dimension
table can disagree for the same area.

May be acceptable (a finalized assessment is a point-in-time record). Worth a deliberate
decision either way, since it is the kind of inconsistency a reviewer will notice.
Options: recompute on read, or surface the snapshot date next to the score.

---

## Data-loss risks

### OBS-6 — Notes, barriers, and plans are dropped if no level is selected

**Confirmed** by reading the three functions.

`updateNotes`, `updateBarriers`, and `updatePlans` in `src/hooks/useOrbitRatings.ts` all
follow `if (existing) { update }` with **no else branch** — unlike `updateLevel` and
`updateTargetLevel`, which create the rating when missing.

So a user who expands an aspect and types into Notes _before_ choosing a maturity level
loses that text. Worse, the save indicator still flashes "Saved" (see OBS-7), so there
is no feedback. This is plausible real-world behavior — reading the criteria, jotting a
note, then deciding the level.

These three also skip the `capabilityAssessments.updatedAt` bump that every other write
performs, so text-only edits do not move the assessment in the dashboard's
recently-updated ordering.

**Resolved in Wave 2**, both halves: the three functions create the rating when one is
missing, and they bump `updatedAt`. Verified end to end in a real browser rather than only
in tests, because it is a data-loss fix shipping into a pilot — notes typed with no level
selected persist at `currentLevel: 0`, survive a reload, and are not clobbered when a level
is later chosen. Sidebar progress correctly stays at 0% for a notes-only row.

### OBS-7 — The save indicator is not wired to actual saves

**Confirmed** by reading `triggerSave` in `src/pages/Assessment.tsx`.

```ts
setSaveStatus('saving');
setTimeout(() => { setSaveStatus('saved'); ... }, 300);
```

It reports success on a timer, never observing the promise. Failed writes still display
"Saved". `AssessmentContextBar` already implements an `'error'` state that nothing can
trigger. In a tool whose entire value proposition is local persistence, a save indicator
that cannot report failure is worth fixing — awaiting the handler's promise and
surfacing rejection would use the existing UI.

**Resolved in Wave 2.** `triggerSave` awaits the handler and routes rejection to the
`'error'` state that already existed, so the indicator now reports the real outcome. It is
also a polite live region rather than a silent one. A test covers the rejected-save path.

### OBS-8 — Import runs untransacted

**Confirmed** by grep: `db.transaction` appears only in `src/services/tags.ts` and
`src/services/db.ts`, not in `importService.ts`.

The whole import is sequential un-transacted writes across five tables, including a
destructive path (delete existing ratings, then insert imported ones) in the
"imported is newer" branch. A mid-run failure leaves partial state with no rollback.
This diverges from the project's own multi-table transaction guidance in the
development standards.

### OBS-9 — Attachment import failures are silent

**Confirmed**: the per-file loop in `importFromZip` ends in `} catch { }` with a comment
calling attachment loss non-critical. Attachments are user-supplied evidence documents;
losing them without a single line in the import summary seems inconsistent with that
summary's otherwise detailed per-item reporting.

Related: the rating-matching logic there compares `dimensionId` and `aspectId` but
ignores `subDimensionId`. **Inferred** — aspect IDs currently appear globally unique, so
this is latent rather than active.

---

## Structural debt

### OBS-10 — `DimensionScoresTable` and `DimensionScoresTableWithTarget` are near-duplicates

**Confirmed** by grep.

~80% duplicated: `AspectDetailRow`, `DimensionRow`, `TechnologyDimensionRows`,
`getLevelDisplay`, `getLevelDescription`, `getShortLevelDisplay` exist in both. OBS-1 is
exactly the kind of bug this shape produces — one fix, two places, and it was applied to
neither.

Consumers, each exactly one:

| Component                        | Rendered by                   | Reachable?                      |
| -------------------------------- | ----------------------------- | ------------------------------- |
| `DimensionScoresTableWithTarget` | `ResultsMasterDetail.tsx:599` | Yes — this is the live UI       |
| `DimensionScoresTable`           | `AreaResults.tsx:485`         | Only by direct URL (see OBS-11) |

### OBS-11 — Orphaned results routes and one genuinely dead component

**Confirmed** by grep.

`ResultsMasterDetail` replaced the drill-down but the old routes remain in `App.tsx`:

- `/results/:domainId` → `DomainResults.tsx`
- `/results/:domainId/:areaId` → `AreaResults.tsx`

Nothing in the live UI navigates into them; they only link to each other. Reachable by
bookmark or direct URL, where they render duplicated (and now divergent) content.

`DomainScoresList.tsx` is the one component that entered that pair from outside, and it
is dead: rendered nowhere, absent from the results barrel (`index.ts` exports only
`DimensionScoresTable` and `ResultsMasterDetail`), referenced solely by its own test.
Knip does not flag it because the test import counts as usage.

`AreaResults` does still hold one thing the master-detail lacks: the score-trend line
chart and history table. Removing the routes means porting or dropping that.

### OBS-12 — Assessment navigation is local state only

**Confirmed** by reading `src/pages/Assessment.tsx`.

`currentNavIndex` is `useState`, and `searchParams` is destructured without its setter,
so nothing writes to the URL. Consequences: no deep-linking to a dimension or aspect,
refresh always returns to the first nav item, and browser back/forward does not move
between dimensions. Only `?view=true` is read.

Not a bug, but a hard constraint on anything that wants shareable or resumable
positions. Flagging because "send me a link to this dimension" is a natural request.

### OBS-13 — Two independent completion denominators

**Confirmed** by reading both.

| Where                                             | Denominator                                                                   |
| ------------------------------------------------- | ----------------------------------------------------------------------------- |
| Assessment page (sidebar header, finalize dialog) | `navItems.reduce((sum, nav) => sum + nav.aspectCount, 0)`                     |
| Dashboard and results                             | `getAssessableAspectCountForArea(areaId, domainId)` (`src/services/orbit.ts`) |

They currently agree (26 / 15 / 26-minus-aggregated) but are computed by unrelated code
from different inputs. Any change to the nav model must update both or they diverge
silently. A single shared source would remove the coupling.

Related, same area: the numerator `getAssessedCount()` counts assessed ratings across
the **whole assessment, unfiltered by dimension**, so a stray rating on an aggregated
dimension (possible via imported or legacy data) can push displayed progress above 100%.
**Inferred** — not reproduced.

### OBS-14 — Overloaded parameter in the sidebar selection callback

**Confirmed** by reading the call sites.

In organizational mode, `onDimensionSelect(dimensionId, subDimensionId?)` is called with
an **aspectId** cast to `OrbitDimensionId`, and `handleDimensionSelect` branches on
`isOrganizationalAssessment` to reinterpret it. The same pattern forces casts at
`currentDimensionId={currentNav.dimensionId ?? (currentNav.aspectId as OrbitDimensionId)}`
and `dimensionId={currentNav.dimensionId ?? (currentNav.organizationalType as OrbitDimensionId)}`.

This is the main source of type-casting debt in the assessment flow. A discriminated
union for the selection payload would let TypeScript check what is currently
cast-and-hope. Relevant if navigation gets touched.

### OBS-15 — Full-record read-modify-write on checkbox changes

**Inferred**; not reproduced under timing.

`handleQuestionChange` and `handleEvidenceChange` call the full `saveRating`, which
rewrites `currentLevel`, `targetLevel`, `questionResponses`, `evidenceResponses`,
`notes`, `barriers`, and `plans` from the in-memory `ratingsMap` snapshot. A debounced
notes save (500ms) landing between snapshot and write would be reverted. Narrow window,
real mechanism. Patching only the changed field would close it.

### OBS-16 — Minor duplication and dead UI state

**Confirmed.**

- `type SaveStatus` is declared identically in `Assessment.tsx` and `AssessmentContextBar.tsx`.
- `isReviewSelected` is set by `handleReviewSelect` but never reset when the finalize
  dialog is dismissed. Since `AssessmentSidebar.isSelected` returns `false` for every row
  while it is true, cancelling the dialog leaves no dimension highlighted even though the
  content pane still shows one.
- `ResultsMasterDetail` hardcodes `height: 600` with internal scroll. On a tall viewport
  the nav list clips mid-domain (observed in the browser) with lots of empty page below.
  **Partially resolved — the fourth bullet only.** The three above it are still open: the
  duplicated `SaveStatus` type, `isReviewSelected` never resetting when the finalize dialog is
  dismissed, and `ResultsMasterDetail`'s hardcoded `height: 600`. Do not read this entry as
  closed.

- ~~`Dashboard.handleExportAssessment` is a `TODO: Implement export in Phase 7` stub~~ —
  **corrected during Wave 1.** It was worse and simpler than described: `ActionMenu` never
  rendered an Export item at all, so the handler was unreachable and `onExport` was dead
  prop plumbing threaded through `Dashboard` → `DomainTable` → `CapabilityRow` →
  `ActionMenu`. Not a user-visible dead end, just dead code. Removed rather than wired up.
  Worth noting that knip cannot see this class of dead code: each prop _is_ used, by being
  passed one level further down.

---

## Documentation drift

### OBS-17 — The steering file contradicts the shipped model

**Confirmed** against `src/data/*.json`.

`.kiro/steering/development-standards.md` states 16 domains, 66 areas, and describes
`isCategorizedDomain` / `CategorizedCapabilityDomain` as live type guards. All of that is
v3. Actual: 14 domains, 72 areas, category tier and those types removed in v4.

`PROJECT_FOUNDATION_v2.md` is correct. Since the steering file is injected into every
AI-assisted session, it actively feeds wrong domain facts into future work — highest
value-per-effort item in this document.

**Resolved in Wave 1.** The steering file now states 14 domains / 72 areas / 3 layers, the
`isCategorizedDomain` and `CategorizedCapabilityDomain` references are gone, the "currently
at version 1" schema claim is corrected to v4, and it notes that `UI.DEBOUNCE_MS` is not the
delay `AspectCard` actually passes. Two things it still does **not** carry, both worth adding
next time it is touched: OBS-32's guidance to pass `component` explicitly on every
`Typography`, and the `scripts/` convention once the XLSX generator lands (a Wave 8 task).

### OBS-18 — Placeholder descriptions are user-visible

**Confirmed** in the browser: the Enterprise Governance results panel renders
"[Placeholder — pending updated Capability Reference Model] Assess organizational
maturity across…".

Deliberate (Decision 6 in `CAPABILITY_MODEL_UPDATE_PLAN.md`) and awaiting NextGen's
document, so this is a tracking note rather than a defect. 13 areas carry placeholders.
Worth confirming the working group expects to see the marker during staging review.

---

## Test gaps

### OBS-19 — The most complex files are the untested ones

**Confirmed** by directory listing.

`src/components/assessment/` contains tests for only `AssessmentSidebar` and
`InformationManagementNotice`. Untested:

| File                                      | Lines | Why it matters                                                  |
| ----------------------------------------- | ----- | --------------------------------------------------------------- |
| `pages/Assessment.tsx`                    | 837   | Owns the nav model, all three special cases, and every DB write |
| `components/assessment/AspectCard.tsx`    | 302   | Owns debounced auto-save (see OBS-6)                            |
| `components/assessment/DimensionPage.tsx` | 214   | Aspect fan-out and expansion state                              |

Coverage is strong where logic is pure (hooks, services, export/import all have
substantial suites). The gap is concentrated in the stateful container layer — which is
also where OBS-6, OBS-7, OBS-12, OBS-13, and OBS-14 all live. Changes there currently
have no safety net.

---

## Suggested triage

Not a commitment, just how I would sequence it:

**Cheap and clearly worth it**

- OBS-17 — correct the steering file (minutes; prevents compounding errors)
- OBS-1 — three sections instead of two, derived from the constant (small, fixes a visible bug)
- OBS-2 — align the PDF N/A sentinel (small, fixes stakeholder-facing output)

**Worth doing before the next feature touches these areas**

- OBS-6 + OBS-7 — silent data loss plus an indicator that hides it; related fix
- OBS-8 — wrap import in a transaction
- OBS-11 — decide the fate of the orphaned routes, which unblocks OBS-10

**Needs a decision, not just a patch**

- OBS-5 — stale stored scores: recompute, or display as a snapshot?
- OBS-3 — should PDFs represent aggregate dimensions at all?
- OBS-12 / OBS-14 — only if navigation is being reworked anyway

**Opportunistic**

- OBS-19 — add container tests alongside the next change in that area rather than as a standalone effort

### OBS-20 — The vendor chunk exceeds its own warning threshold on every build

**Confirmed** by running `npm run build` (September 9, 2026).

`vite.config.ts` sets `chunkSizeWarningLimit: 520` with a comment stating the vendor
chunk is "~510KB which is acceptable for a PWA". Actual output:

| Chunk        | Size         | Gzipped    |
| ------------ | ------------ | ---------- |
| `vendor-mui` | 337 kB       | 100 kB     |
| `vendor`     | **1,418 kB** | **450 kB** |
| `index`      | 337 kB       | 81 kB      |

So the threshold is exceeded on every single build and the explanatory comment is stale.
Two costs: a warning that always fires trains people to ignore build output, and 450 kB
gzipped of vendor JavaScript is meaningful for an offline-first PWA used on state agency
networks.

The `vendor` chunk currently collects everything outside MUI — jsPDF, Chart.js, JSZip,
Dexie, React and Router. Several are only needed on specific routes (jsPDF and JSZip only
on export, Chart.js only on results), so route-level dynamic imports would cut the initial
payload substantially. `manualChunks` in `vite.config.ts` is already the place this is
controlled.

Not on the pilot-clearance critical path. Noted so the stale comment does not keep
implying the limit is respected.

### OBS-21 — Technology dimension score is computed two different ways and they disagree

**Confirmed** by reproducing the divergence numerically.

Two code paths compute the Technology dimension score, and they round at different points:

| Path                                                                                         | Behavior                                                                                           |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `services/scoring.ts` `calculateDimensionScore` — used by finalize, aggregates, and export   | sub-dimension means left **unrounded**, averaged, then rounded once                                |
| `hooks/useScores.ts` `getDimensionScoresForAssessment` — used by the results dimension table | each sub-dimension mean **rounded** via `calculateAverageScore`, then averaged, then rounded again |

Double rounding makes them differ. Worked example — Technical Infrastructure Management
rated `2,2,2,2,1,1` (mean 1.6667) and Application Management rated `1,1,1,1,1` (mean 1.0):

- `calculateDimensionScore` → mean(1.6667, 1.0) = 1.3333 → **1.3**
- `getDimensionScoresForAssessment` → mean(1.7, 1.0) = 1.35 → **1.4**

The stored `overallScore` shown in the area header derives from the first path; the
Technology row in the dimension table derives from the second. So the same assessment
displays a header score built from 1.3 while the table beside it shows 1.4.

The organizational path has the same shape: `finalizeAssessment` averages **unrounded**
section means, while the results table shows **rounded** section means, so summing what is
displayed does not always reproduce the stored score.

`calculateDimensionScore` is the canonical implementation — its own docstring says so, and
finalize, aggregate, and export all use it. `useScores` should delegate rather than
recompute. Fix by having `getDimensionScoresForAssessment` keep unrounded sub-dimension
means for the dimension roll-up while still displaying rounded values per sub-dimension.

Consequential now for two reasons: reviewers are looking at the Results screen this week,
and the XLSX workbook has to reproduce one of these two numbers — so which one is
authoritative must be settled before the formulas are written.

**Resolved in Wave 1.** `getDimensionScoresForAssessment` now delegates the dimension
roll-up to `calculateDimensionScore` while still displaying rounded per-sub-dimension
values — display rounds, scoring does not. A regression test pins the divergent case:
Infrastructure `2,2,2,2,1,1` plus Application `1,1,1,1,1` yields the same score in both
paths.

**The organizational section path was deliberately left as-is.**
`getOrganizationalScoresForAssessment` still rounds each section mean while
`finalizeAssessment` averages unrounded ones. That follows the same
display-rounds/scoring-does-not rule, and nothing recomputes an area score from the
displayed section values, so there is no contradictory pair on screen.

Worth knowing this entry undercounted: export had a **third** implementation, which is
OBS-25, and there turned out to be six sites in total. Wave 5 closed the rest.

### OBS-22 — The app is documented and advertised as an offline-first PWA, but no service worker exists

**Confirmed** by inspection: `vite.config.ts` registers only `react()`. No `VitePWA`, no
manifest, no service-worker registration in `main.tsx` or `index.html`, and no `sw.js` in
build output. `vite-plugin-pwa@^0.21.1` is a dependency but unused — and `knip.json`
explicitly silences it (`"ignoreDependencies": ["vite-plugin-pwa"]`), which is why the
clean knip run never surfaced it.

**Resolved in Wave 8** by making the claim true rather than removing it (decision P4). The record
is at the bottom of this entry, including the measurement that the claim now holds, and the
`knip.json` silencer is gone — the dependency is genuinely used, so nothing needs suppressing.

The claim is made in six places, two of them user-facing:

| Location                                        | Claim                                                                                         |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `src/pages/Landing.tsx:26-28`                   | "Works Offline — Full functionality after initial load, even without an internet connection." |
| `src/pages/About.tsx:49-51`                     | "Works offline — Full functionality after the first load, even without a connection."         |
| `README.md:3, :10, :209`                        | PWA; offline-first; "Requires IndexedDB and Service Worker support"                           |
| `PROJECT_FOUNDATION_v2.md:5, :18, :40`          | Core Principle 2 "Offline First"; tech stack lists `vite-plugin-pwa`                          |
| `.kiro/steering/development-standards.md:11-14` | "Offline-First" as a key characteristic                                                       |

Data persistence genuinely is local (IndexedDB), so a loaded tab keeps working. But a
reload without network fails — there is no cached app shell. "Offline-first" describes the
storage model, not the delivery model, and the user-facing copy promises the latter.

This matters beyond documentation accuracy: states are being recruited for the pilot now
and will be told the tool works offline. It also means a generated workbook served from
`public/` is not precached, so the offline fallback is not itself available offline.

Two paths: wire up the plugin that is already installed (small — config plus manifest plus
registration), or remove the claims. Wiring it up is preferable given the copy already
promises it, but a service worker introduces cache-invalidation behavior that can confuse
pilot users, so prefer prompt-on-update over silent auto-update.

#### How it was resolved in Wave 8

`VitePWA` is registered in `vite.config.ts` with `registerType: 'prompt'`, and
`src/components/layout/PwaUpdatePrompt.tsx` performs the registration and renders the prompt.

**Measured, not assumed.** A service worker is easy to configure and hard to confirm, so this was
verified against a real build by **stopping the server outright** — a stronger test than the
browser's offline toggle, because there is nothing to fall back to:

| Check                                           | Result                                                                |
| ----------------------------------------------- | --------------------------------------------------------------------- |
| Worker registers and activates                  | `activated`, scope `/`, 13 unique precache entries                    |
| Reload with the server stopped                  | Loads. `navigator.serviceWorker.controller` non-null                  |
| **Deep link** to `/dashboard`, server stopped   | Loads, `h1` = "Assessment Dashboard"                                  |
| That deep link came from cache, not the network | `PerformanceNavigationTiming.transferSize` **0**, `workerStart` 0.4ms |
| Offline workbook fetch                          | 200, 222,655 bytes, valid ZIP magic                                   |
| SPA navigation offline                          | Dashboard → Guide → Import/Export all render                          |
| Draft banner offline                            | Present                                                               |

**The precache gap was wider than this entry originally said.** Workbox's schema default is
`['**/*.{js,wasm,css,html}']` — verified in
`node_modules/workbox-build/build/schema/GenerateSWOptions.json`, after a first draft of this note
claimed `js,css,html,ico,png,svg`, which is a figure from a plugin README rather than the real
default. So without an explicit `globPatterns` the precache would have omitted the workbook **and
every icon, the favicon and the manifest**. All are now in the pattern and confirmed present in
`dist/sw.js`.

Two configuration choices worth knowing:

- **`navigateFallbackDenylist: [/\.xlsx$/]`.** A `download`-attribute click is a navigation request
  in some browsers, and `navigateFallback` would hand it `index.html`. Verified that precache
  routing already wins — Workbox matches routes in registration order and `precacheAndRoute`
  registers before the `NavigationRoute` — so this is belt-and-braces. Kept because the failure
  mode is an `.xlsx` that is silently HTML, which a user would report as "the workbook is corrupt".
- **`maximumFileSizeToCacheInBytes` raised to 3 MiB — which _raises_ a tripwire rather than
  creating one.** An earlier version of this note had the causality backwards. `vite-plugin-pwa`
  sets `throwMaximumFileSizeToCacheInBytes: !showMaximumFileSizeToCacheInBytesWarning`, and that
  warning flag defaults to `false`, so an oversized asset **already fails the build** at any limit
  including Workbox's 2 MiB default. Workbox itself only warns; the throw is the plugin's. The
  reason for 3 MiB is headroom — at 2 MiB a moderate dependency bump would break the build — and if
  it ever needs raising again, that is the signal to code-split instead (OBS-20).

**A kill switch is documented but not enabled.** A service worker outlives a deploy: if a build
without `sw.js` ever reaches the site, the update check 404s, the spec aborts the update, and the
installed worker serves its cached build **indefinitely with no prompt**. `cleanupOutdatedCaches`
does not help, because it only prunes when a new worker activates and none ever does. That is not
hypothetical here — `deploy.yml` auto-triggers on push to `main`, and `origin/main` predates the PWA
entirely. The recovery is `selfDestroying: true`, which emits a worker that unregisters itself and
clears its caches; it is set to `false` with the procedure written out in `vite.config.ts`, so the
fix is known before it is needed rather than discovered during an incident.

#### Four defects in the prompt itself, none of which reading the code would have found

1. **No way to dismiss it.** MUI's `Alert` renders its own close button from `onClose` **only when
   `action` is absent**. The first version passed `onClose` alongside an `action` containing the
   Reload button, which type-checked, looked right, and left the handler wired and unreachable.
2. **The message was announced twice.** MUI's `Alert` defaults to `role="alert"` — an _assertive_
   live region. Paired with a polite region carrying the same sentence, a screen reader announced it
   both politely and assertively. Found by dumping every `[role]` in the rendered DOM; the test that
   was supposed to cover this queried only `role="status"` and passed while the defect was live.
3. **Two false lifecycle claims in comments**, each of which would have justified a wrong change
   later. `updateServiceWorker(true)`'s argument is documented by the plugin as unused since 0.13.2
   — the reload comes from its `controlling` listener — and a waiting worker does **not** activate on
   the next page load, so "dismissing costs nothing" was inverted. Dismissal defers indefinitely
   until `skipWaiting` or every tab closes. Measured.
4. **`offlineReady` is returned by the hook and cannot be used.** A "ready to work offline"
   confirmation was built on it, to make the Guide's "saves itself to your browser" claim observable
   — and then removed, because **the callback never fires**. Measured three times from a fully reset
   state (zero registrations, zero caches, fresh navigation, polling the DOM from the first frame):
   the worker reached `activated` before `useRegisterSW`'s `installed` listener observed the
   transition, so `onOfflineReady` was never invoked and the notice was unreachable. Rather than ship
   a dead path that looks like a feature, the Guide's copy now promises only what is observable
   ("once you have opened this tool with a connection, it will load and run without one"). **Do not
   re-add a notice on `offlineReady` without first confirming the callback fires** — the natural
   assumption is that it does, and it does not.

The announcement shape went through three worse designs before the current one; the rejected
alternatives and why each failed are recorded in `PwaUpdatePrompt.tsx`'s docblock, because each is
the obvious thing to reach for. The short version: the notice renders **inside** an always-mounted
polite live region, so the region's contents change rather than the region appearing populated, the
text exists exactly once in the accessibility tree, and axe's `region` rule is satisfied because a
live region is exempt from it — which matters since Wave 4 deliberately stopped suppressing that
rule.

**What this does not establish.** One browser (Chromium via Playwright) on macOS. The first pass
verified at the root scope (`/`); a second pass verified at the real Pages subpath
(`/mita-ssa-tool/`), which is where relative precache URLs and a relative `start_url` would break if
they were going to. No test of a corporate proxy or a policy that blocks service worker registration
— `README.md` now states the app still works online in that case.

#### The update cycle _was_ exercised against two real builds

Initially recorded as untested. It then happened by accident — rebuilding `dist/` while a worker was
installed produced exactly the real scenario — so it is now measured rather than inferred:

| Step                                     | Observed                                                            |
| ---------------------------------------- | ------------------------------------------------------------------- |
| Rebuild with the old worker installed    | `registration.waiting` = `installed`, old worker still `controller` |
| Prompt appears                           | Live region carries the message; Reload and Close both present      |
| Page still served from the **old** build | Confirmed — new copy absent from the served HTML                    |
| Press Reload                             | New worker activates, page reloads, **new build served**            |
| After reload                             | No waiting worker, prompt gone, live region mounted and empty       |
| Route preserved across the reload        | Stayed on `/guide`                                                  |

**And it found a layout defect.** As a fixed-position toast at `bottom: 16` the prompt overlapped
both the CMS-required Paperwork Reduction Act notice (629–667px of a 720px viewport) and the footer
(667–720). Those notices are a hard requirement (Decision 15), so covering one even transiently is
not acceptable, and a hardcoded offset would be fragile — the footer is suppressed on the assessment
page and the notice rewraps with viewport width. The prompt is now a normal-flow sibling in
`Layout`'s column, immediately above the bottom notice. Verified by injecting a 68px stub into the
live region: the notice stayed at 629–667 and the footer at 667–720, both unmoved and fully visible,
because the space comes out of the scrollable `main` instead. Idle, the region is `position: static`
with **zero height** and no children, so it costs no layout on any page.

**Then it happened for real, on the deployed site, in a human's own browser.** The v4.1.1 deploy was
the first time two builds of this app existed on GitHub Pages in sequence with a worker installed
between them, and the prompt appeared and offered the reload as designed. That closes the gap this
entry had been carrying: every earlier observation was a local `dist/` rebuild driven by Playwright,
which reproduces the mechanism but not the deployment — different origin, different scope, a real
cache lifetime, and a browser nobody instrumented.

What remains genuinely unestablished: still only Chromium-family browsers on macOS, and no test
against a corporate proxy or a policy that blocks service worker registration.

### OBS-23 — Every per-level `questions` array is empty, and `questionResponses` is dead weight

**Confirmed**: across all 205 level entries (41 aspects × 5 levels) in `orbit-model.json`,
`questions` is `[]` in **205/205**. `evidence` is empty in 56/205.

This is a correct consequence of the v3 model change — the CHANGELOG records that per-level
question checklists were replaced by a single aspect-level question plus "Suggested
Documentation" as evidence, and the aspect-level question now lives in the aspect
`description` (visible in the UI as "To what extent is…"). But the schema still carries the
empty arrays, and the code still carries the machinery:

- `OrbitLevelDefinition.questions` is always empty, so `QuestionChecklist` renders only its
  evidence half, and its questions props, `getQuestionChecked`, and question accordion are
  unreachable
- `QuestionResponse` / `OrbitRating.questionResponses` are written and persisted but can
  never hold a meaningful entry, since there is no question to answer
- `handleQuestionChange` in `Assessment.tsx` is likewise unreachable
- Import/export, history snapshots, and the full-record `saveRating` all carry the field

Low urgency and harmless at runtime, but it is a trap for anyone reading the model: the
schema implies a feature that no longer exists. Relevant to the XLSX work — a criteria
sheet column for "question" would be 100% blank, which would violate the no-empty-columns
rule the workbook has to satisfy.

### OBS-24 — Expandable dimension rows are mouse-only

**Confirmed** while writing the OBS-1 regression test — the test could not find a button to
activate, because there isn't one.

`DimensionRow` in both `DimensionScoresTable.tsx` and `DimensionScoresTableWithTarget.tsx`
attaches `onClick` to the `TableRow` itself and sets `aria-expanded`, with no `tabIndex`, no
`role="button"`, and no `onKeyDown`. So the row announces itself as expandable to a screen
reader while being impossible to expand without a mouse.

That hides real content: the expanded region is where per-aspect levels, notes, barriers,
plans, and attachment links live. A keyboard or screen reader user can reach the dimension
summary and nothing beneath it.

`aria-expanded` on a non-interactive element is also invalid — the attribute is only
meaningful on something focusable and activatable.

Fix shape: move the affordance to a real `IconButton` inside the first cell (the pattern
`DomainTable` already uses for its expand control, which _is_ keyboard reachable), or give
the row `role="button"`, `tabIndex={0}`, and Enter/Space handling. The `IconButton` route is
preferable — it matches existing precedent in the codebase and avoids a row-wide click
target that interferes with text selection.

**Resolved.** It turned out to be two half-fixes in two commits:

- `DimensionScoresTableWithTarget.tsx` — the **live** table — was fixed incidentally by the
  Wave 1 OBS-1 work (`a0b53c2`), which gave the row a real `Box component="button"` with
  `aria-expanded`, `aria-controls`, an `aria-label`, and Enter/Space handling. So the
  keyboard-unreachable content described above stopped being reachable-only-by-mouse before
  Wave 4 began.
- `DimensionScoresTable.tsx` — reachable only via the orphaned `/results/:domainId/:areaId`
  route (OBS-11) — still carried bare `aria-expanded` on two `TableRow`s. axe flags that as
  `aria-conditional-attr` (serious): `aria-expanded` is valid on `treegrid` rows but not on
  `table` rows. Fixed in **Wave 4** by porting the same button pattern from its sibling.

Note this is exactly the OBS-10 duplication tax predicted: one bug, two files, fixed in two
different waves.

### OBS-25 — PDF and CSV export weight the Technology score by aspect count, not by sub-dimension

**Confirmed** by reading both call sites and reproducing the divergence. Surfaced by the
Wave 1 review of the OBS-21 fix.

There were **three** implementations of the Technology dimension score, not two. OBS-21
fixed the results table; export was not in its scope and still diverges:

| Site                                                                                     | Method                                                            | Example result |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | -------------- |
| `services/scoring.ts` `calculateDimensionScore` (canonical)                              | mean of the two sub-dimension means                               | **3.0**        |
| `hooks/useScores.ts` (fixed in OBS-21)                                                   | delegates to canonical                                            | **3.0**        |
| `services/export/exportService.ts` `generateStandardAreaProfile`                         | `calculateAverageScore` over a flat array of all 11 aspect levels | **3.2**        |
| `services/export/pdfExport.ts` `generateDimensionDetails` and `generateExecutiveSummary` | flat mean over the dimension's ratings                            | **3.2**        |

Example is Technical Infrastructure Management all at 5 and Application Management all at 1.
Canonical gives `mean(5, 1) = 3.0`; the flat mean gives `(6×5 + 5×1) / 11 = 3.18 → 3.2`.

This is a **weighting** difference, not a rounding one, so it does not shrink with more data
— it is systematically biased toward whichever sub-dimension has more aspects
(Infrastructure, 6 versus 5).

Why it matters more than the others: the CSV maturity profile is the artifact states submit
to CMS, and the PDF is the stakeholder report. Both currently report a Technology number
the tool's own UI disagrees with.

Two further wrinkles in the same code:

- **To-Be has the same flaw and no canonical scorer to delegate to.** `calculateDimensionScore`
  only reads `currentLevel`. Fixing the To-Be column needs either a level-selector parameter
  or a small generalization of the scorer.
- **`generateExecutiveSummary`'s "ORBIT Dimension Summary" is a different question again** —
  it flat-averages every rating for a dimension across all capability areas, so it is
  weighted by both aspect count and by how many areas were assessed. The defensible
  enterprise-wide figure is the mean of per-area dimension scores. That is a semantic change,
  not just a delegation.

Scheduled for **Wave 5** (export correctness) in the pilot clearance plan, which lands before
the workbook formulas in Wave 7 — so the workbook has one canonical rule to implement rather
than three candidates.

**Resolved in Wave 5. There were five sites, not three** — the count in the table above was
low twice over, which is the main thing to carry forward from this entry.

| Site                                                               | Was                                            | Now                                    |
| ------------------------------------------------------------------ | ---------------------------------------------- | -------------------------------------- |
| `exportService.generateStandardAreaProfile` (CSV, As-Is)           | flat mean over 11 aspects                      | delegates to `calculateDimensionScore` |
| `exportService.generateStandardAreaProfile` (CSV, **To-Be**)       | flat mean                                      | delegates, with `levelField`           |
| `pdfExport.generateDimensionDetails`                               | flat mean                                      | delegates                              |
| `pdfExport.generateExecutiveSummary`                               | flat mean over **all areas**                   | see the follow-on below                |
| `ResultsMasterDetail.calculateTargetDimensionScores` (**live UI**) | flat mean of `targetLevel`                     | delegates, with `levelField`           |
| `useOrbitRatings.getAverageLevelForDimension`                      | flat mean; latent, no caller passes Technology | delegates                              |

Verified in generated artifacts, not just in tests: the CSV and PDF now print 3.0 where they
printed 3.2, for a fixture of Infrastructure ×6 at 5 and Application ×5 at 1.

**The To-Be wrinkle, resolved by generalizing the scorer.** `calculateDimensionScore` gained
an optional third parameter, `levelField: 'currentLevel' | 'targetLevel'`, defaulting to
`'currentLevel'`. Chosen over having each caller remap ratings into `currentLevel`, because
remapping leaves the To-Be rule re-derived at every site — the precise failure this entry and
OBS-21 describe — and scatters the `undefined`-means-unassessed sentinel across three places
where one `?? -1` would be a silent wrong answer. The default keeps every pre-existing As-Is
caller byte-identical.

**The live UI's To-Be was a genuinely new finding**, absent from the Wave 5 pre-brief. It
matters for sequencing: fixing export To-Be alone would have _created_ a UI-versus-export
disagreement where the two previously agreed by both being wrong. Both were changed together
on the user's instruction — one rule everywhere.

**Follow-on, also resolved.** `generateExecutiveSummary`'s "ORBIT Dimension Summary" is now
the mean of per-area dimension scores, counting finalized assessments only, extracted as
`summariseDimensionsAcrossAreas`. Two defects, not one: the old figure was weighted by aspect
count _and_ by area count, and it read every rating regardless of status while the Domain
Maturity Scores table directly above it counted finalized only — one page, two tables,
different populations. Aggregate dimensions are deliberately not folded in, since an
aggregate derives from the same per-area scores and would count those areas twice. A new
"Areas" column shows the denominator. This was a semantic change to a stakeholder-facing
table and was made on the user's explicit call, September 11.

Related, and **still open**: `useOrbitRatings.getOverallAverageLevel` flat-averages every
rating across all dimensions and is displayed as the live overall score during assessment,
whereas the `overallScore` persisted at finalize is the mean of the three dimension scores.
Those disagree by aspect-count weighting for the same data. Not export-facing, so it was left
alone rather than folded into Wave 5. Same class of defect as this entry.

### OBS-26 — `useDebouncedSave` can clobber keystrokes with the echo of its own save

**Confirmed** by reading the hook; the window is narrow, so not reproduced live. Found while
verifying the OBS-6 fix in Wave 2.

`useDebouncedSave` (`src/hooks/useDebounce.ts`) syncs local state down from the external
value unconditionally:

```ts
useEffect(() => {
  setLocalValue(externalValue);
}, [externalValue]);
```

The save effect depends on `[localValue, ...]` and clears its timer on every change, so no
save fires during continuous typing — only after a 500ms pause. That creates this sequence:

1. User pauses 500ms; the debounce dispatches a save with `"Hello"`
2. User resumes typing, local becomes `"Hello wor"`
3. The write lands and `useLiveQuery` pushes the new rating, so `externalValue` becomes `"Hello"`
4. The sync effect runs `setLocalValue("Hello")` — the `" wor"` is discarded and the caret jumps

The window is only as long as a Dexie write plus a live-query round trip (roughly tens of
milliseconds), and the user has to resume typing inside it, immediately after a deliberate
pause. That narrowness is presumably why it survived the pilot.

**Pre-existing, and the OBS-6 fix does not widen the window** — it only makes the race
reachable in one more situation. Before, typing into a fresh notes field never created a
rating, so `externalValue` stayed `''` and there was no echo to clobber with; the race
already occurred whenever a rating existed, which is the normal flow after picking a level.

Proposed fix, kept out of Wave 2 because it changes shared behavior that three fields and ten
existing tests depend on: accept a new external value only when the user has no unsaved local
edit.

```ts
// If the user has diverged from the last external value we saw, their text wins —
// the pending debounce will reconcile it. Otherwise accept the incoming value.
useEffect(() => {
  setLocalValue((current) => (current === lastExternalRef.current ? externalValue : current));
  lastExternalRef.current = externalValue;
}, [externalValue]);
```

That keeps legitimate external updates working (import, revert-edit, carry-forward) while
making in-progress typing authoritative. Worth pairing with a test that types across a save
boundary.

### OBS-27 — Hook tests gate on a live-query emission they do not need, making them flaky

**Confirmed** by measurement during Wave 2.

Many tests in `src/hooks/useOrbitRatings.test.ts` follow this shape:

```ts
const { result } = renderHook(() => useOrbitRatings(assessmentId));
await waitFor(() => {
  expect(result.current.ratings).toHaveLength(1); // load gate, not an assertion
});
await act(async () => {
  await result.current.updateNotes(/* ... */);
});
const stored = await db.orbitRatings.get('r1'); // asserts against the DB, not the hook
```

The `waitFor` is there to ensure the hook has "loaded" before mutating. It is not needed: the
mutation paths (`updateLevel`, `updateTargetLevel`, `updateTextField`, `saveRating`) resolve
the target row directly from IndexedDB through `findExistingRating` and never read
`result.current.ratings`. The gate only couples the test to Dexie `liveQuery` scheduling.

That coupling is the flake. Measured failure rates for
`vitest run useOrbitRatings.test.ts <second file>`:

| Invocation                                      | Failures |
| ----------------------------------------------- | -------- |
| Alone                                           | 0 / 8    |
| Plus `useDebounce.test.ts`                      | 1 / 8    |
| Plus `useSaveStatus.test.ts` (uses fake timers) | 5 / 10   |
| Full suite                                      | 0 / 5    |

Under CPU contention from a concurrently running file, the first `liveQuery` emission
sometimes does not arrive within seconds. Removing the gate from the tests added in Wave 2
dropped the two-file rate from 5/10 to **0/10**.

CI is unaffected — the full suite has never flaked — so this is a developer-ergonomics
problem: running two files at once during development fails for no real reason.

Fix: drop the load gate wherever the test asserts against the database rather than the hook,
keeping `waitFor` only where the hook's own returned state is what is being tested (for
example `getAssessedCount`, `getAverageLevelForDimension`). Roughly a dozen call sites in
that one file. `asyncUtilTimeout` is now 3000 in `src/test/setup.ts`, which raises the
ceiling for the genuine cases while staying under vitest's 5000ms `testTimeout` so failures
still report as assertion differences.

### OBS-28 — The referenced favicon does not exist

**Confirmed** by inspection and by request against the deployed site. **Resolved in Wave 8** —
both halves: `public/favicon.svg` now exists, and the reference is `%BASE_URL%favicon.svg`, which
Vite substitutes, so it resolves under the Pages subpath. Verified by building with
`VITE_BASE_PATH=/mita-ssa-tool/` and confirming the emitted href is
`/mita-ssa-tool/favicon.svg`.

Done alongside the PWA icon set it was expected to pair with (OBS-22): a 192 and 512 icon, a
maskable 512, and a 180 `apple-touch-icon` for iOS, which ignores the manifest. The icon is a
geometric glyph rather than lettering so that rasterising it does not depend on an installed font;
provenance and regeneration commands are in `docs/ICONS.md`.

`index.html:5` declares `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />`, but no
favicon file exists anywhere in the repository — `public/` contains only `404.html`. Both the
base-path-relative and root URLs return 404 on the deployed site, so browsers fall back to a
default tab icon.

Two separate small problems in one line:

1. **The file is missing.** Adding `public/favicon.svg` would fix the 404.
2. **The path would still be wrong once it exists.** The `href` is a root-absolute `/favicon.svg`,
   which does not pick up `VITE_BASE_PATH`, so on GitHub Pages it would resolve to
   `nickarrow.github.io/favicon.svg` rather than `.../mita-ssa-tool/favicon.svg`. Use
   `%BASE_URL%favicon.svg`, which Vite substitutes at build time.

Purely cosmetic, and worth about ten minutes. Flagged because a missing tab icon is the kind of
detail that registers during a "is this polished enough to ship" review, which is exactly the
gate this tool is heading into. Reasonable to fold into Wave 8 alongside the PWA manifest work,
which needs an icon set anyway.

### OBS-29 — `MaturityLevelSelector` announces a radiogroup it does not implement

**Confirmed** by keyboard-driving the real control in Chromium (Wave 4 audit), not merely by
reading markup. This is the most-used control in the app: every one of the 26 aspects is
rated through it.

`src/components/assessment/MaturityLevelSelector.tsx` puts `role="radiogroup"` on a `Box`
and `role="radio"` on six `Paper` elements (five levels plus N/A). Three distinct problems,
in increasing order of severity:

| Problem                                                                                           | Measured behaviour                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **No arrow-key navigation.** The ARIA radiogroup pattern requires it                              | `ArrowDown` and `ArrowRight` with a radio focused leave focus exactly where it was. Only `Enter`/`Space` do anything                                                                                                                 |
| **No roving tabindex.** All six radios carry `tabIndex={0}`                                       | The correct pattern is one tab stop per group. Measured: Tab order runs radio L1 → To-Be L1 → radio L2 → To-Be L2 …, so **11 stops per aspect** — six rows plus the five To-Be checkbox inputs (Not Applicable has no To-Be control) |
| **A checkbox nested inside `role="radio"`.** axe reports `nested-interactive` at _serious_ impact | ARIA gives `radio` **presentational children**, so the To-Be checkbox's role is erased for assistive tech even though it remains focusable                                                                                           |

On a ten-aspect Information dimension that is 110 tab stops to cross the page.

**The important nuance: the control is operable, not unusable.** A keyboard user can Tab to a
level and press Enter or Space to select it, and can Tab to the To-Be checkbox and press
Space. What is broken is the _contract_ — the control tells a screen reader it is a radiogroup,
then does not behave like one, and the To-Be affordance is announced as nothing in particular.
So this is a WCAG 4.1.2 (Name, Role, Value) problem rather than a 2.1.1 (Keyboard) one.

**Why it was not fixed in Wave 4.** Restructuring it is real surgery on the control every
pilot state uses to enter data, it has **no test file**, and Drop 1 is a _reviewable_ build
rather than a cleared one. Deliberately deferred for a decision instead of being rushed.

**Resolved**, on the instruction to fix it properly rather than defend it.

A 28-test file was written **first**, against the old implementation, to establish a
behavioural baseline: 12 passed and 13 failed, and the 13 failures were exactly the defects
above. That baseline is what made the rewrite safe on a control with no prior coverage.

| Before                                                        | After                                                                               |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `role="radiogroup"` / `role="radio"` on `div`s                | Native `<input type="radio">`, two groups distinguished by `name`                   |
| Arrow keys inert                                              | Browser-native: arrows move focus **and** select, both directions, within the group |
| `tabIndex={0}` on all six rows, checkbox interleaved          | Roving tabindex from the browser. Measured in Chromium: **2 tab stops, was 11**     |
| To-Be checkbox nested inside `role="radio"`                   | To-Be is a **sibling** radio group, never a descendant                              |
| To-Be modelled as a checkbox that toggled off when re-clicked | Modelled as what it is — single-select-or-none — with an explicit clear button      |

Two details worth carrying into anything similar:

- **Radio grouping is by `name`, not by DOM ancestry.** The assessment page renders one
  selector per aspect and several can be expanded at once, so names derive from `useId()`. A
  shared name would have merged every aspect into a single group, and choosing a level for one
  aspect would silently clear another. A test asserts two instances never share names.
- **One `fieldset` wraps both groups**, because they interleave row by row so neither can own a
  fieldset of its own. Each radio therefore carries a self-describing accessible name — the
  To-Be ones include the level, since the visible text is just "To-Be" on every row.

The visual layout is essentially unchanged: one row per level, selection control on the left,
To-Be flag on the right.

**A caveat on the tab-stop measurement.** jsdom does not implement the roving tabindex for a
radio group with nothing checked — it lets Tab visit every unchecked radio, where Chrome
exposes only the first. So the 12-to-2 figure is measured in Chromium, and the jsdom test
asserts the count only in the state where both engines agree (both groups having a checked
member). Do not "fix" a tab-stop count by trusting jsdom here.

### OBS-30 — Twelve colour pairs fail WCAG 1.4.3, and the causes are structural not incidental

**Confirmed** by measurement in Chromium with axe-core 4.11.1 (Wave 4). Worth stating plainly
why this could not have been caught by the test suite: **axe cannot evaluate contrast under
jsdom** — it needs a canvas to sample rendered pixels — so every `toHaveNoViolations()`
assertion in this repo silently skips the contrast rule.

| Ratio      | Foreground / background | Needs | Where                                                 | Root cause                                                  |
| ---------- | ----------------------- | ----- | ----------------------------------------------------- | ----------------------------------------------------------- |
| 2.09:1     | `#02bfe7` on `#fafafa`  | 4.5:1 | Outlined secondary chips ("Organization-wide"), Guide | `secondary.main` is a light cyan, unusable as text on white |
| 2.15:1     | `#ff9800` on `#ffffff`  | 3:1   | 60px score number, AreaResults                        | `getScoreColor` returns raw orange                          |
| 2.15:1     | `#ffffff` on `#ff9800`  | 4.5:1 | Score chips                                           | Same colour, used as a chip fill with white text            |
| 2.33:1     | `#c48f00` on `#e9e8d8`  | 4.5:1 | Sidebar partial-progress chip                         | `warning.dark` on `alpha(warning.main, 0.15)`               |
| 2.67:1     | `#9e9e9e` on `#ffffff`  | 4.5:1 | Tag helper text                                       | `grey.500` used for 12px body copy                          |
| 3.15:1     | `#0095b6` on `#ebf4fa`  | 4.5:1 | To-Be chips                                           | `secondary.dark` on a tinted row                            |
| 3.32:1     | `#0095b6` on `#f5f9fc`  | 4.5:1 | To-Be chips                                           | Same                                                        |
| 3.37:1     | `#2e8540` on `#cae1dd`  | 4.5:1 | Sidebar complete chip                                 | `success.main` on `alpha(success.main, 0.15)`               |
| 3.67:1     | `#2e8540` on `#dbe9de`  | 4.5:1 | Sidebar complete chip                                 | Same, different blend                                       |
| 3.82:1     | `#2e8540` on `#e0ede2`  | 4.5:1 | Sidebar complete chip                                 | Same, different blend                                       |
| 4.16:1     | `#0071bc` on `#d9eaf5`  | 4.5:1 | "AGG" chip, 11.2px                                    | `primary.main` on `alpha(primary.main, 0.15)`               |
| **4.31:1** | `#ffffff` on `#1a7fc3`  | 4.5:1 | **Active header nav button, 5 pages**                 | `rgba(255,255,255,0.1)` overlay _lightens_ `primary.main`   |

Three recurring patterns, which is what makes this structural:

1. **`alpha(X, 0.15)` background with `X` as the foreground.** Tinting a colour toward white
   and then writing in that same colour cannot reach 4.5:1 — the two move together. Affects
   every sidebar progress chip and the AGG chip. The fix is a darker text token
   (`success.dark`, `primary.dark`) rather than a different background.
2. **`secondary.main` `#02bfe7` and `warning.main` `#fdb81e` are decorative-only colours**
   being used as text. Neither can pass on white at any size the app uses.
3. **The active nav button is lightened, not darkened.** `Layout.tsx` marks the current page
   with `rgba(255,255,255,0.1)`, which raises the background luminance just enough to drop
   white text from 4.68:1 (inactive, passing) to 4.31:1 (active, failing). Darkening instead —
   `rgba(0,0,0,0.16)` — both fixes the contrast and still reads as selected. This is the
   cheapest single fix in the table and covers five pages.

Deferred out of Wave 4 because every item changes visible colour, and Shelley and Chris were
mid-review of the deployed build at the time. Needs one deliberate batch, not a trickle.

**Resolved.** Fixing the root causes rather than the reported instances found the count above
was **too low**, because axe can only measure what happens to render:

- **All five `SCORE_COLORS` failed in every role**, at 2.16:1 to 3.68:1 — not the two axe
  flagged. They are used as chip fills behind white text, as text on white, and as chart
  fills; the same luminance constraint governs all three, so one value per band serves all.
  The palette's own docstring had asserted AA compliance.
- **`info` was never defined in the theme**, so MUI's default `#0288d1` was in play: 3.86:1 as
  chip text and 3.41:1 as an Alert icon, the latter under even the 3:1 non-text floor.
- **Alert icons are painted from `palette[severity].main`**, a fill-grade token. Every severity
  failed: warning 1.65:1, info 3.41:1, error 3.98:1, success 4.08:1.
- **Outlined chips take text _and border_ from `.main`** too, so `success` and `warning` chips
  failed on the page background.
- Two more only reachable in transient states: `success.main` at 4.24:1 on a hovered Dashboard
  row, and `#1b5e20` at 3.91:1 against the darker stripe of the striped progress bar.

Fixed at the source rather than per call site: theme `MuiChip` and `MuiAlert` overrides
redirect to the `.dark` tokens, so the pattern is corrected wherever it appears. The fourth
independent `getScoreColor` (in `AggregateDimensionView`) now delegates to the shared one.

Verified 0 `color-contrast` violations in Chromium across 11 routes and 9 interaction states.
Contrast is now pinned by tests that compute real ratios — necessary because **axe cannot
check contrast in this suite at all**: it needs a canvas to sample rendered pixels, which jsdom
does not provide, so every `toHaveNoViolations()` silently skips the rule.

**Documented trade-off.** Forcing all five bands to ~5:1 against white puts them at similar
luminance: they differ from each other by at most 1.21:1, and amber from red by 1.08:1, which
is plausibly confusable under protanopia. Acceptable only because colour is never the sole
carrier of meaning — chips print the score beside the colour, and the two bar charts encode
value as length against a labelled axis. The charts print **no** numbers, so the axis is
load-bearing. A test pins the constraint.

### OBS-33 — Every aspect's level selector renders even when its panel is collapsed

**Confirmed** by a measurable test-timing regression, then by reading the markup.

`AspectCard` renders a MUI `Accordion` with no `unmountOnExit` on the transition, so the
contents of every collapsed aspect panel stay mounted. That was already true before OBS-29 —
the old selector mounted five real checkbox inputs per aspect — but the rewrite raises the count
per aspect from 5 to 11, so a five-aspect dimension goes from 25 to 55 mounted inputs and the
ten-aspect Information dimension mounts 110, essentially all of them invisible. Roughly 2.2×,
not a change from nothing.

The symptom that surfaced it: `Assessment.test.tsx`'s OBS-6 test types into a notes field, and
`user.type` re-renders the page per keystroke. With a 22-character string it began exceeding its
4s gate on roughly **one full-suite run in three** — a flake that had never reached the full
suite before (contrast OBS-27, which is about two-file runs). Shortening the typed string
restored stability across four consecutive runs, but that treats the symptom.

Fix shape: `slotProps={{ transition: { unmountOnExit: true } }}` on the `Accordion`.

**Not done here, deliberately.** MUI's `Collapse` unmounts its own wrapper when exited, and
that wrapper is the element carrying `id="aspect-<id>-content"` — the target of the summary's
`aria-controls`. Removing it leaves `aria-controls` pointing at a non-existent id, which needs
its own accessibility verification. Landing that the day before a stakeholder drop was the wrong
trade. Worth doing next, with an axe pass over the expanded and collapsed states.

### OBS-31 — `ResultsMasterDetail`'s tree needs `Collapse` nested inside the `li`, not beside it

**Resolved in Wave 4.** Recorded because the wrong fix and the right fix look almost
identical, and the wrong one passes typecheck, lint and the whole test suite.

The nav panel is a three-level expandable tree (layer → domain → area) built from MUI
`List` / `ListItemButton` with `Collapse` between levels. `Collapse` renders a `div`. Three
shapes, two of which are invalid:

| Shape                                                               | Result                                                                                       |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Bare `ListItemButton` as a child of `List` (the original)           | `ul` has `div[role=button]` children → `aria-required-children`, **critical**                |
| Rows wrapped in `ListItem`, `Collapse` as a **sibling** of the `li` | the domain and area `li`s land inside the `Collapse` div → `listitem`, **serious**, 14 nodes |
| Rows wrapped in `ListItem`, `Collapse` **nested inside** the `li`   | **valid** — this is what shipped                                                             |

The second shape is what the first Wave 4 attempt produced, and it was briefly documented
here as proof that valid list markup was impossible. That was wrong. An `li` accepts flow
content, so the `Collapse` can live _inside_ it, and each level then gets its own `ul`:

```jsx
<List>                                     {/* ul */}
  <ListItem disablePadding sx={{ display: 'block' }}>   {/* li */}
    <ListItemButton … />
    <Collapse in={expanded} unmountOnExit>
      <List disablePadding dense>          {/* ul, inside the li */}
        …                                  {/* same pattern one level down */}
      </List>
    </Collapse>
  </ListItem>
</List>
```

`display: block` on the `ListItem` is required — its default is `flex`, which would put the
button and its `Collapse` side by side. MUI's `List` sets `list-style: none`, so no marker
appears.

**The lesson is about the verification loop, not the markup.** The invalid shape was caught
only by re-running axe in a browser after the fix; typecheck, lint and 558 tests were all
green on it. `ResultsMasterDetail.test.tsx` now asserts that every `ul` contains only `li`
children and that no `li` is orphaned, in the collapsed, domain-expanded and layer-collapsed
states.

Still open, and a better long-term answer: the ARIA **tree** pattern (`role="tree"` /
`treeitem` / `group` with arrow-key traversal) fits an expandable hierarchy better than
nested lists, and MUI's `SimpleTreeView` implements it. Worth pairing with the `height: 600`
clipping noted under OBS-16.

### OBS-32 — `variant="subtitle1|subtitle2"` silently emits `<h6>`, and it broke heading order on seven pages

**Confirmed** on seven of twelve routes by axe (Wave 4). **Resolved in Wave 4** — 24
`Typography` sites were given an explicit `component`. Recorded here anyway, because the trap
is still live for any new code that does not.

MUI's default `variantMapping` maps `subtitle1` **and** `subtitle2` to `h6`, and `h1`–`h6`
variants to their matching tags. So `<Typography variant="subtitle2">` renders a real
document heading unless an explicit `component` overrides it. 18 sites existed; only 3 set
`component`. The visible result was heading outlines like `h1 → h6` (Dashboard, Guide) and
`h2 → h3 → h6` (assessment pages).

Two sharper edges found along the way:

- **MUI 6.5 wraps `AccordionSummary` in `<h3 class="MuiAccordion-heading">`.** Every aspect
  card therefore had a `<h6>` (`AspectCard`'s `subtitle1` aspect name) nested _inside_ an
  `<h3>` — a heading inside a heading. Not obvious from the JSX, since nothing in this repo
  writes that `h3`.
- **Score values were headings**, in four files: `AggregateDimensionView`, `AreaResults`,
  `DomainResults` and `ResultsMasterDetail` all rendered big numbers with `variant="h2"`,
  `"h3"` or `"h4"`, so "3.2" was announced as document structure. `ResultsMasterDetail` also
  rendered the literal arrow glyph `→` between As-Is and To-Be as an `<h5>`, and two empty
  states ("No Data Available", "No Assessment Results") as headings under an `<h2>`.
- **Half the sites were only reachable by interaction.** The `ResultsMasterDetail` detail
  panel renders nothing until a domain or area is clicked, and selection is component-local
  state rather than URL state (OBS-12). A route-by-route sweep sees only the placeholder and
  reports clean, which is exactly what the first Wave 4 pass did.

**Guidance for new code:** treat `variant` as styling only, and always pass `component`
explicitly on `Typography` — `component="p"` or `"span"` for text that merely looks like a
heading, or the correct `component="hN"` for a genuine section heading. Worth adding to the
steering file's React patterns section.

### OBS-34 — Hardcoded element ids in components that render many times

**Confirmed** twice, in two different components, both found only by expanding panels.

Two components baked fixed `id` values into markup that renders once per aspect:

| Component           | Hardcoded ids                                                  | Result on a five-aspect dimension                |
| ------------------- | -------------------------------------------------------------- | ------------------------------------------------ |
| `AspectCard`        | `aspect-<id>-content` **plus** `role="region"`                 | Duplicated MUI's own accordion region and its id |
| `QuestionChecklist` | `evidence-header` / `evidence-content`, and the questions pair | 5 identical ids; 5 landmarks all named the same  |

Both produced duplicate DOM ids and `landmark-unique` violations, and in the
`QuestionChecklist` case every region's `aria-labelledby` resolved to the _first_ matching
header, so four of the five panels were mislabelled for assistive technology.

**Resolved in Wave 4.** Both are fixed — `AspectCard` by deleting the manual attributes, since MUI's `Accordion`
already renders a correctly-wired `div.MuiAccordion-region`, and `QuestionChecklist` by
deriving ids from `useId()`. With all five aspects and their evidence panels expanded there are
now zero duplicate ids, verified by enumerating every `id` in the document.

**The general point, which is the reason this is logged rather than just fixed:** a hardcoded
`id` in a React component is a latent bug the moment that component can render more than once,
and it is invisible until two instances are on screen together. Both instances here were behind
an expand interaction, which is why a route-level audit missed them. Prefer `useId()`, and
check whether the UI library already provides the wiring before adding `id`/`role` by hand.

A related trap in the same class: `useId()` returns values like `:r3:`. Colons are legal in an
`id` or `name` attribute but break unescaped CSS attribute selectors, so strip them.

### OBS-35 — Arrow-key level selection writes once per step, over a non-atomic upsert

**Confirmed** as a mechanism by reading the code; **not reproduced** — six rapid arrow presses
did not trigger it. Surfaced by the OBS-29 review.

Native radio groups select as focus moves, which is correct and expected behaviour. The
consequence here is that arrowing from Level 1 to Level 5 fires `onAsIsChange` four times, so
four saves are dispatched in as many milliseconds. Before OBS-29 the only way to change a level
was a deliberate click per row, so this rate was not reachable.

Three things line up badly underneath:

- `updateLevel` in `useOrbitRatings.ts` is a read-then-write upsert: it resolves the existing row
  via `findExistingRating` and then either updates or adds. Two interleaved calls for an aspect
  with **no** existing row can both observe "missing" and both `add`.
- `runSave` in `Assessment.tsx` does not serialise; nothing queues or debounces level writes the
  way `useDebouncedSave` does for text.
- The compound index in `db.ts` is declared `[capabilityAssessmentId+dimensionId+aspectId]`
  without a leading `&`, so it is **not** unique and the database will not reject a duplicate.

The window is a single Dexie round trip and only exists on the first rating for an aspect, which
is presumably why it has never been seen. But the failure mode is duplicate `orbitRatings` rows
for one aspect, which would then double-count in `getAssessedCount` and skew a dimension average
— a data-integrity bug in the artifact states submit to CMS, not just a cosmetic one.

Cheapest durable fix is the schema: make the compound index unique (`&[...]`) so the database
enforces what the code assumes. That is a Dexie version bump, and every previous version bump in
this project has been a clean-break that clears all tables, so it is not free — it needs to ride
along with a migration that is happening anyway. Debouncing level changes, or serialising writes
per aspect, would narrow the window without a schema change.

Worth deciding before real state data exists rather than after.

### OBS-36 — `/results` has no headings at all in its empty-data state

**Confirmed** in Chromium with axe-core, while verifying the CMS banner change
(September 11, 2026). Reported as `page-has-heading-one`, moderate impact, one node.

With no finalized assessments, `/results` renders its empty state and the document
contains **zero** heading elements — not merely no `<h1>`. Every other route in the app is
clean under the full ruleset including `best-practice`.

This is a consequence of the OBS-32 fix rather than a new mistake. That work gave 24
`Typography` sites an explicit `component` to stop `variant` emitting stray headings, and
among them were the two empty states ("No Data Available", "No Assessment Results") that
had been rendering as headings under an `<h2>`. Converting them to non-headings was right
for heading order, and on a populated page the real headings remain. On an empty page they
were the only ones.

Why the Wave 4 audit missed it: that sweep seeded 5 assessments and 109 ratings precisely
so the data-dependent pages would render their content, so `/results` never appeared in its
empty state. It is the exact shape of Wave 4's stated limitation 8 — that interaction and
data states were representative rather than exhaustive.

Not a WCAG failure: `page-has-heading-one` is a `best-practice` rule, not tagged
`wcag2a`/`wcag2aa`. But an empty page with no heading is genuinely worse for a screen
reader user than one with a heading, and this is the state a pilot state sees on their
first visit — before they have finalized anything — which makes it more visible than its
severity suggests.

Fix shape: give the empty state a real `<h1>` (the page has no other heading to conflict
with, so heading order cannot regress), or render the page-level `<h1>` unconditionally
above the data-dependent content. The second is preferable — it makes the heading
independent of data, which is what caused this.

Logged rather than fixed because it surfaced during an unrelated copy change and belongs
with a deliberate pass over data-empty states. Worth pairing with a re-audit that drives
the empty variants of `/dashboard`, `/results` and `/history`, since the same reasoning
applies to all three and only `/results` happened to be checked.

### OBS-37 — Production dependencies carry a critical and a high advisory

**Confirmed** by `npm audit --omit=dev` during Wave 6 (September 14, 2026). Unrelated to
that wave's work — noticed while confirming the new `exceljs` dependency stays out of the
production tree, which it does (`npm ls exceljs --omit=dev` returns empty).

**Resolved in Wave 8.** The production tree is now at **0 advisories**, and the full tree —
including devDependencies — is at **2 moderate, 0 critical, 0 high**, down from 30. What the
fix actually cost is recorded at the bottom of this entry, because it was nothing like what
this entry originally predicted.

Seven advisories affected the **production** tree — 1 critical, 2 high, 4 moderate — of which
two mattered:

| Package        | Severity     | Advisories                                                                                                                  |
| -------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `jspdf`        | **critical** | `GHSA-7x6v-j9x4-qf24` (PDF object injection via FreeText color), `GHSA-wfv2-pwc8-crg5` (HTML injection in new-window paths) |
| `react-router` | high         | `GHSA-49rj-9fvp-4h2h` (vendored turbo-stream deserialization → RCE), plus four XSS/DoS/CSRF advisories                      |

Note the severity split: `react-router` and `react-router-dom` are filed as **two** separate
high advisories, not one, so the seven break down as 1 critical / 2 high / 4 moderate. An
earlier revision of this entry, and the Wave 8 opening analysis, both said 1 / 1 / 5.

Both were reported as having fixes available via `npm audit fix`.

How much of this reaches this app is genuinely unclear and worth establishing rather than
assuming, in both directions:

- The `jspdf` advisories concern FreeText annotations and `html()`/new-window rendering.
  `pdfExport.ts` uses neither — it draws text and tables into a document it constructs
  itself, from data the user typed into their own browser. There is no server, and no
  untrusted PDF is ever parsed. So the exploitable path looks absent.
- The `react-router` turbo-stream advisory concerns single-fetch and RSC server paths.
  This app is a static SPA with no router server runtime, so again the path looks absent.

That reasoning is **inferred, not verified**, and "we read the advisory and think it does
not apply" is a weaker position than "we upgraded" when the reviewer is CMS and the
artifact is a government pilot tool. A `npm audit` output with a critical line in it is
also the kind of thing that derails a security review on presentation alone.

#### How it was fixed in Wave 8, and why this entry's own reasoning was wrong

The deferral originally recorded here said the fix meant "upgrading `jspdf` across a major
version," which would change the export path in a drop that had already changed exported
Technology scores. **That was wrong by the time Wave 8 opened, and it is the reason to
re-measure an advisory rather than inherit a stale assessment.** The critical was fixed by
`jspdf` **4.2.0 → 4.2.1** — a patch. Every fix turned out to sit inside the caret ranges
already in `package.json`:

| Package                        | Floor raised      | Resolved version moved | Kind             |
| ------------------------------ | ----------------- | ---------------------- | ---------------- |
| `jspdf`                        | ^4.2.0 → ^4.2.1   | 4.2.0 → 4.2.1          | patch (critical) |
| `react-router-dom`             | ^7.1.1 → ^7.18.4  | 7.12.0 → 7.18.4        | 6 minors (high)  |
| `react-router`                 | — (transitive)    | 7.12.0 → 7.18.4        | 6 minors (high)  |
| `uuid`                         | ^11.0.5 → ^11.1.1 | 11.1.0 → 11.1.1        | patch            |
| `dompurify`                    | — (via `jspdf`)   | 3.3.1 → 3.4.15         | minor            |
| `fflate`                       | — (via `jspdf`)   | 0.8.2 → 0.8.3          | patch            |
| `yaml` (nested, `cosmiconfig`) | — (transitive)    | 1.10.2 → 1.10.3        | patch            |

Two things worth separating, because conflating them overstates the change: the **floor** on
`react-router-dom` moved 17 minor versions, but the **installed** version moved 6. The floors
were raised deliberately rather than taking a lockfile-only fix — leaving `^4.2.0` in place
would let a fresh `npm install` resolve back to the vulnerable `jspdf` 4.2.0, so raising the
floor is what makes the security property durable.

**The dev tree was fixed too, and the stated reason for not doing so was also false.** Wave 8
first recorded that clearing the devDependency advisories — 30 of them, including criticals in
`vitest` and `@vitest/coverage-v8` and a high in `vite` itself — required `npm audit fix
--force` and therefore a Vite/Vitest major bump. It did not. `vitest` and
`@vitest/coverage-v8` 4.0.18 → 4.1.11 and `vite` 6.4.1 → 6.4.3 are all inside the existing
caret ranges. The `--force` prompt came from exactly one package, described below.

**What remains, consciously accepted: 2 moderate, both `exceljs`.** `exceljs >=3.5.0` bundles a
vulnerable `uuid`, and npm's only offered "fix" is `exceljs@3.4.0` — a **downgrade**, flagged
`isSemVerMajor: true`. Taking it would break the workbook generator, which is pinned to 4.4.0
deliberately. So `npm audit fix --force` must never be run in this repo: the one thing it would
"fix" is the one thing that would regress. `exceljs` is a devDependency and absent from the
production tree (`npm ls exceljs --omit=dev` → empty), so the bundled `uuid` never ships.

**`npm audit fix` needs two passes.** The first left a high in `brace-expansion` reachable but
unfixed; a second pass took it. A single pass reporting "to address issues that do not require
attention, run `npm audit fix`" is npm saying it has not finished, not that the rest needs
force.

**Export regression pass** (which this entry asked for): `src/services/export/pdfExport.test.ts`
drives **real jsPDF** rather than a mock — `buildPdfDocument` calls `new jsPDF()` and real
`autoTable`, and assertions search `doc.output()`. Its `Technology dimension weighting (OBS-25)`
suite asserts the exported figure `(Avg: 3.0)` and the absence of `(Avg: 3.2)`, so the Wave 5
weighting fix is covered under 4.2.1 by the suite itself. That was confirmed in a real browser
as well: a seeded finalized area with Infrastructure all at 5 and Application all at 1 exported
a valid 5-page PDF whose Domain Maturity Scores table read `Technology | 3.0`, with no `3.2`
anywhere in the content stream, and with the cover draft band and full PRA statement present.

### OBS-38 — Vite rewrites `new URL(<literal>, import.meta.url)`, so the idiom breaks only under vitest

**Confirmed** in Wave 6 by reproducing it. **Resolved in Wave 6** for the workbook
generator, via `scripts/xlsx/paths.ts`; recorded because the failure mode is confusing and
will recur in any future Node-side script that the test suite imports.

Vite statically recognises the exact syntactic pattern `new URL(<string literal>,
import.meta.url)` and rewrites it into its own asset-URL handling, which produces an
`http://` URL. `fileURLToPath` then throws `TypeError: The URL must be of scheme file`.

The confusing part is where it does and does not happen. The generator ran correctly under
plain Node — where nothing rewrites anything — and only one of its test files failed. And
the rewrite was not uniform even within the same wave: `new URL('../../src/data/capabilities.json',
import.meta.url)` survived while `new URL('../../package.json', import.meta.url)` did not,
so a rule of thumb learned from the first would have been wrong.

Bare `import.meta.url` is left alone. So the durable form is to derive the module directory
from bare `import.meta.url` and compose paths with `node:path`, which Vite cannot statically
analyse:

```ts
export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
```

`process.cwd()` also works for the current callers, since npm scripts and vitest both run
from the package root, but it silently resolves elsewhere the first time someone runs a
script from a subdirectory.

### OBS-39 — ExcelJS sorts cell addresses as strings, emitting duplicate `dataValidation` ranges

**Confirmed** in Wave 6 by reproducing it in isolation, outside this codebase's data.
**Resolved in Wave 6** by using the range API instead of per-cell assignment.

Assigning `cell.dataValidation` on each cell of a column and letting ExcelJS coalesce the
range produces **two overlapping `<dataValidation>` elements** rather than one:
`sqref="H10:I1627"` nested inside `sqref="H3:I1627"`. The cause is visible in the range
itself — `H10` sorts before `H3` lexicographically, so the coalescer walks addresses in
string order and starts a range at the lexicographically first address. Any validated range
that begins below row 10 and extends past it hits this, which is every input sheet in the
workbook.

Excel tolerates the duplicate, so nothing visibly breaks. What makes it worth recording is
that **it is invisible to a round-trip test**: ExcelJS's reader expands both elements back
to the same set of cells, so counting validated cells returns the same number for the
correct and the broken form. It was found by unzipping the artifact and reading the OOXML,
which is why `scripts/xlsx/workbook.raw.test.ts` exists at all.

Fix: `sheet.dataValidations.add(range, validation)`. Note this method exists at runtime but
is **absent from ExcelJS's published TypeScript definitions**, so it needs a narrow local
type assertion (`asRangeValidatable` in `workbook.ts`). Upstream has been dormant since
v4.4.0 (October 2023), so expect the types to stay wrong.

### OBS-40 — The full PRA statement cannot go in an Excel header or footer

**Confirmed** in Wave 6 by measuring, and against Microsoft's documented limit.
**Resolved in Wave 6** by design, and recorded because it is a permanent constraint on the
deliverable rather than a bug anyone can fix.

Excel rejects or truncates header and footer text longer than **255 characters**
([Microsoft Learn on the "text string is too long" footer error](https://learn.microsoft.com/en-us/answers/questions/5303928/why-am-i-getting-the-text-string-you-entered-is-to);
[TechRepublic on the same limit](https://www.techrepublic.com/article/10-steps-to-beating-excels-character-limit-for-headers-and-footers/) —
content rephrased for compliance with licensing restrictions). Some reports put the
practical ceiling lower still, around 227-250.

`DRAFT_NOTICE_LINE` is 420 characters; with the `&L&8` and page-number formatting codes the
assembled footer is 441. Shortening the wording is not available either — Decision 15
requires the CMS-supplied text verbatim, and the PRA sentence by itself exceeds 255. So the
full statement cannot be a per-page Excel footer for anyone, under any implementation.

Consequences already applied: the footer carries `DRAFT_NOTICE_SHORT_LINE` (184 characters
assembled), and the full statement lives on `00_README` as sheet content and in the
workbook's `description` document property. This matches what the PDF already does — full
statement on the cover, short line in the per-page footer.

**No test can confirm that Excel _accepts_ a footer** — the bytes we write are exactly what
we intended, so a round-trip or raw-XML assertion passes and only Excel objects. That is
narrower than "no test can catch a regression here", which an earlier draft of this entry
claimed and which was false: the suites do assert the emitted footer is within 255, that
assertion is mutation-proved, and `assertFooterFits`'s own boundary is unit-tested on both
sides in `scripts/xlsx/footer.test.ts`. What the build-time throw in `workbook.ts` adds is
failing at generation rather than at a reviewer's desk. If Wave 7 or a later change wants
more in the footer, that guard is the thing to read first.

### OBS-41 — WCAG 2.5.3 Label in Name is unenforced, and was failing in three places

**Confirmed** in Wave 8 by computing accessible names in a real browser and applying the
success criterion's literal substring test. **Two instances introduced and fixed within that
wave; a third was pre-existing and fixed alongside them.**

SC 2.5.3 (Level A) requires a control's accessible name to **contain** the text presented
visually. An `aria-label` that adds words _in the middle_ of the visible label breaks it:

| Control                                            | Visible label             | Accessible name                                          |
| -------------------------------------------------- | ------------------------- | -------------------------------------------------------- |
| Guide workbook link (new, fixed)                   | `Download the workbook`   | `Download the blank offline workbook, Excel workbook, …` |
| Landing workbook link (new, fixed)                 | `Prefer Excel? Download…` | `Download the blank offline workbook, Excel workbook, …` |
| `About.tsx` "View on GitHub" (pre-existing, fixed) | `View on GitHub`          | `View the project on GitHub (opens in new window)`       |

`"download the blank offline workbook, …".includes("download the workbook")` is `false` — the
interposed "blank offline" is enough to fail it.

**One row has since been superseded.** The Landing link in that table was the one low on the page,
and its remedy was to carry the type and size in the _visible_ label. Later in Wave 8 that link was
replaced by one in the hero, which uses `aria-describedby` pointing at a visible caption — the same
pattern as the other two. So all three now carry type and size as a description, and the
visible-label remedy recorded here no longer exists anywhere in the app. The criterion still holds
in all three places; only the mechanism changed.

**What makes this worth an entry is that this project's axe configuration cannot see it — and the
reason is a single tag.** axe-core 4.11.1 ships `label-content-name-mismatch`, tagged `wcag21a`,
`wcag253` **and `experimental`**. Experimental rules are excluded from tag-based runs unless
`experimental` is among the requested tags, so the repo's ruleset — `wcag2a`, `wcag2aa`, `wcag21a`,
`wcag21aa`, `best-practice` — silently omits the one rule that covers this criterion.

Measured against the failing markup, three configurations:

| `runOnly` tags                                              | Rule evaluated? | Result                   |
| ----------------------------------------------------------- | --------------- | ------------------------ |
| The repo's current set                                      | **no**          | zero violations          |
| The same set plus `experimental`                            | yes             | reported as `incomplete` |
| `{ type: 'rule', values: ['label-content-name-mismatch'] }` | yes             | reported as `incomplete` |

So this **is** a tag-filtering gap, and one tag closes it. An earlier draft of this entry claimed
the rule "never evaluates the anchors at all" and that the gap was outside automated coverage at any
configuration; both were wrong, and wrong in the direction that discourages the cheap fix.

Two caveats before adding the tag:

- **Under jsdom the result lands in `incomplete`, not `violations`**, so `toHaveNoViolations()` would
  still pass. The rule's comparison path needs a canvas that jsdom does not provide — the same
  limitation that makes `color-contrast` unreportable in this suite. Real coverage means running it
  in a browser.
- Enabling `experimental` enables _every_ experimental rule, so expect unrelated new findings and
  budget for triaging them rather than suppressing them wholesale.

**The pattern to use instead**, now applied: put supplementary information (file type, size,
"opens in new window") in `aria-describedby` pointing at visible text, or in the visible label
itself — not in an `aria-label` that paraphrases. Where an `aria-label` is genuinely needed, it
must start with or contain the visible string verbatim. `EngagementItem` in `About.tsx` is the
good precedent: its accessible name is the visible title plus a suffix.

**Still unguarded.** No test asserts the property. Two options, in order of preference: add
`experimental` to the axe tag list and run the rule in a real browser where it can actually report a
violation, or — cheaper and jsdom-safe — assert directly that each control's `aria-label`, where
present, contains its visible text. The second is a few lines and would have caught all three
instances; the first is the better long-term answer because it also covers controls nobody thought
to write an assertion for.

### OBS-42 — A static `role="alert"` on the landing page is a live region that never fires

**Confirmed** in Wave 8 while counting live regions on the page, by enumerating every
`[role]` in the rendered DOM. Not introduced by that wave and **not fixed** — recorded because
it is a latent trap rather than a current defect.

`src/pages/Landing.tsx` renders the privacy notice as `<Alert severity="info">`, and MUI's
`Alert` defaults to `role="alert"` — an **assertive** live region. The content is static and
present at mount, so no announcement ever fires: live regions announce on _mutation_, and a
region that is populated before it is observed produces nothing. OBS-22's Wave 8 notes record the
same mechanism for the update prompt, where it had to be worked around deliberately. (An earlier
draft of this entry credited the Wave 4 audit for that reasoning; the passage is in OBS-22 and was
written in Wave 8.)

Why it matters anyway, in two directions:

1. **It is a loaded gun.** Any future change that makes that copy dynamic turns a quiet element
   into an assertive interruption, which is the most disruptive announcement available and the
   thing WCAG reserves for genuine emergencies.
2. **It makes "count the live regions" an unreliable check.** This is how it was found: a test
   asserting the update prompt is the only live region passed while a second one existed,
   because the assertion queried `role="status"` and missed `role="alert"`. Anything reasoning
   about live regions on a page that includes the landing page has to know this one is there.

Same shape exists wherever an MUI `Alert` carries static text. `ImportExport.tsx` now has one
too, in the workbook section added in Wave 8. Neither is announced; both would be if the copy
became dynamic.

Cheap fix if it is ever worth doing: pass `role="presentation"` to any `Alert` whose content is
static, as `PwaUpdatePrompt` does — there for a different reason, to avoid nesting a second live
region inside a deliberate one.

### OBS-43 — An unknown assessment id renders a blank page with no headings and no error

**Confirmed** in Wave 8 by navigating to `/assessment/health-plan-administration` — a plausible
mistake, since that is a capability **area** id and the route takes an **assessment** id
(`/assessment/:assessmentId` in `App.tsx`).

Measured on that URL: `h1` is `null`, the page contains **zero** `h1`/`h2`/`h3` elements, zero form
controls, and no error message. With the correct id the same route renders an `h1`, 12 headings, 55
radios and 30 text fields, so this is specific to the lookup failing.

**It is not a blank page — it is a permanent "Loading assessment…" spinner**, which is worse. The
guard at `Assessment.tsx:706` is `if (!assessment || !capabilityInfo || !currentNav)` and its
fallback renders a `CircularProgress` with that label. So the tool actively tells the user to wait
for something that is never going to arrive. An earlier draft of this entry described it as blank and
as an empty content area; both were wrong, and they point at a different fix.

**Root cause.** `useLiveQuery(() => db.capabilityAssessments.get(id))` at `Assessment.tsx:182`
returns `undefined` **both** while the query is in flight **and** when no such record exists. The
component therefore cannot distinguish "still loading" from "does not exist", so any fix has to
resolve that ambiguity first — for example by tracking the query's settled state separately, rather
than by adding a second guard on the same `undefined`.

Three consequences:

1. **The feedback is actively misleading.** A stale bookmark or a mistyped URL presents as a hang.
2. **No heading at all**, which is a worse version of OBS-36 (`/results` has no headings in its
   empty-data state). A screen-reader user navigating by heading finds nothing to orient on, and
   `document.title` is unchanged, so there is no announcement either.
3. **It is reachable by accident**, not just by URL tampering: area ids and assessment ids are both
   slugs in the same URL shape, and the area id is the one that appears in the Results routes.

Wants pairing with OBS-36 as a single "empty and error states across the app" pass rather than a
one-route patch — `/results`, `/results/:domainId`, `/history/:historyId` and this route all have
the same class of question, and only `/results` has been looked at.

### OBS-44 — Every deploy makes offline clients re-download the workbook

**Confirmed** in Wave 8 by measurement, and a direct consequence of two things that are each
correct on their own.

ExcelJS stamps ZIP entry timestamps it does not expose, so the generated `.xlsx` differs on
every run even when the model is byte-identical — observed at 222,655 / 222,656 / 222,658 bytes
for unchanged content, with the length varying because the timestamp encoding does. Workbox
computes a precache revision hash from file contents. So the workbook's revision changes on
every deploy, and every client with the service worker installed re-downloads ~217 KB whether
or not the workbook actually changed.

Not a correctness problem, and small in absolute terms. Recorded because the obvious fix does not
work, and someone will otherwise spend an afternoon discovering that.

**`SOURCE_DATE_EPOCH` alone is not sufficient.** It is the reproducible-builds convention,
`scripts/xlsx/paths.ts` already reads it, and nothing sets it in CI — so it looks like the answer.
Measured with the epoch pinned and two generator runs three seconds apart:

| Compared                        | Result                                                  |
| ------------------------------- | ------------------------------------------------------- |
| Unzipped parts                  | **Byte-identical** — `diff -rq` clean across every part |
| Entry CRCs                      | Identical                                               |
| `.xlsx` bytes                   | **Differ**                                              |
| md5, hence the Workbox revision | **Differs**                                             |

The residue is ZIP entry metadata, which ExcelJS stamps from the clock and does not expose. So
fixing this needs the archive's entry timestamps normalised after generation, not just the epoch
pinned.

**A trap worth naming, because it will manufacture a false success.** DOS ZIP timestamps have
two-second granularity. Two runs less than two seconds apart produce byte-identical archives
whether or not `SOURCE_DATE_EPOCH` is set. Any verification of this that runs the generator twice in
quick succession will appear to prove the fix works.

---

### OBS-45 — Stat-card numbers and the hero tagline are styled as headings, and the same missing tag hides them as OBS-41

**Confirmed** in Wave 8 by running axe-core 4.11.1 in real Chromium against the built site, on
every route reachable without seeded data.

axe's `p-as-heading` rule reports `<p>` elements styled to look like headings, as a WCAG 1.3.1
(Level A) concern: sighted users perceive a structural heading, assistive technology is given a
paragraph, and the two views of the page disagree.

| Route            | Nodes | Element                                            | What it is                                            |
| ---------------- | ----- | -------------------------------------------------- | ----------------------------------------------------- |
| `/`              | 1     | `<Typography variant="h5" component="p">`          | The hero tagline, "Assess your Medicaid Enterprise …" |
| `/dashboard`     | 4     | `<Typography variant="h3">` × 4 (`DashboardStats`) | The big stat numbers — `—`, `0`, `0`, `72`            |
| `/import-export` | 4     | the same `DashboardStats`                          | same                                                  |
| `/guide`         | 0     | rule evaluated, nothing found                      |                                                       |
| `/results`       | 0     | short-circuits to the empty state                  |                                                       |

**Nine nodes across three routes**, `impact: serious` on each. All are **pre-existing** — none was
introduced by the download-link work; they were found while verifying it. A first draft of this
entry said "five across two", because axe had only been run on the two pages being edited; the count
is recorded here as a reminder that a rule newly turned on has to be swept across all routes, not
just the diff.

**Two more places carry the identical pattern behind a data gate and are unmeasured.**
`Results.tsx` and `ResultsMasterDetail.tsx` render `variant="h3"`/`"h4"` as `component="p"` with a
sibling `<p>` label, reachable only once `statusCounts.finalized > 0`. Structurally identical, so
expect the count to grow once a state has real data. Inferred, not measured — it needs seeded
IndexedDB.

**They differ in kind, and only one is arguably a real defect.**

The hero tagline is a deliberate call: it is a tagline, not a section heading, and promoting it to
`<h2>` would insert a heading above the feature cards that describes nothing and disturbs the
document outline. Restyling it smaller is the alternative, and that is a design question.

`DashboardStats` is the substantive one, and more so than the first draft credited: it is on
`/dashboard`, the app's main working surface, not only on an export page. Each card renders a 48px
number as a `<p>` above a small `<p>` label, so visually the number reads as the card's heading and
the label as its caption — while the accessible tree has two sibling paragraphs and no heading at
all. The card's meaning lives entirely in the pairing, and nothing in the markup expresses it.
`role="figure"` with the label as its accessible name, or a definition list, would.

**Why this never surfaced before, and why it is filed next to OBS-41:** `p-as-heading` is tagged
`cat.semantics`, `wcag2a`, `wcag131` **and `experimental`**. It is the same mechanism recorded in
OBS-41 — experimental rules are excluded from tag-based runs unless `experimental` is requested, and
the repo's ruleset does not request it. So the **Wave 4** sweep of 12 routes (September 10, 2026 —
an earlier draft of this entry said Wave 3, which is the draft-banner wave), which reported zero
violations, never evaluated this rule either.

That makes two Level-A criteria with real failures behind a single missing tag, found five waves
apart. The fix is one word in the axe configuration, and the reason to do it deliberately rather
than quietly is that adding `experimental` will surface findings like the hero tagline, which need a
judgement call rather than a patch — better made as its own piece of work than discovered mid-wave.

The mechanism was read out of the library rather than assumed: `axe.js` sets
`tagExclude = ['experimental', 'deprecated']`, and `matchTags` keeps a rule only when
`exclude.every((tag) => rule.tags.indexOf(tag) === -1)`, where `exclude` is `tagExclude` minus
whatever the caller included. Neither rule sets `enabled: false`. So both a `wcag2a`-style tag run
and a bare `axe(container)` exclude them, and naming `experimental` turns both on.

---

### OBS-46 — At phone widths the app chrome takes 57% of the viewport, leaving 287px of content

**Confirmed** in Wave 8 by measuring the built site in Chromium at 375×667, while checking whether
the repositioned workbook link cleared the fold.

The layout is a `height: 100vh` flex column: `AppBar`, top notice, `<main>` (the only scroller),
bottom PRA notice, footer. At 375×667 those siblings consume **380px of 667**, so `<main>` gets 287.

| Band                   | Height at 375×667 |
| ---------------------- | ----------------- |
| `AppBar`               | **128.0px**       |
| Top predecisional band | 65.6px            |
| `<main>`               | **286.6px**       |
| Bottom PRA band        | 113.8px           |
| Footer                 | 73.0px            |
| Total                  | 667.0px           |

The skip link is absolutely positioned and the live-region `<div>` is 0px, so neither takes space.
A first draft of this table published the three non-`AppBar` bands as ~59 / 73 / 48, which with the
correct 128px `AppBar` totals 308 against the 380 asserted two lines above it — the total and the
`<main>` figure were measured, the split was not. Recorded because a band table is exactly the kind
of thing later work will trust without re-measuring.

**The `AppBar` is the dominant term and the only accidental one.** It is 128px, 2.3× a normal 56px
`Toolbar`, and the mechanism is not what it looks like. The `Toolbar` does **not** wrap —
`flex-wrap` computes to `nowrap`, and all four nav buttons sit on one row at `y: 43.8`. What happens
is that the brand button gets squeezed to **57.5px wide**, so its _text_ wraps to four lines and the
button becomes 128px tall, which sets the row height. The nav buttons are beside the brand, not
below it; the overlap visible in a screenshot is each button's label and icon overflowing its own
shrunk box — 64px for three of them, 69.5px for Import/Export. The two notice bands are CMS
requirements and the footer is
small — the `AppBar` is oversized purely because the responsive nav was never built.

Consequences beyond the cosmetic: a phone user gets a 287px reading window on every page except the
assessment page, which suppresses the footer and so gets ~360px. That is enough for a heading and a
paragraph or two — the Import/Export pointer link sits at 161-203px inside it, comfortably above the
fold — but not for anything taller. The Landing hero is the measured casualty: made responsive in
Wave 8 and still unable to fit its second call to action into the band, because a title, a tagline
and a sentence of explanation already exceed it. So the rule is about height, not about pages:
content in the first ~287px is reachable, and anything that needs more than that is not, on any page.
An earlier draft of this paragraph said any above-the-fold claim about any page was false on a phone,
which is both wrong and the version that would stop someone from trying.

Fix is a responsive nav: a menu button below `sm` that collapses the four routes into a drawer. With
the nav buttons gone the brand takes the full width on one 32px line, so the `Toolbar` falls back to
its 56px `minHeight` — 72px recovered, giving `<main>` ~359px. Not attempted in Wave 8: it is a
layout change touching every page, and the wave was closing a deploy, not opening a redesign.
