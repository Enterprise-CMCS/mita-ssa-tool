# MITA State Self-Assessment Tool - Development Guide

> **⚠️ DEPRECATED**: This file has been migrated to `.kiro/steering/development-workflow.md` and `.kiro/steering/coding-standards.md`. Please use the Kiro steering files for current development standards.

## Development Approach

This document provides implementation guidelines and best practices for developing the MITA State Self-Assessment Tool using Amazon Q Developer. Following these guidelines will ensure consistent, high-quality code and an effective development process.

## Environment Setup

### Required Tools

1. **Visual Studio Code**: Primary IDE (latest stable version)
   - Download: https://code.visualstudio.com/

2. **Amazon Q Developer Extension**: AI coding assistant
   - Install via VS Code Extensions marketplace

3. **Node.js and npm**: Runtime environment and package manager (LTS version recommended)
   - Download: https://nodejs.org/

4. **Git & GitHub Desktop**: Version control
   - Download GitHub Desktop: https://desktop.github.com/

### Initial Setup Process

1. Clone the GitHub repository
2. Install project dependencies:
   ```
   npm install
   ```
3. Start the development server:
   ```
   npm run dev
   ```
4. Access the application at `http://localhost:3000`

## Coding Standards

### TypeScript Best Practices

1. **Type Everything**: Create interfaces for all data structures
2. **Avoid `any`**: Use specific types or `unknown` if type is truly uncertain
3. **Nullable Types**: Use union with `null` or `undefined` for optional values
4. **Type Guards**: Implement proper type narrowing with type guards

### React Best Practices

1. **Functional Components**: Use React functional components with hooks
2. **Custom Hooks**: Extract reusable logic into custom hooks
3. **Memoization**: Use `useMemo` and `useCallback` for optimization
4. **Context API**: Use React Context for state that needs to be shared
5. **Component Structure**:
   - Small, focused components
   - Clear props interfaces
   - Logical file organization

### Component Organization

```
src/
├── components/
│   ├── assessment/         # Assessment-specific components
│   │   ├── AssessmentResults.tsx    # Results page with charts and exports
│   │   ├── AssessmentSetup.tsx      # Domain/capability selection
│   │   ├── CapabilityOverview.tsx   # Capability information display
│   │   ├── DimensionAssessment.tsx  # ORBIT dimension assessment forms
│   │   ├── GuidedAssessment.tsx     # Main assessment workflow
│   │   └── ProgressTracker.tsx      # Progress and auto-save indicators
│   ├── common/             # Shared UI components
│   ├── dashboard/          # Dashboard and assessment management
│   ├── layout/             # Layout components
│   ├── storage/            # Storage management components
│   └── index.ts            # Component exports
```

## Content Management

### YAML/Markdown Files

1. **Location**: Store in `public/content` directory
2. **Naming Convention**: `[module]-[domain]-[capability].md`
3. **Structure**: Follow the template in `mita-framework.md`
4. **Metadata**: Include all required front matter fields
5. **Content Sections**: Maintain consistent heading structure

### Content Loading

1. Use dynamic imports for markdown files
2. Parse front matter with gray-matter
3. Convert markdown to structured data
4. Cache loaded content for performance

## State Management

### Assessment Data Flow

1. **Content Loading**: Parse Markdown files with YAML front matter into typed CapabilityDefinition structures using ContentService
2. **Assessment Setup**: User selects capability domains and areas through AssessmentSetup component with card-based UI
3. **Assessment Creation**: Create Assessment object with selected capabilities and initialize dimension data structures
4. **Guided Workflow**: GuidedAssessment orchestrates step-by-step progression through:
   - CapabilityOverview: Display capability context and ORBIT dimension information
   - DimensionAssessment: Individual ORBIT dimension forms with maturity level selection (1-5)
5. **User Input Capture**: Collect maturity levels, evidence, barriers, plans, and notes through controlled form components
6. **State Management**: Use React state with immutable update patterns and real-time synchronization
7. **Auto-Save**: EnhancedStorageService automatically persists data every 30 seconds with localStorage/IndexedDB fallbacks
8. **Progress Tracking**: ProgressTracker component shows current step, completion percentage, and save status
9. **Results Calculation**: AssessmentResults component computes overall and dimension-specific maturity scores
10. **Visualization**: Generate interactive Bar and Radar charts using Chart.js for data visualization
11. **Export**: Generate PDF reports with jsPDF and CSV data exports for sharing and analysis

### Browser Storage Strategy

1. **EnhancedStorageService**: Comprehensive storage service with tiered approach (localStorage primary, IndexedDB fallback)
2. **Storage Detection**: Automatic detection of available storage mechanisms with graceful degradation
3. **Data Persistence**: Assessment data automatically saved with metadata for quick dashboard loading
4. **Error Handling**: Robust error handling with user-friendly messages and recovery options
5. **Size Management**: Monitor storage usage and provide warnings when approaching limits
6. **Import/Export**: JSON import/export functionality for data portability and backup
7. **Assessment Summaries**: Pre-computed summary data to optimize dashboard performance

## Testing Approach

