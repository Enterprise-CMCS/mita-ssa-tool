# Assessment Header and Sidebar Integration Guide

This guide provides comprehensive information on integrating and using the new AssessmentHeader and AssessmentSidebar components in the MITA State Self-Assessment Tool.

## Overview

The header and sidebar components work together to provide a modern, accessible navigation experience for assessment workflows. They implement industry-standard navigation patterns with comprehensive responsive design and accessibility features.

## Component Architecture

### AssessmentHeader Component

The `AssessmentHeader` component provides a sticky header with the following features:

- **Development Banner**: Prototype status with feedback links
- **Navigation Controls**: Dashboard return and sidebar toggle
- **Assessment Context**: Title, system name, and current step display
- **Progress Tracking**: Completion percentage and step counters
- **Save Status**: Real-time auto-save indicators
- **Keyboard Shortcuts**: Alt+D (dashboard), Alt+S (sidebar toggle)

### AssessmentSidebar Component

The `AssessmentSidebar` component provides collapsible navigation with:

- **Capability Organization**: Expandable sections by capability area
- **Progress Indicators**: Visual completion tracking per capability
- **Direct Navigation**: Jump to any assessment step
- **Mobile Overlay**: Full-screen navigation on mobile devices
- **Status Icons**: Visual indicators for step completion status
- **Touch Gestures**: Swipe-to-close on mobile devices

## Integration Example

```typescript
import React, { useState, useCallback } from 'react';
import AssessmentHeader from '../components/assessment/AssessmentHeader';
import AssessmentSidebar from '../components/assessment/AssessmentSidebar';

interface GuidedAssessmentProps {
  assessment: Assessment;
  capabilities: CapabilityDefinition[];
  steps: AssessmentStep[];
}

const GuidedAssessment: React.FC<GuidedAssessmentProps> = ({
  assessment,
  capabilities,
  steps
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Calculate progress
  const completionPercentage = calculateCompletionPercentage(assessment);
  const currentStep = steps[currentStepIndex];

  // Navigation handlers
  const handleNavigateToStep = useCallback((stepIndex: number) => {
    setCurrentStepIndex(stepIndex);
    setMobileSidebarOpen(false); // Close mobile sidebar after navigation
  }, []);

  const handleToggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  const handleMobileSidebarToggle = useCallback(() => {
    setMobileSidebarOpen(prev => !prev);
  }, []);

  return (
    <div className="guided-assessment">
      <AssessmentHeader
        assessmentName={assessment.stateName}
        systemName={assessment.systemName}
        currentStep={getCurrentStepDescription(currentStep)}
        onOpenSidebar={handleMobileSidebarToggle}
        showSidebarToggle={true}
        saving={saving}
        lastSaved={lastSaved}
        completionPercentage={completionPercentage}
        currentStepIndex={currentStepIndex}
        totalSteps={steps.length}
      />

      <AssessmentSidebar
        assessment={assessment}
        capabilities={capabilities}
        steps={steps}
        currentStepIndex={currentStepIndex}
        onNavigateToStep={handleNavigateToStep}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
        isMobileOpen={mobileSidebarOpen}
        onMobileToggle={handleMobileSidebarToggle}
      />

      <main className={`assessment-main-content ${
        sidebarCollapsed 
          ? 'assessment-main-content--sidebar-collapsed' 
          : 'assessment-main-content--sidebar-expanded'
      }`}>
        {/* Assessment content */}
      </main>
    </div>
  );
};
```

## CSS Integration

Include the sidebar CSS file in your application:

```typescript
// In your main CSS file or component
import '../styles/assessment-sidebar.css';
```

The CSS provides:
- Responsive breakpoints for desktop, tablet, and mobile
- CSS custom properties for consistent theming
- Accessibility features (high contrast, reduced motion)
- Touch-friendly controls with proper target sizes

## Accessibility Features

### Keyboard Navigation

- **Tab Navigation**: Logical tab order through all interactive elements
- **Arrow Keys**: Navigate between sidebar items when focused
- **Enter/Space**: Activate buttons and navigation items
- **Escape**: Close mobile sidebar overlay
- **Alt+D**: Navigate to dashboard from anywhere
- **Alt+S**: Toggle sidebar visibility
- **Alt+R**: Open assessment results in new window

### Screen Reader Support

- **ARIA Labels**: Descriptive labels for all interactive elements
- **ARIA Roles**: Proper semantic roles (navigation, progressbar, button)
- **ARIA States**: Current step indication with `aria-current="step"`
- **Live Regions**: Progress updates announced to screen readers
- **Landmark Navigation**: Proper heading hierarchy and navigation landmarks

### Visual Accessibility

