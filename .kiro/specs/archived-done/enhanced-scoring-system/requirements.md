# Requirements Document

## Introduction

This feature enhances the MITA State Self-Assessment Tool's scoring system to provide more granular and accurate maturity assessments. The enhancement introduces partial credit scoring based on checkbox completion, improved results visualization, real-time sidebar scoring indicators, better data management for unselected maturity levels, and clearer field labeling. These improvements will help state Medicaid agencies get more precise assessments of their system maturity and better understand their progress within each capability area.

## Requirements

### Requirement 1: Partial Credit Scoring System

**User Story:** As a state assessment coordinator, I want checkbox completion to contribute partial credit to my maturity scores, so that I can receive more accurate and granular scoring that reflects my actual progress within each maturity level.

#### Acceptance Criteria

1. WHEN a user selects a maturity level (e.g., "Level 2: Compliant") THEN the system SHALL establish the base score as that level number (e.g., 2.0)
2. WHEN a user checks checkboxes within the selected maturity level THEN the system SHALL calculate partial credit as (checked_boxes / total_boxes) and add this as a decimal to the base score
3. WHEN a user has checked 6 out of 8 boxes in Level 2 THEN the system SHALL calculate the score as 2.75 (2 + 6/8)
4. WHEN a user checks all boxes within a maturity level THEN the system SHALL display a message prompting them to consider selecting the next higher maturity level
5. WHEN a user selects a higher maturity level after completing all boxes THEN the system SHALL maintain any relevant checkboxes from the previous level and allow selection of new checkboxes

### Requirement 2: Enhanced Results Page with Detailed Scoring

**User Story:** As a state assessment coordinator, I want the results page to show detailed scoring based on checkbox completion and allow me to view the details of each section, so that I can understand how my scores were calculated and review my assessment responses.

#### Acceptance Criteria

1. WHEN the results page calculates scores THEN the system SHALL incorporate checkbox-based partial credit into all score calculations
2. WHEN displaying results THEN the system SHALL show both the base maturity level selected and the partial credit earned from checkboxes
3. WHEN a user views the results page THEN the system SHALL provide expandable/collapsible sections for each capability area
4. WHEN a section is expanded THEN the system SHALL display the written content from all maturity detail text boxes and show which checkboxes were selected
5. WHEN a section is collapsed THEN the system SHALL show only the summary score and capability name
6. WHEN displaying detailed results THEN the system SHALL clearly indicate which maturity level was selected and which checkboxes contributed to the partial credit

### Requirement 3: Real-time Sidebar Scoring Indicators

**User Story:** As a state assessment coordinator, I want to see current scores for completed ORBIT dimensions in the sidebar, so that I can track my progress and understand my current assessment status at a glance.

#### Acceptance Criteria

1. WHEN an ORBIT dimension is marked as complete THEN the system SHALL display a numerical score indicator next to the completion checkmark
2. WHEN calculating sidebar scores THEN the system SHALL use the same partial credit calculation as the main scoring system
3. WHEN a user makes changes to checkboxes or maturity level selections THEN the sidebar score SHALL update in real-time
4. WHEN displaying sidebar scores THEN the system SHALL format scores to two decimal places (e.g., "2.75")
5. WHEN an ORBIT dimension is incomplete THEN the system SHALL not display a score indicator

### Requirement 4: Data Management for Unselected Maturity Levels

**User Story:** As a state assessment coordinator, I want the system to handle data I've entered for maturity levels that aren't currently selected, so that I don't lose work when switching between maturity levels and can understand what data applies to my final assessment.

#### Acceptance Criteria

1. WHEN a user enters data in maturity detail text boxes for any maturity level THEN the system SHALL preserve this data even if the maturity level is not selected
2. WHEN calculating scores THEN the system SHALL only consider checkboxes and data from the currently selected maturity level
3. WHEN displaying results THEN the system SHALL only show data and checkboxes from the selected maturity level for each capability
4. WHEN a user switches maturity levels THEN the system SHALL preserve previously entered data and allow the user to return to it
5. WHEN exporting assessment data THEN the system SHALL include a clear indication of which maturity level was selected and which data applies to the final assessment
6. WHEN a user has data in multiple maturity levels THEN the system SHALL provide a visual indicator or warning about unselected data that won't be included in scoring

### Requirement 5: Improved Field Labeling

**User Story:** As a state assessment coordinator, I want clearer and more descriptive labels for the maturity detail text boxes, so that I understand exactly what type of information to provide in each field.

#### Acceptance Criteria

1. WHEN displaying maturity detail text boxes THEN the system SHALL use the label "Supporting Attestation" instead of the current generic label
2. WHEN displaying maturity detail text boxes THEN the system SHALL use the label "Barriers and Challenges" instead of the current generic label  
3. WHEN displaying maturity detail text boxes THEN the system SHALL use the label "Outcomes-Based Advancement Plans" instead of the current generic label
4. WHEN displaying maturity detail text boxes THEN the system SHALL use the label "Additional Notes" instead of the current generic label
5. WHEN users interact with these fields THEN the system SHALL maintain all existing functionality while using the new labels
6. WHEN displaying results or exporting data THEN the system SHALL use the new field labels consistently throughout the application