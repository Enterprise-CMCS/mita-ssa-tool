# Design Document - Deployment Simplification and Cleanup

## Overview

The Deployment Simplification and Cleanup feature streamlines the deployment infrastructure by replacing the complex multi-branch deployment system with a simple, reliable single-branch deployment to GitHub Pages. This design focuses on removing unnecessary complexity, improving maintainability, and aligning with GitHub Pages' native deployment model. The solution includes a clean GitHub Actions workflow, simplified Next.js configuration, updated documentation, and organized repository structure.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│         Simplified Deployment Infrastructure                │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │ GitHub Actions  │    │  Next.js Build  │                │
│  │ Workflow        │    │  System         │                │
│  │                 │    │                 │                │
│  │ - Push Trigger  │───►│ - Static Export │                │
│  │ - Build Job     │    │ - Asset Opt     │                │
│  │ - Deploy Job    │    │ - Base Path     │                │
│  └─────────────────┘    └─────────────────┘                │
│           │                      │                          │
│           ▼                      ▼                          │
│  ┌─────────────────────────────────────┐                   │
│  │     GitHub Pages Deployment         │                   │
│  │                                     │                   │
│  │  - Static Site Hosting              │                   │
│  │  - HTTPS Enforcement                │                   │
│  │  - Custom Domain Support            │                   │
│  └─────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

### Deployment Flow

1. **Trigger**: Developer pushes code to main branch
2. **Checkout**: GitHub Actions checks out the repository code
3. **Setup**: Install Node.js and project dependencies with caching
4. **Build**: Run Next.js build with production configuration
5. **Deploy**: Upload build artifacts to GitHub Pages
6. **Verify**: Confirm deployment success and site accessibility

## Components and Interfaces

### GitHub Actions Workflow

Simplified workflow for single-branch deployment:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build
        env:
          NEXT_PUBLIC_BASE_PATH: /mita-state-self-assessment-tool

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./out

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### Next.js Configuration

Simplified configuration for production deployment:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  
  // GitHub Pages configuration
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || '',
  
  // Static export settings
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  
  // Production optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Disable server-side features
  distDir: 'out',
};

module.exports = nextConfig;
```

### Environment Configuration

Single environment configuration:

```typescript
interface DeploymentConfig {
  repository: string;
  branch: string;
  basePath: string;
  assetPrefix: string;
  githubPagesUrl: string;
}

const deploymentConfig: DeploymentConfig = {
  repository: 'naretakis/mita-state-self-assessment-tool',
  branch: 'main',
  basePath: '/mita-state-self-assessment-tool',
  assetPrefix: '/mita-state-self-assessment-tool',
  githubPagesUrl: 'https://naretakis.github.io/mita-state-self-assessment-tool',
};
```

## Data Models

### Workflow Configuration

```typescript
interface WorkflowConfig {
  name: string;
  triggers: {
    push: {
      branches: string[];
    };
    workflowDispatch: boolean;
  };
  permissions: {
    contents: 'read' | 'write';
    pages: 'write';
    idToken: 'write';
  };
  concurrency: {
    group: string;
    cancelInProgress: boolean;
  };
  jobs: {
    build: BuildJob;
    deploy: DeployJob;
  };
}

interface BuildJob {
  runsOn: string;
  steps: BuildStep[];
}

interface BuildStep {
  name: string;
  uses?: string;
  run?: string;
  with?: Record<string, string>;
  env?: Record<string, string>;
}

interface DeployJob {
  environment: {
    name: string;
    url: string;
  };
  runsOn: string;
  needs: string[];
  steps: DeployStep[];
}
```

### Repository Structure

```typescript
interface RepositoryStructure {
  specs: {
    active: string[];
    archivedDone: string[];
    archivedOnHold: string[];
  };
  workflows: {
    deployment: string;
    removed: string[];
  };
  documentation: {
    readme: string;
    changelog: string;
    contributing: string;
  };
}

