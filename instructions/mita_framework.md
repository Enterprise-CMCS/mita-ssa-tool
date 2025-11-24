# MITA NextGen Framework Structure

> **⚠️ DEPRECATED**: This file has been migrated to `.kiro/specs/content-management-system/` with detailed requirements and implementation guidance. Please use the Kiro spec for current MITA framework integration work.

## Overview

The Medicaid Information Technology Architecture (MITA) NextGen framework represents a significant evolution from the previous MITA 3.0 approach. This document outlines the structure and organization of the MITA NextGen capability-based model, which forms the foundation of the State Self-Assessment (SS-A) Tool.

## Capability-Based Approach

Unlike the previous process-centric MITA 3.0 framework, MITA NextGen employs a capability-based approach that better aligns with modern Medicaid systems. This approach:

1. Organizes Medicaid functionality around business capabilities rather than processes
2. Provides a more modular framework for assessment and planning
3. Better supports modern system architectures and implementation approaches
4. Aligns with broader IT industry practices for capability-based planning

## MITA Capability Structure

The MITA NextGen framework organizes capabilities in a hierarchical structure:

```
Medicaid Enterprise
├── Capability Domain 1 (e.g. Provider)
│   ├── Capability Area 1 (e.g. Provider Enrollment)
│   │   ├── Outcomes
│   │   ├── Roles
│   │   ├── Business Processes
│   │   ├── Information
│   │   └── Technology
│   └── Capability Area 2 (e.g. Provider Management)
│   │   └── [ORBIT dimensions]
└── Capability Domain 2 (e.g. Claims Processing)
│   └── [Capability Areas]
│   │   └── [ORBIT dimensions]
└── Capability Domain 3 (e.g. Eligibility and Enrollment)
│   └── [Capability Areas]
│   │   └── [ORBIT dimensions]
└── [Other Capability Domains]
```

## ORBIT Dimensions

Each capability area is assessed across five key dimensions, collectively known as ORBIT:

### 1. Outcomes

The Outcome dimension describes the business results and objectives achieved through the capability. Assessment focuses on:

* Effectiveness in meeting program goals
* Alignment with Medicaid objectives
* Measurable impact on stakeholders
* Improvements in service delivery

### 2. Roles

The Role dimension examines who performs various functions within the capability and how responsibilities are structured. Assessment focuses on:

* Distribution of responsibilities
* Staff skills and training
* Operational efficiency
* Business and technical roles

### 3. Business Processes

The Business Process dimension evaluates the workflows, procedures, and business rules that implement the capability. Assessment focuses on:

* Process efficiency and automation
* Standardization and consistency
* Integration between processes
* Compliance with requirements

### 4. Information

The Information dimension examines how data is structured, shared, and utilized within the capability. Assessment focuses on:

* Data quality and governance
* Information accessibility
* Data standardization
* Integration capabilities

### 5. Technology

The Technology dimension evaluates the technical implementation supporting the capability. Assessment focuses on:

* System architecture
* Technical standards adherence
* Interoperability capabilities
* Modularity and reusability

## Maturity Levels

Each ORBIT dimension is assessed against five maturity levels, allowing states to track their progress and set improvement goals:

### Level 1: Initial

* Ad-hoc processes
* Minimal automation
* Limited standardization
* Siloed operation
* Reactive management

### Level 2: Repeatable

* Documented processes
* Basic automation
* Emerging standards
* Limited integration
* Consistent operation

### Level 3: Defined

* Standardized processes
* Increased automation
* Adopted industry standards
* Enhanced integration
* Performance monitoring

### Level 4: Managed

* Optimized processes
* Comprehensive automation
* Full standards compliance
* Seamless integration
* Data-driven management

### Level 5: Optimized

* Continuous improvement
* Full automation
* Leadership in standards
* Complete interoperability
* Predictive management

## Assessment Approach

The SS-A Tool guides users through assessing each capability area across all five ORBIT dimensions. For each dimension:

1. Users review the capability description and maturity level definitions
2. Answer structured assessment questions
3. Optional: Provide evidence supporting their maturity level selection
4. Document plans for improvement
5. Identify barriers to advancement

## Capability Framework Structure in SS-A Tool

Within the application, capability definitions and assessment content are structured in YAML/Markdown files per the [Data Model](data_models.md). 

See the [example provider enrollment file](/public/content/sample-provider-enrollment.md) for more information.

## Implementation Considerations

When implementing the MITA NextGen framework in the SS-A Tool:

1. **Content Separation**: Capability definitions must be maintained separately from application code
2. **Dynamic Loading**: Content should be loaded dynamically at runtime
3. **Versioning**: Content versioning should track framework evolution
4. **Extensibility**: New capability areas should be easily added without code changes
5. **Consistency**: TypeScript interfaces should enforce consistent content structure

## Future Evolution

The MITA NextGen framework will continue to evolve based on industry feedback and changing Medicaid requirements. The SS-A Tool architecture must accommodate:

1. Addition of new capability areas
2. Refinement of existing maturity definitions
3. Updates to assessment questions
4. Expansion to cover additional Medicaid modules
5. Integration with related federal frameworks

