# Development Workflow Standards

## Quality Gate Process

Every code change must pass through a comprehensive quality gate before being committed or pushed. This ensures consistent code quality and prevents CI/CD pipeline failures.

## Required NPM Scripts

Your package.json should include these quality check scripts:

```json
{
  "scripts": {
    "check": "npm run format:check && npm run lint && npm run type-check && npm run test && npm run build",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "lint": "eslint . --ext .ts,.tsx --fix",
    "lint:check": "eslint . --ext .ts,.tsx",
    "lint:staged": "eslint --ext .ts,.tsx",
    "type-check": "tsc --noEmit",
    "test": "jest --passWithNoTests",
    "test:coverage": "jest --coverage --passWithNoTests",
    "test:staged": "jest --findRelatedTests --passWithNoTests",
    "build": "next build"
  }
}
```

## Development Workflow Steps

### 1. Before Starting Work
- Pull latest changes from main branch
- Run `npm install` to ensure dependencies are up to date
- Run `npm run check` to verify clean starting state

### 2. During Development
- Write code following established coding standards
- Write tests for new functionality
- Run relevant tests frequently: `npm run test:watch`
- Use `npm run lint:fix` to auto-fix linting issues

### 3. Before Committing
- **ALWAYS** run `npm run check` and ensure it passes
- Update relevant documentation (README, CHANGELOG, instructions)
- Stage only the files you intend to commit
- Write clear, descriptive commit messages
- Never commit code that fails quality checks

### 4. Before Pushing
- Run `npm run check` one final time
- Ensure all tests pass with adequate coverage
- Verify build succeeds for production deployment

## Quality Check Components

### Code Formatting (Prettier)
- Enforces consistent code style
- Auto-fixes formatting issues where possible
- Prevents style-related merge conflicts

### Linting (ESLint)
- Catches potential bugs and code smells
- Enforces coding best practices
- Maintains consistent code patterns

### Type Checking (TypeScript)
- Validates type safety across the codebase
- Catches type-related errors before runtime
- Ensures interface compliance

### Testing (Jest)
- Validates functionality works as expected
- Maintains code coverage thresholds
- Prevents regressions in existing features

### Build Verification
- Ensures code compiles for production
- Catches build-time errors early
- Validates deployment readiness

## Failure Resolution

### When Quality Checks Fail:

1. **Formatting Issues**: Run `npm run format` to auto-fix
2. **Linting Errors**: Run `npm run lint` to auto-fix, manually resolve remaining issues
3. **Type Errors**: Fix TypeScript compilation errors in affected files
4. **Test Failures**: Debug and fix failing tests, ensure new code is tested
5. **Build Errors**: Resolve compilation or bundling issues

### Never:
- Commit code with failing quality checks
- Skip tests or reduce coverage to pass checks
- Disable linting rules without team discussion
- Push code that fails the build process

## Continuous Integration Alignment

Local quality checks should mirror CI/CD pipeline requirements:
- Same linting rules and configuration
- Identical test execution and coverage thresholds
- Matching build process and environment
- Consistent formatting standards

This ensures that code passing local checks will also pass in the CI/CD pipeline, reducing build failures and deployment issues.

## Tool Configuration Files

Ensure these configuration files are properly set up:
- `.eslintrc.js` or `.eslintrc.json` - ESLint configuration
- `.prettierrc` - Prettier formatting rules
- `tsconfig.json` - TypeScript compiler options
- `jest.config.js` - Jest testing configuration
- `.gitignore` - Exclude build artifacts and dependencies