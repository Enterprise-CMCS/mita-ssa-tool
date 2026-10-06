# Development Standards & Best Practices

This document defines the development standards for the MITA 4.0 State Self-Assessment Tool. These standards MUST be followed for all code changes, whether by human developers or LLM-assisted coding.

---

## 1. Project Context

### What This Application Does

The MITA 4.0 State Self-Assessment Tool is a Progressive Web App (PWA) that enables State Medicaid Agencies (SMAs) to self-assess their Medicaid Enterprise maturity using the **ORBIT Maturity Model**. Key characteristics:

- **Privacy-First**: All data stays in the browser (IndexedDB). No server, no data transmission.
- **Offline-First**: Two separate properties — keep them separate when reasoning about a change.
  _Storage_ is local (IndexedDB), so saving never touches the network. _Delivery_ is cached by a
  service worker, so a reload with no network succeeds. Only the first was true until Wave 8; the
  app shipped the offline claim for months with no service worker at all (OBS-22). If you are
  about to assert offline behaviour, say which half you mean.
- **Accessibility**: WCAG 2.1 AA compliant for government use.

### Key Domain Terminology

| Term                  | Definition                                                                                                                                                                                     |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Capability Domain** | High-level capability grouping (e.g., "Provider Management"). 14 domains across 3 layers (Strategic 3, Core 7, Support 4).                                                                     |
| **Capability Area**   | Specific capability being assessed (e.g., "Provider Enrollment"). 72 total areas.                                                                                                              |
| **ORBIT**             | Assessment framework: **O**utcomes, **R**oles, **B**usiness Architecture, **I**nformation, **T**echnology. B-I-T are required per-capability dimensions; O & R are organizational assessments. |
| **Dimension**         | One of the 3 standard ORBIT categories assessed per capability (B, I, T). All required.                                                                                                        |
| **Sub-Dimension**     | Only applies to Technology (2 sub-dimensions: Technical Infrastructure Management, Application Management)                                                                                     |
| **Aspect**            | Individual assessment criteria within a dimension. 26 standard + 15 organizational = 41 total                                                                                                  |
| **Maturity Level**    | Rating from 1 (Initial) to 5 (Optimized), or N/A (-1)                                                                                                                                          |

### Primary Data Files

The application uses two JSON files that define **what** and **how** assessments work:

| File                         | Purpose                                                         | When to Modify                                  |
| ---------------------------- | --------------------------------------------------------------- | ----------------------------------------------- |
| `src/data/capabilities.json` | Defines capability domains and areas (WHAT can be assessed)     | When CMS updates the Capability Reference Model |
| `src/data/orbit-model.json`  | Defines ORBIT maturity criteria (HOW assessments are conducted) | When CMS updates the Maturity Model             |

**Reference Documents** (in `docs/`):

- `MITA_4.0_Capability_Reference_Model.md` - Source for capabilities.json
- `MITA_4.0_Maturity_Model_List_Format.md` - Source for orbit-model.json

### Data Architecture

User data is stored locally in IndexedDB via Dexie.js:

| Table                   | Purpose                                                                                                   |
| ----------------------- | --------------------------------------------------------------------------------------------------------- |
| `capabilityAssessments` | One record per capability area being assessed                                                             |
| `orbitRatings`          | One record per aspect per assessment (up to 26 standard aspects × N assessments + organizational ratings) |
| `attachments`           | File attachments stored as Blobs                                                                          |
| `assessmentHistory`     | Snapshots of finalized assessments                                                                        |
| `tags`                  | User-defined tags for organization                                                                        |

---

## 2. Documentation Standards

### What to Document

| Document                     | When to Update                                                |
| ---------------------------- | ------------------------------------------------------------- |
| **README.md**                | Project setup changes, new major features, dependency changes |
| **CHANGELOG.md**             | Every feature, fix, or breaking change (before PR merge)      |
| **PROJECT_FOUNDATION_v2.md** | Architecture decisions, data model changes, phase completion  |

### CHANGELOG Format

