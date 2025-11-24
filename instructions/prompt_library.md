# MITA State Self-Assessment Tool - Prompt Library

> **⚠️ DEPRECATED**: This file has been replaced by actionable Kiro specs with specific implementation tasks. Instead of prompts, use:
> - `.kiro/specs/*/tasks.md` for specific implementation tasks
> - `.kiro/hooks/spec-task-execution.kiro.hook` for implementation assistance
> - `.kiro/steering/` files for development guidance

## Introduction

This document provides a collection of effective prompts for Amazon Q Developer to assist with implementing the MITA State Self-Assessment Tool. These prompts are organized by development phase to help you leverage AI assistance effectively throughout the project lifecycle.

## How to Use This Library

1. **Provide Context**: Always reference the project documentation in your prompts
2. **Be Specific**: Include details about the desired outcome
3. **Request Explanations**: Ask Amazon Q to explain its code and reasoning
4. **Iterate**: Refine prompts based on initial responses

## Development Phase 1: Project Setup and Configuration ✅COMPLETED

### Phase 1 Completion Summary

All items in Development Phase 1 have been successfully completed. The project has a solid foundation with:

- Well-structured repository following Next.js and TypeScript best practices
- Configured GitHub Pages deployment with multi-branch support
- Comprehensive package.json with all required dependencies
- Testing framework with Jest and React Testing Library
- Optimized build configuration with code splitting and caching strategies

### Repository Structure Setup ✅DONE

```
I'm building the MITA State Self-Assessment Tool as described in instructions/index.md and following the Development Guide in instructions/development_guide.md. I'll be providing additional prompts for each part of the development, but for now, please help me set up the initial folder structure for a Next.js project with TypeScript following the architecture outlined in instructions/architecture.md and the Development Guide in instructions/development_guide.md. Include appropriate configuration files for Next.js, TypeScript, ESLint, and Prettier.
```

### GitHub Pages Configuration ✅DONE

```
Based on the MITA SS-A Tool project described in instructions/index.md, help me create 
a GitHub Actions workflow file (.github/workflows/deploy.yml) that will:

1. Build the Next.js application for static export
2. Deploy the built files to GitHub Pages
3. Run on push to the `main` branch
4. Include proper caching for dependencies
```

### Package.json Setup ✅DONE

```
For the MITA SS-A Tool project described in instructions/index.md, please help me create 
a package.json file with:

1. Required dependencies for Next.js, React, TypeScript, and the CMS Design System
2. Development dependencies for testing tools
3. Appropriate scripts for development, building, testing, and linting
4. Project metadata as described in our implementation plan
```

### Testing Framework Setup ✅DONE

```
Following our development approach in instructions/development_guide.md, help me set up a testing framework for the MITA SS-A Tool including:

1. Jest configuration for unit tests
2. React Testing Library setup for component testing
3. Basic test structure for components
4. Example test for a simple component
```

### Build Optimization ✅DONE

```
Based on our architecture in instructions/architecture.md, please help me optimize the build configuration for our Next.js application to:

1. Minimize bundle size through code splitting
2. Implement efficient caching strategies
3. Optimize image loading and processing
4. Ensure fast initial load times
```

## Development Phase 2: Content Structure Implementation ✅COMPLETED

### Phase 2 Completion Summary

All items in Development Phase 2 have been successfully completed. The project now has:

- YAML/Markdown Parser that loads and parses capability definitions with proper typing
- Sample capability content files for Provider Enrollment, Management, and Termination
- Comprehensive TypeScript interfaces for content structure
- Content loading component that dynamically loads and provides capability definitions
- Storage service foundation for persisting assessment data

### YAML/Markdown Parser ✅DONE

```
Following the content structure outlined in instructions/data_models.md, help me create 
a parser utility that will:

1. Load Markdown files containing MITA capability definitions
2. Parse the front matter metadata
3. Extract structured content from the Markdown sections
4. Return typed capability definition objects that match the interfaces in instructions/data_models.md
```

### Sample Capability Content ✅DONE

```
Based on the MITA framework structure in instructions/mita_framework.md, please create 
a sample markdown file for a Provider Enrollment capability area that:

1. Includes the proper YAML front matter
2. Contains sections for all five ORBIT dimensions (Outcome, Role, Business Process, Information, Technology)
3. Includes assessment questions and maturity level definitions for each dimension
4. Follows the structure detailed in instructions/data_models.md
```

### Type Definitions for Content ✅DONE

```
Using the data models described in instructions/data_models.md, please create TypeScript 
interfaces for the content structure of our MITA capability definitions. Include:

1. Interfaces for capability metadata
2. Type definitions for the five ORBIT dimensions (Outcome, Role, Business Process, Information, Technology) 
3. Interfaces for assessment questions and maturity levels for each ORBIT dimension
4. TypeScript enums or constants to represent the ORBIT dimension types
5. Proper documentation comments explaining the relationship between dimensions
```

