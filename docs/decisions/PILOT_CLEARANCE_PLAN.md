# Pilot Clearance Plan — Draft Banner, Accessibility, and XLSX Workbook

**Created:** September 9, 2026
**Status:** In progress — all decisions resolved
**Driver:** MITA 4.0 pilot cannot start until the tool and the spreadsheet both pass CMS internal clearance
**Target dates:** two drops, agreed September 9

- **Drop 1 — Friday, September 12:** Waves 1-5 (the tool: content fixes, data integrity,
  banner everywhere including exports, accessibility). Lets Shelley begin reviewing the tool
  without waiting on the workbook.
- **Drop 2 — Wednesday, September 17:** Waves 6-8 (the workbook, CI delivery, PWA, docs).

Backstop for both: the ISM conference at end of September. Neither date means "cleared" —
CMS internal 508 review is a separate gate on their clock. Excel is available locally, so
Wave 7 arithmetic verification is an in-house loop rather than a multi-day round trip.
**Working branch:** `feature/pilot-clearance`, cut from `feature/capability-model-v4` @ `33e7963` (v4.0.0)
**Reference implementation:** `feat-xlsx-workbook-generation` @ `b0fc55d` — reference only, never rebase (Decision 6)

Scope record and working plan for the four workstreams committed in the September 9
meeting. Check off tasks as they complete. Every wave ends with the repo green.

---

## 1. Session Recovery Protocol

**Read this section first if you are resuming with no prior context.**

### Where things stand

|                |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Working branch | `feature/pilot-clearance`, cut from `feature/capability-model-v4` @ `33e7963`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Commits so far | **Drop 1:** Waves 1-3 `a0b53c2` / `e25d665` / `81f076f`, docs `ef141e8` + `7710921`, accessibility `5580191` + `bdf1871` + `198c300`, docs `dbd54c7`, Wave 5 `1efdc9f`, docs `37a646c`, CMS notices `84ec16c`. **Drop 2:** Wave 6 `6fda84c` + `269ea0a` + `e38f1cc`, Wave 7 `00de4ba` + docs `2786d04` + text-column fix `18d1fb8` + TEXTJOIN removal `7adf873`, docs `0f67d07`. **Wave 8:** deps `c7c93fa`, build wiring `95a0fa9`, PWA + icons `75a113b`, download links `feb9c76`, release `5e344e7`, wave record `cf27c56`. **Post-deploy:** link repositioning `d68cbf3`, deploy record `61b4db3`, email rewrite `ba53516`, accessibility-claim correction `604c413` |
| Pushed         | **Everything, through `604c413`.** `origin/feature/pilot-clearance` matches local                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Deployed       | **v4.1.1 is live**, dispatched from this branch. Verified on the site: service worker active at scope `/mita-ssa-tool/`, both CMS notices on all five pages, three working workbook download links, footer reads 4.1.1                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Tagged         | **`v4.1.0` at `cf27c56` and `v4.1.1` at `d68cbf3`**, both annotated and pushed — the repository's first tags. v4.0.0 and earlier shipped untagged                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Green at       | **1025 tests / 47 files**; typecheck, lint, knip, `format:check` and `build` clean, plus `verify:workbook-artifact`. **94/94** mutations proved failable. Workbook arithmetic verified by driving Excel — **41/41**, re-run at 4.1.1 because the version bump moves a generator-emitted cell — see 8l                                                                                                                                                                                                                                                                                                                                                                     |
| Node floor     | **22.18.** The workbook generator is a `.ts` file run directly by Node and needs native type stripping. Declared in `engines`, `.nvmrc`, and both workflows — which were on Node 20                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Next wave      | **None. The plan is complete** — 96 of 96 boxes across Waves 0-8, no open decision, both drops shipped. **Read 8p for what remains outside it**, which is where any new work starts                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

> **Drop 1 is delivered.** Waves 1-5 are done and deployed, which is the whole of the Friday
> September 12 scope, plus the CMS-requested top and bottom notices (Decision 15).

> **Wave 6 opened Drop 2 and is complete.** The generator produces sheets `00`-`05` with the
> 508 structure from 5.3. Section 8j is the record; it contains two defects that only
> surfaced by inspecting the real artifact.
> **Wave 7 is complete and its checklist is fully closed**, including the Accessibility Checker
> re-run, Print Preview, dropdown entry and arithmetic — all verified in Excel. Sheets `06`-`09`
> compute scores, and the arithmetic is verified by _driving_ Excel rather than by asserting on
> formula strings. That found three wrong-number defects after 989 tests and 89 mutations were
> green; a user then found two more in the text columns that the scripted check had not been
> reading. Section 8l is the record and the most useful thing in this document to read before
> touching the workbook again.
>
> **No decisions are open.** The one Wave 7 handed forward — `TEXTJOIN` requiring Excel 2019 — was
> settled before Wave 8 began: it is gone, replaced by explicit concatenation, and the workbook's
> Excel 2007 floor is now enforced by a test over the emitted file. See 8m.

> **Wave 8 closed Drop 2, and the deploy produced one more round of work.** The workbook became
> reachable in the app, the PWA made the offline claim true, and v4.1.0 shipped. Looking at the
> deployed site then showed the download links sat 80-92% of the way down their pages, which no
> local check has an opinion about — so v4.1.1 repositioned them. **8n** is the wave record, **8o**
> the post-deploy record, and **8p** is what remains outside the plan.

> **The deploy target is the fork, not the CMS org repo — and `gh` gets this wrong by
> default.** `origin` is `naretakis/mita-ssa-tool` (redirecting to `nickarrow/mita-ssa-tool`)
> and the pilot site is <https://nickarrow.github.io/mita-ssa-tool/>. `upstream` is
> `Enterprise-CMCS/mita-ssa-tool`, which has its own Pages site at
> `enterprise-cmcs.github.io/mita-ssa-tool` and has only ever deployed `main` via merged PRs.
> `gh repo view` in this working copy resolves to **Enterprise-CMCS**, so a bare
> `gh workflow run` aims at the wrong repository — where `feature/pilot-clearance` does not
> even exist. Always pass the repo explicitly:
>
> ```
> gh workflow run "Deploy to GitHub Pages" \
>   --repo nickarrow/mita-ssa-tool --ref feature/pilot-clearance
> ```
>
> Confirm afterwards by reading the live bundle rather than trusting a green run:
> `curl -s <site>/ | grep -o '/mita-ssa-tool/assets/index-[^"]*\.js'` then grep that file for
> the copy you expect.

> **Stakeholders are looking at a build that has changed twice in quick succession.** Wave 4
> altered appearance — darker score chips, a selected nav item that darkens rather than
> lightens, several recoloured chips, a maturity level selector built from standard radio
> buttons. Drop 1 then changed the **Technology score** in exports (see the Wave 5 notes for
> the before-and-after figures) and replaced the disclaimer with CMS's two-notice wording.
> All deliberate and all briefed. Expect questions, and check that table before attributing a
> changed number to a defect.

> **Do not push to `main`.** `deploy.yml` auto-triggers on pushes to `main`, and
> `origin/main` sits 10 commits behind at the pre-v4 capability model (`aa3708c`).
> Anything landing there — including a merged dependabot PR — auto-deploys and silently
> reverts the live site that stakeholders are reviewing back to the old model. Keep work
> on this branch, and deploy only by manually dispatching the Pages action from it
> (Decision 11).

> **Stakeholders are reviewing the deployed build as work continues.** Anything that changes
> what they see — or what a number says — should land as one deliberate deploy rather than a
> trickle, and the user decides when. Tell them before anything visually disruptive or
> score-changing goes out.

### How to resume

1. Read this file. Section 4 is the decision record, Section 5 is the specs, Section 6 is
   progress, and **Section 8m is the pre-brief for the next wave** — read that one carefully,
   it records traps that have already been paid for once, and it opens with the one decision
   Wave 7 handed forward.

   Section 8 has grown organically and its subsections are not in wave order. Where to look:

   | Looking for                                               | Section                                                                         |
   | --------------------------------------------------------- | ------------------------------------------------------------------------------- |
   | Baseline to restore if a wave needs backing out           | 8, "Wave 0 baseline"                                                            |
   | What Waves 2, 3 learned                                   | 8, "Wave 2 notes" and "Wave 3 notes"                                            |
   | Review of the plan itself, before any code                | 8b                                                                              |
   | Accessibility: the record to point CMS at                 | **8d** (method, results, and what it does _not_ establish)                      |
   | Accessibility: lessons and traps                          | 8h, 8i                                                                          |
   | Export scoring and the draft notice                       | **8e**                                                                          |
   | The workbook: what Wave 6 built and learned               | **8j**                                                                          |
   | The formulas, and how the arithmetic was proved           | **8l** (read before touching any score cell or formula)                         |
   | Why a green test suite proved little here                 | **8l**, "Two more defects" and "What this says about the verification strategy" |
   | Pre-briefs                                                | 8c (Wave 4), 8f (Wave 5), 8g (Wave 6), 8k (Wave 7), 8m (Wave 8)                 |
   | **What Wave 8 built, and why a green gate proved little** | **8n** — read before trusting any suite in this repo                            |

2. **There are no unchecked boxes left** — 96 of 96 across Waves 0-8. That instruction used to read
   "find the first wave with unchecked boxes"; it now dead-ends, which is the correct answer. Go to
   **8p, "What remains after this plan"**, which is the current position and lists everything still
   open with its reasoning.
3. Confirm the repo agrees with the checkboxes before trusting them:
   ```
   git branch --show-current && git status --short && git log --oneline -4
   npm run typecheck && npm run lint && npm test && npm run audit:code
   ```
4. Also read `docs/CODEBASE_OBSERVATIONS.md` — **46 `OBS-*` entries, 20 resolved**, referenced
   throughout this plan. Resolved: OBS-1, 2, 3, 6, 7, 17, 21, 22, 24, 25, 28, 29, 30, 31, 32, 34,
   37, 38, 39, 40 — each carrying a `**Resolved` marker naming the wave, so the file can be
   scanned rather than cross-referenced against this one. **OBS-16 is only _partially_ resolved**
   (one of its four bullets); earlier revisions of this plan listed it as closed, which was wrong.

   Wave 8 added six, all unresolved and all worth reading before touching the relevant area:

   | New    | What                                                                                                                |
   | ------ | ------------------------------------------------------------------------------------------------------------------- |
   | OBS-41 | **WCAG 2.5.3 is unenforced** — axe reports zero violations while three controls failed it                           |
   | OBS-42 | A static `role="alert"` on Landing is a live region that never fires, and breaks any "count the live regions" check |
   | OBS-43 | An unknown assessment id shows a permanent "Loading assessment…" spinner — no heading, no error                     |
   | OBS-44 | Every deploy makes offline clients re-download the workbook, because its bytes shift per build                      |
   | OBS-45 | Stat-card numbers styled as headings — hidden by the **same** missing axe tag as OBS-41                             |
   | OBS-46 | At 375px the `AppBar`, notices and footer take 57% of the viewport, leaving `<main>` 287px                          |

   OBS-41 and OBS-45 share a root cause worth acting on as its own piece of work: adding
   `experimental` to the axe tag set turns on both rules, and two Level-A criteria with real
   failures were sitting behind that single missing word. OBS-46 is the constraint behind any
   "above the fold" claim about any page on a phone, including the workbook link's.

   Also still open and worth a decision before real state data exists: OBS-33 (collapsed panels
   stay mounted) and OBS-35 (the duplicate-rating path).

5. Append what you learn to Section 8 so the next session inherits it.

### Working agreements established with the user

- **One commit per wave**, conventional-commit style, so each wave is a revertable
  checkpoint. Write the message with `git commit -F -` and a heredoc; the body explains
  _why_, not just what.
- **Invoke a sub-agent reviewer before each wave's commit.** This has caught a real
  regression or a false claim in the code every single time — three for three. Treat
  `NEEDS_CHANGES` as blocking.
- **Verify user-facing behaviour in a real browser**, not only in tests, for anything
  touching data integrity or visual output. Recipe below.
- Be explicit about what is verified versus assumed. The user values a stated limitation
  over an implied guarantee.

### Toolbox — things that cost time to rediscover

**Browser verification.** Playwright MCP is available and the fastest way to check real
rendering. Start the dev server as a background process (`npm run dev`, port 5173), then
drive it. Seed data straight into IndexedDB rather than clicking through the UI:

```js
// In browser_evaluate. DB name is 'Mita4Database'; stores are
// capabilityAssessments, orbitRatings, attachments, assessmentHistory, tags.
() =>
  new Promise((res, rej) => {
    const r = indexedDB.open('Mita4Database');
    r.onsuccess = () => {
      const tx = r.result.transaction(['capabilityAssessments', 'orbitRatings'], 'readwrite');
      tx.objectStore('capabilityAssessments').put({
        /* CapabilityAssessment shape */
      });
      tx.oncomplete = () => res('seeded');
      tx.onerror = () => rej(tx.error);
    };
  });
```

**Always clear the five stores afterwards** — the user's browser profile persists, and
leaving seed data behind pollutes their view of the tool.

**Since Wave 8 the app has a service worker, and it will serve you a stale build.** Rebuild,
reload `vite preview`, and the page you measure is the **previous** build — precached and served
from `workbox-precache-v2-http://localhost:4173/`. There is no error and nothing looks wrong; the
measurements are simply of code you replaced. Verified the hard way: a `py: '11px'` override read
back as `12px` and a responsive `h1` read back at its desktop size. Before any post-rebuild
measurement, clear it and reload:

```js
// In browser_evaluate, then navigate again.
async () => {
  for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
  for (const k of await caches.keys()) await caches.delete(k);
};
```

Cheaper still: assert a canary in the same `browser_evaluate` that takes the measurement — read
back one computed value you know only the new build produces, so a stale read fails loudly instead
of quietly.

**axe cannot evaluate colour contrast under jsdom.** It needs a canvas to sample rendered
pixels, which is what the "getContext not implemented" notice in test output means. Any
`toHaveNoViolations()` assertion in this repo silently skips contrast. Measure it in a real
browser by reading `getComputedStyle` and computing the ratio.

**Contrast over a gradient has to be measured from pixels, and the sample is easy to poison.**
axe reports `color-contrast` as `incomplete`, not passing or failing, whenever the background is a
gradient — the whole Landing hero is one, so five nodes there are permanently unevaluated. To
measure: blank the text (`el.style.color = 'transparent'` across the container), screenshot, and
sample the background under each text box, then composite the foreground yourself if the element
carries an `opacity`. Sampling a screenshot **with** the text present reads antialiased glyph edges
as background and inflates the result — that produced a 4.18:1 scare where the real value was
4.91:1. And quote one sample point per element: a first pass paired a border read at the button's
midpoint with a background read at its edge, reporting 4.17:1 for a border that is 4.00:1 where it
matters.

**Dev mode already runs axe and logs violations to the console** (`main.tsx` wires
`@axe-core/react`). Reading the browser console while clicking around is free findings.

**Test flake (OBS-27).** Running two arbitrary test files together flakes, because many
tests gate on a Dexie `liveQuery` emission they do not need. Run the **full suite** or a
**single file**; avoid arbitrary pairs. `asyncUtilTimeout` is 3000ms so failures report as
assertion differences rather than timeouts. **`testTimeout` is 15000**, raised in Wave 4
because a deliberate 4000ms `waitFor` was blowing vitest's 5000ms default under load — if
tests start reporting "Test timed out" instead of a diff, check that first. (A comment in
`src/test/setup.ts:8` still says 5000; the authoritative value is `vitest.config.ts:33`.)

**knip fails the build on unused exports.** Do not add an export before its consumer
exists — this bit twice, both times adding a constant one wave early.

**zsh, not bash.** Unquoted `$VAR` does **not** word-split, so `git checkout -- $FILES`
silently does nothing. And `$B:src/...` triggers zsh modifier expansion, mangling the path.
Quote everything or write paths literally.

