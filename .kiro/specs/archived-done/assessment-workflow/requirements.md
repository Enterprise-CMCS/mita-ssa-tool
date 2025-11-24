# Requirements Document - Assessment Workflow

## Introduction

The Assessment Workflow feature enables state Medicaid agencies to conduct guided assessments of their system maturity using the MITA NextGen capability-based framework. This feature provides a structured, step-by-step process that guides users through capability selection, assessment completion, and results visualization.

## Requirements

### Requirement 1

**User Story:** As a state Medicaid agency user, I want to select specific capability domains and areas for assessment, so that I can focus my evaluation on relevant areas of my system.

#### Acceptance Criteria

1. WHEN a user starts a new assessment THEN the system SHALL display available capability domains for selection
2. WHEN a user selects a capability domain THEN the system SHALL display associated capability areas within that domain
3. WHEN a user selects capability areas THEN the system SHALL validate that at least one area is selected before proceeding
4. IF no capability areas are selected THEN the system SHALL display a validation message and prevent progression

### Requirement 2

**User Story:** As a state user, I want to view detailed information about each capability before assessment, so that I can understand what I'm evaluating.

#### Acceptance Criteria

1. WHEN a user begins assessing a capability THEN the system SHALL display the capability overview with description and context
2. WHEN viewing capability information THEN the system SHALL show the five ORBIT dimensions (Outcome, Role, Business Process, Information, Technology)
3. WHEN a user reviews capability details THEN the system SHALL provide clear navigation to proceed to the assessment

### Requirement 3

**User Story:** As a state user, I want to assess each ORBIT dimension with maturity levels, so that I can provide accurate evaluations of my system capabilities.

#### Acceptance Criteria

1. WHEN assessing a dimension THEN the system SHALL present maturity levels 1-5 with clear descriptions
2. WHEN a user selects a maturity level THEN the system SHALL require supporting evidence or notes
3. WHEN completing dimension assessment THEN the system SHALL validate that all required fields are completed
4. IF assessment data is incomplete THEN the system SHALL highlight missing information and prevent progression

### Requirement 4

**User Story:** As a state user, I want my assessment progress to be automatically saved, so that I don't lose my work if I need to pause or encounter technical issues.

#### Acceptance Criteria

1. WHEN a user enters assessment data THEN the system SHALL automatically save progress every 30 seconds
2. WHEN a user manually triggers save THEN the system SHALL immediately persist all current data to browser storage
3. WHEN a user returns to an in-progress assessment THEN the system SHALL restore their previous state and position
4. IF browser storage fails THEN the system SHALL notify the user and provide export options for data backup

### Requirement 5

**User Story:** As a state user, I want to track my progress through the assessment, so that I can understand how much work remains and manage my time effectively.

#### Acceptance Criteria

1. WHEN conducting an assessment THEN the system SHALL display a progress indicator showing completed and remaining items
2. WHEN moving between assessment sections THEN the system SHALL update the progress indicator in real-time
3. WHEN viewing progress THEN the system SHALL show both overall assessment progress and current capability progress
4. WHEN assessment is complete THEN the system SHALL clearly indicate completion status and provide next steps