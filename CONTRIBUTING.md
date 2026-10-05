# Contributing to MITA 4.0 State Self-Assessment Tool

Thank you for your interest in contributing! This document provides guidelines and information for contributors.

## Getting Started

### Prerequisites

- **Node.js 22.18 or newer** — enforced in `engines` and pinned in `.nvmrc`. The offline workbook
  generator is a TypeScript file Node executes directly and needs native type stripping; on an
  older Node it fails with an unknown-file-extension error while `npm test` still passes, so the
  failure shows up somewhere confusing
- npm 9 or higher
- Git
- A modern code editor (VS Code recommended)
- macOS with Microsoft Excel, **only** if you change the workbook generator — see Before Submitting

### Development Setup

1. **Fork and clone the repository**

   ```bash
   git clone https://github.com/YOUR-USERNAME/mita-ssa-tool.git
   cd mita-ssa-tool
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start the development server**

   ```bash
   npm run dev
   ```

4. **Run tests in watch mode** (in a separate terminal)

   ```bash
   npm run test:watch
   ```

5. **Verify your setup**
   ```bash
   npm run lint
   npm run typecheck
   npm test
   ```

## Project Architecture

### Directory Structure

```
src/
├── components/          # React components organized by feature
│   ├── assessment/      # ORBIT assessment workflow components
│   ├── dashboard/       # Dashboard and capability management
│   ├── export/          # Import/export dialogs
│   ├── layout/          # App layout (header, footer, nav)
│   └── results/         # Results visualization
├── data/                # Static JSON data files
│   ├── capabilities.json    # Capability reference model
│   └── orbit-model.json     # ORBIT maturity criteria
├── hooks/               # Custom React hooks
├── pages/               # Route page components
├── services/            # Business logic and utilities
│   └── export/          # Export/import services
├── types/               # TypeScript type definitions
├── theme/               # MUI theme customization
├── utils/               # Utility functions
├── constants/           # Application constants
└── test/                # Test setup and utilities

scripts/                 # Build-time tooling, TypeScript run directly by Node
├── generate-xlsx-workbook.ts   # Generates the offline Excel workbook into public/
├── verify-workbook-artifact.ts # Checks the copy that shipped into dist/
├── verify-workbook-in-excel.ts # Verifies formulas by driving Excel (macOS only)
└── xlsx/                # The generator's modules, with their own tests
```

`scripts/` is covered by `typecheck`, `lint`, `knip` and `format:check` exactly like `src/`, and
its tests run under `npm test`. It never ships — the workbook is generated at build time, so
`exceljs` is a devDependency and stays out of the browser bundle.

### Key Concepts

- **Capability Reference Model**: Defines WHAT can be assessed (domains and areas)
- **ORBIT Model**: Defines HOW assessments are conducted (maturity criteria)
- **Dexie.js**: IndexedDB wrapper for local data persistence
- **Custom Hooks**: Encapsulate business logic and data access

### Data Flow

1. Static data loaded from JSON files (`capabilities.json`, `orbit-model.json`)
2. User data stored in IndexedDB via Dexie.js
3. React hooks provide reactive access to data
4. Components render based on hook state

## Coding Standards

### TypeScript

- **Strict mode enabled** - No `any` types allowed
- **Explicit return types** on exported functions
- **JSDoc comments** on all exported functions and hooks

```typescript
/**
 * Calculate the average score for a set of ratings
 * @param ratings - Array of maturity level ratings
 * @returns Average score or null if no valid ratings
 */