interface SpecArchive {
  name: string;
  status: 'active' | 'archived-done' | 'archived-on-hold';
  completionDate?: string;
  reason?: string;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Single workflow deployment

*For any* push to the main branch, the deployment workflow should trigger exactly once and deploy to the production GitHub Pages environment.

**Validates: Requirements 1.1, 1.2**

### Property 2: Configuration consistency

*For any* build execution, the base path and asset prefix should match the configured GitHub Pages path.

**Validates: Requirements 1.2, 2.2, 2.4**

### Property 3: Multi-branch code removal

*For any* file in the repository, it should not contain references to dev or test branch deployment configurations.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

### Property 4: Documentation accuracy

*For any* documentation file, deployment instructions should reference only the main branch and production environment.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

### Property 5: Archive organization

*For any* completed spec, it should exist in the archived-done folder and not in the root specs folder.

**Validates: Requirements 5.1, 5.3, 5.4, 5.5**

### Property 6: Deployment success verification

*For any* successful deployment, the application should be accessible at the configured GitHub Pages URL with all assets loading correctly.

**Validates: Requirements 1.5, 4.3, 6.3**

## Error Handling

### Build Failures

```typescript
interface BuildError {
  stage: 'dependencies' | 'build' | 'export';
  message: string;
  details: string;
  suggestedFix: string;
}

const handleBuildError = (error: BuildError): void => {
  console.error(`Build failed at ${error.stage}: ${error.message}`);
  console.error(`Details: ${error.details}`);
  console.error(`Suggested fix: ${error.suggestedFix}`);
  
  // Preserve existing deployment
  process.exit(1);
};
```

### Deployment Failures

```typescript
interface DeploymentError {
  type: 'upload' | 'pages-deployment' | 'verification';
  message: string;
  recoverable: boolean;
  retryable: boolean;
}

const handleDeploymentError = (error: DeploymentError): void => {
  if (error.retryable) {
    console.log('Retrying deployment...');
    // Retry logic handled by GitHub Actions
  } else {
    console.error(`Deployment failed: ${error.message}`);
    console.error('Existing deployment preserved');
    process.exit(1);
  }
};
```

### Configuration Errors

```typescript
interface ConfigurationError {
  setting: string;
  expected: string;
  actual: string;
  instructions: string;
}

const validateConfiguration = (): ConfigurationError[] => {
  const errors: ConfigurationError[] = [];
  
  // Validate GitHub Pages settings
  if (!isGitHubPagesEnabled()) {
    errors.push({
      setting: 'GitHub Pages',
      expected: 'Enabled with main branch',
      actual: 'Disabled or misconfigured',
      instructions: 'Go to Settings > Pages > Source: Deploy from a branch > Branch: main',
    });
  }
  
  return errors;
};
```

## Testing Strategy

### Unit Tests

Unit tests will verify specific configuration and utility functions:

- Test Next.js configuration generation
- Test base path and asset prefix calculation
- Test environment variable handling
- Test error message formatting

### Integration Tests

Integration tests will verify the complete deployment process:

- Test workflow file syntax and structure
- Test build process with production configuration
- Test artifact generation and structure
- Test deployment to GitHub Pages (in test repository)

### Manual Verification

Manual checks to ensure deployment success:

1. **Pre-Deployment Checklist**:
   - Verify GitHub Pages is enabled in repository settings
   - Confirm main branch is selected as source
   - Check that HTTPS is enforced
   - Validate base path configuration

2. **Post-Deployment Verification**:
   - Visit deployed site URL
   - Test navigation between pages
   - Verify all assets load correctly
   - Check browser console for errors
   - Test on multiple browsers

3. **Documentation Review**:
   - Read through updated README
   - Verify deployment instructions are clear
   - Check that all multi-branch references are removed
   - Confirm CHANGELOG is updated

### Property-Based Testing

Property-based tests will use a testing library appropriate for the validation scripts:

- **Property 1**: Generate random commit scenarios and verify single workflow trigger
- **Property 2**: Generate random build configurations and verify path consistency
- **Property 3**: Scan all repository files for multi-branch references
- **Property 4**: Parse all documentation files and verify deployment references
- **Property 5**: Check spec folder structure and verify archive organization
- **Property 6**: Test deployed URLs and verify accessibility

## Deployment Process

### Step-by-Step Deployment

1. **Prepare Repository**:
   ```bash
   # Ensure on main branch
   git checkout main
   git pull origin main
   
   # Run quality checks
   npm run check
   ```

2. **Configure GitHub Pages**:
   - Navigate to repository Settings > Pages
   - Source: Deploy from a branch
   - Branch: main
   - Folder: / (root)
   - Save configuration

3. **Push Changes**:
   ```bash
   # Commit and push
   git add .
   git commit -m "Simplify deployment to single branch"
   git push origin main
   ```

4. **Monitor Deployment**:
   - Go to Actions tab in GitHub
   - Watch deployment workflow progress
   - Check for any errors or warnings

5. **Verify Deployment**:
   - Visit: https://naretakis.github.io/mita-state-self-assessment-tool
   - Test navigation and functionality
   - Check browser console for errors

### Rollback Procedure

If deployment fails or issues are discovered:

```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Or reset to specific commit
git reset --hard <previous-commit-sha>
git push --force origin main
```

## Repository Organization

### Spec Folder Structure

```
.kiro/specs/
├── archived-done/              # Completed specifications
│   ├── assessment-workflow/
│   ├── content-management-system/
│   ├── error-handling-and-resilience/
│   ├── multi-branch-deployment-infrastructure/
│   └── ...
├── archived-on-hold/           # Inactive specifications
│   ├── github-pages-routing-fix/
│   ├── tech-debt-cleanup/
│   └── ...
└── deployment-simplification-and-cleanup/  # Active spec
    ├── requirements.md
    ├── design.md
    └── tasks.md
```

### Archive Decision Criteria

**Move to archived-done** if:
- All tasks are completed
- Feature is deployed to production
- No outstanding bugs or issues
- Documentation is updated

**Move to archived-on-hold** if:
- Spec was created but not started
- Feature is deprioritized
- Waiting for external dependencies
- Superseded by other work

**Keep active** if:
- Currently being worked on
- Tasks are in progress
- Next priority for development

## Documentation Updates

### README.md Updates

```markdown
## Deployment

The application is automatically deployed to GitHub Pages when changes are pushed to the `main` branch.

### Deployment URL
https://naretakis.github.io/mita-state-self-assessment-tool

### Manual Deployment
To trigger a manual deployment:
1. Go to the Actions tab in GitHub
2. Select "Deploy to GitHub Pages" workflow
3. Click "Run workflow"
4. Select the main branch
5. Click "Run workflow"

### Local Development
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run start
```

### CHANGELOG.md Updates

```markdown
## [Unreleased]

### Changed
- Simplified deployment to single-branch GitHub Pages workflow
- Removed multi-branch deployment infrastructure (dev/test environments)
- Updated Next.js configuration for production-only deployment
- Streamlined GitHub Actions workflow for faster deployments

### Removed
- Dev and test branch deployment configurations
- Multi-environment deployment scripts
- Complex content preservation logic
- Environment-specific build configurations

### Fixed
- Deployment reliability by aligning with GitHub Pages native model
- Build times by removing unnecessary deployment complexity
```

### CONTRIBUTING.md Updates

```markdown
## Deployment Process

The project uses a simplified single-branch deployment model:

1. All changes are merged to the `main` branch
2. GitHub Actions automatically builds and deploys to GitHub Pages
3. Deployment typically completes within 5 minutes
4. The live site updates at: https://naretakis.github.io/mita-state-self-assessment-tool

### Before Pushing

Always run the quality check before pushing:

```bash
npm run check
```

This ensures your code passes all formatting, linting, type checking, and build verification.
```

## Performance Considerations

### Build Optimization

```yaml
# Caching strategy for faster builds
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'

- name: Install dependencies
  run: npm ci  # Faster than npm install for CI
```

### Deployment Speed

Expected timings:
- Dependency installation: 30-60 seconds (with cache)
- Build process: 2-3 minutes
- Upload and deployment: 1-2 minutes
- **Total: 3-5 minutes**

### Monitoring

```typescript
interface DeploymentMetrics {
  startTime: string;
  endTime: string;
  duration: number;
  buildSize: number;
  assetCount: number;
  cacheHit: boolean;
}

const logDeploymentMetrics = (metrics: DeploymentMetrics): void => {
  console.log('Deployment Metrics:');
  console.log(`Duration: ${metrics.duration}ms`);
  console.log(`Build Size: ${metrics.buildSize} bytes`);
  console.log(`Asset Count: ${metrics.assetCount}`);
  console.log(`Cache Hit: ${metrics.cacheHit}`);
};
```

## Security Considerations

### Workflow Permissions

Minimal required permissions:
- `contents: read` - Read repository code
- `pages: write` - Deploy to GitHub Pages
- `id-token: write` - Authenticate with GitHub Pages

### Secrets Management

No secrets required for basic deployment. If custom domain or additional features are added:

```yaml
env:
  CUSTOM_DOMAIN: ${{ secrets.CUSTOM_DOMAIN }}
  # Add other secrets as needed
```

### Branch Protection

Recommended settings for main branch:
- Require pull request reviews
- Require status checks to pass
- Require branches to be up to date
- Include administrators in restrictions

## Migration Plan

### Phase 1: Preparation
1. Review existing multi-branch deployment code
2. Document current deployment URLs and configurations
3. Create backup of current workflow files
4. Communicate changes to team

### Phase 2: Implementation
1. Create new simplified workflow file
2. Update Next.js configuration
3. Remove multi-branch deployment code
4. Update documentation

### Phase 3: Testing
1. Test deployment in test repository (if available)
2. Verify build process locally
3. Check configuration files
4. Review documentation

### Phase 4: Deployment
1. Configure GitHub Pages settings
2. Push changes to main branch
3. Monitor deployment workflow
4. Verify site accessibility

### Phase 5: Cleanup
1. Archive old workflow files
2. Organize spec folder structure
3. Update team documentation
4. Remove unused scripts and configurations

## Success Criteria

The deployment simplification is successful when:

1. ✅ Single workflow file deploys to GitHub Pages
2. ✅ No multi-branch deployment code remains
3. ✅ Documentation reflects simplified process
4. ✅ Deployment completes in under 5 minutes
5. ✅ Site is accessible at configured URL
6. ✅ All assets load correctly
7. ✅ Spec folder is organized with archives
8. ✅ Team understands new deployment process