**Sub-agent reviewers write to `semantic-review/`**, which is gitignored. The
`semantic_reviewer` agent **stalled twice** in Wave 5 on this workspace ("Model stream
stalled"); `general-task-execution` given an explicit adversarial-reviewer brief worked and
produced the better review of the five. Try that first rather than retrying the specialist.

**Capturing a real export.** Every export on the Import/Export page is gated behind a
state-name dialog, so clicking the button alone produces nothing. And the Playwright MCP
wrapper handles the `download` event itself, racing `page.waitForEvent('download')` — which
then times out even though the file arrived. Register `page.on('download', ...)` and save from
inside it.

**Reading a generated PDF.** Two routes, both needed:

- **Outside the suite:** extract text with `uv run --with "pypdf==5.4.0" python3 -` and a
  heredoc. Nothing PDF-related is installed locally, and `uv` avoids installing anything.
- **Inside the suite:** `generatePdfReport` returns a `Blob`, and jsdom implements neither
  `Blob.text()` nor `Blob.arrayBuffer()`, so use `buildPdfDocument(...).output()` instead — it
  returns the uncompressed document as a searchable string. **Unescape PDF string escapes
  first** (`text.replace(/\\([()\\])/g, '$1')`): a literal parenthesis is written `\(`, so
  every assertion on a bracketed score silently fails to match without it, while assertions on
  plain words pass — which reads like an exporter bug rather than a test bug.

**A substring assertion over a PDF is usually reachable another way.** Wave 5 shipped three
that could not fail: a dimension name that the executive summary's intro sentence prints in
every report, an `Areas` table header that another table already emitted, and `DRAFT` which
the footer supplied while the assertion was meant to cover the cover band. Prefer asserting
through an extracted pure function, anchoring the search past a unique heading, or counting
occurrences against page count — **and prove each assertion by breaking the code it covers.**

**Pre-commit hooks** run prettier and eslint via lint-staged and will reformat staged
files, so run `npx prettier --write` on what you touched before committing to keep the
commit and the working tree identical.

## 2. Executive Summary

Four workstreams, one gate. CMS internal clearance ("clearance" here means internal
review, not the 12-week PRA process) covers both the web tool and a new offline
spreadsheet. Pilot state recruitment is already underway and the schedule is being
reverse-engineered off this plan's delivery date.

| #   | Workstream                                                    | Why                                                               | Size         |
| --- | ------------------------------------------------------------- | ----------------------------------------------------------------- | ------------ |
| A   | Red draft disclaimer banner on every page and in every export | AJ requires unambiguous draft markers                             | Small        |
| B   | Accessibility audit and remediation (508 + WCAG 2.1 AA)       | Same reviewer gate as the spreadsheet                             | Small–medium |
| C   | XLSX workbook generated from the data model in CI             | Offline alternative to the tool; must be 508 compliant            | Medium–large |
| D   | Selected fixes from `CODEBASE_OBSERVATIONS.md`                | Content accuracy and data integrity before real states enter data | Small        |

Workstream D exists because Shelley and Chris are reviewing the dev branch **this
week**. Anything that makes the tool look wrong or lose their input during that review
generates noise and rework, so it goes first.

### Standing constraint: parity

The workbook must match the tool's content, functionality, and accessibility (Decision 7).
"Functionality" specifically includes the scoring rules — a state must not get one score
from the tool and a different score from the spreadsheet with the same inputs. This is
the highest-risk part of workstream C and Section 5.4 addresses it directly.

---

## 3. Sources

| Source                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Authority                                                                                                 |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Meeting transcript, September 9, 2026 (Nick, Shelley, Sean)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Commitments and design direction. Cited as `[mm:ss]`                                                      |
| Nick's follow-up answers, September 9                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Resolved Decisions 4–9                                                                                    |
| `docs/CODEBASE_OBSERVATIONS.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Audit of September 9, 2026                                                                                |
| `feat-xlsx-workbook-generation` @ `b0fc55d`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Prior experiment; reference implementation for workstream C                                               |
| [Section508.gov — accessible spreadsheets](https://www.section508.gov/blog/accessibility-bytes/accessible-spreadsheets/), [FEMA Excel 2016 checklist](https://training.fema.gov/devres/docs/508/checklists/AEDCOP%20MS%20Excel%202016%20Accessibility%20Checklist.pdf), [CMS Excel 508 guide](https://www.cms.gov/research-statistics-data-and-systems/cms-information-technology/section508/downloads/508-how-to-guide-excel2010.pdf), [Microsoft accessibility best practices](https://support.microsoft.com/en-us/office/accessibility-best-practices-with-excel-spreadsheets-6cc05fc5-1314-48b5-8eb3-683e49b3e593) | Spreadsheet 508 requirements in Section 5.3. Content rephrased for compliance with licensing restrictions |

The transcript double-logs speakers — `[You]` lines often echo `[Others]`. Attribution
below follows first occurrence. Notably "I would do it in red" is Shelley's, not Nick's.

---

## 4. Decision Log

### Resolved

| #   | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Source                                                   |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| 1   | Draft banner is red, at the top, on every page. Precedent: the draft guidance site used red                                                                                                                                                                                                                                                                                                                                                                                                     | Shelley `[07:14]`                                        |
| 2   | Copy conveys "draft version of the tool, still being piloted." Exact prior wording not required                                                                                                                                                                                                                                                                                                                                                                                                 | Shelley `[07:08]`                                        |
| 3   | Banner is visible but not alarming — no flashing, no bright-red alarm styling                                                                                                                                                                                                                                                                                                                                                                                                                   | Nick `[06:20]`                                           |
| 4   | **The draft notice also appears in exports** (PDF, CSV, XLSX) for consistency                                                                                                                                                                                                                                                                                                                                                                                                                   | Nick, follow-up                                          |
| 5   | **The notice must be easily removable** so CMS can drop it at go-live                                                                                                                                                                                                                                                                                                                                                                                                                           | Nick, follow-up                                          |
| 6   | **Blank workbook only.** Live-data XLSX export and XLSX import are deferred — they over-complicate this delivery                                                                                                                                                                                                                                                                                                                                                                                | Nick, follow-up; aligns with `[12:34]`                   |
| 7   | **Focus is parity** with existing content, functionality, and accessibility                                                                                                                                                                                                                                                                                                                                                                                                                     | Nick, follow-up                                          |
| 8   | **No rebase of `feat-xlsx-workbook-generation`.** It was an experiment; harvest what is useful                                                                                                                                                                                                                                                                                                                                                                                                  | Nick, follow-up                                          |
| 9   | **Accessibility audit is in scope**, bundled with the banner work                                                                                                                                                                                                                                                                                                                                                                                                                               | Nick, follow-up; committed at `[22:15]`                  |
| 10  | Workbook download is linked from the homepage as well as Import/Export                                                                                                                                                                                                                                                                                                                                                                                                                          | Nick, follow-up                                          |
| 11  | Deployment stays a manual `workflow_dispatch` of the Pages action from the feature branch                                                                                                                                                                                                                                                                                                                                                                                                       | Nick, follow-up                                          |
| 12  | Workbook is generated at build time as a Node script, not client-side. Keeps ExcelJS out of the browser bundle as a devDependency                                                                                                                                                                                                                                                                                                                                                               | Plan recommendation, accepted `[25:33]`                  |
| 13  | Banner removal is controlled by `VITE_DRAFT_MODE`, defaulting to draft-on. Follows the existing `VITE_BASE_PATH` / `VITE_GITHUB_REPO_URL` precedent                                                                                                                                                                                                                                                                                                                                             | Plan default under Decision 5                            |
| 14  | Workbook filename is stable and unversioned so the guidance-site URL never breaks; the version is printed inside the workbook                                                                                                                                                                                                                                                                                                                                                                   | Plan default; addresses Shelley `[10:08]`                |
| 15  | **Two notices, top and bottom, with CMS-supplied wording reproduced verbatim.** Supersedes Decisions 1-3's "draft version, still being piloted" copy. Bottom notice carries the PRA statement; exports carry the full statement. See the Copy block in 5.1                                                                                                                                                                                                                                      | CMS, September 11                                        |
| 16  | **Workbook notice treatment is "option D": short line in `A1` of every sheet, short line in the print footer of every sheet, full PRA text on `00_README` as sheet content and in the `description` document property.** The footer was specified as the full line and **cannot** be — Excel's limit is 255 characters and the assembled full line is 441 (OBS-40). Since Decision 15 forbids shortening the CMS wording, the full statement cannot be an Excel footer under any implementation | Nick, September 14; footer constraint measured in Wave 6 |
| 17  | **The workbook surfaces the enterprise-wide ORBIT dimension figure, on a new `09_Dimension_Scores` sheet.** Three rows (B/I/T) with As-Is, To-Be and a visible Areas denominator, mirroring the PDF executive summary's table so the two artifacts agree in shape. Registered in Wave 6; built in Wave 7                                                                                                                                                                                        | Nick, September 14                                       |

### Resolved — formerly pending

| #      | Decision                                                                                                                                                                                                                                                                                                                                                                        | Source          |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| **P1** | **Aggregate dimensions: full parity (option a).** Omit Information input rows for Data Management areas and Technology input rows for Technology Management areas; compute the aggregate on the profile sheet by formula, mirroring `getAggregateDimensionScore`. Fallback if the formulas prove brittle: show "—" with an explanatory note, and record the change in Section 8 | Nick, follow-up |
| **P2** | **Accessibility: fix what is safe, report the rest, no formal ACR.** Build to WCAG 2.1 AA and verify with our own automated plus manual testing. The goal is an artifact that reasonably passes accessibility testing; CMS runs the official 508 review. **Applies to both the app and the workbook**                                                                           | Nick, follow-up |
| **P3** | **One branch: `feature/pilot-clearance`**, cut from `feature/capability-model-v4`. Single developer, single deployable; the manual dispatch switches to this branch                                                                                                                                                                                                             | Nick, follow-up |

Consequence of P2 for the workbook: there is no axe equivalent for XLSX, so the 508
requirements in Section 5.3 become **assertions in the test suite** — no merged cells,
one header row per table, no blank rows or columns inside tables, document properties
populated, no floating objects, and editable columns labeled in text rather than by fill
colour alone. Excel's own Accessibility Checker is the manual complement (Wave 7).

### Resolved in Wave 8 — the last open question

| #      | Question                                                                                                                                                                                                                                                                                                                                                                     | Outcome                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P4** | **The app is advertised as an offline-first PWA but has no service worker** (OBS-22). `vite-plugin-pwa` is installed and unused, and `knip.json` silences it. Landing and Guide both promise "Works Offline — full functionality after initial load." A reload without network fails. States are being recruited on this premise now. Wire up the PWA, or remove the claims? | **Wired up, as recommended.** `registerType: 'prompt'`, the offline workbook precached, and the claim verified by stopping the server and reloading — a deep link to `/dashboard` served from cache with `transferSize` 0. The `knip.json` silencer is removed. Copy on Landing and Guide was still tightened, because "full functionality after initial load" did not tell a user they must open it once online. Full record in OBS-22 |

**No questions remain open.** Everything in this section and the two above is decided.

### Noted, not decided

Two of the four below have since been settled and are struck or marked as such, rather than deleted,
because the reasoning is the useful part. **The two that genuinely remain open are OBS-5 and OBS-35**,
and both want deciding before real state data exists — see 8p.

- **OBS-5 (stale enterprise-domain scores).** A finalized Data Management score does not
  change when other domains are later finalized, but the results table recomputes the
  aggregate live, so the two can disagree. During a pilot, states finalize over weeks —
  this will be visible. Needs a product decision (recompute on read, or label as a
  point-in-time snapshot) before the pilot, but is not code work in this plan.
- **OBS-18 (placeholder descriptions).** 14 areas still carry
  `[Placeholder — pending updated Capability Reference Model]`. Deliberate, pending
  NextGen's document. **Handled:** called out to Shelley in the sent handoff email, with an
  explicit request not to spend review time on them. Still open as an `OBS-*` item, since the
  placeholders remain until NextGen's document lands — but it no longer needs a decision.
- **OBS-35 (duplicate ratings from arrow-key level selection).** Native radio groups select
  as focus moves, so arrowing from Level 1 to Level 5 fires four saves in as many
  milliseconds over a read-then-write upsert, and the compound index in `db.ts` is not
  unique so the database will not reject a duplicate. Not reproduced — six rapid presses did
  not trigger it — but the failure mode is duplicate `orbitRatings` rows for one aspect,
  which would double-count in a score a state submits to CMS. **Decide before real state data
  exists.** The durable fix is a unique index, which means a Dexie version bump, and every
  bump in this project has been a clean break that clears all tables — so it wants to ride
  along with a migration that is happening anyway.
- ~~**`src/data/templates/maturity-profile-template.csv`** may be retirable~~ — **resolved in Wave
  8: deleted.** Shelley asked whether the manual blank CSV profile could be "negated" now that the
  workbook produces one (`[14:38]`–`[15:30]`). Checking before deleting produced something better
  than an answer: the file had zero code references and lived in `src/data/templates/` rather than
  `public/`, so it was never bundled and no user could ever have downloaded it — the premise that
  states were using it was never true of the deployed tool. Flagged in the sent email so she can
  object; git retains it either way.

---

## 5. Specifications

### 5.1 Draft banner

**Placement.** Directly below the `AppBar` in `Layout.tsx`, above `<main>`, so it is
inside every route with no per-page work.

**Critical constraint.** `Layout.tsx` is `height: 100vh; overflow: hidden`, and the
assessment page is a fixed-height working area with internal scrolling (its footer is
already suppressed). The banner permanently reduces that space. Requirements: single
line, target 32–36px, no icon, no dismiss control, `flexShrink: 0`.

**Color.** `theme.palette.error.dark` (`#b0142f`) with white text — roughly 7:1 contrast.
`error.main` (`#e31c3d`) computes to about 4.7:1, which passes AA with almost no margin.
Verify measured values during Wave 4 rather than trusting arithmetic.

**Accessibility.** Do **not** use `role="alert"` — it is assertive and would interrupt
screen reader users on every navigation. Use a labeled region read in document order.
This matters more than usual because Wave 4 claims an accessibility audit.

**Copy — superseded September 11 by CMS-supplied wording (Decision 15).** What Wave 3
shipped was:

> **Draft** — This is a draft version of the MITA 4.0 State Self-Assessment Tool. It is
> still being piloted and is subject to change.

CMS then asked for a notice at the top **and** the bottom of every page, with specific
text for each. Both are reproduced verbatim in `src/constants/draftNotice.ts` and **must
not be edited for length or consistency.** The two bodies genuinely differ — the top says
"in support of MITA 4.0 pilot activities", the bottom says "in support of pilot
activities" and adds the PRA statement — so neither can be derived from the other:

> **Top.** Predecisional Pilot Materials: These materials are preliminary and are being
> made available for limited review and testing in support of MITA 4.0 pilot activities.

> **Bottom.** Predecisional Pilot Materials: These materials are preliminary and are being
> made available for limited review and testing in support of pilot activities. They do not
> represent final agency policy or requirements and may not be used to conduct an
> information collection subject to the Paperwork Reduction Act (PRA) unless and until
> applicable PRA requirements, including OMB approval where required, have been satisfied.

**Removal mechanism (Decision 13).** One module exports both the flag and the text so
every surface — app, PDF, CSV, XLSX — reads from the same place:

```ts
export const IS_DRAFT = import.meta.env.VITE_DRAFT_MODE !== 'false';
// The rest live in constants/draftNotice.ts, which stays free of `import.meta`:
//   DRAFT_NOTICE_LABEL      'Predecisional Pilot Materials'
//   DRAFT_NOTICE_BODY       top body
//   DRAFT_NOTICE_FULL_BODY  bottom body, with the PRA statement
//   DRAFT_NOTICE_LINE       label + full body, single line, for exports
//   DRAFT_NOTICE_SHORT_LINE label + top body, for space-constrained surfaces
//   DRAFT_TITLE_MARKER      'Predecisional', for document.title
```

The label is no longer usable as a title suffix at 29 characters, hence
`DRAFT_TITLE_MARKER`. The internal names keep saying "draft" on purpose:
`VITE_DRAFT_MODE` is a deploy-workflow variable and renaming it would break that contract,
so internal naming and user-facing copy are deliberately decoupled.

Default-on means forgetting to set the variable fails toward showing the disclaimer.
Go-live is then one workflow variable, no code change. The Node workbook script reads
`process.env.VITE_DRAFT_MODE` for the same result. `src/vite-env.d.ts` needs the
`ImportMetaEnv` declaration.

**Export surfaces.**

| Artifact   | Placement                                                                           |
| ---------- | ----------------------------------------------------------------------------------- |
| PDF        | Cover page band, plus the per-page footer line                                      |
| CSV        | A notice line above the existing `MITA 4.0 Maturity Profile: <state>` header        |
| XLSX       | Prominent row on the README sheet; also the workbook `description` property         |
| JSON / ZIP | A `draftNotice` field in the export envelope, and a line in the ZIP `manifest.json` |

CSV placement is constrained: `parseMaturityProfileCsv` reads the state name from `lines[0]`
specifically (`csvExport.ts:141-143`), so a notice **above** that line makes every parsed
state name `Unknown`. Put the notice on the line _after_ the
`MITA 4.0 Maturity Profile: <state>` header, padded to full width with the existing `,,,,,`
convention, and teach the parser to skip it. Worth knowing: `parseMaturityProfileCsv` is not
exported from `services/export/index.ts` and has no consumer outside its own test, so the
round-trip constraint is currently hypothetical — but leaving the parser broken would trap
whoever wires CSV import later.

**Skip-link gap.** `Layout.tsx:43` skips to `#main-content`, so a banner above `<main>` sits
outside that target and skip-link users never encounter it. Putting the banner inside
`<main>` is not viable — `<main>` scrolls on non-assessment pages, so the notice would scroll
away. Resolution: keep the banner above `<main>` and additionally append `(Draft)` to the
document title, which assistive tech announces on load regardless of the skip link.

### 5.2 Workbook structure

Build-time Node script → `public/` → Vite copies to `dist/`. Sheet design adapted from
the reference implementation, with the 508 corrections in 5.3 and the v4 model applied.

| Sheet                         | Rows  | Purpose                                                                                         |
| ----------------------------- | ----- | ----------------------------------------------------------------------------------------------- |
| `00_README`                   | ~24   | Draft notice, model + app version, generation date, how to use, sheet index, Info Mgmt guidance |
| `01_Maturity_Levels`          | 6     | Levels 1-5 plus N/A, names and descriptions                                                     |
| `02_Capability_Reference`     | 72    | One row per area; domain name, layer, and domain description repeat as columns                  |
| `03_ORBIT_Criteria_Reference` | 205   | 41 aspects x 5 levels: criteria text and suggested documentation                                |
| `04_Assessment_Input`         | 1,625 | One row per assessable aspect per standard capability area                                      |
| `05_Organizational_Input`     | 15    | The `enterprise-governance` aspects, with section as a column                                   |
| `06_Maturity_Profile`         | 216   | One row per area and dimension: 213 standard (71 x 3) + 3 organizational section rows           |
| `07_Area_Scores`              | 72    | One row per capability area: score, completion, domain                                          |
| `08_Domain_Scores`            | 15    | 14 domain rows + 1 overall row                                                                  |
| `09_Dimension_Scores`         | 3     | Enterprise-wide B/I/T figure, As-Is and To-Be, with the Areas denominator (Decision 17)         |

Row counts computed from `src/data/*.json`; regenerate if the model changes.

`04_Assessment_Input` is 1,625 rather than 71 x 26 = 1,846 because aggregate-dimension
rows are omitted under P1(a): Data Management's 10 areas skip 10 Information aspects,
Technology Management's 11 areas skip 11 Technology aspects.

**Every input and profile row carries both As-Is and To-Be columns.** `targetLevel` is a
first-class feature in the tool — stored per rating, edited via the per-row To-Be control,
surfaced in results, and already a column in the CSV maturity profile — so Decision 7 puts
it in scope.

**Score rollups live on their own sheets, not as extra rows in the profile.** `06` is one
row per area-and-dimension. Area, domain, and overall rollups go on `07`, `08` and `09`, each a
clean single-header-row table. Technology sub-dimension means are extra **columns** on `06`,
populated only on Technology rows — no extra rows, no merged cells.

**`06` is 216 rows, not the 228 stated earlier.** This section previously specified "213
standard rows + 15 organizational aspect rows", which contradicted its own "one row per
area-and-dimension" in the same paragraph. Resolved in Wave 7 in favour of the uniform shape:
213 standard dimension rows plus **3 organizational section rows**.

The 15-aspect version came from mirroring the CSV profile, which emits organizational aspects
individually. But the CSV emits them under `Section:` **label rows** — precisely the shape 5.3
forbids carrying forward — so the workbook cannot mirror that layout regardless. And on a sheet
whose purpose is _computed_ values, an aspect row would be a copy of a cell on
`05_Organizational_Input` rather than a computation, while the section mean is genuinely
computed and is what the area score needs. Per-aspect organizational detail stays on `05`,
where a state enters it.

**`03` has no "question" column.** All 205 per-level `questions` arrays in the model are
empty (OBS-23), so such a column would be entirely blank and would fail the
no-empty-columns rule in 5.3.

**Information Management parity.** 11 areas carry `informationManagement: true` and show
in-app guidance to assess information maturity once in that area and skip the Information
dimension in the domain's other areas. Without an equivalent, a state filling in the
workbook produces different input data than the same state using the tool. `02` and `04`
therefore carry an `Information Management` flag column, and `00_README` reproduces the
guidance text.

**Carry forward from the reference implementation:** the declarative `constants.ts`
column/header/width model (important — Shelley's team may edit the generated file and
send it back for folding in, `[20:03]`–`[20:29]`, so layout should be config not code);
level dropdowns via data validation with `N/A` as a token; hidden stable ID columns;
sheet protection with `selectLockedCells: true`; the `AVERAGEIFS` / `TEXTJOIN` formula
techniques.

**Do not carry forward:** `categoryName` / `categoryId` columns (the tier was deleted in
v4); the three-separate-org-types model (v4 has one area with three sections);
`buildProfilePlan`'s `section` / `domain` / `area` / `blank` label-row shape (see 5.3).

### 5.3 508 requirements for the workbook

Non-negotiable, and the reason the previous spreadsheet was rejected. Shelley's account:
a visually polished workbook was rewritten to look "like something from 1986," with
merged cells, images, and colors specifically called out (`[20:53]`–`[22:09]`).

| Requirement                                         | Implementation                                                                                                                                                                                                                   |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No merged cells in data tables                      | Remove all 5 `mergeCells` calls. CMS guidance permits merging in the first row only; simplest to avoid it entirely                                                                                                               |
| Single header row per table, no multi-level headers | One frozen header row; no stacked or spanning headers                                                                                                                                                                            |
| No blank rows or columns inside tables              | Replace the reference implementation's `blank` spacer rows with real `Domain` / `Capability Area` / `Dimension` columns. This also makes autofilter work and simplifies future import                                            |
| Information not conveyed by color alone             | Append "(enter value)" to editable column headers rather than relying on the yellow `INPUT_FILL`                                                                                                                                 |
| Descriptive sheet tab names                         | Keep the numeric-prefix convention; hyphens and underscores are acceptable                                                                                                                                                       |
| No images or floating objects                       | None. Charts belong in the tool, not the workbook                                                                                                                                                                                |
| Document properties set                             | `title`, `subject`, `description`, `creator`, `category`                                                                                                                                                                         |
| Header/footer info duplicated in-sheet              | Anything in print headers also appears as sheet content                                                                                                                                                                          |
| Locked cells remain reachable by AT                 | Keep `selectLockedCells: true` — disabling it hides reference content from keyboard and screen reader users                                                                                                                      |
| ID columns are visible, not hidden                  | Hidden columns inside a table range conceal content from assistive tech and get flagged. Put the stable ID columns at the far right, narrow, with real headers, and **outside** the named table range — do not use column hiding |
| Defined table ranges                                | Named ranges per input table, aiding both navigation and formulas                                                                                                                                                                |

Flattening the profile sheet is the key move: it is simultaneously the 508 fix, better
for screen readers, and better for a future import. The old file's ugliness came from
retrofitting a merged-cell presentation layout; building flat from the start avoids it.

### 5.4 Scoring parity — the real risk

The workbook formulas are a second implementation of the tool's scoring. **Rounding happens
at different points in different rollups**, and getting that wrong is how the workbook
silently disagrees with the tool. Authoritative source is `src/services/scoring.ts` plus
`useCapabilityAssessments.finalizeAssessment`.

| Rollup                    | Rule                                                                                                                                                                                                     | Rounding                                                 |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Aspect                    | The entered level                                                                                                                                                                                        | n/a                                                      |
| Non-Technology dimension  | Mean of assessed aspect levels                                                                                                                                                                           | round once                                               |
| **Technology dimension**  | Mean of the **two sub-dimension means** — not a flat mean of 11 aspects                                                                                                                                  | sub-dimension means **unrounded**, round once at the end |
| Standard area             | Mean of its dimension scores                                                                                                                                                                             | dimension scores **already rounded**, then round         |
| **Organizational area**   | Mean of the three section means; sections with nothing assessed are excluded, so sections weigh equally despite 6/5/4 aspect counts                                                                      | section means **unrounded**, round once at the end       |
| Aggregate dimension       | Mean of the per-area dimension scores across non-enterprise areas                                                                                                                                        | per-area scores **already rounded**, then round          |
| Domain                    | Mean of its areas' scores                                                                                                                                                                                | stored (rounded) area scores, then round                 |
| Enterprise-wide dimension | Mean of the per-area dimension scores, finalized areas only. Aggregate dimensions are **not** folded in — an aggregate derives from these same per-area scores, so counting it double-counts those areas | per-area scores **already rounded**, then round          |
| **To-Be, every rollup**   | Identical to the As-Is rule at the same level, reading `targetLevel` instead of `currentLevel`. An absent `targetLevel` is excluded exactly like unassessed                                              | identical to the As-Is row above it                      |

Exclusions, uniform everywhere **in averages**: unassessed (`0`) and N/A (`-1`) are both left
out. A dimension with no assessed aspects is **dropped** from the area average rather than
counted as zero — Excel's `AVERAGE` over blanks matches this, but the test suite must assert
it rather than assume it.

### 5.4.1 Three rules the table above omits

Added in Wave 7 after reading every rollup implementation. None contradicts the table; each is
a rule a formula needs and could not get from it.

**Completion percentage — and N/A counts here, unlike everywhere else.** `useScores.ts:112`
counts ratings where `currentLevel > 0 || currentLevel === -1`, so **an N/A determination
counts as assessed for completion** while being excluded from every average. Read literally,
the exclusions paragraph above points the wrong way for this one column. The denominator is
`getAssessableAspectCountForArea`: **26** for an ordinary area, **16** for a Data Management
area, **15** for a Technology Management area, **15** for `enterprise-governance`. Then
`Math.round((assessed / total) * 100)` to an integer percent.

In Excel that is "count cells that are non-blank", because blank ≡ no rating row ≡ level 0,
and the `N/A` token is non-blank. `COUNTA` over the level column, not `COUNTIF(">0")`.

**The tool's single overall score is not a mean of domain scores.** `getOverallScore`
(`useScores.ts:174`) averages the **stored area scores across every finalized area in every
domain**, each area counting once. Averaging the 14 domain scores instead would weight small
domains more heavily and produce a different number. The "Enterprise-wide dimension" row above
is the per-dimension PDF figure, a different quantity from this.

**For the two enterprise domains, one of an area's three dimension scores is the aggregate.**
`finalizeAssessment` injects it with `dimensionScores.set(aggregatedDimension, aggregateScore)`
_after_ computing the manual ones, so the aggregate replaces rather than supplements — and if
the aggregate is `null` the dimension is absent and the divisor drops to 2. The "Standard area"
row does not say this; it is only recoverable by reading Decision P1 alongside it.

Also worth stating precisely, because the wording above is looser than the code: the
aggregate's population filter is `status === 'finalized' && !isEnterpriseDomain(domain)`, so
**both** enterprise domains are excluded from **both** aggregates. And the enterprise-wide
row's "aggregates are not folded in" holds by _absence of ratings_ rather than by a filter —
`summariseDimensionsAcrossAreas` has no `isEnterpriseDomain` guard, so imported or legacy data
carrying an Information rating on a Data Management area would silently be counted.

**The aggregate dimension has no To-Be value.** `generateStandardAreaProfile` sets
`toBeAvg = ''` on an aggregate row and puts `(Aggregate from N assessments)` in its notes. The
workbook must leave the aggregate's To-Be cell empty rather than computing one, or it invents a
figure the tool does not have.

**Resolved — there is now exactly one rule to mirror.** This section previously recorded a
blocker: the tool computed the Technology dimension two different ways and the workbook could
not mirror both. That is discharged, and it took three waves rather than one.

| Wave | What it fixed                                                                                                                                                      |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1    | OBS-21 — the results table double-rounded sub-dimension means, disagreeing with `calculateDimensionScore` by 0.1                                                   |
| 5    | OBS-25 — both export paths, the PDF executive summary, and the live To-Be column all flat-averaged 11 Technology aspects. Five sites in total, plus a latent sixth |
| 5    | To-Be gained a canonical rule at all, via `calculateDimensionScore(..., 'targetLevel')`. Before this there was none, and each caller averaged `targetLevel` itself |

`calculateDimensionScore` in `src/services/scoring.ts` is the single canonical
implementation and the one the workbook formulas mirror. `summariseDimensionsAcrossAreas` in
`src/services/export/pdfExport.ts` is the reference for the enterprise-wide row above.

**Known accepted divergences.** The workbook has no concept of assessment _status_, but two
tool rules depend on it: aggregate dimensions count only **finalized** assessments, and
domain scores count only **finalized** areas. A workbook aggregate necessarily includes
everything entered. This is unrepresentable rather than fixable, so it gets documented in
`00_README` and in the handoff note rather than engineered around.

**The aggregate formula must average per-area scores, not raw input cells.** A flat
`AVERAGEIFS` over every Information input cell weights areas by how many aspects they
filled in; the tool weights each area equally. The formula therefore averages the 50
per-area Information cells on `06_Maturity_Profile`, not the input range.

**Honest limitation.** ExcelJS does not evaluate formulas, so no unit test can assert that
a cell computes 3.4. Mitigation, strongest first:

1. Write a JS reference implementation of each formula's intent, test it against
   `calculateDimensionScore` over shared fixtures, and generate the formula strings from
   that same spec.
2. Snapshot-test the generated formula strings so range and criteria drift is caught.
3. Content-fidelity tests: every domain, area, dimension, sub-dimension, and aspect present
   with correct IDs and counts — the checks promised at `[19:39]`.
4. Manual confirmation in Excel. Must be requested of Shelley's reviewers as **arithmetic**
   validation, not look-and-feel, because steps 1-3 cannot cover it.

**Excel `ROUND` and JS `Math.round(x * 10) / 10` are not equivalent** on decimal halfway
values, because the JS form operates on accumulated binary floats. `4.05 / 3` yields `1.3`
in JS and `1.4` from Excel's `ROUND(...,1)`. Step 1 cannot catch this — it shares the JS
primitive. Wave 7 therefore includes a halfway-value fixture set for manual Excel
comparison, and records which primitive is authoritative.

### 5.5 Delivery and CI

- `scripts/generate-xlsx-workbook.ts` reads `src/data/capabilities.json` and
  `src/data/orbit-model.json`, writes `public/mita-4.0-self-assessment-workbook.xlsx`.
  **`.ts`, not the `.mjs` this section originally specified** — Node 22.18 strips types
  natively, so it runs directly with no loader while still being covered by `typecheck`,
  `lint` and `knip`. The cost is a Node floor of 22.18, which both workflows now pin;
  they were on Node 20, where the generator cannot run at all
- Run it with `npm run generate:workbook`. Set `SOURCE_DATE_EPOCH` for a reproducible
  artifact: with it fixed, two runs produce byte-identical _unzipped content_, though the
  `.xlsx` bytes still differ because ExcelJS stamps ZIP entry times it does not expose. So
  a CI drift check must unzip and diff the parts, or just regenerate and run the suite —
  diffing the `.xlsx` itself reports a change on every run
- `npm run build` runs the generator first, so local and CI builds are identical.
  **Done in Wave 8** via a `prebuild` script, with `predev` doing the same for the dev server
  so the in-app download links resolve in development too. An earlier revision of this line
  said `deploy.yml` therefore "needs no XLSX-specific step" — it does have one, deliberately:
  both workflows run `npm run verify:workbook-artifact` after the build so a site whose
  download links 404 fails the deploy instead of shipping
- Generated artifact is gitignored — it is a build output, not source
- `ci.yml` runs the generator plus its validation tests so PRs catch model drift. The
  generator runs as a side effect of `prebuild`, which is not redundant with `npm test`: the
  suite imports the generator's modules through Vite's transform and builds a workbook in
  memory, so it would not catch a failure of Node's native type stripping — the reason 22.18
  is the floor
- In-app download links: **Landing hero (primary)**, Import/Export, Guide.
  **Done in Wave 8, repositioned immediately after the deploy.** On Import/Export it is a full-width
  section of its own rather than a third card among "Other Export Formats" — every card there
  serialises the state's own data and is gated on `hasData`, so filing a blank template among them
  would imply it contained their assessment. All three links carry the file type and approximate size
  as an `aria-describedby` **description** pointing at a visible caption, not in the accessible name:
  a download is a commitment and the visible label alone says neither, but folding the size into an
  `aria-label` broke WCAG 2.5.3 (see the comment in `ImportExport.tsx`). The URL is built from
  `import.meta.env.BASE_URL`, verified to resolve under the Pages subpath rather than the origin —
  the same defect class as OBS-28
- **Why "primary" moved from Import/Export to the Landing hero.** Measured on the deployed site,
  the three links sat at 80%, 92% and 81% of the way down their respective pages, and nothing above
  the fold on any page mentioned Excel. Naming Import/Export the primary placement was a claim the
  layout did not support, and it was the wrong page besides: the workbook exists for someone who
  **cannot use a browser-based tool at all**, and that person has no reason to navigate to a page
  about exporting data from the tool they have already concluded they cannot use. So the hero now
  carries it, as the deliberately _secondary_ affordance beside "Get Started" — outlined against the
  filled primary, second in the tab order, because most states can use the browser tool and this
  should not read as an equal recommendation. The old lower-Landing link is gone rather than kept
  in both places: it repeated the same visible text for the same audience two screens apart.
  Import/Export keeps its section and gains an above-the-fold link pointing down to it
- **What the repositioning actually achieved, stated narrowly.** Measured against the real scroller
  on a local build: the hero link is 26% down the page at 1280×720 with 128px of slack, and 16% down
  at 375×667 — where it is still 170px below the fold. On a phone "above the fold" is not reachable
  from this component: the `AppBar`, the two CMS notice bands and the footer take 380px of 667,
  leaving `<main>` 287px (**OBS-46**). The hero was made responsive anyway, which moved the link from
  80% of the page to 16%; the remaining gap needs a responsive nav, which is its own piece of work.
  Recorded this way because the first version of the comment claimed the fold outright, and one
  viewport check would have contradicted it
- **The Import/Export pointer is a plain fragment anchor, plus a mount effect that makes the URL
  work.** The anchor alone was not enough: the app is client-rendered, so the browser resolves the
  fragment before the target exists, and `ScrollToTop` then resets `<main>` on mount — meaning
  `…/import-export#offline-workbook-section` opened cold, reloaded, or shared with a colleague landed
  at the top of the page with an unexplained hash. The effect handles that case, keyed on
  `useLocation().hash` and deferred a frame so it does not race `ScrollToTop`. The section carries
  `tabIndex={-1}`, which is what lets the browser move focus there and not just the viewport.
  **Rejected: intercepting the click with `preventDefault` and scrolling by hand.** It was the first
  attempt, and it could not do the job it was for — `preventDefault` also fires on Cmd/Ctrl+click, so
  asking for a background tab yanked the current page down instead, while middle-click bypassed the
  handler entirely and opened the un-handled URL anyway. It broke the good interactions without
  preventing the bad URL. Verified on the anchor-plus-effect version: cold load, plain click and
  Cmd+click into a background tab all end scrolled to the section with focus on it, and the original
  tab does not move on a Cmd+click. One consequence to know: a plain click now adds a history entry,
  and Back clears the hash without restoring the scroller, since `ScrollToTop` keys on `pathname`
- ExcelJS is a `devDependency`. It never enters the browser bundle of an offline-first
  PWA, and its supply-chain exposure is limited to CI. Worth knowing: upstream `exceljs`
  has been dormant since v4.4.0 (October 2023). Still MIT and widely used; acceptable for
  a build-time-only dependency, and active forks exist if fixes are ever needed

---

## 6. Waves

Each wave ends with `npm run typecheck && npm run lint && npm test` green. Do not start
the next wave with a red repo.

### Wave 0 — Setup and baseline

- [x] Resolve **P3** (branch strategy); create the branch — `feature/pilot-clearance`
      cut from `feature/capability-model-v4` @ `33e7963`
- [x] Record baseline (see Section 8 for the recorded numbers)
- [x] `.gitignore`: add the generated workbook path. `temp-transcript.md` no longer needs
      an entry — the user deleted it and keeps a backup outside the repo
- [x] Confirm `deploy.yml` supports `workflow_dispatch` from an arbitrary branch
- [x] Sub-agent review of the two planning docs before building on them — see Section 8b.
      Found 14 issues; all corrections applied. Produced OBS-21, OBS-22, OBS-23 and P4

### Wave 1 — Content accuracy (do first; Shelley and Chris are reviewing now)

- [x] **OBS-1** — organizational Enterprise Architecture aspects render as raw IDs in
      Results. Fix `DimensionScoresTableWithTarget.tsx:118` **and**
      `DimensionScoresTable.tsx:89`; derive the check from `ORGANIZATIONAL_SECTIONS` /
      `getOrganizationalAssessmentTypes()` instead of a hand-written literal union so a
      fourth section cannot reintroduce it
- [x] Add a regression test covering all three sections, `enterprise-architecture` included
- [x] **OBS-21** — the Technology dimension score is computed two ways that disagree by 0.1
      (`calculateDimensionScore` uses unrounded sub-dimension means;
      `getDimensionScoresForAssessment` rounds them first). Make `useScores` delegate to the
      canonical `calculateDimensionScore` for the dimension roll-up while still displaying
      rounded per-sub-dimension values; same fix shape for the organizational section path.
      **Blocks Wave 7** — the workbook cannot mirror two different answers
- [x] Regression test pinning the divergent case: Infrastructure `2,2,2,2,1,1` plus
      Application `1,1,1,1,1` must yield the same Technology score in both paths
- [x] **Organizational section path: deliberately left as-is.** `getOrganizationalScoresForAssessment`
      still rounds each section mean while `finalizeAssessment` averages unrounded ones. That
      follows the same display-rounds/scoring-does-not rule as the Technology fix, and nothing
      recomputes an area score from the displayed section values, so there is no contradictory
      pair on screen. Recorded rather than changed
- [x] **OBS-17** — correct `.kiro/steering/development-standards.md`: 14 domains / 72
      areas / 3 layers; remove the `isCategorizedDomain` and `CategorizedCapabilityDomain`
      references (deleted in v4); correct "Currently at version 1" — `db.ts` defines schema
      versions 1 through 4; note that `UI.DEBOUNCE_MS = 300` is not what `AspectCard` uses
      (it passes 500 literally)
- [x] **OBS-16 (partial)** — `Dashboard.handleExportAssessment` is a "coming soon" stub.
      Either route it to Import/Export or remove the menu item; do not leave a dead end
      during review week
- [x] Verify green; push so it appears in the reviewed build

### Wave 2 — Pilot data integrity

- [x] **OBS-6** — `updateNotes`, `updateBarriers`, `updatePlans` in `useOrbitRatings.ts`
      silently discard input when no rating row exists. Add the create-if-missing branch
      that `updateLevel` already has, so notes typed before a level is chosen persist
- [x] Bump `capabilityAssessments.updatedAt` in those three, matching every other write,
      so text-only edits affect dashboard ordering
- [x] **OBS-7** — `triggerSave` reports success on a 300ms timer without observing the
      promise. Await the handler and surface rejection through the `'error'` state that
      `AssessmentContextBar` already implements but nothing can currently trigger
- [x] Tests: notes-before-level persists; a rejected save shows the error state
- [x] Verify green

### Wave 3 — Draft banner (app surfaces)

- [x] Create the draft-notice module per 5.1 (`IS_DRAFT`, title, body)
- [x] Add the `VITE_DRAFT_MODE` declaration to `src/vite-env.d.ts`
- [x] Build `DraftBanner` component: slim, single-line, non-dismissible, `error.dark`,
      labeled region — **not** `role="alert"`
- [x] Wire into `Layout.tsx` below the `AppBar`, above `<main>`, with `flexShrink: 0`
- [x] Confirm the assessment page's fixed-height working area still fits: sidebar,
      content, and context bar all usable at 1280×720
- [x] Tests: renders when `IS_DRAFT`, absent when disabled, no axe violations
- [x] Verify green

### Wave 4 — Accessibility audit and remediation

- [x] Resolve **P2** — settled: build to WCAG 2.1 AA, verify with our own automated plus
      manual testing, fix what is safe, report the rest for a decision, no formal ACR. CMS
      runs the official 508 review. Applies to the workbook as well as the app
- [x] Automated pass: axe via Playwright on Landing, Dashboard, Assessment (standard,
      organizational, aggregate variants), Results, Import/Export, Guide, History, 404 —
      plus both orphaned results routes. 12 routes, axe-core 4.11.1 in real Chromium
- [x] Banner contrast measured in a browser: 7.03:1 at 12.8px, passes AA and AAA. Theme
      contrast beyond the banner **measured and logged as OBS-30** — deferred, needs sign-off
- [x] Keyboard-only pass: full assessment flow, results drill-down, dialogs, skip link,
      focus visibility and focus order
- [x] Screen-reader-semantics review of the two custom widgets most likely to be wrong:
      `MaturityLevelSelector` (OBS-29, deferred for a decision) and `AssessmentSidebar`
      list structure (fixed — it was a critical `aria-required-children` failure)
- [x] Fix findings per the P2 policy; log anything structural as new `OBS-*` entries —
      OBS-29, 30, 31, 32 filed; OBS-24 closed
- [x] Record the audit result — see Section 8d
- [x] Verify green — 567 tests / 32 files; typecheck, lint, knip clean

### Wave 5 — Draft notice in exports, plus PDF correctness

- [x] PDF: draft band on the cover and a footer line, from the shared module
- [x] CSV: notice line **directly after** the `MITA 4.0 Maturity Profile: <state>` header — not
      above it, which would break state-name parsing (see 5.1) — and teach
      `parseMaturityProfileCsv` to skip it
- [x] JSON / ZIP: `draftNotice` field in the export envelope, and a line in the ZIP
      `manifest.json`. This is the primary export path, so do not skip it (Decision 4)
- [x] **OBS-2** — done early, in Wave 2. `pdfExport.ts` labelled `currentLevel === 0` as
      "N/A" in `generateDimensionDetails` while `generateOrganizationalDetails` correctly
      used `-1`. Pulled forward because the OBS-6 fix makes notes-only rows (level 0) a
      common case, so shipping Wave 2 without it would have amplified a stakeholder-facing
      misreport. Still needs the export-side test in this wave
- [x] **OBS-3** — aggregate dimensions are omitted from the PDF entirely because the
      generator iterates actual ratings and aggregates have none. Emit the aggregated
      dimension with its score and an "(Aggregate from N assessments)" note, matching
      what CSV and the results UI already do
- [x] **OBS-25** — PDF and CSV compute the Technology dimension as a flat mean over all 11
      aspects, weighting by aspect count instead of by sub-dimension: 3.2 where the tool says
      3.0. The CSV profile is the CMS submission artifact. Delegate
      `generateStandardAreaProfile` and `generateDimensionDetails` to `calculateDimensionScore`.
      Needs a To-Be path too — the canonical scorer only reads `currentLevel`, so either
      parameterize the level selector or generalize it. **Resolved by generalizing:**
      `calculateDimensionScore` gained an optional `levelField` parameter defaulting to
      `'currentLevel'`, so the To-Be rule lives beside the As-Is rule instead of being
      re-derived per call site
- [x] **OBS-25 follow-on** — decide what `generateExecutiveSummary`'s "ORBIT Dimension Summary"
      should mean. **User's call, September 11: mean of per-area dimension scores, finalized
      assessments only.** Extracted as `summariseDimensionsAcrossAreas`, with a new "Areas"
      column so the denominator is visible. The old figure was weighted by aspect count _and_
      area count, and separately read every rating regardless of status while the domain table
      directly above it counted finalized only
- [x] **New in this wave, and a third divergence the pre-brief did not know about:**
      `ResultsMasterDetail.calculateTargetDimensionScores` flat-averaged `targetLevel` in the
      **live UI**, so fixing export To-Be alone would have created a fresh UI-versus-export
      disagreement. **User's call: one rule everywhere.** It now delegates to the canonical
      scorer. Logged under OBS-25
- [x] While in these files, replace the inline three-literal organizational-section checks in
      `exportService.ts` and `pdfExport.ts` with `isOrganizationalDimensionId`
- [x] Tests: draft notice present in each format when enabled and absent when disabled;
      N/A versus unassigned labeling; aggregate row present for enterprise domains;
      Technology export score matches `calculateDimensionScore`
- [x] Verify green — 675 tests / 35 files; typecheck, lint, knip, `format:check` all clean

### Wave 6 — XLSX foundation

- [x] Add `exceljs` as a **devDependency**, pinned — `4.4.0`, exact. Confirmed absent from
      the production tree (`npm ls exceljs --omit=dev` empty), absent from every
      `dist/assets/*.js`, and the vendor chunk is byte-identical to the Wave 0 baseline
- [x] Generator skeleton: read both JSON files, write to `public/`, log a row-count
      summary. **Written as `scripts/generate-xlsx-workbook.ts`, not `.mjs`** — Node 22.18
      strips TypeScript types natively, so it still runs directly and is covered by
      `typecheck`, `lint` and `knip` instead of being an unchecked island generating a CMS
      deliverable. Consequence: Node 22.18 is now a floor, recorded in `engines`, `.nvmrc`,
      and both workflows
- [x] Port the declarative column model from the reference implementation, updated for v4:
      dropped `categoryName` / `categoryId`, organizational columns restructured for the
      single combined area with a section column
- [x] Sheets `00_README`, `01_Maturity_Levels`, `02_Capability_Reference`,
      `03_ORBIT_Criteria_Reference`
- [x] Sheets `04_Assessment_Input` and `05_Organizational_Input`: flat tables, single
      header row, no merged cells, level dropdowns, protection with
      `selectLockedCells: true`
- [x] **ID columns are visible at the far right and outside the named range, not hidden.**
      This checklist previously said "hidden ID columns", contradicting 5.3 and the 8b
      review record, which both settled the opposite — hidden columns inside a table range
      conceal content from assistive technology and get flagged. 5.3 is the spec and was
      followed; the line is corrected here
- [x] Apply aggregate-dimension omission per **P1**; row counts 1,625 + 15 asserted, and
      per-area counts asserted against the app's own `getAssessableAspectCountForArea` for
      all 72 areas rather than against literals
- [x] To-Be columns on both input sheets, with the same dropdown and validation as As-Is
- [x] `Information Management` flag column on `02` and `04`; guidance text on `00_README`,
      with a parity test that renders `InformationManagementNotice` and compares the
      load-bearing claims
- [x] Set workbook document properties per 5.3
- [x] Content-fidelity tests: all 14 domains, 72 areas, 41 aspects, 205 criteria rows
      present with correct IDs
- [x] **508 structural test suite** (per P2): no merged cells anywhere; exactly one header
      row per table; no blank rows or columns inside tables; document properties populated;
      no floating objects; every editable column's header carries text signalling, not fill
      colour alone; `selectLockedCells` remains enabled on every protected sheet
- [x] **Every 508 assertion proved failable.** `scripts/xlsx/prove-assertions.ts` breaks
      the thing each assertion covers and confirms the test goes red: 41 for 41. It found
      two genuinely vacuous assertions, both self-referential. Kept rather than deleted —
      Wave 7 adds more assertions of the same shape. See 8j
- [x] **Raw-OOXML test suite** — not in the original scope, added because the reload-based
      suite is blind to a whole class of defect and one of them had already shipped. See 8j
- [x] **Opened in Excel and checked by the user**, including Excel's own Accessibility
      Checker, which passes with no issues in any category. Found four defects no assertion
      could see — incoherent page numbers, illegible print scaling, inconsistent vertical
      alignment, and clipped headers including the README's own title. All fixed. See 8j
- [x] Verify green — 903 tests / 41 files; typecheck, lint, knip, `format:check` and
      `build` all clean. `knip` now actually covers `scripts/`, which it previously ignored

### Wave 7 — XLSX maturity profile and formulas

Record in **Section 8l**. Everything below is done except the two items that need a human in
front of Excel, which are called out as such.

- [x] Flat `06_Maturity_Profile`: real Domain / Capability Area / Dimension columns
      replacing the reference implementation's merged label rows. 216 rows
- [x] `AVERAGEIFS` rollups for the standard dimensions, with Technology as the mean of
      its two sub-dimension means (**not** a flat mean of 11 aspects)
- [x] Organizational rows — **as 3 section rows, not per-aspect.** The per-aspect shape 5.2
      originally described needs "Section:" label rows that 5.3 forbids, and it would be a
      copy of `05` rather than a computation. See 8l
- [x] Aggregate-dimension cells per P1(a): formula averaging the dimension across
      non-enterprise areas, mirroring `getAggregateDimensionScore`
- [x] `TEXTJOIN` rollups for notes, barriers, and plans
- [x] To-Be rollups mirroring every As-Is rollup, except the aggregate, which has no
      target in the tool either
- [x] `07_Area_Scores`, `08_Domain_Scores` and `09_Dimension_Scores` sheets per 5.2
- [x] **The `Finalized?` question: decided against.** No status column. A cell a state can
      forget produces silently wrong domain scores, and the divergence it would close only
      exists mid-assessment. What was added instead is narrower and needs no input: an area
      scores blank until the state has entered at least one level _for that area_. That is the
      closest representable analogue of "has no assessment record", and it fixed a real defect
      — see 8l. `00_README` updated
- [x] Halfway-value fixture set comparing Excel `ROUND` against JS `Math.round(x * 10) / 10`;
      authoritative primitive recorded. **And now measured rather than modelled** — see 8l
- [x] JS reference implementation of the formula spec, tested against
      `calculateDimensionScore` on shared fixtures (5.4 step 1)
- [x] Snapshot tests on generated formula strings (5.4 step 2)
- [x] Arithmetic verified in Excel — **scripted, not by hand.** `npm run verify:workbook-excel`
      drives Excel over AppleScript, seeds input cells, and reads the computed cells back. 41
      checks across 9 scenarios. This replaced the hand-verification the plan called for and
      found three defects the 989-test suite could not, exactly as budgeted for
- [x] Excel's Accessibility Checker re-run with `06`-`09` present — **clean in every
      category**, confirmed by the user on September 15. Wave 6's run was also clean, so the
      four computed sheets introduce no finding
- [x] Print Preview checked on the computed sheets. Works, and is never going to look good:
      these are 5-to-19-column tables that spill across pages. Orientation is already
      `landscape` on every sheet. "Fit all columns on one page" is available in the print
      dialog but is the `fitToWidth` setting Wave 6 removed — Excel honours it at roughly 23%
      scale on `04` and `06`, which is illegible, so it stays off and the header row repeats
      instead. Accepted as-is; printing is not a pilot workflow
- [x] Dropdown entry confirmed to store a **number**, not text — verified by the user on
      September 15, entering levels through the dropdown and checking the whole chain of
      expected figures. This was the one property the scripted verification structurally cannot
      reach, because it writes values programmatically and bypasses validation. Had the dropdown
      stored text, every score would have read blank while completion still counted the entry
- [x] Text roll-ups fixed and verified — see the 2026-09-16 record in 8l. Two defects a user
      found by opening the file: `#NAME?` in all 648 cells from a missing `_xlfn.` prefix, and
      behind it a silent cross-area mis-attribution from Excel's implicit intersection
- [x] Verify green — 989 tests / 44 files, 89/89 mutations, typecheck / lint / format / knip /
      build all clean

### Wave 8 — Delivery, docs, handoff

- [x] Wire the generator into `npm run build`; confirm the file lands in `dist/`
- [x] Document the go-live switch: setting `VITE_DRAFT_MODE=false` in `deploy.yml` removes
      the disclaimer from the app and all exports in one change (Decision 13)
- [x] Add the generator plus validation tests to `ci.yml`
- [x] Download links: Landing hero (primary), Import/Export, Guide. Shipped with Import/Export
      as the primary and all three below the fold; **repositioned after the deploy** once measurement
      showed they sat 80-92% of the way down their pages (Section 5.5)
- [x] Handle dev mode: the workbook is a gitignored build output, so `npm run dev` has no
      file and the three links would 404. Add a `predev` generation step or a graceful message.
      **Both, and the premise was wrong in a way that mattered.** It does not 404 — Vite's SPA
      fallback answers the workbook URL with **HTTP 200, `Content-Type: text/html` and 1,922 bytes
      of `index.html`**, which the `download` attribute then saves to disk _as_ the `.xlsx`. Silent
      file corruption, no error anywhere, and Excel blames itself. So: `predev` generates the file,
      **and** a dev/preview middleware returns a real 404 when it is absent. Exactly the failure
      `workbox.navigateFallbackDenylist` already guarded for the service worker and nobody had
      guarded here
- [x] Resolve **P4** (PWA) and align the offline claims in Landing, About, README,
      PROJECT_FOUNDATION, and the steering file with reality
- [x] **OBS-28** — add `public/favicon.svg` and reference it as `%BASE_URL%favicon.svg`. No
      favicon exists today and the root-absolute path would not respect the base path anyway.
      Natural pairing with the PWA manifest, which needs an icon set
- [x] Mark the draft in `index.html`'s `<title>` and `<meta name="description">`. Those are
      what render as the link preview when the pilot URL is pasted into Teams or Slack, and
      they are currently unmarked — the runtime title suffix does not reach a crawler. Needs
      a Vite HTML transform so `VITE_DRAFT_MODE=false` still removes it; deferred here rather
      than hardcoding "(Draft)" into static HTML, which would survive go-live. Pair with the
      PWA manifest name, which has the same problem
- [x] Full check: `npm run typecheck && npm run lint && npm test && npm run build`. **Green, plus
      everything else the repo can run:** 1022 tests / 46 files, knip, `format:check`,
      `verify:workbook-artifact`, a second build at the real Pages base path, `npm audit --omit=dev`
      clean at 0, **94/94 mutations** proved failable via `prove-assertions.ts` on a clean tree, and
      **41/41** arithmetic checks in Excel. The Excel gate was run even though the only
      generator-emitted change this wave was `00_README`'s version cell, so the shipped workbook is
      verified at the version actually going out. **Re-run at 4.1.1** after the post-deploy version
      bump moved that same cell again — 41/41, and all 5 rounding fixtures still diverge as
      `00_README` documents. Cheap insurance rather than a real risk (`getAppVersion()` has one call
      site and feeds a text cell), but steering §16 makes any change to generator output the trigger,
      and "it is only a version string" is exactly the reasoning that lets a gate rot
- [x] Manual smoke on a `workflow_dispatch` deploy: banner on every page, workbook
      downloads and opens cleanly, exports carry the notice. **Done on the live site.** Service
      worker activated at scope `/mita-ssa-tool/` with 12 precached entries including the workbook
      and favicon, both CMS notices on all five pages, three working download links, footer reads
      4.1.0, `<title>` carries `(Predecisional)`. The smoke found one thing no local check could:
      all three download links sat 80-92% of the way down their pages, which is what prompted the
      repositioning recorded in Section 5.5
- [x] `CHANGELOG.md`: fold the `[Unreleased]` section into a version entry. Wave 5 already
      populated it, because that wave changes the Technology figure a state submits to CMS and
      shipping Drop 1 with no record of that would have been wrong
- [x] `PROJECT_FOUNDATION_v2.md`: **workbook artifact section done in Wave 7** — sheets, module
      map, scoring parity, accepted divergences, minimum Excel version. Still to do: the
      draft-mode flag, and the export formats table once the download links exist
- [x] `.kiro/steering/development-standards.md`: workbook generator, the `scripts/` convention,
      and the "verifying workbook changes" gate. Done across Waves 6 and 7
- [x] `README.md`: **offline workbook section done in Wave 7** (what it is, how to generate and
      verify it). Revisit once the in-app download links land, since the user-facing story
      changes from "run a script" to "click a link"
- [x] Resolve the `maturity-profile-template.csv` question (Section 4, Noted). **Deleted.** The
      confirmation Shelley's question needed turned out to be checkable rather than a judgement
      call: the file had **zero code references**, lived in `src/data/templates/` rather than
      `public/`, and was therefore never bundled — so no user could ever download it, and the
      premise that states were using it as a manual blank was never true of the deployed tool. The
      workbook's `06_Maturity_Profile` supersedes what it was for. Flagged in the handoff email so
      she can object; git retains it either way
- [x] Update `docs/CODEBASE_OBSERVATIONS.md` — most entries are already marked resolved as
      their wave landed; check nothing from Waves 6-8 is left unrecorded. **Now 46 entries, 20
      resolved.** Wave 8 closed OBS-22, OBS-28 and OBS-37, and added six: OBS-41 (WCAG 2.5.3 is
      unenforced and three controls were failing it), OBS-42 (a static `role="alert"` on Landing),
      OBS-43 (unknown assessment id renders a blank page), OBS-44 (every deploy re-downloads the
      workbook to offline clients), and — both from the post-deploy link repositioning — OBS-45
      (stat-card numbers styled as headings, hidden by the same missing axe tag as OBS-41) and
      OBS-46 (at 375px the app chrome leaves `<main>` only 287px)
- [x] Version bump and `npm install --package-lock-only`. **4.0.0 → 4.1.0**, MINOR: user-facing
      features were added and no data format changed, so nothing migrates and existing assessments
      are untouched. Then **4.1.0 → 4.1.1** for the post-deploy link repositioning — PATCH, and a
      second version rather than an edit to the 4.1.0 entry because 4.1.0 was already deployed and
      being looked at. Two builds sharing one version number is precisely the traceability problem
      the 4.1.0 notes complain about for the September 11 fixes, which arrived stamped `4.0.0`
- [x] Draft the follow-up email to Shelley, then send it. **Sent.** It covered the pilot scoping
      answer, the changed Technology export figure, the deliberate placeholders, the deleted CSV
      template (with an invitation to object), the offer to fold her workbook edits back into the
      generator, and the deferred XLSX import and live-data export. Rewritten once after the v4.1.1
      deploy to lead with the live URL rather than describing software she had no link to.
      **The drafts are no longer carried here** — a sent email is correspondence, not a plan
      artifact, and Section 7 held two full revisions of it. Recoverable from git history if ever
      needed; the requirements it had to satisfy are what mattered and they are recorded above
- [x] **Tag the releases — steering §13 step 5, deliberately deferred to last. Done.** Two annotated
      tags, both pushed: **`v4.1.0` at `cf27c56`** and **`v4.1.1` at `d68cbf3`**, each pointing at the
      commit that was actually deployed and verified rather than at a commit that might need a
      follow-up. These are the repository's **first tags** — v4.0.0 and everything before it shipped
      untagged, so there was no prior convention to match.

      **Deferring was the right call, and for a reason worth keeping.** Had `v4.1.0` been tagged at
      the same time as the version bump, it would have named a build whose workbook links nobody
      could find, and the repositioning would have had to become `v4.1.0` retroactively or hide
      inside it. Because the tag waited for the deploy to be *looked at*, the history now records
      what it should: a release, a real finding from it, and a follow-up release — which is also why
      there are two tags here instead of one

---

## 7. Out of Scope

| Item                                                        | Disposition                                                                                                                                                                                                                                                                                                                                                    |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| XLSX import (fill in the spreadsheet, continue in the tool) | Deferred (Decision 6). Sean raised it `[11:30]`; Shelley agreed it is not the priority `[12:52]`. The reference implementation has a working `xlsxImport.ts` to revisit. Hidden ID columns keep it feasible                                                                                                                                                    |
| Live-data XLSX export                                       | Deferred (Decision 6). The reference implementation's `includeCurrentData` path covers it                                                                                                                                                                                                                                                                      |
| Capability model or maturity criteria changes               | None. Content is unchanged; workstream C only reads it                                                                                                                                                                                                                                                                                                         |
| Reviewing the v4 model against the source deck              | Shelley and Chris, this week `[13:52]`                                                                                                                                                                                                                                                                                                                         |
| PRA submission                                              | Shelley; going in under the approved APD template PRA `[15:45]`                                                                                                                                                                                                                                                                                                |
| Formal ACR/VPAT                                             | **Settled by P2: none published.** An ACR asserts per-criterion conformance, and with no assistive-technology testing several criteria could only honestly be marked "Not Evaluated". What is published instead is the Accessibility section of `README.md` and the audit record in 8d                                                                         |
| Remaining `OBS-*` items                                     | **26 of 46 stay in the backlog** (was 22 of 36 when this plan opened; Waves 1-8 closed 20 and added 10). Still open: OBS-4, 5, 8, 9, 10, 11, 12, 13, 14, 15, **16 (partially)**, 18, 19, 20, 23, 26, 27, 33, 35, 36, 41, 42, 43, 44, 45, 46. OBS-22 (PWA) and OBS-28 (favicon) were scheduled for Wave 8 and are **done**. See 8p for what to do with the rest |

---

## 8. Working Notes

Append findings here as waves complete, so later sessions inherit them.

- **2026-09-09** — Plan created. Reference implementation at `b0fc55d` audited: ~2,300
  lines, 7 sheets, ExcelJS 4.4.0. Genuinely useful, with three disqualifying gaps —
  v3-era category columns, three-separate-org-types model, and 508 violations (5
  `mergeCells`, merged label rows, blank spacer rows, color-only signaling for editable
  columns). **It does not handle aggregate dimensions at all** — `buildProfilePlan` emits
  BA/Information/Technology for every area including Data Management and Technology
  Management, which contradicts the aggregate rules that have existed since v2.0.5. That
  omission is the origin of question P1 and is the largest genuinely new piece of
  workstream C.
- **2026-09-09** — Confirmed the reference implementation sets `selectLockedCells: true`,
  avoiding the common 508 trap of hiding locked reference cells from assistive tech.
  Keep that.

### Wave 2 notes — 2026-09-09

Verified the OBS-6 fix end to end in a real browser, not just in unit tests, because it is a
data-loss fix shipping into a pilot: typed notes into a fresh aspect with **no** level
selected, confirmed the row persisted at `currentLevel: 0`, confirmed sidebar progress stayed
at 0%, reloaded and confirmed the text rendered back, then picked a level and confirmed the
notes survived (`updateLevel` patches only the level, so it does not clobber text).

The save indicator now reports the real outcome and is a polite live region.

**Head start on Wave 4.** The app already runs axe in dev mode, and it reported these on the
assessment page during the check above — so Wave 4's remediation looks bounded rather than
structural:

| Finding               | Detail                                                     |
| --------------------- | ---------------------------------------------------------- |
| Contrast 4.31:1       | `#ffffff` on `#1a7fc3`, 14px normal — needs 4.5:1          |
| Contrast 3.49:1       | `#757575` on `#e0e0e0`, 12px — needs 4.5:1, reported twice |
| Heading order invalid | Heading levels skip on the assessment page                 |

Plus OBS-24 (mouse-only expandable dimension rows), already logged. Note the second contrast
pair looks like a disabled/greyed chip, so it may recur across several components.

**Test-suite flake — diagnosed and fixed, and my first diagnosis was wrong.** I initially
recorded this as a `waitFor` timeout to be fixed by raising the timeout. Measurement said
otherwise:

| Invocation                                | Failures |
| ----------------------------------------- | -------- |
| `useOrbitRatings.test.ts` alone           | 0 / 8    |
| With a second file (`useDebounce`)        | 1 / 8    |
| With a fake-timers file (`useSaveStatus`) | 5 / 10   |
| Full suite (what CI runs)                 | 0 / 5    |

Raising `asyncUtilTimeout` to 5000 made it _worse-looking_, not better: it matched vitest's
5000ms `testTimeout`, so a failing `waitFor` blew the test timeout and reported "Test timed
out" instead of the actual assertion difference. It is now 3000, deliberately below the test
timeout.

The real cause was unnecessary synchronization. Many tests gate on a Dexie `liveQuery`
emission (`await waitFor(() => expect(result.current.ratings).toEqual([]))`) before mutating
— but the mutation paths resolve rows straight from IndexedDB via `findExistingRating` and
never read `ratings`. That gate only made the tests sensitive to liveQuery scheduling under
CPU contention. Removing it from the tests added in this wave took the two-file failure rate
from **5/10 to 0/10**, with the full suite still clean 4/4.

The same unnecessary pattern remains in roughly a dozen pre-existing tests in that file.
Logged as OBS-27 rather than changed here, to keep this wave's diff reviewable.

### Wave 3 notes — 2026-09-09

Banner measured in a real browser rather than asserted from theory, because axe-core
**cannot evaluate colour contrast under jsdom** — it needs a canvas to sample rendered
pixels, which is what the "getContext not implemented" notice in the test output means. The
`toHaveNoViolations()` assertion in `DraftBanner.test.tsx` therefore does _not_ cover
contrast, which is this banner's main accessibility risk. Noted in the test itself so nobody
reads it as broader coverage than it is.

Measured at `error.dark` (`#b0142f`) on white text:

| Property       | Value         | Verdict                                             |
| -------------- | ------------- | --------------------------------------------------- |
| Contrast ratio | **7.03:1**    | Passes AA (4.5:1) and AAA (7:1) for normal text     |
| Font size      | 12.8px normal | Below the large-text threshold, so 4.5:1 is the bar |
| Banner height  | 27px          | Slimmer than the 32-36px target                     |

Layout impact on the fixed-height shell at 1280x720, with the banner present: document
scroll height equals the viewport (no overflow), the sidebar still reaches the bottom, and
"Review & Finalize" remains visible. The assessment working area survives the banner.

Responsive behaviour: one line down to 768px, wrapping to three lines (66px) at 390px. That
is a real bite out of a phone viewport, but the assessment page already needs a 240px fixed
sidebar plus content, so phones are not a supported target for this tool. Accepted rather
than special-cased.

Document title becomes "MITA 4.0 State Self-Assessment Tool (Draft)". That is the fix for
the skip-link gap: `#main-content` sits below the banner, so anyone using the skip link never
reaches the notice, but the title is announced on load regardless.

**The go-live switch removes the copy, not just the banner.** Verified against real builds:
with `VITE_DRAFT_MODE=false` the phrase "still being piloted" is absent from
`dist/assets/*.js` entirely — Rollup tree-shakes the whole branch, since `IS_DRAFT` resolves
to a constant at build time. The default build contains it. So Decision 5's "easily
removable" is satisfied by one workflow variable with no dead copy left in the artifact, and
the change is verifiable by grepping the bundle rather than clicking through the app.

Tests also pin that only the exact string `'false'` disables it, so a variable set to `FALSE`
or `0` cannot quietly drop the disclaimer.

**Review outcomes.** Three things the Wave 3 review changed:

- The banner is now a **labelled landmark** (`<section aria-label="Draft notice">`), which is
  what Section 5.1 and the wave checklist actually specified — I had ticked "labeled region"
  while shipping a plain `Box`. It follows the USWDS Site Alert shape, a closer precedent for
  a government tool than the GOV.UK phase banner I originally cited, and it satisfies axe's
  `region` rule for top-level content outside any landmark.
- The comment justifying the no-live-region decision was **wrong**, and is corrected in the
  component. A live region does not "re-announce unchanging text"; announcements fire on
  mutation, so a static live region would simply never fire. The conclusion held, the stated
  reason did not, and the comment is the durable record.
- The draft **copy moved to `src/constants/draftNotice.ts`**, a module with no `import.meta`
  reference. `import.meta.env` is `undefined` under plain Node and touching it throws, so the
  Wave 6 XLSX generator could not have imported the copy from `constants/index.ts` —
  defeating Section 5.1's "one module exports both the flag and the text". The flag stays in
  `constants/index.ts` because it is environment-dependent; Node derives it from
  `process.env.VITE_DRAFT_MODE`.

**A real bug the duplication test caught.** The title guard was first written as
`endsWith(' (Draft)')`. The DOM **trims `document.title`**, so once the value round-trips the
leading space is gone, the guard never matches, and the marker is appended again on every
mount — observed as `"(Draft) (Draft)"`. It now keys on the parenthesised marker with no
leading whitespace.

**Two stale axe suppressions removed** from `Layout.test.tsx`. The `region` and
`landmark-one-main` rules were disabled with comments claiming the skip link was missing and
main needed a label; both have existed for some time. The full ruleset passes now, and the
"allow up to 2 violations" tolerance in the navigation test is gone too.

**Layout re-checked on the tightest page.** `/history/:historyId` is the same fixed-height
master-detail shell as Results but keeps the footer _and_ adds a header plus an alert, so it
has the least vertical room in the app. At 1280x720 with the banner present it still does not
overflow.

### Wave 0 baseline — 2026-09-09, `feature/pilot-clearance` @ `33e7963`

| Check                       | Result                                               |
| --------------------------- | ---------------------------------------------------- |
| `npm run typecheck`         | clean                                                |
| `npm run lint`              | clean                                                |
| `npm test`                  | 514 passed / 28 files                                |
| `npm run build`             | succeeds, **with a pre-existing chunk-size warning** |
| `npm run audit:code` (knip) | clean                                                |

Restore this exact state with `git stash` + `git checkout 33e7963` if a wave needs backing out.

**Pre-existing build warning (not introduced here).** `vite.config.ts` sets
`chunkSizeWarningLimit: 520` with a comment saying the vendor chunk is "~510KB". Actual
output: `vendor-mui` 337 kB and `vendor` **1,418 kB** (450 kB gzipped). So the limit is
exceeded on every build and the comment is stale. Two consequences worth knowing:

- A warning that fires on every build trains people to ignore build warnings, which
  matters when we are about to add build steps.
- 450 kB gzipped of vendor JS is a real cost for an offline-first PWA on state networks.

This validates Decision 12 — keeping ExcelJS a build-time `devDependency` means the
workbook feature adds **zero** bytes to this chunk. Logged as a new backlog item
(OBS-20) rather than fixed here; it is out of scope for pilot clearance.

**Deploy path (Decision 11) confirmed by config inspection.** `deploy.yml` declares
`workflow_dispatch`, and its `actions/checkout@v4` step pins no `ref`, so a manual
dispatch builds whichever branch is selected. `VITE_BASE_PATH` and `VITE_GITHUB_REPO_URL`
both derive from `github.*` context that is populated for dispatch events, so they
resolve correctly off a feature branch. Not executed here — triggering the workflow is
the user's action, so this is verified as _supported_, not as _run_.

---

## 8b. Wave 0 Review Record

An independent sub-agent review (September 9, 2026) checked this plan and
`CODEBASE_OBSERVATIONS.md` against the actual code and data before any implementation
began. Verdict: ready-with-corrections. All corrections are applied above.

**Verified correct, unchanged:** every row count in 5.2 (26 aspects, 71+1 areas, 1,625 /
15 / 228 / 205 / 72); the aggregate-omission arithmetic and the `DOMAIN_AGGREGATE_DIMENSIONS`
mapping; OBS-6 in full, including that the Wave 2 fix cannot inflate completion counters
because `getAssessedCount` filters on level; OBS-1's two locations, with a broad search
confirming no third site (`pdfExport`, `exportService`, and `importService` all correctly
include `enterprise-architecture`); the `100vh` layout constraint, with no `calc(100vh - N)`
anywhere in `src/`, so a `flexShrink: 0` sibling degrades gracefully; both contrast figures
(`error.dark` 7.03:1, `error.main` 4.67:1).

**Corrections applied:**

| Finding                                                                                                                                     | Fix                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 5.4 said only "round to one decimal"; rounding actually happens at different points per rollup, and the Technology paths genuinely disagree | 5.4 rewritten as a rounding-point table; OBS-21 filed and pulled into Wave 1 as a Wave 7 blocker                      |
| Excel `ROUND` differs from JS `Math.round(x*10)/10` on halfway values, and mitigation step 1 shares the JS primitive so cannot catch it     | Halfway-value fixture set added to Wave 7                                                                             |
| P1(a) said "mirror `getAggregateDimensionScore`", but a flat `AVERAGEIFS` weights by aspect count and the workbook has no status concept    | 5.4 now specifies averaging per-area profile cells, and documents the finalized-only filter as an accepted divergence |
| Placeholder count was 13                                                                                                                    | Corrected to 14 in both documents                                                                                     |
| 5.4 omitted that domain scores are finalized-only, and that dimensions with no assessed aspects are dropped rather than zeroed              | Both added                                                                                                            |
| `03` specified a "question" column, but all 205 per-level `questions` arrays are empty — it would fail the plan's own no-empty-columns rule | Column dropped; OBS-23 filed                                                                                          |
| 228 profile rows left no room for area, domain, or section scores that 5.4 and Wave 7 both require                                          | Rollups moved to new `07_Area_Scores` / `08_Domain_Scores` sheets; Technology sub-dimension means become columns      |
| "Offline-first PWA" is false — no service worker exists                                                                                     | OBS-22 filed; raised as P4                                                                                            |
| The Information Management guidance had no workbook counterpart, so workbook and tool would collect different input for the same state      | Flag column plus README guidance added to Wave 6                                                                      |
| To-Be / `targetLevel` was absent from the workbook spec despite being a first-class tool feature and a CSV profile column                   | Added to 5.2 and Waves 6 and 7                                                                                        |
| 5.3 simultaneously required no-blank-columns and carried-forward hidden ID columns                                                          | Resolved: IDs visible at far right, outside the named range, never hidden                                             |
| A CSV notice above `lines[0]` would break state-name parsing entirely, not merely need skipping                                             | 5.1 now specifies placement after the header line, and notes the parser is currently unexported and unused            |
| The skip link bypasses a banner placed above `<main>`                                                                                       | Resolution added: keep placement, and append `(Draft)` to the document title                                          |
| Decision 4 covered PDF/CSV/XLSX but not JSON/ZIP, the primary export path                                                                   | JSON/ZIP added to the export-surface table                                                                            |
| OBS-17's correction list omitted the steering file's "Currently at version 1" schema claim (actual: v4)                                     | Added to Wave 1, along with the misleading `UI.DEBOUNCE_MS` constant                                                  |
| The workbook is a gitignored build output, so in-app download links 404 under `npm run dev`                                                 | Dev-mode handling added to Wave 8                                                                                     |
| Section 1 warned against committing `temp-transcript.md`, which no longer exists                                                            | Warning removed                                                                                                       |

## 8c. Wave 4 Pre-Brief (accessibility audit)

Written at the end of Wave 3 so the next session starts with what is already known rather
than rediscovering it. **Wave 4 is the wave with genuinely unbounded scope** — the audit
itself is a couple of hours, but remediation depends on what it finds.

### Already-known findings

Collected from dev-mode axe while verifying Waves 2 and 3, plus the audit in
`CODEBASE_OBSERVATIONS.md`. These are the starting worklist:

| #   | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                      | Source                   |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| 1   | Contrast **4.31:1** — `#ffffff` on `#1a7fc3`, 14px normal. Needs 4.5:1                                                                                                                                                                                                                                                                                                                                                                       | dev axe, assessment page |
| 2   | Contrast **3.49:1** — `#757575` on `#e0e0e0`, 12px. Reported twice; looks like a disabled or greyed chip, so it likely recurs across components                                                                                                                                                                                                                                                                                              | dev axe, assessment page |
| 3   | **Heading order invalid** — levels skip on the assessment page                                                                                                                                                                                                                                                                                                                                                                               | dev axe                  |
| 4   | **OBS-24: expandable dimension rows are mouse-only.** `DimensionRow` in both `DimensionScoresTable.tsx` and `DimensionScoresTableWithTarget.tsx` puts `onClick` on the `TableRow` with `aria-expanded` but no `tabIndex`, no `role="button"`, no key handler. Everything behind the expansion — per-aspect levels, notes, barriers, attachments — is unreachable without a mouse. `aria-expanded` on a non-focusable element is also invalid | OBS-24                   |

For #4 the fix pattern already exists in the codebase: `DomainTable` uses a real
`IconButton` for its expand control and _is_ keyboard reachable. Prefer that over adding
`role="button"` to the row, which also avoids a row-wide click target fighting text
selection.

### The item most likely to blow up the estimate

`MaturityLevelSelector` (`src/components/assessment/MaturityLevelSelector.tsx`) is the
most-used control in the app — it is how every one of the 26 aspects gets rated — and its
markup is the riskiest in the codebase:

- The level rows are `div`s carrying `role="radiogroup"` and `role="radio"` rather than real
  inputs, so keyboard support (arrow-key navigation within the group, roving tabindex) is
  hand-rolled or absent. Verify with keyboard only, not with axe: axe checks that roles are
  _valid_, not that the interaction _works_.
- Each radio row contains a **nested To-Be checkbox**. A checkbox inside a radio is not a
  valid ARIA composition — interactive content must not nest inside a `role="radio"`.

If this needs restructuring it is real surgery on the control states actually use, with
regression risk. Two mitigations worth considering before touching it: it currently has no
test file, so add coverage first; and the plan's Drop 1 date (Sept 12) is for a _reviewable_
build, so a documented finding with a proposed fix may serve better than a rushed rewrite.
Get the user's call rather than deciding unilaterally.

### Scope guidance

- P2 is settled: fix what is safe, report the rest with a recommendation, no formal ACR.
- Pages to cover: Landing, Dashboard, Assessment (standard **and** organizational **and**
  an enterprise-domain aggregate variant — they render different components), Results
  (including the master-detail drill-down), Import/Export, Guide, History, 404.
- `Layout` is a clean baseline: its two stale axe suppressions were removed in Wave 3 and
  the full ruleset passes, so violations found now are in page content, not the shell.
- Remember contrast must be measured in a browser (see the toolbox in Section 1).
- Log anything structural as a new `OBS-*` entry rather than expanding this wave.

### Deliverable

Record pages covered, tools used, findings, and dispositions — that record is what the user
points CMS at, and it is also the honest answer to "is it accessible?" which is otherwise
unanswerable without assistive-technology testing by real users.

## 8d. Wave 4 Accessibility Audit Record

**Date:** September 10, 2026 · **Branch:** `feature/pilot-clearance` · **Standard:** WCAG 2.1
Level AA · **Policy:** Decision P2 — fix what is safe, report the rest, no formal ACR

This is the record to point CMS at. It states what was tested, what was fixed, what was
deliberately not fixed, and — importantly — **what this exercise cannot tell you**.

### Method

| Aspect                 | Detail                                                                                                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tool                   | axe-core **4.11.1**, injected into the running app from `node_modules` via the Vite dev server, driven by Playwright                                                            |
| Rule sets              | `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, **plus** `best-practice`                                                                                                            |
| Environment            | Real Chromium at 1280×720 and 1400×1000 — **not** jsdom, so colour contrast was genuinely evaluated                                                                             |
| Data                   | IndexedDB seeded directly with 5 assessments / 109 ratings / 1 history snapshot, covering a standard area, an aggregate-dimension area, and the organizational area             |
| Manual                 | Keyboard-only traversal, focus-indicator inspection via `getComputedStyle` **and screenshots**, dialog focus-trap and Escape, skip-link activation                              |
| Routes (12)            | Landing, Dashboard, Assessment ×3 (standard / aggregate / organizational), Results, Import/Export, Guide, History detail, both orphaned results routes, 404                     |
| Interaction states (7) | Results with a domain selected, an area selected, and a dimension row expanded; a collapsed layer; Assessment with 2 and 3 aspect accordions expanded; the finalize dialog open |

Why `best-practice` was included: `heading-order` is **not** WCAG-tagged in axe. A run
filtered to WCAG tags alone reports zero heading problems on this app, which is misleading —
the first pass did exactly that and found nothing, while the app had heading-order failures
on seven routes.

Why interaction states are listed separately: **auditing routes by URL is not sufficient
coverage for this app.** `ResultsMasterDetail` renders its detail panel only after a click and
holds selection in component-local state rather than the URL (OBS-12), and the assessment
page's aspect panels load collapsed. Two findings below — the last heading skips and
`landmark-unique` — exist _only_ in states a route sweep cannot reach. The first pass of this
audit reported `heading-order` clean on `/results` for precisely that reason; a reviewer caught
the gap, and the states were then driven explicitly.

### Result

| Rule                     | Impact       | Before                                     | After                                                               |
| ------------------------ | ------------ | ------------------------------------------ | ------------------------------------------------------------------- |
| `aria-required-children` | **critical** | 4 routes                                   | **0** — fixed                                                       |
| `role-img-alt`           | serious      | 3 routes                                   | **0** — fixed                                                       |
| `aria-conditional-attr`  | serious      | 1 route (3 nodes)                          | **0** — fixed                                                       |
| `heading-order`          | moderate     | 7 routes (19 nodes) + 2 interaction states | **0** — fixed, re-verified in the interaction states                |
| `landmark-unique`        | moderate     | assessment, expanded panels only           | **0** — fixed                                                       |
| `listitem`               | serious      | 0                                          | **0** — introduced by the first fix attempt, then resolved (OBS-31) |
| `color-contrast`         | serious      | 12 distinct pairs                          | 12 — **deferred, OBS-30**                                           |
| `nested-interactive`     | serious      | 3 assessment routes                        | 3 — **deferred, OBS-29**                                            |

Landing and 404 were clean before and after. Every remaining automated violation is one of
the two deferred items.

Two findings surfaced only once panels were expanded, and both are worth knowing about
because the same shape recurs easily:

- **`landmark-unique`.** `AspectCard` set `role="region"` plus an `id` on `AccordionDetails`,
  but MUI's `Accordion` already renders its own `div.MuiAccordion-region` carrying
  `role="region"`, the same `id`, and `aria-labelledby`. Every expanded aspect therefore
  produced **two identically-named landmarks and a duplicate DOM `id`**. Removing the manual
  attributes took the landmark count on a five-aspect page from 16 to 6 and left zero
  duplicate ids (verified by enumerating every `id` in the document).
- `AttachmentUpload` used `role="region"` with the fixed label "File upload area", so it
  appeared once per aspect. Changed to `role="group"`, which keeps the name without claiming
  page-level structure.

Plus one failure **axe never reported**, found only by manual testing and the most
consequential thing in this audit:

> **WCAG 2.4.7 Focus Visible failed across essentially the whole application.** MUI's
> `ButtonBase` sets `outline: 0` and signals keyboard focus with a background tint from
> `palette.action.focus`; this app's own `sx` backgrounds override that tint. Measured on the
> assessment sidebar with focus on it: `outline: none`, `box-shadow: none`, background
> `rgba(0,0,0,0.004)`. Confirmed by screenshot — the focused row was visually identical to
> its neighbours. This affected every `ButtonBase`-derived control — `Button`, `IconButton`,
> `ListItemButton`, `AccordionSummary`, `MenuItem`, `Checkbox`, `Radio`. Anchors and the few
> `role="button"` divs were unaffected, because they still received the browser's default ring.
>
> Fixed at the theme level with `'&.Mui-focusVisible': { outline: '2px solid currentColor' }`.
> `currentColor` was chosen deliberately: an outline cannot be clobbered by a background
> rule, and it adapts to context — measured white (`rgb(255,255,255)`) on the dark blue
> AppBar and near-black (`rgb(33,33,33)`) on light page backgrounds.
>
> **`currentColor` alone was not sufficient, and the first attempt shipped a ring nobody
> could see.** On a _contained_ button the text colour is `palette[color].contrastText`
> (white), and the default `outline-offset: 2px` draws the ring entirely outside the button
> onto the white page — measured **1.00:1**, i.e. invisible, on the primary call to action of
> five pages and on every dialog confirm. A reviewer caught this. Contained buttons now use
> `outlineOffset: -4` so the white ring is drawn on the button's own fill: measured
> **5.14:1** on primary and 4.67:1 on error, both clearing the 3:1 required for non-text
> contrast, and confirmed by screenshot.
>
> **Scope limits worth stating.** `Chip` is `styled('div')` rather than `ButtonBase`, so the
> clickable attachment-download chips are _not_ covered by this override and still signal
> focus only with a background tint. Disabled controls resolve `currentColor` to
> `text.disabled` and would give a sub-3:1 ring, but they are exempt under WCAG 1.4.11 and
> MUI removes them from the tab order.
>
> Because the rule keys off `:focus-visible`, **mouse and touch users see no change.**

### What was fixed

| Fix                                                                                                                              | Visual impact                             |
| -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Theme focus-visible outline on `ButtonBase` controls, inset on contained buttons and full-bleed rows                             | Keyboard focus only; none for mouse users |
| `AssessmentSidebar` standard branch: rows wrapped in `ListItem`, Technology rollup row is an `li` — was `ul` with `div` children | None                                      |
| `AssessmentContextBar` tag-suggestion list: rows wrapped in `ListItem`                                                           | None                                      |
| `ResultsMasterDetail`: `Collapse` nested inside each `li` so the tree is valid list markup at every level (OBS-31)               | None                                      |
| 24 `Typography` sites given explicit `component` so `variant` no longer emits stray headings (OBS-32)                            | None — `variant` still drives styling     |
| Chart accessible names moved onto the `<canvas>` (where react-chartjs-2 sets `role="img"`) instead of a wrapper `div`            | None                                      |
| `AspectCard`: removed the duplicate `role="region"` and duplicate DOM `id` that shadowed MUI's own accordion region              | None                                      |
| `AttachmentUpload`: `role="region"` → `role="group"` so it is not a repeated landmark                                            | None                                      |
| `DimensionScoresTable`: `aria-expanded` moved from `TableRow` to a real focusable button (OBS-24 remainder)                      | None                                      |

**Every fix in this wave is invisible to a mouse user.** The first draft of the
`DimensionScoresTable` fix added chevron icons and dropped the `↳` sub-dimension marker;
both were reverted after review, since `all: unset` on the new `<button>` already makes it
render identically to the text node it replaced.

Tests added: 14 — 5 `AssessmentSidebar` standard-mode (two list-structure guards, two axe
checks), 5 `ResultsMasterDetail` (list validity collapsed, domain-expanded and
layer-collapsed, plus an axe check), 4 theme. Suite went 558 → **572**, files 31 → 33.

### Follow-up — both Wave 4 deferrals were subsequently fixed

Wave 4 first deferred OBS-29 and OBS-30 as open AA failures, on the grounds that both change
what stakeholders see mid-review. The instruction was to fix them properly rather than defend
them, so both were completed in two further commits, each independently reviewed.

**The automated result is now zero violations across 12 routes and 9 interaction states**, under
`wcag2a`, `wcag2aa`, `wcag21a` and `wcag21aa`.

**Two corrections to that sentence, both dated after this audit, because it is the sentence most
likely to be quoted.** It originally ended "**and** `best-practice`", and that no longer holds:
OBS-36 was found the next day and is open — `/results` renders no heading at all in its empty state,
reported by `page-has-heading-one`, which is a `best-practice` rule. The sweep had seeded data, so it
never saw that state. Not an AA failure, but "zero under best-practice" is now false. Separately,
the ruleset omits axe's `experimental` rules, and OBS-41 and OBS-45 are two Level A criteria that had
real failures behind exactly that omission — so read the sentence as scoped to the rules that were
run, which is all it ever meant.

- **OBS-30 — contrast.** Fixing root causes rather than reported instances showed the audit had
  under-counted: **all five** `SCORE_COLORS` failed in every role at 2.16-3.68:1, not the two axe
  flagged, because axe measures only what renders. `info` was never defined, so MUI's failing
  default was in play; Alert icons and outlined chips both paint from fill-grade `.main` tokens.
  Fixed with theme overrides so the patterns are corrected wherever they appear, plus two states
  reachable only on hover or in a striped progress bar.
- **OBS-29 — `MaturityLevelSelector`.** Rewritten onto native radio inputs: arrow keys work in
  both directions, tab stops fell from 11 per aspect to 2, and the To-Be control is a sibling
  radio group rather than a checkbox nested inside a `role="radio"`. A 28-test file was written
  **first**, against the old implementation — 13 of its tests failed there, describing exactly
  the defects — which is what made the rewrite safe on a control that had no coverage.
- Two more defects surfaced only by expanding panels, both fixed: duplicate DOM ids and duplicate
  landmarks from hardcoded ids in `QuestionChecklist` and `AspectCard` (OBS-34), and a
  `div role="button"` wrapping a real `<button>` in `AssessmentContextBar`.

### What remains deliberately unfixed

- **OBS-31 — proper ARIA `tree` semantics** for the results nav. The Wave 4 change makes the
  markup valid; making it a real tree is a refactor.
- **OBS-33 — collapsed aspect panels stay mounted**, so the ten-aspect Information dimension
  mounts ~110 invisible radio inputs. The fix is one MUI prop, but it removes the element that
  the summary's `aria-controls` points at, so it needs its own accessibility pass rather than
  landing the day before a stakeholder drop.
- **Clickable `Chip` focus indicators.** `Chip` is `styled('div')`, not `ButtonBase`, so the
  theme focus ring does not reach it.

### Limitations — what this audit does not establish

State these alongside any claim about accessibility:

1. **No assistive-technology testing was performed.** No screen reader (NVDA, JAWS, VoiceOver)
   was driven against the app. Every screen-reader claim here is inferred from the accessibility
   tree and ARIA semantics, not heard. This is the single largest gap, and automated tooling
   cannot close it.
2. **Automated rules cover a minority of WCAG.** axe finds roughly a third of WCAG issues by
   common estimates. A clean axe run is a floor, not a pass.
3. **"Zero automated violations" is not "meets WCAG 2.1 AA."** Both originally-deferred failures
   are now fixed and every rule axe can evaluate passes, but that is a floor, not a pass — see
   points 1 and 2. The honest statement is: no known open AA failure, and no assistive-technology
   testing to confirm it.
4. **Contrast was measured on the states that happened to render.** Hover, disabled, error and
   validation states were not systematically enumerated.
5. **Zoom and reflow (1.4.10), text spacing (1.4.12) and 400% magnification were not tested.**
   The assessment page is a fixed-height shell with a 240px sidebar, which is where reflow
   problems would concentrate.
6. **No testing below 768px.** Accepted deliberately in Wave 3 — the fixed sidebar plus content
   means phones are not a supported target.
7. **Verified in Chromium only.** No Firefox or Safari pass, and `:focus-visible` heuristics
   differ between engines.
8. **Interaction-state coverage is representative, not exhaustive.** Seven states were driven
   explicitly (listed under Method), chosen because they render different components. Others
   were not enumerated — notably import/export progress and error states, snackbar alerts, the
   tag editor's validation states, and the organizational assessment's review step. Given that
   two findings in this audit existed _only_ in interaction states, assume more remain.
9. **`Chip` focus indicators were not fixed.** Clickable chips are outside the `ButtonBase`
   override (see the focus-ring note above) and still rely on a background tint.

### Recommended next steps

1. **Before any "accessible" claim reaches states, do one screen-reader pass on the assessment
   flow.** This is now the single largest remaining gap, and automation cannot fill it. It also
   matters more than it did: the rewritten level selector is the control states will spend all
   their time in, and its semantics have only been verified through the accessibility tree.
2. Resolve OBS-33 (unmount collapsed aspect panels) with an axe pass over both states.
3. Give clickable `Chip`s a focus indicator; they are the one interactive control class the theme
   override does not reach.
4. When auditing again, drive interaction states rather than routes. Four of this audit's findings
   existed only behind an expand or a selection, so a sweep that only visits URLs will report this
   app cleaner than it is.

## 8e. Wave 5 Notes — 2026-09-11

Full record of what changed is the Wave 5 checklist above. What is here is the things
that cost time to learn, and the numbers a later session should not have to re-derive.

**Every figure below was read out of a generated artifact**, not asserted from a
function's return value. Exports were driven through the real Import/Export page in
Chromium with IndexedDB seeded to 3 finalized areas plus 1 in-progress area; the PDF was
then text-extracted with `pypdf`.

| Surface                     | Before          | After                                        |
| --------------------------- | --------------- | -------------------------------------------- |
| CSV Technology As-Is        | 3.2             | **3.0**                                      |
| CSV Technology To-Be        | 3.2             | **3.0**                                      |
| PDF per-area Technology     | `(Avg: 3.2)`    | **`(Avg: 3.0)`**                             |
| PDF exec summary Technology | 3.2             | **3.0**, over 2 areas                        |
| Results UI Technology To-Be | 3.2             | **3.0**                                      |
| PDF aggregate dimension     | absent entirely | `Information (Avg: 3.0)` + contribution note |

The fixture is Infrastructure ×6 at 5 and Application ×5 at 1: canonical `mean(5, 1) = 3.0`
against a flat `(30 + 5) / 11 = 3.18 → 3.2`.

**Generalising the scorer beat adapting at the call sites.** `calculateDimensionScore` took
an optional third parameter, `levelField`, defaulting to `'currentLevel'`. The alternative —
each caller remapping `{currentLevel: r.targetLevel ?? 0}` — leaves the To-Be rule
re-derived per site, which is the exact failure OBS-21 and OBS-25 document. It also puts the
`undefined`-means-unassessed sentinel in one place rather than three, where one `?? -1` would
be a silent wrong answer. The default keeps every pre-existing As-Is caller byte-identical.

**The first parameter was also widened, `OrbitDimensionId` → `RatingDimensionId`.** This is
honest rather than convenient: `technology` is the only branch, so organizational sections
already take the plain-mean path, and `DimensionScore.dimensionId` is already
`RatingDimensionId`. Widening let the UI caller pass its id straight through instead of
asserting it is narrower than it is — and a cast of exactly that shape is what produced
OBS-1.

**The PDF was untestable, and that is why OBS-2 and OBS-3 survived 631 tests.** Two things
to know:

- `generatePdfReport` returns a `Blob`. Its bytes are intact (`blob.size` matches
  `doc.output().length`), but **jsdom implements neither `Blob.text()` nor
  `Blob.arrayBuffer()`**, so reading it needs a `FileReader` and an async hop. Splitting out
  `buildPdfDocument`, which returns the document before serialisation, is the shorter path.
  Beware a wrong turn taken here: an early note recorded "the Blob yields 13 bytes" — that
  was `String(blob).length`, i.e. `"[object Blob]"`. The reviewer caught it.
- **PDF literal strings escape parentheses**, so `(Avg: 3.0)` is written `\(Avg: 3.0\)`.
  Without unescaping, every assertion on a bracketed score silently fails to match while
  assertions on plain words pass — which reads like a bug in the exporter rather than in the
  test. `pdfExport.test.ts` has a `pdfText` helper that undoes it.

**Grepping a content stream produces vacuous assertions unless you fight for it.** The
review found three that could not fail, all of which looked reasonable:

| Assertion                               | Why it was inert                                                             |
| --------------------------------------- | ---------------------------------------------------------------------------- |
| `toContain('Information')` for OBS-3    | the exec summary's intro sentence names all three dimensions in every report |
| `toContain('Areas')` for the new column | the Domain table above already emits that exact header                       |
| `toContain('DRAFT')` for the cover band | `DRAFT_NOTICE_LINE` starts with `DRAFT:`, so the footers alone satisfy it    |

The general lesson: in a document full of numbers and dimension names, a bare substring is
almost always reachable another way. What works is asserting through an extracted pure
function, anchoring a search past a unique heading, or counting occurrences against page
count. **Each fix was proved by neutering the code it covers and watching the test fail** —
worth doing, because two of the three had passed against deliberately broken code.

**The scoring rule had a fourth implementation, not three.** `useOrbitRatings.getAverageLevelForDimension`
still flat-averaged, and its signature accepts `'technology'`. No caller reaches it with
Technology today — `buildStandardNavItems` emits Technology either per-sub-dimension or as a
rollup handled earlier — so no wrong number shipped from it. It now delegates anyway. Second
time the count of these has been wrong; assume there is another and grep before claiming
otherwise.

**`DRAFT:` is a wire format, not presentation.** `parseMaturityProfileCsv` skips the notice
row by matching that prefix, and derives the prefix from `DRAFT_NOTICE_LABEL`. So renaming
the label would keep the entire suite green while making every CSV already exported during
the pilot unparseable. There is now a test asserting the **literal**, with a comment saying
not to "fix" it to use the constant.

**Playwright download capture.** The MCP wrapper handles the `download` event itself and
races `page.waitForEvent('download')`, which then times out even though the file arrived.
Register `page.on('download', ...)` and save from there. Also: every export is gated behind a
state-name dialog, so the click alone produces nothing.

**One thing checked and cleared, recorded so it is not re-investigated.** Dev-mode axe
reported a `color-contrast` failure of 1.32:1 (white on `#e0e0e0`, 15px) on Import/Export.
At rest, axe's full ruleset over that page reports **zero** violations, and when the export
buttons are genuinely disabled their text resolves to `rgba(0,0,0,0.26)`, which axe exempts.
It is most likely axe sampling MUI's colour transition mid-animation. Not reproducible as a
stable state, so it is **not** filed as an `OBS-*` entry — but note it sits inside Wave 4's
stated limitation 8, that import/export interaction states were never enumerated.

**The PDF print palette was verified rather than assumed** — Section 8f flagged `stat.color`
at `pdfExport.ts:192` as untraced. It comes from the local `COLORS` table
(`accent`/`primary`/`darkGray`), measuring 4.89:1, 6.56:1 and 5.43:1 on `lightGray`. Every
pair in the palette clears AA, so Wave 4's contrast work not reaching the PDF turned out not
to matter. New `COLORS.draft` `#b0142f` is 7.03:1 on white — and contrast is symmetric, so
that one figure covers both the white-on-red band and the red-on-white footer. An earlier
comment quoted a second, different ratio for the reversed pairing; there is no such thing.

**Limitations of this wave's verification, stated plainly.**

1. PDF content is asserted by substring search over a content stream. That proves a string
   was written. It does **not** prove it is legible, correctly positioned, or on the page a
   reader expects.
2. **The PDF was never rendered to an image and looked at.** Text extraction confirms
   presence and order; it says nothing about overlap or visual balance. The cover band's
   geometry was reasoned about (roughly y 60-74 against a state name fixed at y 90, so about
   three spare lines) rather than seen. The cover does not reflow — `drawCoverDraftBand`
   returns a y coordinate the caller ignores, deliberately, and this is noted in its
   docstring.
3. The footer notice is drawn at **7pt**. It clears AA on contrast and now wraps rather than
   overflowing, but 7pt is small and legibility at that size was not assessed.
4. Excel/`ROUND` parity is untouched here; that is Wave 7's problem.
5. `parseMaturityProfileCsv` still has no consumer outside its own test, so the CSV
   round-trip guarantee remains real but hypothetical.

## 8f. Wave 5 Pre-Brief — historical

> **Wave 5 is complete.** This is kept as written, before the work, because comparing it
> against what actually happened is useful: it called four defects and there were six, and it
> did not know about the live UI's To-Be divergence at all. **Section 8e is the record of what
> was actually done.**

Written at the end of Wave 4 so the next session starts with what is already known. Wave 5 is
the last wave of Drop 1 and, unlike Wave 4, its scope is **bounded and enumerable** — the work
is four known defects plus the draft notice on four surfaces.

### Why this wave matters beyond Drop 1

**OBS-25 is a Wave 7 blocker.** The workbook formulas have to reproduce one Technology dimension
score, and there are currently still two answers in the codebase: the canonical
`calculateDimensionScore` (mean of the two sub-dimension means) and the export path's flat mean
over all 11 aspects. Wave 1 fixed the results table; export was out of its scope. Until this is
settled, Wave 7 has no single number to target — so this wave unblocks the whole of Drop 2.

It also matters on its own terms: **the CSV maturity profile is the artifact states submit to
CMS**, and the PDF is the stakeholder report. Both currently print a Technology score the tool's
own UI disagrees with. Example from OBS-25: Infrastructure all at 5 and Application all at 1
gives 3.0 canonically and 3.2 in export — a weighting difference, so it does not shrink with
more data.

### The four defects, in dependency order

1. **OBS-25 — Technology weighting in `exportService.generateStandardAreaProfile` and
   `pdfExport.generateDimensionDetails`.** Delegate to `calculateDimensionScore`. The wrinkle:
   that scorer only reads `currentLevel`, so the **To-Be column needs a path too** — either
   parameterise the level selector or generalise the scorer. Decide which, and say why.
2. **OBS-25 follow-on — `generateExecutiveSummary`'s "ORBIT Dimension Summary".** This is a
   different question, not a delegation: it flat-averages every rating for a dimension across all
   areas, so it is weighted by both aspect count _and_ how many areas were assessed. The
   defensible enterprise figure is the mean of per-area dimension scores. **That is a semantic
   change to a stakeholder-facing table — get the user's call before changing it.**
3. **OBS-3 — aggregate dimensions are missing from the PDF entirely.** `generateCapabilityAreaSection`
   groups actual ratings, and aggregate dimensions have none by design, so a Data Management
   area's PDF silently omits Information. CSV and the results UI both handle this; copy their
   shape (`(Aggregate from N assessments)`).
4. **OBS-2 export-side test.** The fix landed in Wave 2 — `pdfExport` had labelled
   `currentLevel === 0` as "N/A" where the convention is `-1` — but it still has no test at the
   export boundary. Cheap, and it guards a stakeholder-facing misreport.

Plus the draft notice on four surfaces (Decision 4), and replacing the inline three-literal
organizational-section checks in `exportService.ts` and `pdfExport.ts` with
`isOrganizationalDimensionId`.

### Traps already known

- **CSV notice placement is constrained.** `parseMaturityProfileCsv` reads the state name from
  `lines[0]` specifically (`csvExport.ts:141-143`), so a notice _above_ that line makes every
  parsed state name `Unknown`. Put it on the line **after** the
  `MITA 4.0 Maturity Profile: <state>` header, padded with the existing `,,,,,` convention, and
  teach the parser to skip it. Worth knowing: that parser is not exported from
  `services/export/index.ts` and has no consumer outside its own test, so the round-trip
  constraint is currently hypothetical — but leaving it broken traps whoever wires CSV import.
- **The draft copy lives in `src/constants/draftNotice.ts`**, deliberately free of any
  `import.meta` reference so Node build tooling can import it. `IS_DRAFT` stays in
  `constants/index.ts` because it is environment-dependent. Do not merge them.
- **The PDF has its own colour set** — `COLORS` in `pdfStyles.ts`, unrelated to `SCORE_COLORS`.
  The Wave 4 contrast work therefore did **not** reach the PDF. Spot-checked and the print
  palette looks conservative (`#005b96`, `#646464`, `#007a5c` all clear 4.5:1 on white), but
  `stat.color` at `pdfExport.ts:192` is passed in from elsewhere and was not traced. Verify, do
  not assume — and note the PDF is a fifth place score colours are decided.
- **`npm test` needs `testTimeout`.** Wave 4 raised it to 15000 in `vitest.config.ts` because a
  deliberate 4000ms `waitFor` inside vitest's 5000ms default was timing out under load. If tests
  start reporting "Test timed out" rather than assertion differences, check that first.

### Suggested sequence

OBS-25 first — it is the blocker, and getting the canonical score into export makes the notice
work purely additive. Then OBS-3, then the notice on all four surfaces, then the OBS-2 test.
Land it as one commit with a sub-agent review, as with Waves 1-4.

## 8g. Wave 6 Pre-Brief — historical

> **Wave 6 is complete.** Kept as written, before the work, because comparing it against
> what happened is useful. It got the scoring groundwork and the traps right. What it did
> not anticipate: that the full PRA statement physically cannot fit in an Excel footer, that
> ExcelJS emits duplicate validation ranges, that empty-string cells are not blank cells, or
> that `knip` was ignoring the entire directory the wave was about to fill. Three of those
> four were found by looking at the real artifact rather than at a test result.
>
> It also did not anticipate that the go-live variant (`VITE_DRAFT_MODE=false`) needed testing
> at all — and the first attempt at that test passed against a workbook still carrying the
> notice. **Section 8j is the record of what actually happened.**

Written at the end of Wave 5. Wave 6 opens Drop 2 and is the first wave that adds a new
artifact rather than correcting an existing one.

### Read before writing any code

- **Section 5.2** (sheet structure and row counts), **5.3** (the 508 requirements, which are
  the reason the previous spreadsheet was rejected) and **5.5** (delivery).
- **Branch `feat-xlsx-workbook-generation` @ `b0fc55d`.** Roughly 2,300 lines of working
  ExcelJS generator already exist there. Reference only — never rebase it (Decision 8). Take
  the declarative `constants.ts` column/header/width model, the data-validation dropdowns, the
  `AVERAGEIFS`/`TEXTJOIN` techniques and `selectLockedCells: true`. Do **not** take the
  `categoryName`/`categoryId` columns (that tier was deleted in v4), the three-separate-org-types
  model, or `buildProfilePlan`'s merged label-row shape.
- It **does not handle aggregate dimensions at all**, which is the largest genuinely new piece
  of work and the origin of decision P1.

### What Wave 5 has already settled for you

The scoring parity problem in Section 5.4 is now tractable, which it was not before:

- **There is one Technology rule, in one place.** `calculateDimensionScore` in
  `src/services/scoring.ts` is the only implementation the workbook has to mirror. Wave 1
  fixed the results table, Wave 5 fixed both export paths, the executive summary and the live
  To-Be column, and closed a latent fourth copy in `useOrbitRatings`. Section 5.4's
  "Blocked on OBS-21" note is discharged.
- **To-Be has a canonical rule too**, via `calculateDimensionScore(..., 'targetLevel')`. Every
  input and profile row carries As-Is and To-Be, so the workbook needs both, and there is now
  a single answer to target for each.
- **The enterprise-wide dimension figure has agreed semantics**: mean of per-area dimension
  scores, finalized only, aggregate dimensions not folded in. If the workbook grows a
  summary sheet, that is the rule — `summariseDimensionsAcrossAreas` in `pdfExport.ts` is the
  reference implementation, and Section 5.4's rounding table still governs.
- **The draft notice has a Node-safe home.** `src/constants/draftNotice.ts` exports
  `DRAFT_NOTICE_LABEL`, `DRAFT_NOTICE_BODY` and `DRAFT_NOTICE_LINE` and is deliberately free
  of `import.meta`, so the build-time generator can import it directly. Derive the flag from
  `process.env.VITE_DRAFT_MODE`, never from `constants/index.ts`, which does read
  `import.meta.env` and throws under plain Node.

### Traps specific to this wave

- **knip fails the build on unused exports.** This has bitten twice, both times adding a
  constant one wave early. Add an export only once its consumer exists.
- **`ExcelJS` is a `devDependency`, pinned** (Decision 12). It must never enter the browser
  bundle. The vendor chunk is already 450 kB gzipped and over its own warning threshold
  (OBS-20).
- **The generated workbook is a gitignored build output**, so `npm run dev` has no file and
  the three in-app download links 404. That is Wave 8's problem, but do not be surprised by it.
- **ExcelJS does not evaluate formulas**, so no unit test can assert a cell computes 3.4.
  Section 5.4's four-step mitigation is the plan; step 1 (a JS reference implementation of each
  formula's intent, tested against `calculateDimensionScore`) is the one that carries the
  weight, and it now has a single scorer to test against.
- **Excel `ROUND` and JS `Math.round(x * 10) / 10` disagree on decimal halfway values**, and
  step 1 cannot catch it because it shares the JS primitive. The halfway-value fixture set is
  Wave 7, not here, but design the formulas knowing it is coming.

### A lesson from Wave 5 that transfers directly

Wave 5's tests searched a generated PDF for substrings, and three assertions turned out unable
to fail — each satisfied by unrelated text elsewhere in the document. The workbook's 508
assertions in Wave 6 have exactly the same shape: "no merged cells", "one header row per
table", "document properties populated" are all easy to write in a form that passes on an empty
or half-built workbook. **Prove each assertion by breaking the thing it covers and watching it
fail.** That step caught two of Wave 5's three.

## 8h. Wave 4 Notes — 2026-09-10

Full audit record is Section 8d. What is here is the things that cost time to learn.

**Run axe with `best-practice` included, or heading order is invisible.** `heading-order` is
not WCAG-tagged in axe. My first sweep filtered to the four WCAG tags and reported zero
heading problems; the app had them on seven routes. The pre-brief's "heading order invalid"
item came from dev-mode axe, which uses the default ruleset — so the two sources disagreeing
was the clue.

**Injecting axe into the real browser is the whole game, and it is easy.** `page.addScriptTag({
path: '<abs>/node_modules/axe-core/axe.min.js' })` after each `page.goto`. Note the path must
be **absolute** — Playwright's cwd is not the repo root. This gives real contrast evaluation,
which jsdom cannot do at all, and it took one Playwright call to sweep 12 routes.

**The biggest finding was not automatable.** Focus-visible failed across nearly the whole app
and axe reported nothing, because axe cannot tell whether a focus indicator is _perceivable_.
It was found by tabbing and reading `getComputedStyle`, then confirmed by screenshot. Worth
remembering for the workbook's 508 work in Wave 7: the same logic applies — the automated
assertions are a floor.

**`currentColor` is the right primitive for a focus ring in this app.** Two reasons, both
learned the hard way. MUI `ButtonBase` sets `outline: 0` and expresses focus as a background
tint — which the app's own `sx` backgrounds silently override, so a background-based fix would
have been fragile in exactly the places that were already broken. And the ring has to work on
both the dark blue AppBar and light page backgrounds; `currentColor` resolves to white on the
former and near-black on the latter, measured on both.

**My first fix for the results tree was wrong twice, and each time a different check caught
it.** Wrapping `ListItemButton` in `ListItem` is the correct fix for the sidebar and silenced
the critical `aria-required-children` there. Applying the same shape to `ResultsMasterDetail`
traded one violation for another: because `Collapse` renders a `div` between the levels, the
new `li`s were not inside a `ul`, producing `listitem` × 14. Re-running axe in the browser
caught that — typecheck, lint and 558 tests were green on it.

I then concluded the tree _could not_ be valid list markup and documented that as a
limitation. **That was also wrong**, and the sub-agent reviewer disproved it with a
counter-example: nest the `Collapse` **inside** the `li` rather than beside it, give each level
its own `ul`, and it passes clean. Shipped that instead. The general lesson: "this cannot be
done accessibly" is a claim that deserves a counter-example before it goes in a document
headed for CMS. See OBS-31.

**MUI 6.5 wraps `AccordionSummary` in `<h3 class="MuiAccordion-heading">`.** Nothing in this
repo writes that heading, so the assessment page's `h2 → h3 → h6` outline looked inexplicable
until I queried the live DOM for it. Every aspect card had a heading nested inside a heading.
Do not try to reason about heading order in this app from the JSX alone.

**Two things are deferred with a decision attached, not quietly dropped:** OBS-30 (contrast)
and OBS-29 (`MaturityLevelSelector`). For OBS-29 the useful distinction, which changes how
urgent it is, is that the control **is** operable by keyboard — Enter/Space selects, Tab reaches
the To-Be checkbox — so it fails WCAG 4.1.2, not 2.1.1. It is announced wrong rather than
unusable, which is what makes "document it for Drop 1" defensible.

**A URL sweep under-reports this app, and two findings hid behind clicks.** `/results` renders
its detail panel only after a selection, held in component-local state (OBS-12), and assessment
aspect panels load collapsed. Driving those states found the last heading skips plus
`landmark-unique` — and behind the latter, a **duplicate DOM `id`**: `AspectCard` set
`role="region"` and `id` on `AccordionDetails`, not knowing MUI's `Accordion` already renders a
`div.MuiAccordion-region` with the same id and a proper `aria-labelledby`. Removing the manual
copy took a five-aspect page from 16 landmarks to 6 with zero duplicate ids. Removing it also
broke a test helper that had been matching the _unnamed duplicate_ via
`getByRole('region', { name: '' })` — worth knowing that a test can silently depend on a bug.

**`currentColor` needed one exception.** On contained buttons the text colour is white, and the
default outward `outline-offset` drew the ring on the white page instead of the button: 1.00:1,
invisible, on the primary CTA of five pages. The reviewer caught it. Contained buttons now use
`outlineOffset: -4`, measured 5.14:1. Generalisable point — an adaptive colour still needs
checking against every surface it can land on, not just the two you looked at.

**Seed and clean up.** The 12-route sweep needs data on Dashboard/Results/Assessment/History.
Seeded 5 assessments / 109 ratings / 1 snapshot straight into IndexedDB, then cleared all five
stores afterwards and **read the counts back to prove they were zero** — the user's browser
profile persists. `.playwright-mcp/` (screenshots, console logs) is now gitignored; it was not
before, and it would otherwise have landed in this commit.

## 8i. Wave 4 Follow-Up Notes — 2026-09-10

The two Wave 4 deferrals were fixed rather than documented. Lessons worth inheriting.

**Reported instances are not root causes, and axe only sees what renders.** OBS-30 was filed as
"twelve failing colour pairs". Chasing the causes instead found that **all five** score colours
failed in every role they are used in, at 2.16-3.68:1 — axe had flagged two of the five, being
the two that happened to render during the sweep. Same shape for `info`, which the theme never
defined, so MUI's failing default was silently in play everywhere. If a contrast finding looks
like a short list, check the token rather than the list.

**Fix the token or the theme, not the call site.** MUI paints outlined-chip text and Alert icons
from `palette[x].main`, which is a fill-grade colour. Two `styleOverrides` entries fixed every
outlined success/warning/info chip and every Alert icon in the app at once. Chasing call sites
would have missed the conditional ones — three `color="info"` chips only render in states the
sweep never reached.

**Compute contrast, do not eyeball it.** A throwaway Node script computing luminance ratios
settled every palette choice in minutes and caught that `#b26500` misses at 4.42:1 while
`#a15c00` passes at 5.19:1 — a distinction no amount of looking would reveal. The maths then went
into tests, because the old palette's docstring _claimed_ AA compliance while failing everywhere,
and a comment cannot enforce anything.

**Write the tests before the rewrite, especially with no existing coverage.**
`MaturityLevelSelector` had no test file. Writing 28 tests against the _old_ implementation first
produced a baseline of 12 passing and 13 failing, where the 13 failures were precisely the
defects OBS-29 described. After the rewrite the same file went green without being rewritten to
match the implementation — which is the only real evidence that behaviour was preserved.

**jsdom is not a browser, and knowing where it lies matters.** It does not implement the roving
tabindex for a radio group with nothing checked: Tab visits every unchecked radio, where Chrome
exposes only the first. A tab-stop count measured in jsdom would therefore have been wrong. The
12-to-2 figure is measured in Chromium; the jsdom test asserts the count only in the state where
both engines agree. Separately, MUI puts `pointer-events: none` on disabled controls, so
`userEvent` refuses to click them — a disabled-state test that does not set
`pointerEventsCheck: 0` passes without exercising anything.

**Expanding panels is where the remaining bugs were.** Four findings across this work existed
only behind an interaction: two heading skips, `landmark-unique`, and duplicate DOM ids in both
`QuestionChecklist` and `AspectCard`. Hardcoded `id` attributes in a component that renders once
per aspect are invisible until two instances are on screen, and in the `QuestionChecklist` case
every region's `aria-labelledby` resolved to the _first_ matching header, so four of five panels
were mislabelled. Prefer `useId()`, and check whether MUI already provides the wiring before
adding `id`/`role` by hand. `useId()` returns `:r3:`-style values — strip the colons, they break
unescaped CSS selectors.

**A performance regression showed up as a test flake.** Moving to real radio inputs took a
five-aspect dimension from 25 to 55 mounted inputs per page, because collapsed accordion
panels stay mounted. The OBS-6 notes test started missing its 4s gate on about one full-suite run
in three. Shortening the typed string restored stability across four consecutive runs, but the
underlying cost is real and is logged as OBS-33 — the one-prop fix removes the element
`aria-controls` points at, so it needs its own accessibility pass rather than a rushed landing.

## 8j. Wave 6 Notes — 2026-09-14

The checklist above says what was built. This is what cost time to learn, and the numbers a
later session should not have to re-derive.

**Every figure below was read out of the generated `.xlsx`**, and the structural ones were
read out of its unzipped OOXML rather than through ExcelJS's reader. That distinction turned
out to matter more than expected — see the two defects below.

### Shape of the artifact

| Sheet                         | Rows  |
| ----------------------------- | ----- |
| `00_README`                   | 50    |
| `01_Maturity_Levels`          | 6     |
| `02_Capability_Reference`     | 72    |
| `03_ORBIT_Criteria_Reference` | 205   |
| `04_Assessment_Input`         | 1,625 |
| `05_Organizational_Input`     | 15    |

149 KB. Every count in 5.2 verified against the JSON. Row geometry is the same on every
sheet: notice in `A1`, the single header row on row 2, data from row 3, **no blank rows
anywhere in the workbook**. `HEADER_ROW` and `FIRST_DATA_ROW` in `scripts/xlsx/constants.ts`
are the only definition of that, and Wave 7 must derive its formula ranges from them.

**Decision 12 confirmed by measurement, not assertion.** As measured in Wave 6, the vendor chunk
was 1,418.43 kB / 449.92 kB gzipped — byte-identical to the Wave 0 baseline. No `exceljs` string
in any `dist/assets/*.js`, no `src/` import, and `npm ls exceljs --omit=dev` is empty. The
workbook feature costs the shipped app nothing.

> **Superseded as a current figure, not as a finding.** Wave 8's dependency-security work
> (OBS-37) moved `react-router` 7.12.0 → 7.18.4, so the vendor chunk is now **1,428.10 kB /
> 453.66 kB gzipped** — plus 9.67 kB, 0.68%. Read the byte-identical claim above as a dated
> Wave 6 snapshot. What it was there to establish still holds and was re-verified in Wave 8:
> `exceljs` remains absent from the production tree and from the bundle.

### Two defects that only the real artifact revealed

Both passed the full reload-based test suite. Both were found by unzipping the `.xlsx`.

1. **Two overlapping `<dataValidation>` elements** where there should be one. ExcelJS's
   range coalescer sorts cell addresses as strings, so `H10` precedes `H3` and it emitted
   `H10:I1627` nested inside `H3:I1627`. Reproduced in isolation, so it is a library bug and
   not our data. Fixed by using `dataValidations.add(range, ...)` instead of per-cell
   assignment. **The round-trip test could not see it** — ExcelJS's reader expands both
   elements to the same cells, so counting validated cells returned 1,625 either way.
   Recorded as OBS-39.
2. **Every editable cell was a text cell holding an empty string**, not a blank cell:
   `<c r="H3" s="8" t="s"><v>4</v></c>` where shared string 4 is `""`. 8,200 on the two input
   sheets, plus 9 on the README from a second code path that was missed on the first fix.
   `ISBLANK` returns FALSE and `COUNTBLANK` returns 0 for those cells, while
   `AVERAGEIF(">0")` correctly skips them — so a Wave 7 completion column counting non-blank
   level cells would have reported **a blank workbook as 100% complete** on the same sheet as
   a correctly-empty score. Fixed by writing `null`; ExcelJS still emits the style, so the
   fill and the unlocked protection survive, and both are now asserted. The workbook now
   contains **no empty shared string at all**, which is the strongest form of the check and
   what `writes no empty-string text cells on any sheet` asserts.

The lesson generalises: **ExcelJS's reader normalises, so a round-trip test is blind to
anything the reader smooths over.** `scripts/xlsx/workbook.raw.test.ts` exists for that
reason — it unzips the artifact with `jszip` (already a production dependency) and asserts on
the XML. Use it for anything where the file format is the ground truth.

### The full PRA statement cannot go in an Excel footer

Option D specified the full notice line in the print footer of every sheet. It does not fit:
Excel's header/footer limit is 255 characters, `DRAFT_NOTICE_LINE` is 420, and the assembled
footer was 441. Decision 15 forbids shortening the CMS wording, and the PRA sentence alone
exceeds 255 — so this is not an implementation problem, it is impossible.

Resolution, and Decision 16 now records it: the footer carries `DRAFT_NOTICE_SHORT_LINE`
(184 characters assembled), and the full statement lives on `00_README` as sheet content plus
the `description` document property. Same split the PDF already uses.

`assertFooterFits` throws at generation time as well. Note the precise claim, because a
looser version of it was wrong on first writing: the suites **do** assert the emitted footer
is within the limit, and that assertion is mutation-proved. What no test can do is confirm
Excel _accepts_ what we wrote — the bytes are exactly what we intended and only Excel
objects. The guard's own boundary is unit-tested in `footer.test.ts`, both sides of it.
Recorded as OBS-40.

### Verified in Excel — 2026-09-15

The user opened the generated workbook. **This is the check nothing automated could
substitute for**, and it found five defects the whole suite was blind to.

| Check                           | Result                                                               |
| ------------------------------- | -------------------------------------------------------------------- |
| Opens without a repair prompt   | Clean, lands on `00_README`                                          |
| Print footer                    | Renders, **not** truncated — the 255-character concern is discharged |
| Level dropdowns                 | Work on first and last row; typing `7` is rejected as designed       |
| Sheet protection                | Editable columns writable, locked cells still selectable             |
| **Excel Accessibility Checker** | **"Looks good! No issues found."** — every category green            |
| `A1` notice legibility          | Small but acceptable                                                 |
| Overall appearance              | Plain, judged acceptable for the volume of content                   |

The Accessibility Checker result is worth recording precisely: green on **"Avoid red
formatting"** despite the notice being red, and green on **"Use of merged cells"**, **"Missing
table header"** and **"Default sheet name"**. That is the manual complement to P2's automated
assertions and the closest available approximation of CMS's own 508 review. It does **not**
mean cleared — CMS runs its own review on its own clock — but it removes the most likely
category of surprise.

**Five defects found by looking, none of them something a 508 checker flags**, which is
exactly why no assertion covered them. Note the pattern: four of the five are consequences of
_styling_ — a fill that hides gridlines, an alignment default, a scale instruction, a blocked
text overflow. Structural assertions do not see styling, and Excel's Accessibility Checker
passed clean through all of them.

1. **Page numbers were incoherent.** `&P of &N` printed "1 of 24" on the first page and
   "114 of 24" after scrolling right, because the sheet spans a _grid_ of pages while `&N`
   counts one dimension of it. Removed on the user's call — and the cause was worse than the
   symptom, see the next item.
2. **`fitToWidth: 1` was a bad instruction on a 498-character-wide sheet.** Excel obeys it at
   roughly 23% scale: one page wide and illegible. Now used only on `00_README`, which is two
   columns and fits at about 85%. The table sheets paginate naturally at 100% with the header
   row repeating, so anything printed is readable.
3. **Vertical alignment was inconsistent.** Only the wrapping columns were set to top, so on a
   row made tall by a wrapped question the short values sat at Excel's bottom default — a
   state's typed notes floated above their own As-Is level. Now top on every column, set at
   **column** level only: ExcelJS merges that into each cell's own style, confirmed in
   `styles.xml` where the editable cells carry `applyAlignment="1"`. The per-cell assignment
   that was also there was redundant, and redundant enough that a mutation could not tell the
   two mechanisms apart — which made the assertion unprovable until one was removed.
4. **Autofilter buttons clipped long headers**, and **the README's own title was truncated** to
   "MITA 4.0 State Self-Assessment W" because the version string in `B2` blocked its overflow.
   Widths widened, header row taller, and the redundant version dropped from the title band —
   it already has its own labelled row.
5. **The editable columns had no cell borders**, so the input area read as one undifferentiated
   block of yellow. The cause is that **a solid fill covers Excel's gridlines**: the unfilled
   reference columns kept their ruling and the input columns lost it, in both directions — on
   `04` the three adjacent text columns (Notes, Barriers, Plans) had no visible boundary at
   all, which is worse than the row-tracking problem. Thin borders on all four sides of every
   editable cell now, in `#8C8C8C`, which measures 3.19:1 against the fill.

   Two things worth knowing about that fix. The border colour clears WCAG 1.4.11 even though
   it arguably need not — the row and column structure is available programmatically, so a
   border duplicating it is a redundant aid, and Excel's own gridlines are only about 1.48:1 —
   but clearing 3:1 costs nothing and removes the argument. And **gridlines print off by
   default**, which would have left the editable columns as the only ruled part of a printed
   sheet, so `printOptions gridLines="1"` is now set: the borders exist to imitate gridlines,
   so the two have to appear together or neither does.

   Cost is negligible. Borders are defined once in `styles.xml` and referenced by style index,
   so ruling 8,200 cells added one border definition and no measurable file size.

**A trap for the next session: Excel saves over the generated file.** The review session wrote
test data, Excel's `filterMode="1"`, and a computed `scale="23"` into
`public/mita-4.0-self-assessment-workbook.xlsx`. Inspecting that afterwards looks exactly like
a generator bug — it briefly did, and `scale="23"` was nearly filed against our own code before
the test data in `sharedStrings.xml` gave it away. **Regenerate before inspecting**, and
confirm the file is ours by checking it carries no `filterMode` attribute.

### Proving the 508 assertions

`scripts/xlsx/prove-assertions.ts` breaks the thing each assertion covers and confirms the
test goes red. **46 for 46**, exit code 0. Kept rather than deleted: Wave 7 adds more
assertions of the same shape, and it is also the evidence behind the accessibility claim.

It found **two genuinely vacuous assertions**, and both had the same shape — the test
compared the workbook against the same constant the workbook was generated from, so mutating
the constant moved both sides and the test stayed green:

| Assertion          | Why it could not fail                                       | Fix                        |
| ------------------ | ----------------------------------------------------------- | -------------------------- |
| notice colour      | compared cell font to `COLORS.noticeFont`                   | pin the literal `FFB0142F` |
| header is on row 2 | read the header _at_ `HEADER_ROW` and compared to the model | pin the literals 1 / 2 / 3 |

That is a different failure mode from Wave 5's three, which were substrings satisfiable by
unrelated content. **Both classes are invisible to review and to a passing suite.** The rule
that catches this one: if both sides of an assertion derive from the same constant, it asserts
nothing — pin a literal, and say in a comment why it must not be "fixed" to use the constant.

**The harness does not catch every shape of vacuity, and two more got through it.** Both were
found by an adversarial sub-agent review:

- A **conditionally** vacuous assertion. "Every input-filled cell has a header that says so in
  words" scanned for the fill and only asserted if it found one, so deleting the input fill
  entirely left 120 tests green. Fixed by asserting the fill is present, which is now its own
  mutation.
- A **mismatched** mutation and test. The go-live block's "carries no predecisional notice"
  checked four named locations — `A1`, the footer, the title, the `description` property — and
  passed against a workbook carrying the full PRA statement verbatim on README row 4, because
  the README's notice section was the one surface not gated on `isDraft()`. That is the worst
  finding of the wave: a test certifying the opposite of the truth about the artifact states
  will actually receive. The assertion now enumerates every cell of every sheet.

The generalisation: **a mutation only proves the assertion it is pointed at.** Check that the
pair actually correspond, and that the assertion has no early exit which the mutation happens
to take.

**Five mutations went stale mid-wave**, at three separate points, each time because a
refactor renamed the code they patch. The harness reports that as `MUTATION-NOT-APPLIED` and
exits non-zero, which is right — a stale mutation is an unproved assertion, so `41 of 41`
quietly became `31 of 32` twice without the claim changing.

Two consequences, both now in place. **Re-run the harness after any refactor**, not once at
the end. And because it takes minutes and is therefore not in `npm test`, `footer.test.ts`
now asserts that every mutation's target text still exists in the file it patches — the fast
half of the guarantee, running in milliseconds. It earned itself immediately: it caught two
freshly-stale mutations within a minute of being written.

The harness also had a **classification bug worth knowing about if you extend it**. Its
failure detection accepted `Test Files 1 failed`, which vitest prints on a _collection_
error — so a mutation that broke the module at import time, running zero assertions, was
reported as proof that the assertion works. It now requires the `Tests N failed` summary line
and treats "no tests ran" as its own outcome counting against the total.

### Traps and gotchas

**`new URL(<literal>, import.meta.url)` is not safe in a module Vite transforms.** Vite
statically rewrites that exact pattern to an asset URL, so `fileURLToPath` throws under
vitest while the same code works fine under plain Node. Not uniform either — the
`capabilities.json` path survived and the `package.json` path did not. Derive the directory
from bare `import.meta.url` and compose with `node:path`; `scripts/xlsx/paths.ts` is the one
place that happens. OBS-38.

**`selectLockedCells: true` disappears from the file, and that is correct.** ExcelJS's `true`
means "allow selection", which OOXML encodes as the _absence_ of the attribute because
allowing is the format default. So asserting `=== true` always fails and asserting `!== false`
passes even on an unprotected sheet. Two assertions are needed: `sheet === true` to prove
protection is on, and `selectLockedCells !== false` to prove selection is not blocked. The
raw XML shows `<sheetProtection sheet="1" sort="0" autoFilter="0"/>`, where `sort="0"` means
sorting is _permitted_ — the OOXML flags are inverted relative to the ExcelJS API, which
makes a naive reading of the file look alarming.

**`knip` was ignoring the whole `scripts` directory**, so "knip clean" said nothing at all
about this wave. Now fixed — `knip.json` has `scripts/**/*.{ts,tsx}` in `project` and
`prove-assertions.ts` as an entry, since nothing imports it. It
immediately found five dead exports I had added for Wave 7's benefit, which is the exact trap
Section 1 warns about twice. They were deleted; add them back when a consumer exists.

**`format:check` only globbed `src/**`.** Widened to `{src,scripts}`. The lint-staged glob is
`*.{ts,tsx}` with no directory prefix, so the pre-commit hook *was\* reformatting the new files
— meaning the gate and the hook disagreed about which files had a style.

**Both workflows pinned Node 20, where the generator cannot run at all.** Type stripping is
unflagged from 22.18. Bumped both to `22.18` and added `engines` plus `.nvmrc`. `npm test`
passes on Node 20 regardless, because vitest transforms through Vite — so this was invisible
today and would have detonated in Wave 8, which puts the generator in `npm run build`.
`deploy.yml` was bumped in this wave rather than Wave 8 deliberately, so CI and deploy never
validate against different runtimes.

### Limitations — what this wave's verification does not establish

Stated plainly, because the artifact goes to CMS.

1. **No formula is verified, because none exists.** Sheets `06`-`09` are Wave 7. The README
   describes the scoring rules it _will_ apply and says so explicitly.
2. **Screen reader behaviour is untested.** The structural properties a screen reader depends
   on are asserted, and Excel's Accessibility Checker passes clean — but no assistive
   technology has actually read this file.
3. **Print output was previewed, not printed.** The footer and the repeating header row were
   seen in Excel. No page went on paper, and the natural-pagination setup that replaced
   `fitToWidth` has not been re-checked in Excel since the change — worth a glance at Print
   Preview on `04_Assessment_Input` next time the file is open.
4. **The `A1` notice overflows into adjacent cells rather than wrapping**, which is how it
   reads across the sheet without a merged cell. Judged acceptable in Excel at default zoom;
   how it behaves at other zoom levels was not explored.
5. The go-live variant (`VITE_DRAFT_MODE=false`) is asserted structurally — no notice in any
   cell, footer or document property, row 1 still populated, no blank rows, the same row
   counts as the draft build — but it has **not** been opened in Excel. Worth generating and
   checking once before go-live actually happens, since that is the artifact CMS publishes and
   it will have had far less human attention than the draft.
6. **The five defects found in Excel were all invisible to the suite, and none is something a
   508 checker flags.** Alignment, page numbering, print scaling, a clipped title, and missing
   cell ruling are consequences of styling, and structural assertions do not see styling —
   Excel's own Accessibility Checker passed clean through all five. That is the general lesson
   rather than a gap to close: for a visual artifact some verification only comes from opening
   it, and **Wave 7 should budget for another Excel pass** rather than assuming a green suite
   means a good spreadsheet. Each of the five now has an assertion and a mutation behind it,
   so they cannot come back — but the next five will be different.

## 8k. Wave 7 Pre-Brief (maturity profile and formulas)

Written at the end of Wave 6. Wave 7 is the wave where the workbook starts _computing_, which
makes it the highest-risk part of workstream C — 5.4 calls it "the real risk" and that is
still true.

### Read before writing any formula

- **Section 5.4 in full**, especially the rounding-point table. Rounding happens at
  _different points_ in different rollups, and getting that wrong is how the workbook
  silently disagrees with the tool.
- **Section 8j above**, both the defects the raw artifact revealed and the four the Excel pass
  revealed. The blank-cell one directly affects the completion column on `07`, and the
  print-scaling one means new sheets should not reintroduce `fitToWidth` without checking how
  wide they actually are.
- `calculateDimensionScore` in `src/services/scoring.ts` is the single canonical scorer.
  `summariseDimensionsAcrossAreas` in `pdfExport.ts` is the reference for `09`.

### What Wave 6 has already settled for you

- **Row geometry is fixed and mode-independent.** `NOTICE_ROW` 1, `HEADER_ROW` 2,
  `FIRST_DATA_ROW` 3, on every sheet, in both draft and go-live mode. Derive every range from
  those constants — a hardcoded row number is how a range silently shifts by one.
- **Every input row is uniquely keyed** by area + dimension + sub-dimension + aspect, and
  those ID columns are visible at the far right of each sheet, outside the named range. A
  test asserts the key is unique across all 1,625 rows.
- **Technology sub-dimension attribution is preserved and contiguous**, and asserted against
  the app's own ordering. The app's `getAspectsForDimension` flattens and loses it, which is
  why `model.ts` has its own traversal.
- **Sheets `06`-`09` are already named** in `SHEET_NAMES` and listed on the README as "not
  included in this draft". A test pins that exact four-name list, so each sheet turns a test
  red as you build it — including `09_Dimension_Scores`, agreed in Decision 17.
- **The mutation harness exists.** Add a case per new assertion and re-run it. 41 for 41
  today; anything less means an assertion that cannot fail.

### Traps specific to this wave

- **`AVERAGEIFS` returns `#DIV/0!` where `calculateDimensionScore` returns `null`.** The
  canonical scorer _drops_ a sub-dimension with nothing assessed; Excel errors. The Technology
  formula is the mean of two sub-dimension means, so it breaks the moment a state has filled
  in only one sub-dimension — a very common partial state. Wrap in `IFERROR`/`AGGREGATE`, and
  make the 5.4 step-1 reference implementation model the _drop_, not the error.
- **Sorting is deliberately left enabled on the input sheets**, so a state can reorder them.
  Every formula must therefore be criteria-based over the ID columns, never offset-based. The
  README warns about adding and removing rows; it says nothing about sorting, and should.
- **Excel `ROUND` and JS `Math.round(x * 10) / 10` disagree on decimal halfway values.**
  `4.05 / 3` is 1.3 in JS and 1.4 from Excel. 5.4 step 1 cannot catch this because it shares
  the JS primitive — hence the halfway-value fixture set on this wave's checklist. Record
  which primitive is authoritative.
- **`subDimensionId` holds the human string `Not applicable` on 1,570 of 1,625 rows** in a
  column headed "Sub-Dimension ID". `AVERAGEIFS` copes, but it is not an ID, and it matters
  for the XLSX import the design keeps citing as motivation. Worth reconsidering before more
  formulas depend on the literal.
- **Nothing asserts cell _types_ yet.** The row tests stringify, so `1` and `'1'` are
  indistinguishable except where explicitly pinned. `01_Maturity_Levels` column A is
  deliberately mixed — numbers 1-5 then the text `N/A`. If any formula does `MATCH` or
  `VLOOKUP` against it, pin the types first.
- **The `Finalized?` question on the checklist is a real fork, not a formality.** Decide it
  before writing `08` and `09`, and update the README's "Known differences" text to match
  whichever way it goes.

## 8l. Wave 7 Notes — 2026-09-14

The wave where the workbook started computing. Four new sheets, `06`-`09`, holding Excel
formulas that have to produce the same numbers as `calculateDimensionScore` and the rollups
above it.

The headline is not the formulas. It is that **the arithmetic is now verified by making Excel
compute it**, rather than by asserting on formula strings — and that this found three defects
after 989 tests and 89 proved-failable mutations were all green. Every one of them would have
shipped a wrong number to CMS.

### What was built

| Sheet                 | Rows | What it holds                                                        |
| --------------------- | ---- | -------------------------------------------------------------------- |
| `06_Maturity_Profile` | 216  | 71 standard areas × 3 dimensions, plus 3 organizational section rows |
| `07_Area_Scores`      | 72   | One per capability area, with completion % and visible divisors      |
| `08_Domain_Scores`    | 15   | 14 domains plus an overall row                                       |
| `09_Dimension_Scores` | 3    | The enterprise-wide ORBIT figure (Decision 17)                       |

Three modules, all new: `scoring-spec.ts` (the rule, expressed once as JS and once as formula
generators), `profile-rows.ts` (the row builders), `excel-rounding.ts` (a model of Excel's
`ROUND`, plus the fixtures that check the model).

### `06` is 216 rows, not 228

5.2 contradicted itself, giving both a row count of 228 and a uniform
one-row-per-area-and-dimension shape. 216 = 71 × 3 + 3, resolving it in favour of the uniform
shape with **one row per organizational section** rather than per organizational aspect.

The per-aspect alternative needs "Section:" label rows, which 5.3 forbids, and it would be a
copy of `05_Organizational_Input` rather than a computation. The section means are what the area
score consumes, so they are what the sheet carries.

### The `Finalized?` question: decided against, and something better added

The tool counts only _finalized_ areas toward domain scores and aggregates. A workbook has no
status, so the plan offered a `Finalized? (enter Yes/No)` input column to reproduce the tool's
population exactly.

Rejected. It introduces an input the tool has no analogue for — finalizing is an action behind a
dialog there, a cell a state can forget here — and a forgotten cell produces silently wrong
domain scores, which is worse than the divergence it closes. The divergence only exists
mid-assessment and is documented on `00_README`.

What went in instead is narrower and needs no input: **an area scores blank until the state has
entered at least one level for that area.** That is the closest representable analogue of "has
no assessment record", and it turned out to fix a real defect rather than being a nicety — see
defect 3 below.

### Three defects the tests could not see

Two were found by opening the artifact, one by a reviewer reading an emitted cell. All three
produce a plausible-looking wrong number, which is the failure mode that matters here.

**1. Completion over 100% on all 21 enterprise-domain areas.** The aggregate row's
`Aspects Assessed` cell held a count of _contributing capability areas_. `07` sums the three
dimension rows' `Aspects Assessed` as the numerator of completion %, while
`getAssessableAspectCountForArea` leaves the aggregated dimension's aspects out of the
denominator (26 drops to 16 for Data Management, 15 for Technology Management). So up to 11 was
being added to a numerator over a denominator of 16.

Fixed by making the cell a literal `0`, which is also the honest figure: a state enters no
aspects for an aggregated dimension. The contributing-area count survives in the Notes cell,
which is where the CSV profile puts it too.

Found by a test written to assert something else — that the completion count tests for a
non-empty cell rather than `">0"`. The filter caught a row whose `COUNTIFS` was over the wrong
sheet entirely.

**2. Twenty-one blank cells in a workbook whose every other inapplicable cell says so in
words.** The aggregate rows' To-Be was `''`. A blank reads as "not filled in yet" to a screen
reader and to a person; the meaning needed is "there will never be a value here". Changed to the
text `Not applicable`, matching the sub-dimension columns.

Safe for the rollup above, and this is load-bearing rather than incidental: `AVERAGE` ignores
text inside a **cell reference** exactly as it ignores a blank, so `07`'s divisor still drops
from 3 to 2. Measured in Excel, not assumed — `AVERAGE(J4,J5,J6)` with `J4` = "Not applicable",
`J5` = 3, `J6` = 4 returns 3.5.

**3. Twenty-one never-opened areas inflating the domain and overall scores.** This is the one
worth remembering. An aggregate is computed **domain-wide from other domains' areas**, so it is
non-empty while the area holding it is untouched. Seeding a single Information level in any
ordinary area therefore gave all ten Data Management areas a score, and all eleven Technology
Management areas too.

Measured: two seeded areas scoring 3.5 and 2.0 should give an overall of 2.8. Excel returned
3.6, because 21 phantom areas had joined the average. The entered-guard above fixes it, and the
`07` scenario now asserts an untouched enterprise-domain area and its domain both read blank.

No string assertion could have caught this. The formulas were all individually correct.

**4. (Found by review, not by Excel.) The aggregate note frozen at "50 assessments".**
`resolveAggregateFormulas` reused the mean's criteria list for the note's `COUNTIFS`.
`AVERAGEIFS` ignores non-numeric cells in its average range for free; `COUNTIFS` does not. Since
all 216 rows exist at generation time, the count was a **constant** — every aggregate note read
`(Aggregate from 50 assessments)` on a blank workbook, beside a blank score, while the CSV
profile would say 3. Both the zero branch and the singular branch were unreachable.

Fixed by adding `scoreRange,">0"` to the count only. Not to the mean: that formula sits _in_ the
score column, and Excel tolerates a self-reference in `AVERAGEIFS`'s average range but not in a
criteria range. The reviewer measured that distinction rather than assuming it.

### The Excel/JS rounding divergence is real — measured, not modelled

5.4 flagged that Excel's `ROUND` and the app's `Math.round(x * 10) / 10` disagree on decimal
halfway values, and that mitigation step 1 cannot catch it because it shares the JS primitive.
`halfway.test.ts` enumerated the divergence against a _model_ of Excel's behaviour that nothing
could check.

It can now. All five fixtures were evaluated in Excel 16 on macOS and **all five returned the
Excel-style answer**:

| Formula                         | App gives | Excel gives |
| ------------------------------- | --------- | ----------- |
| `=ROUND(4.05/3,1)`              | 1.3       | **1.4**     |
| `=ROUND(AVERAGE(1.2,1.9),1)`    | 1.5       | **1.6**     |
| `=ROUND(AVERAGE(2.8,2.9),1)`    | 2.8       | **2.9**     |
| `=ROUND(AVERAGE(4.3,4.6),1)`    | 4.4       | **4.5**     |
| `=ROUND(AVERAGE(1,1.8,1.25),1)` | 1.3       | **1.4**     |

**Authoritative primitive: the tool.** A state reads their score on screen and submits it through
the CSV profile, both from `Math.round(x * 10) / 10`. Where Excel differs the workbook is wrong
by definition, and the difference is always exactly 0.1. Documented on `00_README` rather than
engineered around.

Where it can actually bite, from the enumeration:

| Rollup                                         | Divergent combinations |
| ---------------------------------------------- | ---------------------- |
| Any dimension score                            | **0**                  |
| Technology (mean of 2 unrounded sub-dim means) | **0** of 2,009         |
| Standard area, all 3 dimensions scored         | **0** of 68,921        |
| Standard area, only 2 dimensions scored        | 32 of 1,681            |
| Organizational area, 3 sections assessed       | 313 of 50,225 (~0.6%)  |

So Technology — the score this project spent three waves getting right — cannot diverge. What
can is the Enterprise Governance score and a two-dimension area. The README names both, after a
reviewer pointed out the first draft aimed its caveat away from exactly those cases.

### The model was right for the wrong reason

Worth recording as a method note. The first `excelStyleRound` normalised to 15 significant
digits (Excel's documented mechanism) and then compared a float remainder against 0.5 with a
`toPrecision(12)` fudge to absorb representation error. A mutation removing the normalisation
**did not fail any test**. Investigating: across the 120,827 values reachable from the model's
rollups, dropping the normalisation changes nothing. The fudge was doing all the work.

The function agreed with every fixture while modelling the wrong thing, and no fixture could
reveal it — only the mutation harness did. Rewritten to round on the normalised decimal digits,
where half-away-from-zero at 1dp is exactly "is the second decimal digit ≥ 5" and there is no
float error to absorb.

### Scripted Excel verification: `npm run verify:workbook-excel`

The plan called for opening the file and hand-verifying three areas. That was replaced with
`scripts/verify-workbook-in-excel.ts`, which drives Excel over AppleScript: copy the workbook to
a temp file, seed input cells, `calculate full`, read the computed cells, close without saving,
compare against the same JS model the unit tests use. 41 checks across 9 scenarios, plus the 5
rounding fixtures in a scratch workbook.

Better than hand-verification in three ways: it is repeatable, it derives every cell address from
the generator's own builders so a stale address is an error rather than a wrong reading, and it
covers cases nobody would think to check by hand — the blank workbook, a Technology dimension
with one sub-dimension empty, a fixture where the two rounding points give different answers.

**Not in CI.** It needs macOS and a licensed Excel. It is a manual gate before shipping a
workbook change, and it can rot, so it is written to fail loudly.

Traps found while building it:

- `calculate` takes a range or a worksheet, **not a workbook**. `calculate wb` fails with a bare
  `Parameter error (-50)`. Use application-level `calculate full`.
- Calculation mode is forced to automatic and restored. If a user's Excel were set to manual,
  every reading would be the stale value the file was written with — a blank — and a blank
  compared against a blank expectation would let the whole run pass while proving nothing.
- One Excel session **per scenario**. Scenarios seed overlapping areas, so sharing a session
  would make each scenario's expected values depend on what ran before it.
- Excel autosaves, so the deliverable is never opened — only ever a fresh temp copy.

### Two vacuities in the verifier itself, found by auditing it

The verifier is the thing nothing else checks, so it got the same treatment as everything else.

**`matches('', 0)` returned `true`.** `Number('')` is 0 and `Number.isFinite(0)` is true, so every
`expected: 0` check — the aggregate's assessed count, the blank-workbook area count, completion at
0% — passed on a cell that was simply empty. Precisely the case they exist to distinguish. Fixed
by rejecting an empty reading for any numeric expectation.

**Nine checks expect an empty reading, and an empty reading is what a wrong cell address
produces.** Added `validateAddresses`, which runs before Excel is involved: a cell expected to be
empty at runtime must hold a _formula_ in the generated file, since a formula returning `""` is
the only way a computed cell legitimately reads empty; a cell expected to hold a value must not be
blank; and every seed must land on a cell that is blank in the file, since the editable input cells
are the only blank ones. Proved by pointing an address at row 500 and confirming it fires in both
directions.

Also pinned the iteration count of every filtered loop in `profile-rows.test.ts` (195, 216, 132).
A loop that `continue`s past every row asserts nothing and still passes, and these filters are one
string literal away from excluding everything.

### Mutation harness: 89 of 89

Up from 51 at the end of Wave 6. The Wave 7 cases target the scoring rules rather than 508
properties, and each is a mistake someone could plausibly make: dropping a redundant-looking
`">0"`, rounding the sub-dimension means because every other mean is rounded, averaging domain
scores for the overall figure because that reads naturally.

`footer.test.ts`'s staleness guard earned its keep again — it caught two mutations pointing at the
same test, twice. Both times the right fix was to split the test, because they really were two
claims.

### The one thing the harness cannot reach

`verify-workbook-in-excel.ts` sets cell values **programmatically**, which bypasses data
validation entirely. So it proves the formulas are right given numeric input, and says nothing
about what a state's **dropdown pick** actually stores.

That gap has teeth. Measured in a scratch workbook:

| Level cell holds | Score formula returns | Completion counts it |
| ---------------- | --------------------- | -------------------- |
| text `"3"`       | **blank**             | 1                    |
| number `3`       | 3.0                   | 1                    |

`AVERAGEIFS` with a `">0"` criterion ignores text, while `COUNTIFS(…,"<>")` counts any non-empty
cell. A workbook whose levels arrived as text would therefore show rising completion percentages
beside entirely blank scores.

`LEVEL_DROPDOWN_VALUES` is a list of **strings** (`'N/A'`, `'1'`…`'5'`) because an inline Excel
validation list is a comma-separated string by format. The stored type comes from the cell's
number format, and no number format is set, so General should parse `3` as numeric. That is an
inference, not a measurement.

Mitigating factor worth recording: the failure is **loud, not silent**. A blank score column next
to a non-zero completion percentage is immediately visible, so this cannot quietly corrupt a
submission the way defects 1-4 could have. It is a go-live check, not a design risk.

### Limitations — what this wave's verification does not establish

- **41 checks are 41 checks.** The scenarios cover the rules 5.4 identifies as risky, not the
  cross product of 72 areas × 3 dimensions × every partial-fill state.
- **Manual entry through the dropdown is unverified.** See the section immediately above.
- **The divergence enumeration is still modelled.** Five confirmed points make the model
  credible; 313 of 50,225 comes from the model, not from 50,225 trips through Excel.
- **One version of one spreadsheet program.** Excel 16 on macOS. Nothing has opened the file in
  Excel for Windows, Excel on the web, LibreOffice, or Google Sheets, and `TEXTJOIN` over an
  implicit array is the most likely thing to behave differently.
- **No screen reader has touched the computed sheets.** (Excel's own Accessibility Checker _has_
  now run with `06`-`09` present and was clean in every category — see the Wave 7 checklist. The
  sentence below predates that and is kept only for the screen-reader half.) It has not run
  since `06`-`09` landed either; that is the one Wave 7 checklist item still open.
- **Print Preview on `06`** is unseen. It is the widest sheet in the workbook at 19 columns, and
  the natural-pagination setup that replaced `fitToWidth` was fixed after the last Excel pass.

## 8m. Wave 8 Pre-Brief (delivery, docs, handoff)

Wave 8 is the last wave of Drop 2 and the first one since Wave 5 whose output a stakeholder can
actually see. Nothing in Waves 6 or 7 is visible in the app yet: the workbook is generated but
unreachable, because the download links are this wave.

### State of the tree

Waves 6 and 7 are committed on `feature/pilot-clearance` and **not pushed, not deployed**.
`origin/main` is still roughly ten commits behind at the pre-v4 model, and `deploy.yml`
auto-triggers on push to `main` — so pushing to `main` would silently revert the live pilot site
to a stale build. Deploy by manual `workflow_dispatch` from the feature branch, dispatched
against the fork explicitly.

### Read first

- **Section 8l above**, particularly the scripted Excel verification. If Wave 8 changes anything
  the generator emits, `npm run verify:workbook-excel` is the gate, and it needs Excel.
- **`scripts/xlsx/paths.ts`** — the measured `SOURCE_DATE_EPOCH` finding. Two runs with the epoch
  fixed produce byte-identical _unzipped content_ but different `.xlsx` bytes, because ExcelJS
  stamps ZIP entry timestamps it does not expose. A CI drift check must unzip and diff the parts,
  or just regenerate and run the suite. Diffing the `.xlsx` will report a change every run.
- **OBS-37** — `jspdf` has a critical advisory and `react-router` a high one, both in production
  dependencies, both unfixed. Decide whether Drop 2 ships with them. **Decided and done in Wave
  8: fixed.** Every fix sat inside the existing caret ranges — the critical was a `jspdf` patch,
  4.2.0 → 4.2.1, not the major bump OBS-37 predicted. The production tree is now at 0 advisories
  and the full tree at 2 moderate / 0 critical / 0 high, down from 30. The 2 remaining are
  `exceljs`'s bundled `uuid`, whose only offered fix is a **downgrade** to `exceljs@3.4.0`, so
  **never run `npm audit fix --force` in this repo.** See OBS-37 for the full record.

### Resolved before Wave 8 started: `TEXTJOIN` is gone

`TEXTJOIN` **requires Excel 2019, 2021, 2024 or Microsoft 365 and does not exist in Excel 2016 or
earlier**, where the three text roll-up columns on `06_Maturity_Profile` showed `#NAME?`. Everything
else the generator emits is Excel 2007 or older, so one function serving three convenience columns
raised the workbook's floor by twelve years, for an audience where a 2016 perpetual install is
entirely plausible.

Replaced with explicit concatenation, which needs nothing newer than Excel 2007:

```
MID(IF(a="","", " | "&a) & IF(b="","", " | "&b) & ... , 4, 32767)
```

Each term contributes a _leading_ separator so the terms are uniform — no special case for "the
first non-empty cell" — and `MID` drops it. An empty block concatenates to `""`, and `MID` on an
empty string is `""`, so nothing needs a guard. The start offset is derived from the separator
length rather than hardcoded.

Verified in Excel across the cases that matter: an empty block, a single entry with no leading
separator, a gap in the middle, the last row of the block included, the boundary between two
organizational sections, and cross-area isolation. Longest emitted formula is 848 characters against
Excel's 8,192 limit; the file grew from 191 KB to 217 KB.

**The Excel 2007 floor is now enforced rather than claimed.** `workbook.raw.test.ts` scans every
`<f>` element in the archive and fails on any function name outside an allowlist of pre-2007
functions. That covers both hazards a newer function brings — needing an `_xlfn.` prefix that
ExcelJS does not add, _and_ not existing in the reader's Excel. Adding one fails the build.

### Traps specific to this wave

- **The workbook is gitignored**, so `npm run dev` has no file and the three download links
  would 404. A `predev` step or a graceful message, not a link that fails silently.
- **`npm run verify:workbook-excel` is the gate for any generator change**, and it needs macOS with
  Excel, so CI cannot run it. If Wave 8 touches anything the generator emits, run it. The Wave 7
  record is emphatic about why: the scripted check found three defects the 989-test suite could not,
  and then a user found two more that the scripted check itself was not covering because it read no
  text cells. **Read at least one cell of every new column.**
- **Prefer formulas whose correctness does not depend on Excel's array-evaluation rules.** The
  criteria-based `IF` over a range looks right, passes every string assertion, and silently reads
  the wrong rows. See 8l, "Two more defects".
- **CI runs Node 22.18** now (both workflows were moved off 20 in Wave 6, because the generator
  relies on native type stripping). `.nvmrc` and `engines` both pin it. Adding the generator to
  `ci.yml` should be a matter of one step, but the node version is the thing that breaks first.
- **The go-live switch is one variable in two places.** `VITE_DRAFT_MODE=false` removes the
  notice from the app _and_ the workbook. `workbook.test.ts` has a go-live suite that runs the
  whole generator with the flag flipped, so that path is covered — but nothing has generated a
  go-live workbook and opened it.
- **Version bump and CHANGELOG** are release-checklist items in the steering doc, and Drop 2 adds
  a user-facing feature (the workbook), so this is a MINOR bump at least.

### Two more defects, found by a user opening the file — 2026-09-16

Both in the `TEXTJOIN` text roll-ups, both invisible to 989 green tests, 89 proved-failable
mutations and 36 passing Excel arithmetic checks. The reason they were invisible is worth stating
plainly: **the formula-string tests assert what the generator emits, and the generator emitted
exactly the string it intended.** The string was right and Excel's reading of it was wrong.

The scripted Excel verification did not catch them either, because it read score cells and never a
text cell. That gap is now closed with a dedicated scenario.

**1. `#NAME?` in all 648 text cells.** Every worksheet function added after Excel 2007 must be
_stored_ with an `_xlfn.` prefix. Excel strips it for display, so the formula bar shows
`TEXTJOIN(...)`, but a file containing the bare name is using a function Excel does not recognise.
ExcelJS does no prefixing. Fixed at the time by emitting `_xlfn.TEXTJOIN`, then superseded entirely
once it emerged that `TEXTJOIN` does not exist in Excel 2016 either — see "Resolved before Wave 8
started" in 8m. The prefix rule is still worth knowing, and the allowlist guard it produced now
enforces the Excel 2007 floor as a whole.

Worth knowing: the prefix is **file-format only**. Typing `=_xlfn.TEXTJOIN(...)` into a cell gives
`#NAME?`, which briefly made a diagnostic probe look like a contradiction.

The guard is now a raw-OOXML scan of every `<f>` element against an allowlist of functions that
predate the prefix rule — `AVERAGE`, `AVERAGEIFS`, `COUNT`, `COUNTIFS`, `IF`, `IFERROR`, `ROUND`,
`SUM`. Deliberately an allowlist, since a denylist silently permits whatever nobody added to it.

**2. Silent cross-area mis-attribution, which was worse.** Behind the `#NAME?` sat a second,
unrelated defect. The criteria-based form `TEXTJOIN(" | ",TRUE,IF(ids=x,texts,""))` **does not work
as a normal formula.** Excel applies _implicit intersection_ to the `IF` condition, collapsing the
range comparison to the single row matching the formula's own row number:

- `N3` sits in sheet row 3. Input row 3 happens to belong to that same area, so the condition is
  TRUE and `IF` returns the **entire** column, which `TEXTJOIN` then joins.
- `N48` sits in row 48. Input row 48 belongs to a different area, so the condition is FALSE and the
  cell returns empty.

Measured on the artifact, with one note on Health Plan Administration and one on Claims
Adjudication:

```
N3  Health Plan Administration notes : [HPA note | CLAIMS note]
N48 Claims Adjudication notes        : []
```

So one capability area's cell contained another area's free text, and the area that owned it showed
nothing. On a document a state submits to CMS that is an accuracy problem, not a cosmetic one — and
it produces plausible-looking output, which is the worst failure mode available.

This also explains an earlier false positive. A probe that seeded two notes and read
`First note | Third note` looked like proof the formula worked; it was really joining every note in
the workbook, and those happened to be the only two.

**The `*1` detour.** An intermediate diagnosis held that a _binary_ arithmetic operator forces array
evaluation while a bare comparison does not, supported by a side-by-side probe where `(cmp)*1`,
`(cmp)*(cmp)`, `(cmp)+0` and `EXACT` all worked and `cmp` and `--(cmp)` returned `#VALUE!`. That
probe was itself contaminated by implicit intersection: every probe cell sat in a row that fell
inside the matching block, so the working cases were false positives too. Recorded because the
lesson generalises — **a probe placed inside the data it is testing cannot distinguish these two
mechanisms.**

**The fix: a plain contiguous range.** `TEXTJOIN(" | ",TRUE,'04'!$J$393:$J$397)` skips empty cells
natively and has no array semantics to get wrong. The input rows for each group are contiguous — 192
area-and-dimension blocks, 252 with sub-dimensions, 3 organizational sections, zero exceptions —
because of the loop order in the row builders.

A true CSE array formula also fixes attribution, and was prototyped by patching
`<f t="array" ref="...">` into 585 cells of the generated archive. Rejected: ExcelJS cannot write
array formulas, so it needs post-processing of the output archive, and the array form then also
needs `&""` guards because an empty input cell coerces to `0` and `TEXTJOIN` does not skip zeros.
Measured output of the prototype: `CLAIMS note | 0 | CLAIMS note two | 0 | 0`.

### Row-position addressing is safe here, and the "sorting" premise was wrong

Section 8k said sorting is deliberately left enabled, so every formula must be criteria-based. That
premise does not hold, and it matters because the text roll-ups now address rows by position.

Measured with a control, same syntax and same range in both cases:

```
UNPROTECTED sort: succeeded — N3 moved from health-plan-administration to waiver-management
PROTECTED   sort: failed
```

Excel refuses to sort a range containing locked cells, and the reference columns on `04` are locked.
So a state cannot reorder the input sheets as shipped. Filtering is a different operation — it hides
rows without moving them, and `TEXTJOIN` over a range includes hidden rows, so a filtered view
changes no computed value.

Two corrections to things previously believed in this document:

- `<sheetProtection sheet="1" sort="0" autoFilter="0"/>` does **not** mean sorting and filtering are
  blocked. These attributes are _locks_: `0` means not locked, so both operations are permitted by
  the protection flags. Sorting is blocked only as a side effect of the locked reference columns.
  An earlier reading of this session had it backwards and briefly concluded the filter buttons were
  decorative. They work.
- `rowBlockOf` throws if a group's rows are not contiguous, so a change to the builder loop order
  fails generation rather than emitting a range that spans a neighbouring group.

`00_README` now says: filter freely, do not reorder rows, and if you unprotect a sheet and sort it
the scores stay correct but the three text columns will show text from the wrong capability areas.

### What this says about the verification strategy

The scripted Excel check found three defects the test suite could not. A user opening the file found
two more that the scripted check could not, purely because it read no text cells. The pattern is
consistent and worth carrying into Wave 8: **coverage of the real artifact matters more than the
number of assertions.** 41 checks that touch every column beat 36 that touch only the numeric ones.

Concretely, for anything added to the workbook from here: read at least one cell of every new column
in `verify-workbook-in-excel.ts`, and prefer a formula whose correctness does not depend on Excel's
array-evaluation rules.

## 8n. Wave 8 Notes — 2026-09-21

The last wave. Five commits, all of Drop 2's stakeholder-visible surface, and the wave where the
review discipline paid for itself most obviously — 39 findings across five reviews, of which **14
were real defects in code I had just written and called done**.

### What shipped

| Commit    | What                                                                      |
| --------- | ------------------------------------------------------------------------- |
| `c7c93fa` | Dependency advisories: production tree 7 → **0**                          |
| `95a0fa9` | Generator wired into `build` and `dev`; artifact check in both workflows  |
| `75a113b` | Service worker, icons, `index.html` draft marking, offline claims aligned |
| `feb9c76` | The three in-app download links                                           |
| `5e344e7` | v4.1.0, CHANGELOG fold, four new observations, docs sweep                 |

Green at 1022 tests / 46 files, 94/94 mutations, 41/41 in Excel, production `npm audit` clean.

### The thing to carry forward: a green gate proved almost nothing here

Wave 7's lesson was that a green suite does not prove Excel computes correctly. Wave 8's is broader
and worse: **the entire gate — typecheck, lint, 1022 tests, knip, `format:check`, build, and the
artifact check — was green for every one of these defects.**

| Defect                                                             | What would have shipped                                     |
| ------------------------------------------------------------------ | ----------------------------------------------------------- |
| MUI `Alert` drops its close button when `action` is supplied       | An update prompt with **no way to dismiss it**              |
| MUI `Alert` defaults to `role="alert"`, an assertive live region   | Every update announced **twice**, once interrupting         |
| The prompt was a fixed-position toast                              | It **covered the CMS-required PRA notice** and the footer   |
| `aria-label` carrying size did not contain the visible label       | **WCAG 2.5.3 failures** on two new links and one old one    |
| Vite's SPA fallback answers `.xlsx` with `index.html` and HTTP 200 | The download link **silently saving HTML to disk as .xlsx** |
| `offlineReady` never fires                                         | A dead code path presented as a feature                     |

Not one of those is reachable by reading the code and thinking carefully. Each was found by
rendering the thing, measuring it, and comparing against what it was supposed to do. Two were found
only because a _mutation_ was applied to an assertion that was already passing.

**The strongest single technique, repeatedly:** stop the server and see what still works. That is
how the offline claim was actually verified (deep link to `/dashboard`, `transferSize` 0), and it is
a stronger test than the browser's offline toggle because there is nothing to fall back to.

### Assertions that passed while the thing they covered was broken

Worth a section of its own, because this happened three times in one wave.

1. **"Only one live region"** queried `role="status"` and passed while the message was announced
   twice — the second region was `role="alert"`.
2. **`expect(url.startsWith(import.meta.env.BASE_URL))`** passes for a root-absolute URL, because
   `BASE_URL` is `'/'` under vitest. Setting `base` in `vitest.config.ts` does **not** change that;
   measured. The test now asserts against the _source expression_ instead, following
   `footer.test.ts`'s precedent.
3. **A size floor on the artifact** turned out to be redundant with the open check at every
   truncation point, because a ZIP's central directory is at the end of the file.

The pattern: an assertion is vacuous when the thing it reads is _also_ the thing that would be wrong.
Mutate it, or it is decoration.

### Claims I inherited or wrote that turned out to be false

Six, all corrected in place. Listed because the lesson is that a confident sentence in a doc is not
evidence, and three of these came from _this project's own_ documentation.

- **OBS-37 said fixing the critical advisory meant a major `jspdf` bump.** It was a patch —
  4.2.0 → 4.2.1. The deferral had outlived its reason.
- **Clearing the dev-tree advisories "needs `npm audit fix --force`".** It did not; every fix was
  in-range. The `--force` prompt came from exactly one package, `exceljs`, whose only offered fix is
  a **downgrade** that would break the generator. So: **never run `npm audit fix --force` here**, and
  note `npm audit fix` needs two passes.
- **Workbox's default `globPatterns`** are `js,wasm,css,html` — not the `js,css,html,ico,png,svg` a
  plugin README suggests. The precache gap was wider than OBS-22 described.
- **`maximumFileSizeToCacheInBytes` does not create a fail-loud tripwire**; the plugin throws by
  default at any limit. Raising it to 3 MiB makes the build _less_ likely to fail, not more.
- **`paths.ts`'s "byte-identical unzipped content"** holds only with `SOURCE_DATE_EPOCH` fixed. With
  it unset the build timestamp is in the content itself (`docProps/core.xml`).
- **`SOURCE_DATE_EPOCH` does not fix OBS-44 either.** With it pinned, unzipped parts and CRCs match
  but archive bytes still differ via ZIP entry metadata, so the Workbox revision still changes. And
  the trap that manufactures a false success: DOS ZIP timestamps have 2-second granularity, so two
  runs less than 2s apart look identical regardless.

### Decisions taken, with reasons that will not be obvious later

- **`registerType: 'prompt'`, never `autoUpdate`.** An auto-updating worker can replace a state's
  assessment page mid-edit. Dismissing the prompt defers **indefinitely** — a waiting worker needs
  `skipWaiting` or every tab closed, so "it'll pick it up on the next reload" is false.
- **A kill switch is documented and left off.** If a build without `sw.js` ever reaches the site, the
  update check 404s and an installed worker serves its cached build **forever, with no prompt**.
  `cleanupOutdatedCaches` does not help. `selfDestroying: true` is the recovery; the procedure is
  written out in `vite.config.ts` so it is known before it is needed. This is not theoretical —
  `deploy.yml` fires on push to `main`, and `origin/main` predates the PWA entirely.
- **The update prompt sits in normal flow, not floating.** Measured: as a toast it overlapped the
  CMS notice and the footer, and a hardcoded offset would be fragile because the footer is
  suppressed on the assessment page.
- **The workbook download is its own section on Import/Export, not a third export card.** Every card
  there serialises the user's data and is gated on `hasData`; this is a blank template.
- **`maturity-profile-template.csv` deleted.** The question needed confirmation and turned out to be
  checkable: zero code references, outside `public/`, never bundled — so no user could ever download
  it, and the premise that states used it was never true of the deployed tool.

### What Wave 8 does not establish

- **One browser.** Chromium via Playwright on macOS. Nothing tested against a corporate proxy or a
  policy that blocks service worker registration, which is plausible in a state agency.
- **The 508 review is still theirs.** Our own axe runs are clean and the workbook's Accessibility
  Checker is clean, but see OBS-41: axe's WCAG 2.5.3 rule is `experimental` and excluded from the
  tag set this project runs, and it was silent while three controls failed that criterion. Assume
  other gaps of the same shape.
- **41 checks are 41 checks.** Not the cross product of 72 areas × 3 dimensions × every partial-fill
  state.
- **No screen reader has touched any of this.**
- **Four observations were logged, not fixed** — OBS-41 through OBS-44. OBS-43 (an unknown assessment
  id shows a permanent "Loading assessment…" spinner) is the one most likely to be hit by a real
  pilot user with a stale bookmark, and it wants pairing with OBS-36 as a single empty-and-error-state
  pass. (**Two more, OBS-45 and OBS-46, came out of the post-deploy work recorded in 8o.** Section 2
  carries the running total; this subsection is as of the wave's own close.)

### Still open when this wave closed

Three things, all requiring a human rather than more code: the push, the deploy — which the user
dispatches by `workflow_dispatch` from this branch, against the fork explicitly — and sending the
email to Shelley. The `v4.1.0` tag is deliberately held until the deploy is verified, so it points at
what actually shipped; the repository has **no tags at all** today, so it will be the first.

**All three have since happened, and the order mattered.** The push and deploy landed and the deploy
was verified — which produced the follow-up recorded in 8o, and is why **two** tags were owed rather
than one (`v4.1.0` at `cf27c56` and `v4.1.1` at `d68cbf3`, both pushed; see the Section 6 checklist).
The email went last, and deliberately so: sent at the Wave 8 draft it would have described download
links in positions they no longer occupy, and it would have had no URL to point at.

---

## 8o. Post-deploy — the workbook link was in the wrong place (v4.1.1)

Recorded separately from 8n because it happened **after** Wave 8 closed and after the deploy, and
because the way it was found is the transferable part.

**The finding could only come from the deployed site.** Every local check passed, three times over,
on a feature that shipped links nobody would look at: all three sat 80-92% of the way down their
pages and nothing on any first screen mentioned Excel. No test, no axe run and no build gate has an
opinion about where on a page a link is, and the wave's own record listed "three working download
links" as a satisfied smoke item. It took a human looking at the live site and asking "is it anywhere
else? should it be?".

**Three adversarial review rounds on a change of about 120 lines**, returning 11, 12 and 9 items.
The pattern across all three is the same and worth naming, because it is not about this change:
**most of the real defects were false factual claims in my own comments and docs, not broken code.**
A contrast figure that paired a border sample with a background sample from a different place. A band
table that did not sum to the total asserted two lines above it. An `AppBar` height attributed to
flex wrapping when `flex-wrap` computes to `nowrap`. A comment describing an `onClick` handler that
had been deleted. Each one would have been believed by whoever read it next.

**Two behavioural defects were also real**, and both were mine from the round before: intercepting
the pointer click broke Cmd+click while failing to prevent the URL it existed to prevent, and
suppressing the section's focus outline removed the ring in exactly the keyboard case it claimed not
to affect.

**A verification hazard the service worker introduced.** From Wave 8 onwards, `vite preview` serves
the _precached previous_ build after a rebuild. Several measurements were silently of code already
replaced. The fix, now in the Section 1 toolbox, is to unregister and clear caches before each pass
and to assert a canary value in the same evaluate — so a stale read fails loudly.

**What shipped:** the hero link on Landing (secondary to "Get Started"), the old lower-Landing link
removed, a fragment link at the top of Import/Export plus the effect that makes that URL work, a
responsive hero, and v4.1.1. Plus OBS-45 and OBS-46, neither fixed.

**Deployed and confirmed, and the second deploy paid for itself twice.** `v4.1.1` went out by
`workflow_dispatch` from this branch and the hero link is live. Two things that no local check could
establish came with it:

1. **The update prompt fired for real.** Two builds of this app have now existed on Pages in sequence
   with a worker installed between them, and a human with the old build got the reload offer rather
   than being moved silently. Every prior observation was a local `dist/` rebuild driven by
   Playwright, which reproduces the mechanism but not the deployment. OBS-22 is updated.
2. **The deferred tags were worth deferring.** Tagging `v4.1.0` at the version bump would have named a
   build whose workbook links nobody could find. Waiting until the deploy had been _looked at_ is
   what let the history record a release, a real finding from it, and a follow-up release. Both tags
   are now pushed — the repository's first.

3. **The email had to be rewritten before it could go.** Drafted at the end of Wave 8, it described
   software rather than pointing at it — no URL, and directions to a workbook download that v4.1.1
   turned into a button in the hero. Rewritten post-deploy and cut from 698 words to 505, then sent.
   Worth noting because the draft was "finished" for two days while being wrong.

**This closes the plan.** Every checklist box in Sections 1-6 is ticked, no decision remains open, and
both drops are deployed and tagged. What is left is not plan work, and is listed in full under
"What remains after this plan" at the end of Section 8.

---

## 8p. What remains after this plan

**The plan is complete.** 96 of 96 checklist boxes across Waves 0-8, no open decision, both drops
deployed, `v4.1.0` and `v4.1.1` tagged and pushed, the handoff email sent. There is no Drop 3 — Drops
1 and 2 were the entire scope.

Everything below is outside this plan. It is recorded here because it is what a session opening this
document next will want, and re-deriving it costs an hour.

#### Decided by a human, not by code — and both wanted before real state data exists

| Item                                      | The decision                                                                                                                                                                                                                                                                                                                                                           |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **OBS-5** — stale enterprise-domain score | A finalized Data Management score does not move when other domains are later finalized, but the results table recomputes the aggregate live, so the two disagree. States finalize over weeks, so a pilot will see it. Recompute on read, or label it a point-in-time snapshot?                                                                                         |
| **OBS-35** — duplicate ratings            | Arrow-keying Level 1 → 5 fires four saves over a non-atomic upsert and the compound index is not unique, so duplicates would double-count in a score submitted to CMS. Not reproduced. The durable fix is a unique index → a Dexie bump → a clean break that wipes tables, so it wants to ride along with a migration that is happening anyway rather than trigger one |

Both are carried in Section 4 under "Noted, not decided". Neither is code work in this plan, and
that is why they are still here.

#### Accessibility, in priority order

1. **One screen-reader pass on the assessment flow.** This is 8d's own first recommendation and the
   single largest gap in the whole effort — every screen-reader claim in this repo is inferred from
   the accessibility tree, not heard. It matters more since the v4.1.1 docs commit, which published a
   README section stating plainly that no assistive-technology testing exists. That is the right
   disclosure, and it is also the first question a 508 reviewer will ask.
2. **OBS-41 and OBS-45** — add `experimental` to the axe tag set. One word, and it turns on two rules
   covering two Level A criteria that have each had real failures behind that omission. Do it as its
   own piece of work: it will surface judgement calls (the hero tagline) rather than patches.
3. **OBS-43** — an unknown assessment id shows a permanent "Loading assessment…" spinner. The most
   likely of these to hit a real pilot user, via a stale bookmark or a copied area id. Pairs with
   **OBS-36** as one pass over empty and error states.
4. **OBS-46** — responsive nav. At 375px the chrome leaves `<main>` 287px, which defeats any
   above-the-fold intent on a phone. Touches every page.
5. **OBS-33** and clickable-`Chip` focus indicators, both from 8d's recommendations.

#### One thing never in this plan, and the highest-consequence item here

The live pilot site is deployed from `feature/pilot-clearance`, which is **37 commits ahead of
`origin/main`**, and `deploy.yml` still auto-triggers on push to `main`. Anything landing on `main`
deploys the pre-v4 capability model over the site states are reviewing.

Two things make this cheaper to fix than it sounds, and one makes it less alarming than earlier
revisions of this document implied:

- **`main` has zero commits the branch does not have**, so merging is a clean fast-forward.
- There is **no `dependabot.yml`**, so no automated PR can trigger it. An earlier note here warned
  that a merged dependabot PR would silently revert the site; that vector does not exist. It needs a
  human to push or merge to `main`.

Merging the branch to `main` removes the hazard and makes the deploy configuration describe what
actually happens, instead of pointing at a branch nobody deploys.

#### Smaller, and genuinely optional

- `.kiro/steering/development-standards.md:19` still reads "WCAG 2.1 AA compliant for government
  use", the flat claim removed from README, PROJECT_FOUNDATION and SECURITY. Line 696 of the same
  file already frames AA correctly as required rather than achieved. Steering is user-authored, so
  it was left alone deliberately — but it is what the next contributor, and the next agent session,
  reads as established fact. The same file's "Full functionality after initial load, even without
  network" is stale for the reason Wave 8 softened that copy in the app.
- **OBS-44** — every deploy makes offline clients re-download the workbook, because ExcelJS stamps
  ZIP timestamps it does not expose. ~217 KB, no correctness impact. Read the entry before attempting
  it; `SOURCE_DATE_EPOCH` alone does not fix it and the obvious verification manufactures a false
  success.
- **OBS-42** — a static `role="alert"` on Landing. A latent trap rather than a live defect.
- The remaining pre-existing backlog: OBS-4, 8, 9, 10, 11, 12, 13, 14, 15, 16 (partially), 18, 19,
  20, 23, 26, 27. None was in scope here and none blocks the pilot.
