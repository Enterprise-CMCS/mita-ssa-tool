# Design Document

## Overview

This design outlines the approach to simplify the MITA State Self-Assessment Tool's UI by standardizing on light mode only and removing all dark mode complexity. The current codebase has some dark mode CSS rules that add unnecessary complexity for the MVP. This design will establish a clean, consistent light mode experience while ensuring accessibility compliance and maintainability.

## Architecture

### Current State Analysis

Based on code analysis, the current theming architecture includes:

1. **Primary Styling Files:**
   - `src/styles/theme.ts` - TypeScript theme configuration with CMS Design System colors
   - `src/styles/globals.css` - Global CSS variables and base styles
   - `src/styles/cms-design-system.css` - CMS Design System component styles
   - `src/styles/responsive.css` - Responsive design with some dark mode rules
   - `src/styles/assessment-sidebar.css` - Sidebar-specific styles with dark mode support

2. **Dark Mode Issues Identified:**
   - `responsive.css` contains `@media (prefers-color-scheme: dark)` rules
   - `assessment-sidebar.css` has extensive dark mode styling
   - Potential inconsistencies between different styling approaches

3. **Positive Aspects:**
   - Already using CMS Design System as foundation
   - Consistent CSS custom properties in globals.css
   - Good accessibility features (focus states, skip links)

### Target Architecture

The simplified architecture will maintain the same file structure but with consolidated light mode styling:

```
src/styles/
├── theme.ts              # TypeScript theme constants (light mode only)
├── globals.css           # Global variables and base styles
├── cms-design-system.css # CMS Design System (unchanged)
├── responsive.css        # Responsive design (dark mode removed)
├── assessment-sidebar.css # Sidebar styles (light mode only)
└── [component].module.css # Component-specific styles
```

## Components and Interfaces

### Color System Consolidation

**Primary Color Palette (Light Mode Only):**
```typescript
colors: {
  // CMS Design System Primary Colors
  primary: '#0071bc',           // CMS primary blue
  primaryDarker: '#205493',     // Hover states
  primaryDarkest: '#112e51',    // Active states
  
  // Secondary Colors
  secondary: '#02bfe7',         // CMS secondary blue
  secondaryDarker: '#00a6d2',   
  secondaryDarkest: '#046b99',  
  
  // Neutral Colors
  base: '#212121',              // Primary text
  muted: '#5b616b',             // Secondary text
  
  // Background Colors
  background: '#f1f1f1',        // Light gray background
  backgroundDark: '#d6d7d9',    // Darker gray background
  white: '#ffffff',             // Pure white
  
  // Status Colors
  success: '#2e8540',           // Green
  warning: '#fdb81e',           // Yellow
  error: '#e31c3d',             // Red
  
  // Interactive Colors
  focus: '#3e94cf',             // Focus indicator
  border: '#dcdee0',            // Default borders
}
```

**CSS Custom Properties (Consolidated):**
```css
:root {
  /* Primary Colors */
  --primary-color: #0071bc;
  --primary-hover: #205493;
  --primary-active: #112e51;
  
  /* Text Colors */
  --text-primary: #212121;
  --text-secondary: #5b616b;
  --text-muted: #6c757d;
  
  /* Background Colors */
  --bg-primary: #ffffff;
  --bg-secondary: #f8f9fa;
  --bg-tertiary: #f1f1f1;
  
  /* Border Colors */
  --border-primary: #dcdee0;
  --border-secondary: #dee2e6;
  
  /* Status Colors */
  --color-success: #2e8540;
  --color-warning: #fdb81e;
  --color-error: #e31c3d;
  --color-info: #02bfe7;
  
  /* Interactive States */
  --focus-color: #3e94cf;
  --focus-outline: 2px solid var(--focus-color);
  --focus-offset: 2px;
}
```

### Component Styling Standards

**Button Components:**
- Use consistent padding, border-radius, and transition timing
- Maintain WCAG AA contrast ratios (4.5:1 minimum)
- Ensure 44px minimum touch target size
- Provide clear focus indicators

**Form Elements:**
- Consistent border styling and focus states
- Proper label association and error messaging
- Accessible color contrast for all states

**Cards and Containers:**
- Consistent border-radius (4px standard)
- Subtle box-shadows for depth
- Proper spacing using design system tokens

**Navigation Elements:**
- Clear visual hierarchy
- Consistent hover and active states
- Proper ARIA attributes for accessibility