- **High Contrast**: Support for high contrast mode preferences
- **Reduced Motion**: Respects user motion preferences
- **Focus Indicators**: Clear focus outlines for keyboard navigation
- **Color Contrast**: WCAG 2.1 AA compliant color combinations
- **Touch Targets**: Minimum 44px touch targets on mobile devices

## Responsive Design

### Desktop (>1024px)
- Full sidebar width (320px) with collapse functionality
- Hover effects and smooth transitions
- Keyboard shortcuts fully enabled
- Content area adjusts for sidebar width

### Tablet (769-1024px)
- Slightly narrower sidebar (300px)
- Touch-friendly controls
- Maintained collapse functionality
- Optimized spacing and typography

### Mobile (≤768px)
- Sidebar transforms to full-screen overlay
- Backdrop with blur effect
- Swipe gestures for closing
- Larger touch targets (48px minimum)
- Simplified navigation patterns

## State Management

### Sidebar State
```typescript
interface SidebarState {
  isCollapsed: boolean;        // Desktop collapse state
  isMobileOpen: boolean;       // Mobile overlay visibility
  expandedCapabilities: Set<string>; // Which capability sections are expanded
}
```

### Progress Tracking
```typescript
interface ProgressState {
  currentStepIndex: number;    // Current step in assessment
  completionPercentage: number; // Overall completion (0-100)
  saving: boolean;             // Auto-save in progress
  lastSaved: Date | null;      // Last successful save timestamp
}
```

## Performance Considerations

### React Optimization
- Components use `React.memo` to prevent unnecessary re-renders
- Event handlers wrapped with `useCallback` for stable references
- Progress calculations memoized with `useMemo`
- Efficient state updates with functional updates

### CSS Performance
- CSS custom properties for consistent theming
- Efficient selectors to minimize reflow/repaint
- Hardware-accelerated transforms for animations
- Minimal DOM manipulation through CSS-only interactions

## Error Handling

### Navigation Errors
```typescript
const handleNavigationError = (error: Error, fallbackAction: () => void) => {
  console.error('Navigation failed:', error);
  // Attempt fallback navigation
  try {
    fallbackAction();
  } catch (fallbackError) {
    console.error('Fallback navigation also failed:', fallbackError);
    // Show user-friendly error message
  }
};
```

### Touch Gesture Errors
```typescript
const handleTouchError = (error: Error) => {
  console.warn('Touch gesture error:', error);
  // Gracefully degrade to button-based navigation
};
```

## Testing Considerations

### Unit Testing
- Test all prop combinations and edge cases
- Mock touch events for gesture testing
- Test keyboard navigation with simulated key events
- Verify accessibility attributes and ARIA states

### Integration Testing
- Test header and sidebar integration with parent components
- Verify responsive behavior across breakpoints
- Test navigation flow and state synchronization
- Validate auto-save functionality with progress updates

### Accessibility Testing
- Automated testing with axe-core or similar tools
- Manual keyboard navigation testing
- Screen reader testing with NVDA, JAWS, or VoiceOver
- Color contrast validation
- Reduced motion and high contrast mode testing

## Customization Options

### Theming
Customize appearance through CSS custom properties:

```css
:root {
  --sidebar-width: 320px;
  --sidebar-bg: #f8f9fa;
  --sidebar-text: #495057;
  --sidebar-current-border: #0071bc;
  --sidebar-completed-color: #28a745;
  /* ... additional properties */
}
```

### Responsive Breakpoints
Modify breakpoints for different screen size requirements:

```css
/* Custom tablet breakpoint */
@media (max-width: 1200px) and (min-width: 769px) {
  :root {
    --sidebar-width: 280px;
  }
}
```

## Troubleshooting

### Common Issues

1. **Sidebar not responding to toggle**
   - Verify `onToggleCollapse` callback is provided
   - Check for JavaScript errors in console
   - Ensure CSS is properly loaded

2. **Mobile overlay not closing**
   - Verify `onMobileToggle` callback is provided
   - Check touch event listeners are properly attached
   - Ensure backdrop click handler is working

3. **Progress not updating**
   - Verify assessment data structure matches expected format
   - Check progress calculation logic
   - Ensure state updates are triggering re-renders

4. **Keyboard shortcuts not working**
   - Check for event listener conflicts
   - Verify keyboard event handlers are properly attached
   - Ensure focus is not trapped in other elements

### Debug Mode
Enable debug logging for troubleshooting:

```typescript
const DEBUG_NAVIGATION = process.env.NODE_ENV === 'development';

if (DEBUG_NAVIGATION) {
  console.log('Navigation state:', {
    currentStepIndex,
    sidebarCollapsed,
    mobileSidebarOpen,
    completionPercentage
  });
}
```

This integration guide provides comprehensive information for implementing and customizing the header and sidebar components in your assessment workflow.