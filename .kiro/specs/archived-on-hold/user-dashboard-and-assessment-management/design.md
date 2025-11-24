# Design Document - User Dashboard and Assessment Management

## Overview

The User Dashboard and Assessment Management system provides a comprehensive interface for managing MITA assessments throughout their lifecycle. The system implements a card-based layout for assessment visualization, integrated progress tracking, and streamlined navigation between assessment activities, serving as the central hub for all assessment-related operations.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│            User Dashboard and Assessment Management         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │  Dashboard      │    │  Assessment     │                │
│  │  Controller     │    │  Manager        │                │
│  │                 │    │                 │                │
│  │ - View State    │◄──►│ - CRUD Ops      │                │
│  │ - Navigation    │    │ - Lifecycle     │                │
│  │ - Filtering     │    │ - Validation    │                │
│  └─────────────────┘    └─────────────────┘                │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │ Progress        │    │  Assessment     │                │
│  │ Calculator      │    │  Card System    │                │
│  │                 │    │                 │                │
│  │ - Completion    │◄──►│ - Card Layout   │                │
│  │   Tracking      │    │ - Quick Actions │                │
│  │ - Metrics       │    │ - Status Display│                │
│  └─────────────────┘    └─────────────────┘                │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │ Filter & Search │    │ Action Handler  │                │
│  │ System          │    │                 │                │
│  │                 │    │ - Create/Edit   │                │
│  │ - Status Filter │◄──►│ - Delete/Dup    │                │
│  │ - Date Range    │    │ - Export/Import │                │
│  │ - Text Search   │    │ - Navigation    │                │
│  └─────────────────┘    └─────────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Dashboard Initialization**: Load assessment summaries and initialize dashboard state
2. **Assessment Display**: Render assessment cards with progress indicators and metadata
3. **User Interactions**: Handle filtering, sorting, and action button clicks
4. **Assessment Operations**: Create, edit, delete, and duplicate assessments
5. **Progress Calculation**: Calculate and display completion metrics
6. **Navigation**: Route users to appropriate assessment workflows

## Components and Interfaces

### UserDashboard Component

Main dashboard component orchestrating assessment management:

```typescript
interface UserDashboardProps {
  initialFilter?: AssessmentFilter;
  initialSort?: SortOption;
}

interface UserDashboardState {
  assessments: AssessmentSummary[];
  filteredAssessments: AssessmentSummary[];
  loading: boolean;
  error: string | null;
  filter: AssessmentFilter;
  sort: SortOption;
  selectedAssessments: string[];
  showCreateModal: boolean;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  initialFilter,
  initialSort
}) => {
  // Component implementation
};
```

### Assessment Manager

Handles assessment CRUD operations and lifecycle management:

```typescript
class AssessmentManager {
  private storageService: EnhancedStorageService;
  private progressCalculator: ProgressCalculator;

  async createAssessment(config: AssessmentConfig): Promise<Assessment>
  async updateAssessment(id: string, updates: Partial<Assessment>): Promise<boolean>
  async deleteAssessment(id: string): Promise<boolean>
  async duplicateAssessment(id: string, newConfig: Partial<AssessmentConfig>): Promise<Assessment>
  async getAssessmentSummaries(): Promise<AssessmentSummary[]>
  async validateAssessmentConfig(config: AssessmentConfig): Promise<ValidationResult>
}

interface AssessmentConfig {
  stateName: string;
  systemName?: string;
  selectedDomains: string[];
  selectedAreas: string[];
  metadata?: AssessmentMetadata;
}
```

### Progress Calculator

Calculates and tracks assessment completion metrics:

```typescript
class ProgressCalculator {
  static calculateOverallProgress(assessment: Assessment): ProgressMetrics
  static calculateCapabilityProgress(capability: CapabilityAreaAssessment): number
  static calculateDimensionProgress(dimensions: Record<OrbitDimension, DimensionAssessment>): number
  static getNextRecommendedAction(assessment: Assessment): RecommendedAction
  static estimateTimeToCompletion(assessment: Assessment): TimeEstimate
}

interface ProgressMetrics {
  overallProgress: number; // 0-100
  completedCapabilities: number;
  totalCapabilities: number;
  completedDimensions: number;
  totalDimensions: number;
  lastUpdated: Date;
  estimatedCompletion?: Date;
}

interface RecommendedAction {
  type: 'continue' | 'review' | 'complete';
  description: string;
  targetUrl: string;
  priority: 'high' | 'medium' | 'low';
}
```

### Assessment Card System

Renders individual assessment cards with actions and status:

```typescript
interface AssessmentCardProps {
  assessment: AssessmentSummary;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onExport: (id: string) => void;
  onContinue: (id: string) => void;
  onViewResults: (id: string) => void;
}

interface AssessmentCardState {
  showActions: boolean;
  showDeleteConfirm: boolean;
  isLoading: boolean;
  error: string | null;
}

export const AssessmentCard: React.FC<AssessmentCardProps> = ({
  assessment,
  onEdit,
  onDelete,
  onDuplicate,
  onExport,
  onContinue,
  onViewResults
}) => {
  // Component implementation
};
```