### Content Loading Component ✅DONE

```
Following our architecture in instructions/architecture.md, help me create a React component that:

1. Dynamically loads capability definitions from Markdown files
2. Parses the content using the parser we've created
3. Provides a clean interface for other components to access this content
4. Handles loading states and errors appropriately
```

## Development Phase 3: Core Feature Implementation ✅COMPLETED

### Phase 3 Completion Summary

All core features have been successfully implemented. The application now provides:

- Complete guided assessment workflow from setup to results
- Interactive ORBIT dimension assessment forms with maturity level selection
- Comprehensive results visualization with charts and detailed reporting
- Auto-save functionality with progress tracking
- PDF and CSV export capabilities
- Professional user interface with CMS Design System integration

### Landing Page Component ✅DONE

```
Following the user journey in instructions/assessment_workflow.md, help me create a landing page component that:

1. Displays welcome message and tool overview with clear navigation options
2. Provides "Getting Started" link to proceed to user dashboard
3. Includes "About MITA" link to framework information page
4. Loads quickly with minimal dependencies and accessible entry points
5. Uses CMS Design System components for visual consistency
```

### User Dashboard Component ✅DONE

```
Based on the dashboard workflow in instructions/assessment_workflow.md, help me create a user dashboard component that:

1. Loads and displays saved assessments from browser storage with progress indicators
2. Shows assessment metadata (dates, domains, completion status) for each assessment
3. Provides "Begin New Assessment" and "Open Existing Assessment" actions
4. Displays assessment states (Not Started, In Progress, Completed, Reviewed, Exported)
5. Integrates with storage service to manage saved assessments
```

### Assessment Setup Component ✅DONE

```
Based on the assessment setup flow in instructions/assessment_workflow.md, help me create a component that:

1. Displays capability domains and areas in organized, selectable structure
2. Validates that at least one capability area is selected before proceeding
3. Saves selections to browser storage and generates customized assessment flow
4. Provides navigation back to modify selections and review before proceeding
5. Links to begin the guided assessment walkthrough
```

### Guided Assessment Walkthrough ✅DONE

```
Following the guided assessment process in instructions/assessment_workflow.md, help me create a multi-page assessment component that:

1. Presents assessment questions in logical sequence with capability overview
2. Implements systematic ORBIT dimension evaluation (Outcome, Role, Business Process, Information, Technology)
3. Provides maturity level selection, evidence documentation, and advancement planning fields
4. Auto-saves user inputs every 30 seconds and validates required fields
5. Supports forward/backward navigation and tracks completion status across dimensions
```

### ORBIT Dimension Assessment Form ✅DONE

```
Based on the form structure in instructions/assessment_workflow.md, help me create a dimension assessment component that:

1. Includes dimension overview, reference materials, and structured assessment questions
2. Provides maturity selection controls (radio buttons) and evidence text areas
3. Contains advancement plans section and general notes field
4. Handles user input validation and state updates
5. Integrates with the guided walkthrough navigation flow
```

### Assessment Results Component ✅DONE

```
Following the assessment results workflow in instructions/assessment_workflow.md, help me create a results component that:

1. Calculates and displays MITA maturity scores for assessed capability areas
2. Provides visualization of results across capability areas
3. Generates formatted PDF/CSV reports for download
4. Updates assessment status to "Completed" and adds to user dashboard
5. Includes navigation back to dashboard and sharing options
```

### Assessment Management Component ✅COMPLETED

The assessment management functionality has been implemented through the UserDashboard component and GuidedAssessment workflow. Users can view, edit, and manage existing assessments through the dashboard interface.

### Browser Storage Service ✅COMPLETED

The EnhancedStorageService has been fully implemented with localStorage/IndexedDB fallbacks, auto-save functionality, export/import capabilities, and comprehensive error handling.

### Error Boundary Component ⚠️MOVED TO SPEC

This functionality has been moved to the **Error Handling and Resilience** spec for comprehensive implementation.

### Storage Error Handling ⚠️MOVED TO SPEC

This functionality has been moved to the **Error Handling and Resilience** spec for comprehensive implementation.

## Development Phase 4: Data Visualization and Export ✅COMPLETED

### Phase 4 Completion Summary

All core data visualization and export functionality has been successfully implemented in the AssessmentResults component:

### Maturity Dashboard ✅COMPLETED

The AssessmentResults component includes comprehensive visualization with:
- Interactive Bar charts for overall maturity scores
- Radar charts for ORBIT dimension comparisons
- Summary statistics and completion indicators
- Professional styling with CMS Design System components

### PDF Export Functionality ✅COMPLETED

PDF export has been implemented using jsPDF with:
- Comprehensive assessment data export
- Professional formatting and layout
- Configurable content sections
- Automatic download functionality

