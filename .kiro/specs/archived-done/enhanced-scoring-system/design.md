# Design Document

## Overview

The Enhanced Scoring System introduces a sophisticated partial credit scoring mechanism that leverages checkbox completion within maturity levels to provide more granular and accurate assessment scores. This system transforms the current binary maturity level selection into a nuanced scoring approach that better reflects the actual progress states have made within each maturity level.

The design builds upon the existing MITA assessment architecture, extending the current `DimensionAssessment` component, `AssessmentResults` component, and `AssessmentSidebar` component to support checkbox-based partial credit calculations while maintaining backward compatibility with existing assessments.

## Architecture

### Core Scoring Algorithm

The enhanced scoring system implements a two-part scoring mechanism:

1. **Base Score**: The selected maturity level (1-5) provides the integer portion of the score
2. **Partial Credit**: Checkbox completion within the selected level provides the decimal portion

**Formula**: `Final Score = Base Score + (Checked Boxes / Total Boxes in Level)`

**Example**: If a user selects Level 2 and completes 6 out of 8 checkboxes, their score becomes 2.75 (2 + 6/8).

### Data Model Extensions

The existing `DimensionAssessment` interface already includes a `checkboxes` field that stores checkbox states as key-value pairs. The enhanced system will leverage this existing structure:

```typescript
interface DimensionAssessment {
  maturityLevel: number;
  evidence: string;
  barriers: string;
  plans: string;
  notes: string;
  targetMaturityLevel?: number;
  lastUpdated: string;
  checkboxes?: Record<string, boolean>; // Existing field - no changes needed
}
```

The checkbox keys follow the pattern `level{N}-{index}` where N is the maturity level and index is the checkbox position within that level.

### Scoring Service Architecture

A new `ScoringService` will be created to centralize all scoring calculations:

```typescript
interface ScoringService {
  calculateDimensionScore(dimension: DimensionAssessment, checkboxItems: CheckboxItems): number;
  calculateCapabilityScore(capability: CapabilityAreaAssessment, definition: CapabilityDefinition): number;
  calculateOverallScore(assessment: Assessment, definitions: CapabilityDefinition[]): number;
  shouldPromptLevelAdvancement(dimension: DimensionAssessment, checkboxItems: CheckboxItems): boolean;
}
```

## Components and Interfaces

### Enhanced DimensionAssessment Component

The existing `DimensionAssessment` component will be enhanced with:

1. **Level Advancement Prompts**: When all checkboxes in a level are completed, display a message encouraging users to consider the next maturity level
2. **Real-time Score Display**: Show the current calculated score as users check/uncheck boxes
3. **Visual Progress Indicators**: Enhanced visual feedback showing completion progress within each level

**Key Changes**:
- Add score calculation logic using the new `ScoringService`
- Implement level advancement detection and messaging
- Add visual score indicators within maturity level cards
- Maintain existing checkbox functionality and styling

### Enhanced AssessmentResults Component

The results component will be updated to:

1. **Use Enhanced Scoring**: Replace the current simple maturity level scoring with partial credit calculations
2. **Expandable Detail Sections**: Add collapsible sections for each capability area showing detailed responses and checkbox selections
3. **Enhanced Score Display**: Show both base maturity level and partial credit earned

**Key Changes**:
- Update `calculateMaturityScores` function to use `ScoringService`
- Add expandable/collapsible sections for detailed capability views
- Display checkbox completion status in detailed views
- Update charts and visualizations to reflect partial credit scores

### Enhanced AssessmentSidebar Component

The sidebar will be enhanced to:

1. **Real-time Score Display**: Show calculated scores next to completion checkmarks for completed ORBIT dimensions
2. **Dynamic Score Updates**: Update scores in real-time as users make changes
3. **Enhanced Progress Indicators**: Maintain existing progress bars while adding score displays

**Key Changes**:
- Add score calculation and display logic
- Integrate with `ScoringService` for real-time updates
- Add score formatting (two decimal places)
- Maintain existing accessibility and navigation features

### Data Management Strategy

To address the challenge of data in unselected maturity levels:

