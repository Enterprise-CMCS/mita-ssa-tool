import { parseCapabilityMarkdown } from '../../../src/utils/markdownParser';

describe('Markdown Parser', () => {
  const sampleMarkdown = `---
capabilityDomain: Provider
capabilityArea: Provider Enrollment
capabilityVersion: 1.1
capabilityAreaCreated: 2025-02-02
capabilityAreaLastUpdated: 2025-02-03
assessmentCreated: 2025-05-01
assessmentUpdated: 2025-05-15
assessmentStatus: in-progress
---

## Capability Domain: Provider

The Provider capability domain encompasses three related areas; Provider Enrollment, Provider Management, and Provider Termination. 

## Capability Area: Provider Enrollment

Provider Enrollment encompasses the processes and systems used to register healthcare providers in the Medicaid program, including application processing, screening, verification, and enrollment decisions.

## Outcomes

### Description
The Outcomes dimension focuses on the results and effectiveness of the provider enrollment process.

### Assessment Questions
1. How efficiently are providers enrolled in the Medicaid program?
2. What percentage of applications are processed within standard timeframes?
3. How effectively does the enrollment process validate provider credentials?

### Maturity Level Definitions

#### Level 1: Initial
Manual provider enrollment process with paper-based applications and limited validation of provider information.

#### Level 2: Repeatable
Basic online enrollment forms with some automated validation, though manual review is still required for most applications.

#### Level 3: Defined
Fully electronic enrollment process with automated validation against multiple sources and self-service status checking.

#### Level 4: Managed
Intelligent workflow with predictive analytics, real-time credential verification, and automated risk assessment.

#### Level 5: Optimized
Continuous monitoring and revalidation with cross-program enrollment coordination and adaptive enrollment requirements based on provider risk.

## Roles

### Description
The Roles dimension addresses the responsibilities and interactions of staff and providers in the enrollment process.

### Assessment Questions
1. How are responsibilities distributed across the enrollment process?
2. What self-service capabilities are available to providers?
3. How effectively do different roles collaborate during the enrollment process?

### Maturity Level Definitions

#### Level 1: Initial
Provider enrollment specialists manually process applications with limited provider self-service capabilities and siloed responsibilities across enrollment steps.

#### Level 2: Repeatable
Providers can submit applications online, staff roles are focused on specific verification tasks, with limited coordination between enrollment teams.

#### Level 3: Defined
Provider self-service for most enrollment functions, specialized staff handle exceptions and complex cases, with coordinated roles across enrollment workflow.

#### Level 4: Managed
Automated assignment of tasks based on expertise, cross-trained staff with decision support tools, and collaborative enrollment teams.

#### Level 5: Optimized
Dynamic role assignment based on enrollment complexity, continuous learning systems support staff decisions, with seamless coordination across programs and agencies.

## Business Processes

### Description
The Business Processes dimension covers the workflows, procedures, and operational aspects of provider enrollment.

### Assessment Questions
1. How streamlined is the provider enrollment workflow?
2. What degree of automation exists in the enrollment process?
3. How are exceptions and special cases handled?

### Maturity Level Definitions

#### Level 1: Initial
Manual, paper-based workflow with sequential processing steps and limited tracking of application status.

#### Level 2: Repeatable
Basic electronic workflow with some automated validations, though manual intervention is required for most steps.

#### Level 3: Defined
Fully electronic workflow with parallel processing where possible and automated tracking and notifications.

#### Level 4: Managed
Intelligent workflow with adaptive routing, automated exception handling, and predictive workload management.

#### Level 5: Optimized
Continuous process optimization with cross-program enrollment coordination and real-time adaptation to regulatory changes.

## Information

### Description
The Information dimension addresses the data, data models, and information management aspects of provider enrollment.

### Assessment Questions
1. How comprehensive is the provider data model?
2. What data validation mechanisms are in place?
3. How effectively is provider information shared across systems?

### Maturity Level Definitions

#### Level 1: Initial
Basic provider demographic information with manual verification of credentials and limited data sharing between systems.

#### Level 2: Repeatable
Structured provider data model with electronic storage of supporting documentation and basic interfaces with external verification sources.

#### Level 3: Defined
Comprehensive provider data model with automated data validation rules and integration with multiple verification sources.

#### Level 4: Managed
Enhanced data model supporting advanced analytics, real-time data validation and enrichment, and comprehensive provider risk profile.

#### Level 5: Optimized
Dynamic data model adapting to changing requirements, continuous data quality monitoring, and seamless information sharing across programs.

## Technology

### Description
The Technology dimension covers the systems, infrastructure, and technical capabilities supporting provider enrollment.

### Assessment Questions
1. How well do systems support the provider enrollment process?
2. What degree of integration exists between enrollment and other systems?
3. How adaptable is the technology to changing requirements?

### Maturity Level Definitions

#### Level 1: Initial
Legacy systems with limited integration, manual data entry and verification, and minimal automation.

#### Level 2: Repeatable
Basic web forms for provider enrollment, document management system, and limited system integration.

#### Level 3: Defined
Integrated provider enrollment system, automated workflow management, and API-based integration with verification sources.

#### Level 4: Managed
Cloud-based enrollment platform, advanced analytics and decision support, and comprehensive API ecosystem.

#### Level 5: Optimized
Microservices architecture, AI/ML-powered enrollment processing, and real-time integration with federal and state systems.`;

  test('parses front matter correctly', () => {
    const result = parseCapabilityMarkdown(sampleMarkdown);

    expect(result.capabilityDomainName).toBe('Provider');
    expect(result.capabilityAreaName).toBe('Provider Enrollment');
    expect(result.capabilityVersion).toBe('1.1');
    expect(result.capabilityAreaLastUpdated).toBe('2025-02-03');
  });

  test('generates correct ID', () => {
    const result = parseCapabilityMarkdown(sampleMarkdown);

    expect(result.id).toBe('provider-provider-enrollment');
  });

  test('extracts capability domain and area information', () => {
    const result = parseCapabilityMarkdown(sampleMarkdown);

    expect(result.capabilityDomainName).toBe('Provider');
    expect(result.capabilityAreaName).toBe('Provider Enrollment');
    expect(result.description).toContain(
      'processes and systems used to register healthcare providers'
    );
  });

  test('extracts dimension descriptions', () => {
    const result = parseCapabilityMarkdown(sampleMarkdown);

    expect(result.dimensions.outcome.description).toContain('results and effectiveness');
    expect(result.dimensions.role.description).toContain('responsibilities and interactions');
    expect(result.dimensions.businessProcess.description).toContain(
      'workflows, procedures, and operational aspects'
    );
    expect(result.dimensions.information.description).toContain(
      'data, data models, and information management'
    );
    expect(result.dimensions.technology.description).toContain(
      'systems, infrastructure, and technical capabilities'
    );
  });

  test('extracts maturity assessment questions for all dimensions', () => {
    const result = parseCapabilityMarkdown(sampleMarkdown);

    // Outcome dimension
    expect(result.dimensions.outcome.maturityAssessment).toHaveLength(3);
    expect(result.dimensions.outcome.maturityAssessment[0]).toContain(
      'How efficiently are providers enrolled'
    );

    // Role dimension
    expect(result.dimensions.role.maturityAssessment).toHaveLength(3);
    expect(result.dimensions.role.maturityAssessment[0]).toContain(
      'How are responsibilities distributed'
    );

    // Business Process dimension
    expect(result.dimensions.businessProcess.maturityAssessment).toHaveLength(3);
    expect(result.dimensions.businessProcess.maturityAssessment[0]).toContain(
      'How streamlined is the provider enrollment workflow'
    );

    // Information dimension
    expect(result.dimensions.information.maturityAssessment).toHaveLength(3);
    expect(result.dimensions.information.maturityAssessment[0]).toContain(
      'How comprehensive is the provider data model'
    );

    // Technology dimension
    expect(result.dimensions.technology.maturityAssessment).toHaveLength(3);
    expect(result.dimensions.technology.maturityAssessment[0]).toContain(
      'How well do systems support'
    );
  });

  test('extracts all maturity levels for all dimensions', () => {
    const result = parseCapabilityMarkdown(sampleMarkdown);

    // Test Outcome dimension - all levels
    expect(result.dimensions.outcome.maturityLevels.level1).toContain(
      'Manual provider enrollment process'
    );
    expect(result.dimensions.outcome.maturityLevels.level2).toContain(
      'Basic online enrollment forms'
    );
    expect(result.dimensions.outcome.maturityLevels.level3).toContain(
      'Fully electronic enrollment process'
    );
    expect(result.dimensions.outcome.maturityLevels.level4).toContain('Intelligent workflow');
    expect(result.dimensions.outcome.maturityLevels.level5).toContain('Continuous monitoring');

    // Test Role dimension - all levels
    expect(result.dimensions.role.maturityLevels.level1).toContain(
      'Provider enrollment specialists'
    );
    expect(result.dimensions.role.maturityLevels.level2).toContain(
      'Providers can submit applications online'
    );
    expect(result.dimensions.role.maturityLevels.level3).toContain(
      'Provider self-service for most enrollment functions'
    );
    expect(result.dimensions.role.maturityLevels.level4).toContain('Automated assignment of tasks');
    expect(result.dimensions.role.maturityLevels.level5).toContain('Dynamic role assignment');

    // Test Technology dimension - sample levels
    expect(result.dimensions.technology.maturityLevels.level1).toContain('Legacy systems');
    expect(result.dimensions.technology.maturityLevels.level5).toContain(
      'Microservices architecture'
    );
  });
});