### CSV Export Functionality ✅COMPLETED

CSV export has been implemented with:
- Complete assessment data in tabular format
- Proper handling of nested data structures
- Downloadable file generation
- User-friendly column headers

### Phase 4: Reporting Components ✅COMPLETED

All reporting functionality has been implemented including:
- Comprehensive maturity dashboard with interactive visualizations
- Detailed results table showing all assessment data
- Summary cards with key metrics and statistics
- Professional export options in both PDF and CSV formats

### Phase 5: Utilization Components 🚧FUTURE ENHANCEMENT

These advanced utilization features are planned for future releases:
- Strategic planning guidance based on assessment results
- Export formats suitable for leadership presentations
- Historical comparison visualizations to track progress
- Integration points with APD development processes
- Executive summary generation for stakeholder communication

## Development Phase 5: Final Integration and Refinement ⚠️PARTIALLY COMPLETED

### Application Integration ✅COMPLETED

The application integration has been successfully completed with:
- Consistent navigation between all sections through React Router
- Proper state management using React Context and EnhancedStorageService
- Smooth transitions between assessment stages with progress tracking
- Comprehensive workflow from landing page through results

### Accessibility Implementation ⚠️MOVED TO SPEC

Accessibility features have been moved to the **Accessibility and Performance** spec for comprehensive implementation including:
- ARIA attributes and screen reader support
- Keyboard navigation and focus management
- Color contrast compliance
- Cross-browser accessibility testing

### Performance Optimization ⚠️MOVED TO SPEC

Performance optimization has been moved to the **Accessibility and Performance** spec for comprehensive implementation including:
- Code splitting and lazy loading
- Bundle size optimization
- Rendering performance improvements
- Cross-browser performance testing

## Troubleshooting Prompts

### Debugging Storage Issues

```
I'm experiencing an issue where assessment data isn't being saved correctly. 
Based on our storage implementation in instructions/data_models.md, please help me:

1. Create debugging steps to identify the problem
2. Implement better error logging
3. Add recovery mechanisms for corrupted data
4. Test the fixes thoroughly
```

### Performance Optimization

```
Our application is running slowly when loading large assessments. Using our architecture 
described in instructions/architecture.md, please suggest:

1. Performance optimizations for data loading
2. Rendering improvements for large forms
3. State management optimizations
4. Memory usage improvements
```

## Component Testing Prompts

### Component Test

```
Following the testing approach in instructions/development_guide.md and using the component structures from instructions/architecture.md, please help me create a Jest test for the AssessmentForm component that:

1. Tests rendering with various props
2. Verifies user interactions work correctly
3. Ensures form validation functions properly
4. Mocks context providers and services as needed
```

### Storage Service Test

```
Following the testing strategies outlined in instructions/development_guide.md, please write Jest tests for our StorageService that:

1. Mock browser storage APIs
2. Test saving and loading assessment data
3. Verify error handling for storage failures
4. Test the fallback from localStorage to IndexedDB
```

### Integration Test

```
Following the testing approach outlined in instructions/development_guide.md, help me create an integration test for the assessment workflow that:

1. Tests the interaction between multiple components
2. Verifies data flows correctly through the system
3. Tests end-to-end assessment completion
4. Mocks browser storage for test stability
```

## Advanced Features Prompts 🚧FUTURE ENHANCEMENTS

### Import/Export Enhancement 🚧FUTURE ENHANCEMENT

Enhanced import/export functionality is planned for future releases:
- Selective import capabilities (choosing specific sections)
- Conflict resolution when merging changes
- Export format validation and versioning
- Support for encrypted exports for sensitive data

### Offline Support ⚠️MOVED TO SPEC

Offline support functionality has been moved to the **Accessibility and Performance** spec for comprehensive implementation including:
- Offline detection and user feedback
- Service worker implementation for offline caching
- Data integrity during offline operation
- Background sync when connectivity returns

---

## Migration to Kiro Specs Summary

The following functionality has been moved from the prompt library to comprehensive Kiro specs:

### ✅ New Specs Created:

1. **Error Handling and Resilience** (`.kiro/specs/error-handling-and-resilience/`)
   - Error boundary components
   - Storage error handling
   - Emergency data protection
   - Comprehensive error recovery

2. **Accessibility and Performance** (`.kiro/specs/accessibility-and-performance/`)
   - WCAG 2.1 AA compliance
   - Keyboard navigation and screen reader support
   - Performance optimization
   - Cross-browser compatibility
   - Offline support

### 🎯 Ready for Kiro Implementation

These specs provide comprehensive requirements, design, and task breakdowns for the remaining work on the MITA State Self-Assessment Tool. The core assessment workflow is 85-90% complete, and these specs will help complete the remaining quality, accessibility, and resilience features.