1. **Data Preservation**: All data entered in any maturity level will be preserved in browser storage
2. **Scoring Isolation**: Only data from the currently selected maturity level will contribute to scoring
3. **Visual Indicators**: Provide clear visual cues about which data applies to the final assessment
4. **Export Clarity**: Ensure exported data clearly indicates which maturity level was selected and which data applies

## Data Models

### Enhanced Scoring Interfaces

```typescript
interface EnhancedMaturityScore {
  capabilityArea: string;
  domain: string;
  overallScore: number;
  baseScore: number;
  partialCredit: number;
  dimensionScores: Record<OrbitDimension, EnhancedDimensionScore>;
}

interface EnhancedDimensionScore {
  maturityLevel: number;
  partialCredit: number;
  finalScore: number;
  checkboxCompletion: {
    completed: number;
    total: number;
    percentage: number;
  };
}

interface CheckboxItems {
  level1?: string[];
  level2?: string[];
  level3?: string[];
  level4?: string[];
  level5?: string[];
}
```

### Field Label Updates

The maturity detail text fields will be updated with new labels:

```typescript
const FIELD_LABELS = {
  evidence: 'Supporting Attestation',
  barriers: 'Barriers and Challenges', 
  plans: 'Outcomes-Based Advancement Plans',
  notes: 'Additional Notes'
};
```

## Error Handling

### Scoring Calculation Errors

1. **Missing Checkbox Data**: If checkbox items are not available, fall back to base maturity level scoring
2. **Invalid Checkbox States**: Validate checkbox data and handle corrupted states gracefully
3. **Division by Zero**: Handle cases where no checkboxes exist for a maturity level

### Data Consistency Errors

1. **Orphaned Data**: Detect and handle data in unselected maturity levels
2. **Migration Issues**: Ensure backward compatibility with existing assessments that don't have checkbox data
3. **Storage Failures**: Maintain scoring functionality even if storage operations fail

## Testing Strategy

### Unit Testing

1. **ScoringService Tests**: Comprehensive tests for all scoring calculations including edge cases
2. **Component Tests**: Test enhanced components with various data states and user interactions
3. **Data Migration Tests**: Ensure existing assessments continue to work correctly

### Integration Testing

1. **End-to-End Scoring**: Test complete scoring workflow from checkbox selection to results display
2. **Real-time Updates**: Verify that sidebar scores update correctly as users make changes
3. **Export Functionality**: Test that exported data reflects enhanced scoring correctly

### Accessibility Testing

1. **Screen Reader Compatibility**: Ensure new scoring displays are accessible
2. **Keyboard Navigation**: Verify all new interactive elements support keyboard navigation
3. **ARIA Labels**: Test that score displays have appropriate ARIA labels and descriptions

## Performance Considerations

### Scoring Calculations

1. **Memoization**: Cache scoring calculations to avoid unnecessary recalculations
2. **Debounced Updates**: Debounce real-time score updates to prevent excessive calculations
3. **Lazy Loading**: Only calculate scores when needed for display

### Data Management

1. **Efficient Storage**: Optimize checkbox data storage to minimize browser storage usage
2. **Incremental Updates**: Update only changed data rather than full assessment objects
3. **Background Processing**: Perform complex calculations in background where possible

## Migration Strategy

### Backward Compatibility

1. **Existing Assessments**: All existing assessments will continue to work with base maturity level scoring
2. **Gradual Enhancement**: New checkbox data will be added as users interact with enhanced components
3. **Fallback Behavior**: If checkbox data is unavailable, system falls back to original scoring method

### Data Migration

1. **No Breaking Changes**: No changes to existing data structures
2. **Progressive Enhancement**: Enhanced features activate as checkbox data becomes available
3. **Version Tracking**: Track which assessments have enhanced scoring data for analytics

## Security Considerations

### Data Validation

1. **Input Sanitization**: Validate all checkbox states and scoring inputs
2. **Range Checking**: Ensure calculated scores fall within expected ranges (0-5)
3. **Type Safety**: Use TypeScript to prevent type-related scoring errors

### Storage Security

1. **Data Integrity**: Validate stored checkbox data on load
2. **Corruption Handling**: Detect and handle corrupted checkbox data gracefully
3. **Privacy**: Ensure no sensitive data is exposed in scoring calculations