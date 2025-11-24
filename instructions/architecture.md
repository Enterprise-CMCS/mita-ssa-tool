# MITA State Self-Assessment Tool - Architecture Overview

> **⚠️ DEPRECATED**: This file has been migrated to `.kiro/steering/architecture-guidelines.md` and `.kiro/specs/` for comprehensive architectural guidance. Please use the Kiro specs for current development work.

## System Architecture

The MITA SS-A Tool follows a modern, browser-based architecture that emphasizes content-code separation and client-side processing. This document outlines the technical architecture to guide Amazon Q Developer in implementing the application.

### High-Level Architecture

```
+-----------------------------------+
|            User Interface         |
|  +-----------+    +-------------+ |
|  | Assessment|    | Reporting & | |
|  | Workflow  |    | Export      | |
|  +-----------+    +-------------+ |
+-------------------+---------------+
|         Application Logic         |
|  +-----------+    +-------------+ |
|  | Content   |    | State       | |
|  | Loader    |    | Management  | |
|  +-----------+    +-------------+ |
|  | Decision   |   | Data        | |
|  | Tree       |   | Validation  | |
|  +-----------+    +-------------+ |
+-------------------+---------------+
|            Data Layer             |
|  +-----------+    +-------------+ |
|  | Browser   |    | Content     | |
|  | Storage   |    | Parser      | |
|  +-----------+    +-------------+ |
+-----------------------------------+
```

## Key Components

### 1. UI Layer

#### Assessment Components

* **AssessmentSetup**: Allows users to select capability domains and areas for assessment
* **GuidedAssessment**: Main orchestration component managing step-by-step assessment workflow
* **AssessmentHeader**: Sticky header component with progress tracking, save status, and navigation controls
* **AssessmentSidebar**: Collapsible navigation sidebar with capability-based organization and direct section access
* **CapabilityOverview**: Displays capability information before assessment begins
* **DimensionAssessment**: Handles individual ORBIT dimension assessment with maturity level selection
* **ProgressTracker**: Displays progress through the assessment with auto-save status

#### Reporting Components

* **AssessmentResults**: Comprehensive results page with maturity score calculations and visualizations
* **UserDashboard**: Assessment management dashboard with progress indicators and export functionality
* **Chart Components**: Interactive Bar and Radar charts using Chart.js for data visualization

### 2. Application Layer

#### Core Services

* **ContentService**: Loads and manages capability definitions from Markdown files
* **EnhancedStorageService**: Manages browser storage operations with localStorage/IndexedDB fallbacks
* **Assessment Components**: Handle assessment logic and state management through React components

#### State Management

* **Context Providers**: React Context API for sharing state
* **Reducers**: State update logic for assessment data
* **Storage Hooks**: Custom hooks for localStorage/IndexedDB interaction

### 3. Data Layer

#### Storage Mechanisms

* **LocalStorage**: Primary storage for smaller assessments
* **IndexedDB**: Storage for larger data sets
* **SessionStorage**: Temporary session data

#### Content Structure

* **Markdown Parser**: Converts markdown content to structured data
* **TypeScript Interfaces**: Type definitions for content structure
* **Validation Utilities**: Ensures content integrity

## Content-Code Separation

A key architectural principle of the MITA SS-A Tool is the separation of content (MITA capability definitions) from code (application logic). This provides several benefits:

1. **Content Maintainability**: Subject matter experts can update capability definitions without code changes
2. **Enhanced Flexibility**: New capability areas can be added through content files only
3. **Versioning Simplicity**: Content can be versioned independently from application code
4. **Improved Testability**: Application logic can be tested with mock content

The content is structured in YAML/Markdown files with a standardized format, see the [Data Model](data_models.md) for detailed information.

## Data Flow

1. **Content Loading**: Application loads YAML/Markdown files at runtime
2. **User Input**: Assessment data captured through forms
3. **State Management**: React Context maintains application state
4. **Data Persistence**: Assessment data saved to browser storage
5. **Reporting**: Visualization components render data from state
6. **Export**: PDF/CSV generated from application state

## Browser Storage Strategy

The application uses a tiered approach to browser storage:

1. **localStorage**: First choice for storing assessment data (limited to \~5MB)
2. **IndexedDB**: Fallback for larger assessments (up to 50MB+)
3. **Memory Cache**: Runtime state management with React Context
4. **Export Files**: Generated files (PDF/CSV) for sharing and backup

### Storage Schema

