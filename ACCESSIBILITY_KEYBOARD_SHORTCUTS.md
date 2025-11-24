# Accessibility Features and Keyboard Shortcuts Guide

This document provides comprehensive information about the accessibility features and keyboard shortcuts implemented in the MITA State Self-Assessment Tool's header and sidebar components.

## Overview

The assessment navigation components are designed to meet WCAG 2.1 AA accessibility standards and provide an inclusive experience for all users, including those who rely on assistive technologies.

## Keyboard Shortcuts

### Global Shortcuts (Available Throughout Assessment)

| Shortcut | Action | Context |
|----------|--------|---------|
| `Alt + D` | Navigate to Dashboard | Available from any assessment page |
| `Alt + S` | Toggle Sidebar Visibility | Desktop: collapse/expand, Mobile: open/close overlay |
| `Alt + R` | Open Assessment Results | Opens results in new window/tab |
| `Escape` | Close Mobile Sidebar | Only active when mobile sidebar overlay is open |

### Navigation Shortcuts

| Key | Action | Context |
|-----|--------|---------|
| `Tab` | Move to next interactive element | Standard tab navigation |
| `Shift + Tab` | Move to previous interactive element | Reverse tab navigation |
| `Enter` | Activate focused element | Buttons, links, navigation items |
| `Space` | Activate focused element | Alternative to Enter for buttons |
| `Arrow Keys` | Navigate within sidebar sections | When focused on capability headers or steps |

### Usage Examples

```typescript
// Example: Implementing keyboard shortcuts in a component
React.useEffect(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    // Alt + S to toggle sidebar
    if (event.altKey && event.key === 's' && onOpenSidebar) {
      event.preventDefault();
      onOpenSidebar();
    }
    
    // Alt + D to go to dashboard
    if (event.altKey && event.key === 'd') {
      event.preventDefault();
      router.push('/dashboard');
    }
    
    // Escape to close mobile sidebar
    if (event.key === 'Escape' && isMobileOpen && onMobileToggle) {
      event.preventDefault();
      onMobileToggle();
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [onOpenSidebar, router, isMobileOpen, onMobileToggle]);
```

## WCAG 2.1 AA Compliance Features

### 1. Perceivable

#### Color and Contrast
- **High Contrast Support**: Automatic detection and support for high contrast mode
- **Color Contrast Ratios**: All text meets WCAG AA standards (4.5:1 for normal text, 3:1 for large text)
- **Color Independence**: Information is not conveyed through color alone

```css
/* High contrast mode support */
@media (prefers-contrast: high) {
  :root {
    --sidebar-border: #000000;
    --sidebar-current-border: #000000;
  }
  
  .assessment-sidebar__step-button--current {
    border-right: 4px solid var(--sidebar-current-border);
    background: #000000;
    color: #ffffff;
  }
}
```

#### Visual Design
- **Focus Indicators**: Clear, visible focus outlines for all interactive elements
- **Text Scaling**: Supports up to 200% zoom without horizontal scrolling
- **Responsive Text**: Text remains readable at all viewport sizes

### 2. Operable

#### Keyboard Navigation
- **Full Keyboard Access**: All functionality available via keyboard
- **Logical Tab Order**: Sequential navigation follows visual layout
- **Focus Management**: Proper focus handling during state changes
- **No Keyboard Traps**: Users can navigate away from any element

```typescript
// Example: Focus management during navigation
const handleStepNavigation = useCallback((stepIndex: number) => {
  onNavigateToStep(stepIndex);
  
  // Manage focus for screen readers
  const newStepElement = document.querySelector(`[data-step="${stepIndex}"]`);
  if (newStepElement) {
    newStepElement.focus();
  }
}, [onNavigateToStep]);
```

#### Touch and Gesture Support
- **Touch Target Size**: Minimum 44px (mobile: 48px) for all interactive elements
- **Touch Gestures**: Swipe-to-close on mobile with fallback button controls
- **Gesture Alternatives**: All gesture-based actions have button alternatives