## Data Models

### Theme Configuration Interface

```typescript
interface ThemeConfig {
  colors: {
    primary: string;
    primaryDarker: string;
    primaryDarkest: string;
    secondary: string;
    secondaryDarker: string;
    secondaryDarkest: string;
    base: string;
    muted: string;
    background: string;
    backgroundDark: string;
    success: string;
    warning: string;
    error: string;
    focus: string;
    white: string;
    black: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    xxl: string;
  };
  breakpoints: {
    mobile: string;
    tablet: string;
    desktop: string;
    widescreen: string;
  };
  typography: {
    fontFamily: string;
    fontSize: {
      small: string;
      base: string;
      large: string;
      heading: {
        h1: string;
        h2: string;
        h3: string;
        h4: string;
      };
    };
  };
}
```

### CSS Variable Structure

```typescript
interface CSSVariables {
  // Color variables
  '--primary-color': string;
  '--text-primary': string;
  '--bg-primary': string;
  '--border-primary': string;
  
  // Spacing variables
  '--spacing-xs': string;
  '--spacing-sm': string;
  '--spacing-md': string;
  '--spacing-lg': string;
  
  // Typography variables
  '--font-family': string;
  '--font-size-base': string;
  '--line-height-base': string;
  
  // Interactive variables
  '--focus-color': string;
  '--transition-base': string;
}
```

## Error Handling

### Contrast Ratio Validation

**Automated Contrast Checking:**
- Implement contrast ratio validation for all color combinations
- Ensure minimum 4.5:1 ratio for normal text
- Ensure minimum 3:1 ratio for large text (18pt+ or 14pt+ bold)
- Validate interactive element contrast ratios

**Fallback Strategies:**
- Provide high contrast alternatives for borderline cases
- Use text shadows or outlines when background contrast is insufficient
- Implement proper focus indicators that work on all backgrounds

### Browser Compatibility

**CSS Custom Property Fallbacks:**
```css
.component {
  background-color: #ffffff; /* Fallback */
  background-color: var(--bg-primary, #ffffff);
}
```

**Progressive Enhancement:**
- Ensure base functionality works without CSS custom properties
- Provide fallback colors for older browsers
- Test across target browsers (Chrome, Firefox, Safari, Edge)

## Testing Strategy

### Accessibility Testing

**Automated Testing:**
- Use axe-core for automated accessibility testing
- Implement contrast ratio checking in CI/CD pipeline
- Validate ARIA attributes and semantic HTML

**Manual Testing:**
- Screen reader testing (NVDA, JAWS, VoiceOver)
- Keyboard navigation testing
- High contrast mode testing
- Color blindness simulation testing

### Visual Regression Testing

**Component Testing:**
- Screenshot testing for all UI components
- Cross-browser visual consistency testing
- Responsive design validation across breakpoints

**Integration Testing:**
- Full page screenshot comparisons
- User flow visual validation
- Print stylesheet testing

### Performance Testing

**CSS Performance:**
- Measure CSS bundle size impact
- Validate CSS loading performance
- Test for unused CSS elimination

**Runtime Performance:**
- Measure paint and layout performance
- Validate smooth animations and transitions
- Test on lower-end devices

### Browser Testing Matrix

**Primary Browsers (Must Support):**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Secondary Browsers (Should Support):**
- Chrome 85-89
- Firefox 83-87
- Safari 13+
- Edge 85-89

**Mobile Testing:**
- iOS Safari 14+
- Chrome Mobile 90+
- Samsung Internet 14+

### Contrast Ratio Requirements

**WCAG 2.1 AA Compliance:**
- Normal text: 4.5:1 minimum contrast ratio
- Large text (18pt+ or 14pt+ bold): 3:1 minimum contrast ratio
- Interactive elements: 3:1 minimum contrast ratio
- Focus indicators: 3:1 minimum contrast ratio against adjacent colors

**Testing Tools:**
- WebAIM Contrast Checker
- Colour Contrast Analyser
- axe DevTools browser extension
- Lighthouse accessibility audit

### Implementation Validation

**Code Quality:**
- ESLint rules for consistent CSS-in-JS usage
- Prettier formatting for CSS files
- TypeScript type checking for theme objects

**Documentation:**
- Style guide with color palette examples
- Component usage examples
- Accessibility implementation notes
- Browser support documentation