### Testing Pyramid

1. **Unit Tests**: Test individual functions and components
2. **Integration Tests**: Test component interactions
3. **End-to-End Tests**: Test complete user flows

### Testing Tools

1. **Jest**: Test runner and assertion library
2. **React Testing Library**: Component testing
3. **Mock Service Worker**: API mocking
4. **LocalStorage Mock**: Browser storage testing

### Test Organization

```
tests/
├── unit/              # Unit tests
├── integration/       # Integration tests
├── e2e/               # End-to-end tests
├── fixtures/          # Test data
└── utils/             # Test utilities
```

## Performance Optimization

### Key Considerations

1. **Bundle Size**: Monitor and optimize bundle size
2. **Lazy Loading**: Load components and content as needed
3. **Memoization**: Prevent unnecessary re-renders
4. **Storage Efficiency**: Minimize browser storage usage
5. **Image Optimization**: Compress and properly size images

### Performance Monitoring

1. Use Lighthouse for performance audits
2. Set performance budgets for critical metrics
3. Monitor performance in various browsers and devices

## Accessibility Implementation

### Standards Compliance

1. Follow WCAG 2.1 AA guidelines
2. Implement appropriate ARIA attributes
3. Ensure keyboard navigation works properly
4. Test with screen readers

### Accessibility Checklist

1. Proper heading structure
2. Sufficient color contrast
3. Text alternatives for non-text content
4. Keyboard accessibility
5. Screen reader compatibility

## Browser Compatibility

### Target Browsers

1. Chrome (latest 2 versions)
2. Firefox (latest 2 versions)
3. Safari (latest 2 versions)
4. Edge (latest 2 versions)

### Compatibility Testing

1. Test on all target browsers
2. Test on tablet devices
3. Verify storage mechanisms work across browsers
4. Ensure export/import functions work cross-browser

## Deployment Process

### GitHub Pages Deployment

1. Configure GitHub Actions workflow for automated deployment to `main` branch
2. Configure caching and compression
3. Test deployed application thoroughly

### Deployment Checklist

1. Run all tests before deployment
2. Check bundle size and performance
3. Verify browser compatibility
4. Test critical user flows
5. Validate accessibility

## Using Amazon Q Developer Effectively

### Providing Context

1. Reference project documentation in comments
2. Use descriptive variable and function names
3. Structure code with clear patterns Amazon Q can recognize
4. Break complex tasks into smaller, well-defined steps

### Writing Effective Prompts

1. Be specific about the task and desired outcome
2. Reference existing project code and documentation
3. Request explanations for generated code
4. Ask for alternatives when appropriate

### Iterative Development

1. Start with basic implementations
2. Test and verify functionality
3. Refine and optimize with Amazon Q's assistance
4. Document the implementation decisions

## Troubleshooting Common Issues

### Browser Storage Problems

1. Check storage limits and usage
2. Verify browser permissions
3. Test with different browsers
4. Implement fallback mechanisms

### Content Loading Issues

1. Verify file paths and access
2. Check content format against expected structure
3. Implement error boundary components
4. Add verbose error logging

## Error Handling Patterns

### Using Error Boundaries

The application provides several error boundary components for different scenarios:

```typescript
// General error boundary for any component
<ErrorBoundary context="Component Name" onRetry={handleRetry}>
  <YourComponent />
</ErrorBoundary>

// Specialized assessment error boundary with data export
<AssessmentErrorBoundary 
  assessmentId={assessmentId}
  onRetry={handleRetry}
  onExportData={handleExport}
>
  <AssessmentComponent />
</AssessmentErrorBoundary>
```

### Using the Error Handler Hook

```typescript
import { useErrorHandler } from '../hooks/useErrorHandler';

function MyComponent() {
  const errorHandler = useErrorHandler();

  const handleOperation = async () => {
    try {
      await riskyOperation();
    } catch (error) {
      errorHandler.setError(error as Error, {
        operation: 'riskyOperation',
        context: 'additional context'
      });
    }
  };

  // Show storage-specific error handling
  if (errorHandler.isStorageError) {
    return (
      <StorageErrorHandler
        error={errorHandler.error.originalError}
        onRetry={() => errorHandler.retry(handleOperation)}
        onContinueOffline={() => errorHandler.clearError()}
      />
    );
  }

  return <div>Component content</div>;
}
```

### Error Handling Best Practices

1. **Categorize Errors**: Use the error handler hook to properly categorize errors
2. **Provide Recovery**: Always offer users a way to recover from errors
3. **Preserve Data**: Use export functionality to prevent data loss
4. **User-Friendly Messages**: Show clear, actionable error messages
5. **Context Logging**: Include relevant context for debugging

### Rendering Problems

1. Check component dependencies
2. Verify state management logic
3. Test with simplified data
4. Use React DevTools for debugging

## Additional Resources

1. [Next.js Documentation](https://nextjs.org/docs)
2. [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
3. [React Docs](https://react.dev/learn)
4. [CMS Design System](https://design.cms.gov/)
5. [MDN Web Docs](https://developer.mozilla.org/)