```TypeScript
interface Assessment {
  id: string;
  stateName: string;
  createdAt: string;
  updatedAt: string;
  status: 'not-started' | 'in-progress' | 'completed';
  capabilities: CapabilityAreaAssessment[];
  metadata: AssessmentMetadata;
}

interface CapabilityAreaAssessment {
  id: string;
  capabilityDomainName: string;
  capabilityAreaName: string;
  status: 'not-started' | 'in-progress' | 'completed';
  dimensions: {
    outcome: DimensionAssessment;
    role: DimensionAssessment;
    businessProcess: DimensionAssessment;
    information: DimensionAssessment;
    technology: DimensionAssessment;
  };
}

interface DimensionAssessment {
  maturityLevel: number;
  evidence: string;
  barriers: string;
  plans: string;
  notes: string;
  targetMaturityLevel?: number;
  lastUpdated: string;
}
```

## Deployment Architecture

```
+-----------------------------------+
|        GitHub Repository          |
|  +-------------------------+      |
|  |  Source Code            |      |
|  +-------------------------+      |
|  |  Content (YAML/Markdown)|      |
|  +-------------------------+      |
|  |  CI/CD Workflow         |      |
|  +-------------------------+      |
+----------------+------------------+
                 |
                 v
+-----------------------------------+
|        GitHub Actions             |
|  +-------------------------+      |
|  |  Build Process          |      |
|  |  (Next.js Export)       |      |
|  +-------------------------+      |
+----------------+------------------+
                 |
                 v
+-----------------------------------+
|        GitHub Pages              |
|  +-------------------------+      |
|  |  Static Site            |      |
|  +-------------------------+      |
+-----------------------------------+
```

## Key Technical Constraints

1. **Client-Side Only**: No server-side processing or storage
2. **Browser Compatibility**: Support for modern browsers (Chrome, Firefox, Safari, Edge)
3. **Mobile Responsiveness**: Tablet support required; mobile optional
4. **Performance**: Quick initial load; efficient operation with large data sets
5. **Accessibility**: WCAG 2.1 AA compliance required

## Error Handling Approach

### Comprehensive Error Handling System

The application implements a multi-layered error handling approach:

1. **Error Boundaries**: React error boundaries catch JavaScript errors and provide recovery options
   - `ErrorBoundary`: General error boundary with retry functionality and user-friendly messages
   - `AssessmentErrorBoundary`: Specialized boundary for assessment workflow with data export capabilities

2. **Storage Error Handling**: Dedicated handling for browser storage issues
   - `StorageErrorHandler`: Provides storage-specific error messages and recovery options
   - Automatic fallback from localStorage to IndexedDB
   - Data export functionality when storage fails

3. **Error Categorization**: Systematic error classification for appropriate handling
   - Storage errors (quota, unavailable, corruption)
   - Network errors (connection issues, timeouts)
   - Validation errors (user input, data integrity)
   - Content errors (parsing, loading failures)

4. **Recovery Mechanisms**:
   - **Retry Logic**: Automatic retry with exponential backoff for transient errors
   - **Data Preservation**: Export functionality to prevent data loss during errors
   - **Graceful Degradation**: Continue offline when storage is unavailable
   - **User Guidance**: Clear instructions for manual recovery steps

5. **Error Context**: Comprehensive error logging with context for debugging
   - Error categorization and metadata
   - User action context and timestamp
   - Component stack traces for development

### Error Handling Components

- **useErrorHandler Hook**: Centralized error handling logic with categorization and retry functionality
- **StorageErrorHandler Component**: UI component for storage-specific error scenarios
- **AssessmentErrorBoundary Component**: Specialized error boundary for assessment workflow
- **Enhanced ErrorBoundary**: Improved general error boundary with recovery options

## Technical Decisions Rationale

1. **Next.js with Static Export**: Provides SEO benefits and optimized loading while enabling GitHub Pages hosting
2. **TypeScript**: Ensures type safety and improves developer experience
3. **CMS Design System**: Provides accessible, compliant UI components
4. **Content in YAML/Markdown**: Separates content from code for easier maintenance
5. **Browser Storage**: Enables offline functionality without server dependencies

## Performance Considerations

1. **Code Splitting**: Load components as needed
2. **Lazy Loading**: Defer non-critical content loading
3. **Optimized Assets**: Minimize image and CSS sizes
4. **Memoization**: Prevent unnecessary re-renders
5. **Storage Limits**: Handle browser storage constraints gracefully