## Data Models

### Assessment Summary

```typescript
interface AssessmentSummary {
  id: string;
  stateName: string;
  systemName?: string;
  status: AssessmentStatus;
  progress: ProgressMetrics;
  createdAt: string;
  updatedAt: string;
  domains: string[];
  areas: string[];
  metadata: {
    capabilityCount: number;
    completedCapabilities: number;
    lastActivity: string;
    estimatedTimeRemaining?: number;
  };
}

type AssessmentStatus = 'not-started' | 'in-progress' | 'completed' | 'archived';
```

### Filter and Sort Options

```typescript
interface AssessmentFilter {
  status?: AssessmentStatus[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  domains?: string[];
  searchText?: string;
  showArchived?: boolean;
}

interface SortOption {
  field: 'createdAt' | 'updatedAt' | 'stateName' | 'progress' | 'status';
  direction: 'asc' | 'desc';
}

interface FilterState {
  activeFilters: AssessmentFilter;
  availableFilters: {
    statuses: AssessmentStatus[];
    domains: string[];
    dateRanges: DateRangeOption[];
  };
  filterCount: number;
}
```

### Dashboard Configuration

```typescript
interface DashboardConfig {
  layout: 'grid' | 'list';
  cardsPerPage: number;
  defaultSort: SortOption;
  defaultFilter: AssessmentFilter;
  showWelcomeMessage: boolean;
  enableBulkActions: boolean;
  autoRefreshInterval?: number;
}

interface DashboardPreferences {
  userId?: string;
  config: DashboardConfig;
  recentFilters: AssessmentFilter[];
  favoriteAssessments: string[];
  lastVisited: Date;
}
```

## User Interface Design

### Dashboard Layout

```typescript
const DashboardLayout = {
  header: {
    title: 'Assessment Dashboard',
    subtitle: 'Manage your MITA assessments and track progress',
    actions: ['Create New Assessment', 'Import Assessment', 'Refresh']
  },
  toolbar: {
    search: 'Search assessments...',
    filters: ['Status', 'Date Range', 'Domains'],
    sort: ['Created Date', 'Updated Date', 'State Name', 'Progress'],
    view: ['Grid View', 'List View']
  },
  content: {
    emptyState: {
      title: 'No Assessments Yet',
      message: 'Create your first MITA assessment to get started',
      action: 'Create New Assessment'
    },
    assessmentGrid: {
      columns: 'responsive',
      cardSpacing: '1rem',
      pagination: true
    }
  }
};
```

### Assessment Card Design

```typescript
const AssessmentCardLayout = {
  header: {
    stateName: 'Primary heading',
    systemName: 'Secondary heading',
    status: 'Badge component'
  },
  body: {
    progress: {
      bar: 'Visual progress indicator',
      text: 'X of Y capabilities completed',
      percentage: 'XX% complete'
    },
    metadata: {
      domains: 'Comma-separated list',
      areas: 'Comma-separated list',
      lastUpdated: 'Relative time format'
    }
  },
  footer: {
    primaryAction: 'Continue Assessment | View Results',
    secondaryActions: ['Edit', 'Duplicate', 'Export', 'Delete']
  }
};
```

## Action Handlers

### Assessment Actions

```typescript
class AssessmentActionHandler {
  constructor(
    private assessmentManager: AssessmentManager,
    private router: NextRouter,
    private notificationService: NotificationService
  ) {}

  async handleCreateAssessment(config: AssessmentConfig): Promise<void> {
    try {
      const assessment = await this.assessmentManager.createAssessment(config);
      this.notificationService.success('Assessment created successfully');
      this.router.push(`/assessment/${assessment.id}/setup`);
    } catch (error) {
      this.notificationService.error('Failed to create assessment');
      throw error;
    }
  }

  async handleDeleteAssessment(id: string): Promise<void> {
    try {
      await this.assessmentManager.deleteAssessment(id);
      this.notificationService.success('Assessment deleted successfully');
      // Refresh dashboard
    } catch (error) {
      this.notificationService.error('Failed to delete assessment');
      throw error;
    }
  }

  async handleDuplicateAssessment(id: string, newConfig: Partial<AssessmentConfig>): Promise<void> {
    try {
      const duplicated = await this.assessmentManager.duplicateAssessment(id, newConfig);
      this.notificationService.success('Assessment duplicated successfully');
      this.router.push(`/assessment/${duplicated.id}/setup`);
    } catch (error) {
      this.notificationService.error('Failed to duplicate assessment');
      throw error;
    }
  }

  handleContinueAssessment(assessment: AssessmentSummary): void {
    const nextAction = ProgressCalculator.getNextRecommendedAction(assessment);
    this.router.push(nextAction.targetUrl);
  }

  handleViewResults(id: string): void {
    this.router.push(`/assessment/${id}/results`);
  }
}
```