Follow [Keep a Changelog](https://keepachangelog.com/) format:

```markdown
## [version]

### Added

- New feature description

### Changed

- Modified behavior description

### Fixed

- Bug fix description

### Removed

- Removed feature description
```

### Code Comments

- Use JSDoc for exported functions, hooks, and components
- Explain "why" not "what" in inline comments
- Document complex business logic and non-obvious decisions
- Keep comments up-to-date when code changes

```typescript
/**
 * Calculates the maturity score for a capability area.
 * Uses simple averaging across all dimensions (no weighting per stakeholder decision).
 *
 * @param ratings - Array of OrbitRating records for the capability
 * @returns Average score (1-5) or null if no ratings
 */
export function calculateCapabilityScore(ratings: OrbitRating[]): number | null {
  // ...
}
```

---

## 3. Code Style & Formatting

### Prettier Configuration

All code MUST be formatted with Prettier before commit. Configuration is in `.prettierrc`:

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

### ESLint

All code MUST pass ESLint with zero errors. Key rules enforced:

- `@typescript-eslint/no-explicit-any`: error
- `@typescript-eslint/explicit-function-return-type`: warn
- `jsx-a11y/*`: Comprehensive accessibility rules

### Import Organization

Organize imports in this order, with blank lines between groups:

```typescript
// 1. React and external libraries
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Box, Typography } from '@mui/material';
import { useLiveQuery } from 'dexie-react-hooks';

// 2. Internal services and hooks
import { db } from '../services/db';
import { useCapabilityAssessments, useOrbitRatings } from '../hooks';
import { calculateScore } from '../services/scoring';

// 3. Types (can be grouped with their source)
import type { CapabilityAssessment, OrbitRating, OrbitDimensionId } from '../types';

// 4. Local imports (components, utilities in same feature)
import { AssessmentCard } from './AssessmentCard';

// 5. Constants
import { MATURITY_THRESHOLDS } from '../constants';
```

### Naming Conventions

| Type             | Convention                  | Example                       |
| ---------------- | --------------------------- | ----------------------------- |
| Components       | PascalCase                  | `AssessmentCard.tsx`          |
| Hooks            | camelCase with `use` prefix | `useCapabilityAssessments.ts` |
| Services/Utils   | camelCase                   | `scoring.ts`, `db.ts`         |
| Types/Interfaces | PascalCase                  | `CapabilityAssessment`        |
| Constants        | SCREAMING_SNAKE_CASE        | `MAX_FILE_SIZE`               |
| CSS classes      | kebab-case                  | `assessment-card`             |
| Test files       | `*.test.ts` or `*.test.tsx` | `scoring.test.ts`             |

### File Structure

```
src/
├── components/
│   ├── assessment/           # ORBIT assessment workflow
│   │   ├── AspectCard.tsx
│   │   ├── AspectCard.test.tsx
│   │   └── index.ts          # Barrel export
│   ├── dashboard/            # Dashboard and capability management
│   ├── export/               # Import/export dialogs
│   ├── layout/               # Header, footer, navigation
│   └── results/              # Results visualization
├── constants/
│   └── index.ts
├── data/
│   ├── capabilities.json     # Capability Reference Model
│   └── orbit-model.json      # ORBIT Maturity Criteria
├── hooks/
│   ├── useCapabilityAssessments.ts
│   ├── useCapabilityAssessments.test.ts
│   └── index.ts              # Barrel export
├── pages/                    # Route page components
├── services/
│   ├── db.ts                 # Dexie database setup
│   ├── capabilities.ts       # Capability data utilities
│   ├── orbit.ts              # ORBIT model utilities
│   ├── scoring.ts            # Score calculations
│   └── export/               # Export/import services
├── theme/
│   └── index.ts              # MUI theme (USWDS colors)
├── types/
│   └── index.ts              # All TypeScript interfaces
└── utils/
    ├── errors.ts             # AssessmentError class
    └── colors.ts             # Score color utilities
```

---

## 4. TypeScript Standards

### Strict Mode

TypeScript strict mode is enabled with additional checks. Do NOT disable any of these:

```json
{
  "strict": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "noFallthroughCasesInSwitch": true,
  "noImplicitReturns": true,
  "noUncheckedIndexedAccess": true
}
```

### No `any`

Never use `any`. Use proper types, `unknown`, or generics instead.

```typescript
// ❌ Bad
function processData(data: any): any { ... }

// ✅ Good
function processData<T>(data: T): ProcessedResult<T> { ... }
```

### Explicit Return Types

Always specify return types for exported functions:

```typescript
// ❌ Bad
export function calculateScore(ratings: OrbitRating[]) { ... }

// ✅ Good
export function calculateScore(ratings: OrbitRating[]): number | null { ... }
```

### Interface vs Type

- Use `interface` for object shapes that may be extended
- Use `type` for unions, intersections, and computed types

```typescript
// Object shapes - use interface
interface CapabilityAssessment {
  id: string;
  status: AssessmentStatus;
}

// Unions and computed types - use type
type AssessmentStatus = 'in_progress' | 'finalized';
type OrbitDimensionId = 'businessArchitecture' | 'information' | 'technology';
type OrganizationalAssessmentId = 'outcomes' | 'roles' | 'enterprise-architecture';
type RatingDimensionId = OrbitDimensionId | OrganizationalAssessmentId;
type MaturityLevelWithNA = -1 | 0 | 1 | 2 | 3 | 4 | 5;
type ScoreMap = Record<string, number>;
```

### Type Guards and Discriminated Unions

Use type guards for runtime type checking, especially with the capability model:

```typescript
// Type guard narrowing a rating's dimensionId to an organizational section.
// Prefer this over inline literal comparisons — hand-written unions have
// drifted before (see OBS-1 in docs/CODEBASE_OBSERVATIONS.md).
export function isOrganizationalDimensionId(
  dimensionId: string
): dimensionId is OrganizationalAssessmentId {
  return (ORGANIZATIONAL_SECTIONS as readonly string[]).includes(dimensionId);
}

// Usage — the false branch narrows to OrbitDimensionId, no cast needed
const aspect = isOrganizationalDimensionId(rating.dimensionId)
  ? getOrganizationalAspect(rating.dimensionId, rating.aspectId)
  : getAspect(rating.dimensionId, rating.aspectId, rating.subDimensionId);
```

### Path Aliases

Use the `@/` alias for imports from `src/`:

```typescript
// ✅ Good - using alias
import { db } from '@/services/db';

// Also acceptable - relative paths
import { db } from '../services/db';
```

---

## 5. React Patterns

### Functional Components Only

Use functional components with hooks. No class components.

### Component Structure

```typescript
import { JSX, useState, useMemo, useCallback } from 'react';
import { Box, Typography } from '@mui/material';
import type { AssessmentCardProps } from './types';

/**
 * Displays a summary card for a capability assessment.
 */
export function AssessmentCard({ assessment, onEdit }: AssessmentCardProps): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false);

  // Memoize expensive calculations
  const score = useMemo(() => calculateScore(assessment), [assessment]);

  // Memoize callbacks passed to children
  const handleToggle = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  return (
    <Box>
      <Typography>{assessment.name}</Typography>
      {/* ... */}
    </Box>
  );
}
```

### Props Interface

Define props interface in the same file or a co-located `types.ts`:

```typescript
interface AssessmentCardProps {
  assessment: CapabilityAssessment;
  onEdit: (id: string) => void;
  className?: string;
}
```

### Reactive Data with Dexie

Use `useLiveQuery` from `dexie-react-hooks` for reactive IndexedDB queries:

```typescript
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';

export function useCapabilityAssessments(): UseCapabilityAssessmentsReturn {
  // Reactive query - automatically updates when data changes
  const assessments = useLiveQuery(
    () => db.capabilityAssessments.orderBy('updatedAt').reverse().toArray(),
    []
  );

  // Return empty array while loading (assessments is undefined initially)
  return {
    assessments: assessments ?? [],
    // ... other methods
  };
}
```

### Debounced Auto-Save

Use the `useDebouncedSave` hook for text fields that auto-save:

```typescript
import { useDebouncedSave } from '../../hooks';

// AspectCard passes 500 explicitly. UI.DEBOUNCE_MS (300) is NOT the value used
// for assessment text fields — pass the delay you want rather than assuming it.
const [localNotes, setLocalNotes] = useDebouncedSave(
  rating?.notes ?? '',
  onNotesChange,
  500 // 500ms delay
);

// In JSX
<TextField
  value={localNotes}
  onChange={(e) => setLocalNotes(e.target.value)}
/>
```

### Avoid Prop Drilling

Use custom hooks to provide data access instead of passing props through many levels:

```typescript
// ✅ Good - hook provides data
function AssessmentPage() {
  const { assessments, startAssessment } = useCapabilityAssessments();
  const { ratings, saveRating } = useOrbitRatings(assessmentId);
  // ...
}

// ❌ Bad - prop drilling
function AssessmentPage({ assessments, ratings, onSave, onStart, ... }) { ... }
```

---

## 6. Error Handling

### Service Layer

Services should throw typed errors using `AssessmentError` with error codes:

```typescript
import { AssessmentError } from '../utils/errors';

// Throw with error code and optional context
throw new AssessmentError('Assessment not found', 'ASSESSMENT_NOT_FOUND', { assessmentId: id });
```

Available error codes:

- `ASSESSMENT_NOT_FOUND`
- `AREA_NOT_FOUND`
- `RATING_NOT_FOUND`
- `INVALID_INPUT`
- `STORAGE_ERROR`
- `ATTACHMENT_ERROR`
- `EXPORT_ERROR`
- `IMPORT_ERROR`

### Using Error Utilities

```typescript
import { isAssessmentError, getErrorMessage, withErrorHandling } from '../utils/errors';

// Type guard for error handling
if (isAssessmentError(error)) {
  const message = getErrorMessage(error.code);
  setSnackbar({ open: true, message, severity: 'error' });
}

// Wrapper for async operations
const result = await withErrorHandling(() => db.assessments.get(id), 'ASSESSMENT_NOT_FOUND', {
  assessmentId: id,
});
```

### Component Layer

Handle expected errors gracefully with user feedback:

```typescript
try {
  await saveAssessment(data);
  setSnackbar({ open: true, message: 'Saved successfully', severity: 'success' });
} catch (error) {
  if (isAssessmentError(error)) {
    setSnackbar({ open: true, message: getErrorMessage(error.code), severity: 'error' });
  } else {
    console.error('Unexpected error:', error);
    setSnackbar({ open: true, message: 'An unexpected error occurred', severity: 'error' });
  }
}
```

---

## 7. Testing Standards

### Testing Framework

- **Vitest** for unit and integration tests
- **React Testing Library** for component tests
- **fake-indexeddb** for IndexedDB mocking
- **vitest-axe** for accessibility testing

### What to Test

| Priority | What                             | Coverage Target |
| -------- | -------------------------------- | --------------- |
| High     | Hooks (business logic)           | 90%+            |
| High     | Services/utilities               | 90%+            |
| Medium   | Complex components               | 70%+            |
| Low      | Simple presentational components | Optional        |

### What NOT to Test

- Pure styling/layout
- Third-party library behavior (MUI, Dexie)
- Simple pass-through components
- Implementation details (test behavior, not internals)

### Test File Location

Place test files alongside the code they test:

```
hooks/
├── useCapabilityAssessments.ts
└── useCapabilityAssessments.test.ts
```

### Test Structure

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useScores } from './useScores';
import { db, clearDatabase } from '../services/db';