### 3. Understandable

#### Clear Navigation
- **Consistent Layout**: Navigation patterns remain consistent across pages
- **Clear Labels**: Descriptive text for all interactive elements
- **Status Indicators**: Clear visual and textual status information
- **Error Prevention**: Validation and confirmation for destructive actions

#### Language and Instructions
- **Plain Language**: Clear, concise instructions and labels
- **Context Information**: Current location and progress clearly indicated
- **Help Text**: Tooltips and descriptions for complex interactions

### 4. Robust

#### Assistive Technology Support
- **Screen Reader Compatibility**: Tested with NVDA, JAWS, and VoiceOver
- **Semantic HTML**: Proper use of HTML5 semantic elements
- **ARIA Implementation**: Comprehensive ARIA labels, roles, and states
- **Progressive Enhancement**: Core functionality works without JavaScript

## ARIA Implementation

### Roles and Landmarks

```html
<!-- Navigation landmark -->
<nav className="assessment-sidebar__nav" aria-label="Assessment sections">
  
<!-- Progress indicators -->
<div 
  className="assessment-sidebar__progress-bar"
  role="progressbar"
  aria-valuenow={progress}
  aria-valuemin={0}
  aria-valuemax={100}
  aria-label={`${progress}% complete`}
>

<!-- Current step indication -->
<button
  aria-current={currentStepIndex === stepIndex ? 'step' : undefined}
  aria-label={`${stepName} - ${status} - Navigate to step ${stepIndex + 1}`}
>
```

### Live Regions

```typescript
// Screen reader announcements for progress updates
const announceProgress = useCallback((message: string) => {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}, []);

// Usage
React.useEffect(() => {
  if (completionPercentage !== previousPercentage) {
    announceProgress(`Assessment progress updated: ${completionPercentage}% complete`);
  }
}, [completionPercentage, previousPercentage, announceProgress]);
```

### State Management

```typescript
// ARIA state updates
const updateAriaStates = useCallback(() => {
  // Update expanded states
  document.querySelectorAll('[aria-expanded]').forEach(element => {
    const capabilityId = element.getAttribute('data-capability-id');
    if (capabilityId) {
      const isExpanded = expandedCapabilities.has(capabilityId);
      element.setAttribute('aria-expanded', isExpanded.toString());
    }
  });
  
  // Update current step
  document.querySelectorAll('[aria-current="step"]').forEach(element => {
    element.removeAttribute('aria-current');
  });
  
  const currentElement = document.querySelector(`[data-step="${currentStepIndex}"]`);
  if (currentElement) {
    currentElement.setAttribute('aria-current', 'step');
  }
}, [expandedCapabilities, currentStepIndex]);
```

## Screen Reader Support

### Announcement Patterns

```typescript
// Progress announcements
const announceStepChange = (stepName: string, stepNumber: number, totalSteps: number) => {
  return `Navigated to ${stepName}, step ${stepNumber} of ${totalSteps}`;
};

// Status announcements
const announceSaveStatus = (status: 'saving' | 'saved' | 'error', timestamp?: Date) => {
  switch (status) {
    case 'saving':
      return 'Assessment is being saved';
    case 'saved':
      return `Assessment saved at ${timestamp?.toLocaleTimeString()}`;
    case 'error':
      return 'Error saving assessment. Please try again.';
  }
};

// Progress announcements
const announceProgressUpdate = (percentage: number, capabilityName?: string) => {
  if (capabilityName) {
    return `${capabilityName} progress updated: ${percentage}% complete`;
  }
  return `Overall assessment progress: ${percentage}% complete`;
};
```

### Screen Reader Testing

#### NVDA (Windows)
- Navigate with Tab and Arrow keys
- Use NVDA+Space to activate elements
- Listen for progress announcements
- Test table navigation mode

#### JAWS (Windows)
- Use virtual cursor for navigation
- Test quick navigation keys (H for headings, B for buttons)
- Verify form mode activation
- Test list navigation

