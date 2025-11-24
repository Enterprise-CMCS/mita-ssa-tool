---
inclusion: fileMatch
fileMatchPattern: 'src/**/*'
---

# Architecture Guidelines

## Core Architectural Principles
1. **Content-Code Separation**: MITA capability definitions are separate from application logic
2. **Client-Side Only**: No server-side processing or storage dependencies
3. **Browser Storage Strategy**: localStorage first, IndexedDB fallback for larger data
4. **Progressive Enhancement**: Check for feature availability and degrade gracefully

## Key Services Architecture
- **ContentService**: Loads and manages capability definitions from YAML/Markdown
- **AssessmentService**: Handles assessment logic and state management
- **StorageService**: Manages browser storage operations with fallback strategies
- **ExportService**: Generates PDF and CSV exports from assessment data

## Data Flow Pattern
1. Content Loading → Parse YAML/Markdown files at runtime
2. User Input → Assessment data captured through controlled forms
3. State Management → React Context maintains application state
4. Data Persistence → Assessment data saved to browser storage
5. Reporting → Visualization components render data from state
6. Export → PDF/CSV generated from application state

## Storage Schema
```typescript
interface AssessmentData {
  assessmentId: string;
  stateName: string;
  createdAt: string;
  updatedAt: string;
  status: 'in-progress' | 'completed';
  capabilities: {
    [capabilityId: string]: {
      id: string;
      name: string;
      dimensions: {
        outcome: MaturityDimension;
        role: MaturityDimension;
        businessProcess: MaturityDimension;
        information: MaturityDimension;
        technology: MaturityDimension;
      }
    }
  }
}
```

## Error Handling Strategy

### Comprehensive Error Handling System
The application implements a multi-layered error handling approach:

- **Error Boundaries**: React error boundaries catch JavaScript errors and provide recovery options
  - `ErrorBoundary`: General error boundary with retry functionality and user-friendly messages
  - `AssessmentErrorBoundary`: Specialized boundary for assessment workflow with data export capabilities

- **Storage Error Handling**: Dedicated handling for browser storage issues
  - `StorageErrorHandler`: Provides storage-specific error messages and recovery options
  - Automatic fallback from localStorage to IndexedDB
  - Data export functionality when storage fails

- **Error Categorization**: Systematic error classification for appropriate handling
  - Storage errors (quota, unavailable, corruption)
  - Network errors (connection issues, timeouts)
  - Validation errors (user input, data integrity)
  - Content errors (parsing, loading failures)

- **Recovery Mechanisms**:
  - **Retry Logic**: Automatic retry with exponential backoff for transient errors
  - **Data Preservation**: Export functionality to prevent data loss during errors
  - **Graceful Degradation**: Continue offline when storage is unavailable
  - **User Guidance**: Clear instructions for manual recovery steps

### Error Handling Components
- **useErrorHandler Hook**: Centralized error handling logic with categorization and retry functionality
- **StorageErrorHandler Component**: UI component for storage-specific error scenarios
- **AssessmentErrorBoundary Component**: Specialized error boundary for assessment workflow
- **Enhanced ErrorBoundary**: Improved general error boundary with recovery options

## Browser Compatibility
- Support modern browsers: Chrome, Firefox, Safari, Edge (latest 2 versions)
- Tablet support required, mobile optional
- Test storage mechanisms across all target browsers

#[[file:instructions/architecture.md]]