describe('useScores', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  describe('getCapabilityScore', () => {
    it('should return score for finalized assessment', async () => {
      // Arrange
      await db.capabilityAssessments.add({
        id: 'a1',
        capabilityAreaId: 'area-1',
        status: 'finalized',
        overallScore: 3.5,
        // ... other required fields
      });

      // Act
      const { result } = renderHook(() => useScores());
      await waitFor(() => {
        expect(result.current.scoresByArea.size).toBe(1);
      });

      // Assert
      expect(result.current.getCapabilityScore('area-1')).toBe(3.5);
    });

    it('should return null for non-assessed capability', async () => {
      const { result } = renderHook(() => useScores());
      await waitFor(() => {
        expect(result.current.scoresByArea).toBeDefined();
      });

      expect(result.current.getCapabilityScore('non-existent')).toBeNull();
    });
  });
});
```

### Accessibility Testing

Use vitest-axe for automated accessibility checks:

```typescript
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'vitest-axe';

expect.extend(toHaveNoViolations);

it('should have no accessibility violations', async () => {
  const { container } = render(<StatusChip status="finalized" />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### Running Tests

```bash
npm test              # Run all tests once
npm run test:watch    # Watch mode during development
npm run test:coverage # Generate coverage report
```

---

## 8. Database Patterns

### Dexie Transactions

Use transactions for operations that modify multiple tables:

```typescript
await db.transaction(
  'rw',
  [db.capabilityAssessments, db.orbitRatings, db.attachments],
  async () => {
    await db.capabilityAssessments.delete(assessmentId);
    await db.orbitRatings.where('capabilityAssessmentId').equals(assessmentId).delete();
    await db.attachments.where('capabilityAssessmentId').equals(assessmentId).delete();
  }
);
```

### Compound Indexes

The database uses compound indexes to prevent duplicate ratings:

```typescript
// Schema definition in db.ts
orbitRatings: 'id, capabilityAssessmentId, [capabilityAssessmentId+dimensionId+aspectId], [capabilityAssessmentId+dimensionId+subDimensionId+aspectId]';
```

### Database Migrations

When schema changes are needed, increment the version and add migration logic:

```typescript
db.version(2)
  .stores({
    // Updated schema
  })
  .upgrade((tx) => {
    // Migration logic
  });
```

**Note**: Currently at version 4. Versions 2, 3, and 4 are all clean-break upgrades that clear every table, because each accompanied a model restructure that invalidated stored data. Document any schema change in PROJECT_FOUNDATION_v2.md.

---

## 9. Scoring Logic

Scoring uses simple averages throughout (no weighting, per stakeholder decision):

```typescript
// Calculation rules:
// - N/A ratings (-1) are excluded from averages
// - Unassessed aspects (level 0) are excluded from averages
// - Scores are rounded to 1 decimal place
// - Dimension score = average of aspect scores
// - Capability area score = average of dimension scores
// - Domain score = average of capability area scores (finalized only)
```

---

## 10. Performance Guidelines

### React Performance

- Use `useMemo` for expensive calculations
- Use `useCallback` for callbacks passed to child components
- Avoid creating objects/arrays in render

```typescript
// ❌ Bad - creates new object every render
<Component style={{ margin: 10 }} />

// ✅ Good - stable reference
const style = useMemo(() => ({ margin: 10 }), []);
<Component style={style} />
```

### Data Loading

- Use `useLiveQuery` for automatic updates from IndexedDB
- Implement loading states for async operations
- The app loads all assessments/ratings upfront (72 areas × 26 standard aspects is manageable)

### Bundle Size

- MUI is chunked separately (~510KB) for better caching
- Use tree-shaking friendly imports: `import { Box } from '@mui/material'`
- Run `npm run audit:code` (knip) to detect unused exports

---

## 11. Accessibility (a11y)

### Requirements

- WCAG 2.1 AA compliance required (government application)
- All interactive elements must be keyboard accessible
- Proper heading hierarchy (h1 → h2 → h3)
- Meaningful alt text for images
- Sufficient color contrast (enforced by MUI theme)

### MUI Accessibility

MUI components are accessible by default. Maintain this by:

- Using semantic props (`aria-label`, `aria-describedby`, `aria-expanded`)
- Not overriding focus styles without replacement
- Testing with keyboard navigation

### Development-Time Testing

axe-core runs automatically in development mode (see `main.tsx`):

```typescript
if (import.meta.env.DEV) {
  import('@axe-core/react').then((axe) => {
    axe.default(React, ReactDOM, 1000);
  });
}
```

---

## 12. Git & Commit Standards

### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, no code change
- `refactor`: Code change that neither fixes nor adds
- `test`: Adding or updating tests
- `chore`: Build, tooling, dependencies

**Examples:**

```
feat(dashboard): add tag filtering to capability list
fix(assessment): prevent duplicate ratings on rapid save
docs: update CHANGELOG for v0.2.0
test(scoring): add edge case tests for N/A ratings
```

### Pre-commit Hooks

Husky runs automatically on commit via lint-staged:

1. TypeScript/TSX files: Prettier format + ESLint fix
2. JSON/MD/CSS files: Prettier format

If any check fails, the commit is blocked.

### Branch Strategy

For solo development, working directly on `main` is acceptable. For features that span multiple sessions:

```
main              # Production-ready code
feature/phase-2   # Larger feature work
```

---

## 13. Versioning

### Semantic Versioning

This project follows [Semantic Versioning](https://semver.org/):

```
MAJOR.MINOR.PATCH (e.g., 2.1.0)
```

- **MAJOR**: Breaking changes (data format changes, removed features)
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes, backward compatible

### Version Location

The version is defined in a single source of truth:

| File           | Purpose                                     |
| -------------- | ------------------------------------------- |
| `package.json` | Authoritative version (update this first)   |
| Footer         | Displayed to users via build-time injection |
| CHANGELOG.md   | Documents what changed in each version      |

### How Version Injection Works

The version is injected at build time via Vite:

```typescript
// vite.config.ts
define: {
  __APP_VERSION__: JSON.stringify(pkg.version),
}
```

This makes `__APP_VERSION__` available globally (declared in `src/vite-env.d.ts`).

### When to Update Version

| Change Type                       | Version Bump | Example            |
| --------------------------------- | ------------ | ------------------ |
| Bug fix                           | PATCH        | 2.0.0 → 2.0.1      |
| New feature (backward compatible) | MINOR        | 2.0.1 → 2.1.0      |
| Breaking change or major release  | MAJOR        | 2.1.0 → 3.0.0      |
| Data model/schema change          | MAJOR        | Requires migration |

### Release Checklist

1. Update version in `package.json`
2. Run `npm install --package-lock-only` to sync package-lock.json
3. Update CHANGELOG.md with release notes
4. Commit with message: `chore: release vX.Y.Z`
5. Tag the release: `git tag vX.Y.Z`

---

## 14. Dependency Management

### Adding Dependencies

Before adding a new dependency:

1. Check if existing dependencies can solve the problem
2. Evaluate bundle size impact
3. Check maintenance status and security
4. Prefer well-maintained, popular packages

### Current Key Dependencies

| Package                        | Purpose                             |
| ------------------------------ | ----------------------------------- |
| `dexie` + `dexie-react-hooks`  | IndexedDB with reactive queries     |
| `@mui/material`                | UI components (USWDS-aligned theme) |
| `react-router-dom` v7          | Client-side routing                 |
| `jspdf` + `jspdf-autotable`    | PDF export                          |
| `jszip`                        | ZIP export with attachments         |
| `chart.js` + `react-chartjs-2` | Results visualization               |
| `uuid`                         | Generate unique IDs                 |

### Updating Dependencies

- Run `npm audit` regularly
- Update patch versions freely
- Test thoroughly when updating minor/major versions
- Document breaking changes in CHANGELOG

---

## 15. Available Scripts

```bash
# Development
npm run dev          # Start dev server (http://localhost:5173)
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

# Build-time artifacts
npm run generate:workbook         # Regenerate the offline XLSX workbook into public/
npm run verify:workbook-artifact  # Check the workbook that shipped into dist/
npm run verify:workbook-excel     # Verify its formulas in Excel (macOS + Excel only, not in CI)
```

**Node 22.18 or newer is required** (declared in `engines` and `.nvmrc`). The workbook
generator is a TypeScript file executed directly by Node, which needs Node's native type
stripping. On Node 20 it fails with an unknown-file-extension error, while `npm test` still
passes because vitest transforms through Vite — so a too-old Node fails in a confusing place.

---

## 16. The `scripts/` Directory

Build-time tooling lives in `scripts/`, written in TypeScript and run directly by Node. It is
covered by `typecheck`, `lint`, `knip` and `format:check` exactly like `src/`, and its tests
run under `npm test`.

| Path                                  | Purpose                                                                     |
| ------------------------------------- | --------------------------------------------------------------------------- |
| `scripts/generate-xlsx-workbook.ts`   | Generates the offline Excel workbook into `public/`                         |
| `scripts/xlsx/model.ts`               | Node-safe view of the capability and ORBIT models, read from the JSON files |
| `scripts/xlsx/constants.ts`           | Declarative sheet, column and layout configuration                          |
| `scripts/xlsx/rows.ts`                | Pure row builders, testable without ExcelJS                                 |
| `scripts/xlsx/workbook.ts`            | ExcelJS assembly and the Section 508 structure                              |
| `scripts/xlsx/paths.ts`               | Repository-root path resolution and the workbook output path                |
| `scripts/xlsx/scoring-spec.ts`        | The scoring rules, as JS functions **and** as Excel formula generators      |
| `scripts/xlsx/profile-rows.ts`        | Row builders for the four calculated sheets, `06`-`09`                      |
| `scripts/xlsx/excel-rounding.ts`      | Model of Excel's `ROUND`, plus the fixtures that check the model            |
| `scripts/xlsx/prove-assertions.ts`    | Mutation harness proving each assertion can fail                            |
| `scripts/verify-workbook-artifact.ts` | Integrity check on the workbook that shipped into `dist/`                   |
| `scripts/verify-workbook-in-excel.ts` | Arithmetic verification by driving Excel over AppleScript                   |

### Verifying workbook changes

The generator emits Excel **formulas**, and no test in this repo can evaluate one. A green suite
therefore proves the generator emitted the string it intended, not that Excel computes the right
answer from it. Three defects shipped past a fully green suite because of exactly this gap, and two
more shipped past the scripted Excel check because that check read only score cells.

So, for any change to what the generator emits:

1. `npm run generate:workbook`
2. `npm run verify:workbook-excel` — drives Excel, seeds input cells, reads computed cells back and
   compares against the same JS model the unit tests use. **Requires macOS and Excel, so CI cannot
   run it.** If you add a column, add an expectation that reads it.
3. `node scripts/xlsx/prove-assertions.ts` — confirms every assertion can still fail. It rewrites
   source files in place and restores them, so run it on a clean tree and never alongside `npm test`.

**Generation is automatic.** A `prebuild` script generates the workbook, so `npm run build` always
produces a current one — locally, in `ci.yml` and in `deploy.yml` alike. `predev` does the same for
the dev server, because the artifact is gitignored and the in-app download links would otherwise
404 in development. Step 1 above is therefore rarely needed by hand. **Use `npm run dev`, not a bare
`vite`** — the latter skips `predev` and the download links 404.

**The filename lives in `src/constants/workbook.ts`, not in `scripts/`.** `paths.ts` imports it, so
the generator's output path and the in-app download URL are built from one string. A rename touching
only one of them 404s the link a pilot user clicks while every test and the artifact check stay
green, because both of those only ever look at the file the generator wrote. That module is
Node-safe by the same contract as `draftNotice.ts` — no imports, no `import.meta` — which is what
makes it importable from `scripts/`. The name is still a literal in `.gitignore`, which cannot
import anything.

**`npm run verify:workbook-artifact` covers the file that ships**, which is a different object from
the ones above: `npm test` builds a workbook in memory and never reads a file, and
`verify:workbook-excel` reads the `public/` copy. This one opens `dist/` — the only copy a pilot
user downloads — and checks it is a real, complete, openable workbook. Both workflows run it after
the build, so a site whose download links 404 fails the deploy rather than shipping. It is an
integrity check only; correctness is still steps 2 and 3.

Do not add a `public/`-versus-`dist/` comparison to it. That was built and removed: the build
timestamp lands in `docProps/core.xml`, so two runs of an unchanged model differ in content as well
as in ZIP bytes, and the check fired on healthy trees while catching nothing the presence, ZIP,
open and sheet checks miss.

Two rules earned the hard way:

- **Prefer formulas whose correctness does not depend on Excel's array-evaluation rules.** A
  criteria-based `IF` over a range looks right, satisfies every string assertion, and silently reads
  the wrong rows via implicit intersection.
- **Functions added after Excel 2007 must be stored with an `_xlfn.` prefix**, which ExcelJS does not
  add. Without it Excel does not recognise the function and the cell reads `#NAME?`.
  `workbook.raw.test.ts` enforces this against an allowlist of pre-2007 functions.

Three rules specific to this directory, each learned the hard way:

**Never import `src/constants/index.ts` or anything that reaches it.** It reads
`import.meta.env` at module scope, which is `undefined` under plain Node, so touching it
throws. `src/constants/draftNotice.ts` was deliberately split out to be Node-safe and _can_
be imported. Derive environment flags from `process.env`, never `import.meta.env`.

**Never use `new URL(<string literal>, import.meta.url)`.** Vite statically rewrites that
exact pattern into an asset URL, so it works under plain Node and throws under vitest — and
not uniformly, which makes it worse. Compose paths from a bare `import.meta.url` via
`node:path`; `scripts/xlsx/paths.ts` is the single place that happens.

**Heavy dependencies here stay `devDependencies`.** ExcelJS is pinned and build-time only, so
it never enters the browser bundle of an offline-first PWA. Verify with
`npm ls <pkg> --omit=dev` rather than assuming.

---

## Quick Reference Checklist

Before committing, verify:

- [ ] Code is formatted (Prettier)
- [ ] ESLint passes with no errors
- [ ] TypeScript compiles with no errors (`npm run typecheck`)
- [ ] Tests pass and cover new code
- [ ] CHANGELOG updated (if user-facing change)
- [ ] Commit message follows conventional format
- [ ] No `console.log` statements left in code
- [ ] No `any` types introduced
- [ ] Exported functions have JSDoc comments
- [ ] Accessibility: keyboard navigation works, aria attributes present