#### VoiceOver (macOS/iOS)
- Use VO+Arrow keys for navigation
- Test rotor navigation
- Verify gesture support on iOS
- Test with reduced motion enabled

## User Preference Support

### Reduced Motion

```css
/* Respect user motion preferences */
@media (prefers-reduced-motion: reduce) {
  :root {
    --sidebar-transition: none;
    --sidebar-hover-transition: none;
  }
  
  .assessment-sidebar,
  .assessment-sidebar__step-button,
  .assessment-sidebar__progress-fill {
    transition: none !important;
    transform: none !important;
    animation: none !important;
  }
}
```



### Font Size and Scaling

```css
/* Support for user font size preferences */
.assessment-sidebar {
  font-size: 1rem; /* Scales with user preferences */
}

/* Ensure touch targets scale appropriately */
.assessment-sidebar__step-button {
  min-height: max(var(--touch-target-min), 2.75em);
}
```

## Testing Procedures

### Automated Testing

```typescript
// Example accessibility test
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('AssessmentSidebar has no accessibility violations', async () => {
  const { container } = render(
    <AssessmentSidebar
      assessment={mockAssessment}
      capabilities={mockCapabilities}
      steps={mockSteps}
      currentStepIndex={0}
      onNavigateToStep={jest.fn()}
      isCollapsed={false}
      onToggleCollapse={jest.fn()}
    />
  );
  
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### Manual Testing Checklist

#### Keyboard Navigation
- [ ] Tab through all interactive elements in logical order
- [ ] All elements reachable via keyboard
- [ ] Focus indicators clearly visible
- [ ] No keyboard traps
- [ ] Shortcuts work as expected

#### Screen Reader Testing
- [ ] All content announced appropriately
- [ ] Navigation landmarks work correctly
- [ ] Progress updates announced
- [ ] Status changes communicated
- [ ] Form controls properly labeled

#### Visual Testing
- [ ] High contrast mode works correctly
- [ ] Text remains readable at 200% zoom
- [ ] Focus indicators visible in all themes
- [ ] Color contrast meets WCAG standards
- [ ] Layout remains functional at all sizes

#### Motor Accessibility
- [ ] Touch targets meet minimum size requirements
- [ ] Hover states don't interfere with touch
- [ ] Gestures have alternative methods
- [ ] No fine motor control required

## Implementation Guidelines

### Development Checklist

1. **Semantic HTML**
   - Use appropriate HTML elements (`nav`, `button`, `ul`, `li`)
   - Include proper heading hierarchy
   - Implement landmark roles

2. **ARIA Implementation**
   - Add descriptive labels for all interactive elements
   - Use appropriate roles and states
   - Implement live regions for dynamic content

3. **Keyboard Support**
   - Ensure all functionality available via keyboard
   - Implement logical tab order
   - Add keyboard shortcuts for efficiency

4. **Visual Design**
   - Meet color contrast requirements
   - Provide clear focus indicators
   - Support user preferences (reduced motion)

5. **Testing**
   - Run automated accessibility tests
   - Test with actual screen readers
   - Validate keyboard navigation
   - Check responsive behavior

### Code Review Guidelines

When reviewing accessibility implementations:

1. **Check ARIA Usage**
   - Verify appropriate roles and properties
   - Ensure labels are descriptive and unique
   - Validate state management

2. **Test Keyboard Navigation**
   - Tab through all interactive elements
   - Verify shortcuts work correctly
   - Check for keyboard traps

3. **Validate Semantic Structure**
   - Ensure proper heading hierarchy
   - Check landmark usage
   - Verify list structures

4. **Review Visual Design**
   - Check color contrast ratios
   - Verify focus indicator visibility
   - Test responsive behavior

This comprehensive accessibility guide ensures that the header and sidebar components provide an inclusive experience for all users, regardless of their abilities or the assistive technologies they use.