export function calculateAverageScore(ratings: MaturityLevel[]): number | null {
  // Implementation
}
```

### React Components

- **Functional components** with hooks
- **PascalCase** for component names
- **Props interface** defined for each component
- **Destructure props** in function signature

```typescript
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export function Button({ label, onClick, disabled = false }: ButtonProps): JSX.Element {
  return (
    <button onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
}
```

### Hooks

- **camelCase** with `use` prefix
- **Return type interface** defined
- **JSDoc documentation** for hook and return values

```typescript
export interface UseExampleReturn {
  data: ExampleData[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook for managing example data
 */
export function useExample(): UseExampleReturn {
  // Implementation
}
```

### File Naming

| Type       | Convention             | Example                       |
| ---------- | ---------------------- | ----------------------------- |
| Components | PascalCase             | `AssessmentCard.tsx`          |
| Hooks      | camelCase + use prefix | `useCapabilityAssessments.ts` |
| Services   | camelCase              | `scoring.ts`                  |
| Types      | PascalCase             | `CapabilityAssessment`        |
| Tests      | `*.test.ts(x)`         | `scoring.test.ts`             |
| Constants  | SCREAMING_SNAKE_CASE   | `MAX_FILE_SIZE`               |

### Formatting

- **Prettier** handles all formatting
- Run `npm run format` before committing
- Pre-commit hook will auto-format staged files

Configuration (`.prettierrc`):

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

### Linting

- **ESLint** with TypeScript rules
- No unused variables (except `_` prefixed)
- No explicit `any` types
- React hooks rules enforced

Run `npm run lint` to check, `npm run lint:fix` to auto-fix.

## Testing Guidelines

### Test Structure

- Tests live alongside source files (`*.test.ts` or `*.test.tsx`)
- Use descriptive test names
- Group related tests with `describe` blocks

```typescript
describe('useCapabilityAssessments', () => {
  describe('startAssessment', () => {
    it('should create a new assessment with in_progress status', async () => {
      // Test implementation
    });

    it('should throw error for invalid capability area', async () => {
      // Test implementation
    });
  });
});
```

### Testing Hooks

Use `renderHook` from React Testing Library:

```typescript
import { renderHook, act } from '@testing-library/react';
import { useCapabilityAssessments } from './useCapabilityAssessments';

it('should start a new assessment', async () => {
  const { result } = renderHook(() => useCapabilityAssessments());

  await act(async () => {
    await result.current.startAssessment('health-plan-administration');
  });

  expect(result.current.assessments).toHaveLength(1);
});
```

### Testing Components

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { StatusChip } from './StatusChip';

it('should display correct status text', () => {
  render(<StatusChip status="in_progress" />);
  expect(screen.getByText('In Progress')).toBeInTheDocument();
});
```

### Mocking IndexedDB

The test setup includes `fake-indexeddb` for Dexie tests. Clear the database between tests:

```typescript
import { db } from '../services/db';

beforeEach(async () => {
  await db.capabilityAssessments.clear();
  await db.orbitRatings.clear();
});
```

### Running Tests

```bash
npm test              # Run all tests once
npm run test:watch    # Watch mode for development
npm run test:coverage # Generate coverage report
```

### Coverage Requirements

- Aim for 80%+ coverage on new code
- All hooks and services should have tests
- Critical paths must be tested

## Commit Guidelines

We use [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

| Type       | Description                                             |
| ---------- | ------------------------------------------------------- |
| `feat`     | New feature                                             |
| `fix`      | Bug fix                                                 |
| `docs`     | Documentation only                                      |
| `style`    | Formatting, no code change                              |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf`     | Performance improvement                                 |
| `test`     | Adding or updating tests                                |
| `chore`    | Build process, dependencies, etc.                       |

### Examples

```bash
feat(assessment): add file attachment support
fix(dashboard): correct progress bar calculation
docs(readme): update installation instructions
test(hooks): add useOrbitRatings test coverage
refactor(services): extract scoring logic to separate module
```

### Commit Message Rules

- Use imperative mood ("add" not "added")
- Don't capitalize first letter
- No period at the end
- Keep subject line under 72 characters
- Reference issues in footer: `Fixes #123`

## Pull Request Process

### Before Submitting

1. **Update your branch** with the latest main

   ```bash
   git fetch origin
   git rebase origin/main
   ```

2. **Run all checks**

   ```bash
   npm run lint
   npm run typecheck
   npm test
   npm run audit:code     # knip — unused exports and dependencies
   npm run format:check
   npm run build
   ```

3. **If you changed the workbook generator, two more gates apply.** `npm test` proves the generator
   emitted the formula string it intended; it cannot prove Excel computes the right answer from it,
   and defects have shipped past a fully green suite because of exactly that gap.

   ```bash
   npm run generate:workbook
   npm run verify:workbook-excel   # drives Excel, reads computed cells back. macOS + Excel, not in CI
   node scripts/xlsx/prove-assertions.ts   # confirms each assertion can still fail; run on a clean tree
   ```

   `.kiro/steering/development-standards.md` §16 has the full rules, including why a criteria-based
   `IF` over a range is unsafe and why post-2007 Excel functions need an `_xlfn.` prefix.

4. **Update documentation** if needed
   - README.md for user-facing changes
   - CHANGELOG.md for all changes
   - JSDoc comments for new functions

### PR Requirements

- [ ] All tests pass
- [ ] No linting errors
- [ ] TypeScript compiles without errors
- [ ] `npm run audit:code` (knip) and `npm run format:check` clean
- [ ] CHANGELOG.md updated
- [ ] Documentation updated (if applicable)
- [ ] Conventional commit messages used
- [ ] If the workbook generator changed: `verify:workbook-excel` and `prove-assertions.ts` run

### PR Description Template

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

Describe how you tested the changes

## Screenshots (if applicable)

Add screenshots for UI changes

## Checklist

- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
```

### Review Process

1. Submit PR against `main` branch
2. Automated checks run (lint, test, build)
3. At least one maintainer review required
4. Address review feedback
5. Squash and merge when approved

## Issue Guidelines

### Bug Reports

Use the bug report template and include:

- Clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Browser and OS information
- Screenshots if applicable

### Feature Requests

Use the feature request template and include:

- Clear description of the feature
- Use case / problem it solves
- Proposed solution (if any)
- Alternatives considered

### Questions

For questions about the codebase or implementation:

1. Check existing documentation first
2. Search existing issues
3. Open a discussion or issue with the `question` label

## Getting Help

- **Documentation**: Start with [PROJECT_FOUNDATION.md](PROJECT_FOUNDATION.md)
- **Issues**: Search existing issues or create a new one
- **Discussions**: Use GitHub Discussions for questions

## Recognition

Contributors will be recognized in:

- CHANGELOG.md for their contributions
- GitHub contributors list

Thank you for contributing to the MITA 4.0 State Self-Assessment Tool!