### Bulk Actions

```typescript
class BulkActionHandler {
  async handleBulkDelete(assessmentIds: string[]): Promise<BulkActionResult> {
    const results = await Promise.allSettled(
      assessmentIds.map(id => this.assessmentManager.deleteAssessment(id))
    );
    
    return {
      successful: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length,
      errors: results
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .map(r => r.reason)
    };
  }

  async handleBulkExport(assessmentIds: string[], format: ExportFormat): Promise<void> {
    // Implementation for bulk export
  }

  async handleBulkArchive(assessmentIds: string[]): Promise<BulkActionResult> {
    // Implementation for bulk archive
  }
}
```

## Error Handling

### Dashboard Error States

```typescript
interface DashboardError {
  type: 'loading' | 'action' | 'network' | 'storage';
  message: string;
  recoverable: boolean;
  retryAction?: () => Promise<void>;
}

class DashboardErrorHandler {
  static handleLoadingError(error: Error): DashboardError {
    return {
      type: 'loading',
      message: 'Failed to load assessments. Please try again.',
      recoverable: true,
      retryAction: async () => {
        // Retry loading assessments
      }
    };
  }

  static handleActionError(action: string, error: Error): DashboardError {
    return {
      type: 'action',
      message: `Failed to ${action}. Please try again.`,
      recoverable: true,
      retryAction: async () => {
        // Retry the failed action
      }
    };
  }

  static handleStorageError(error: StorageError): DashboardError {
    return {
      type: 'storage',
      message: 'Storage error occurred. Your data may not be saved.',
      recoverable: false
    };
  }
}
```

## Testing Strategy

### Unit Tests

1. **Dashboard Component Tests**:
   - Test assessment loading and display
   - Validate filtering and sorting functionality
   - Test error states and recovery
   - Verify action button interactions

2. **Assessment Manager Tests**:
   - Test CRUD operations with various data scenarios
   - Validate assessment configuration and validation
   - Test progress calculation accuracy
   - Verify error handling for storage failures

3. **Progress Calculator Tests**:
   - Test progress calculation with different completion states
   - Validate recommended action logic
   - Test time estimation algorithms
   - Verify edge cases and incomplete data

### Integration Tests

1. **End-to-End Dashboard Workflow**:
   - Test complete assessment creation flow
   - Validate navigation between dashboard and assessment workflows
   - Test bulk operations and their effects
   - Verify data persistence across browser sessions

2. **Cross-Component Integration**:
   - Test dashboard integration with storage services
   - Validate assessment card interactions
   - Test filter and search functionality
   - Verify progress tracking accuracy

### Performance Tests

1. **Large Dataset Handling**:
   - Test dashboard performance with 100+ assessments
   - Measure filtering and sorting performance
   - Test pagination and virtual scrolling
   - Validate memory usage with large datasets

## Accessibility Considerations

### Dashboard Accessibility

```typescript
const AccessibilityConfig = {
  dashboard: {
    landmarks: {
      main: 'Assessment dashboard main content',
      navigation: 'Dashboard navigation and filters',
      complementary: 'Assessment actions and tools'
    },
    headings: {
      h1: 'Assessment Dashboard',
      h2: 'Assessment filters and search',
      h3: 'Individual assessment cards'
    }
  },
  assessmentCards: {
    ariaLabels: {
      card: 'Assessment for {stateName}, {status}, {progress}% complete',
      actions: 'Actions for {stateName} assessment',
      progress: '{progress}% complete, {completed} of {total} capabilities'
    },
    keyboardNavigation: {
      cardFocus: true,
      actionMenus: true,
      bulkSelection: true
    }
  }
};
```

### Screen Reader Support

- Provide comprehensive ARIA labels for all interactive elements
- Implement proper heading hierarchy for content structure
- Use live regions for dynamic content updates
- Ensure keyboard navigation follows logical tab order
- Provide alternative text for visual progress indicators

## Performance Optimizations

### Dashboard Performance

```typescript
const PerformanceOptimizations = {
  rendering: {
    virtualScrolling: 'For large assessment lists',
    lazyLoading: 'For assessment card images and metadata',
    memoization: 'For expensive calculations and renders',
    debouncing: 'For search and filter operations'
  },
  dataManagement: {
    pagination: 'Load assessments in chunks',
    caching: 'Cache assessment summaries',
    backgroundSync: 'Update data in background',
    compression: 'Compress large assessment data'
  }
};
```

### Memory Management

- Implement proper cleanup for event listeners and timers
- Use React.memo for expensive component renders
- Optimize assessment card rendering with virtualization
- Implement efficient state management for large datasets