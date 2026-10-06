# MITA 4.0 Capability Reference Model

> **Note:** This is a historical snapshot of an earlier capability reference model (Jan 2026 / v1.1). The current authoritative source of truth for the application's capability model is the July 2026 BA working group capability model (slides 4–6), archived at [`docs/source-documents/2026-07-30/`](../source-documents/2026-07-30/); the maturity criteria remain sourced from the May 3, 2026 PRA Submission at [`docs/source-documents/2026-05-03/`](../source-documents/2026-05-03/). For the current model structure see [`PROJECT_FOUNDATION_v2.md`](../../PROJECT_FOUNDATION_v2.md) and [`docs/decisions/CAPABILITY_MODEL_UPDATE_PLAN.md`](../decisions/CAPABILITY_MODEL_UPDATE_PLAN.md).

## Version History

| Version | Date              | Author        | Notes                              |
| ------- | ----------------- | ------------- | ---------------------------------- |
| 0.1     | August 8, 2025    | D. Carter     | Initial Outline                    |
| 1.0     | December 17, 2025 | NextGen Leads | Initial Draft                      |
| 1.1     | January 21, 2026  | NextGen Leads | Added Enterprise Governance domain |

---

## Table of Contents

- [1 Document Overview](#1-document-overview)
  - [1.1 Document Purpose](#11-document-purpose)
  - [1.2 Audience](#12-audience)
- [2 Model Overview](#2-model-overview)
  - [2.1 Model Objective](#21-model-objective)
  - [2.2 Model Definition](#22-model-definition)
  - [2.3 Model Structure](#23-model-structure)
  - [2.4 Model Application](#24-model-application)
  - [2.5 Model Contents](#25-model-contents)
- [3 Strategic Capability Areas](#3-strategic-capability-areas)
- [4 Core Capability Areas](#4-core-capability-areas)
- [5 Support Capability Areas](#5-support-capability-areas)
  - [5.1 Data Management Capability Domain](#51-data-management-capability-domain)
  - [5.2 Technical Capability Areas](#52-technical-capability-areas)
  - [5.3 Enterprise Governance](#53-enterprise-governance)

---

## 1 Document Overview

### 1.1 Document Purpose

The Medicaid Information Technology Architecture (MITA) 4.0 Capability Reference Model defines the proposed MITA framework for classifying the necessary capabilities to support a State Medicaid Agency (SMA). This document communicates the proposed Capability framework and gathers feedback from stakeholders.

Once the proposed Capability framework has been reviewed and approved, it will be combined with and aligned to other MITA 4.0 reference models developed by the SS-A and MITA NextGen workgroups to create a comprehensive MITA 4.0 Reference Model for publication.

### 1.2 Audience

The primary audience for this document includes but is not limited to:

- MITA 4.0 NextGen Members
- MITA 4.0 SS-A Workgroup Members
- MITA Governance Board
- Medicaid (MESC) MITA 4.0 Workshop Participants

---

## 2 Model Overview

### 2.1 Model Objective

The MITA 4.0 Capability Reference Model is a key component of the MITA 4.0 Framework. The primary objective of the reference model is to support the alignment, leverage, reuse, and interoperability of MITA-related capabilities across SMAs.

### 2.2 Model Definition

A capability is defined as an ability that an SMA possesses or seeks to develop to achieve its goals and meet its desired outcomes. It represents what the SMA can do without attempting to explain how, why, or where the SMA uses the capability. The ability may exist within the SMA today or may be required to enable a new direction or achieve a new desired outcome.

Each capability in the framework consists of the following elements:

- **Outcomes** — The desired outcomes that require the capability for their achievement
- **Roles** — The individual roles responsible for providing the capability
- **Business Processes** — The business processes performed to deliver the capability
- **Information** — The information and the data management capabilities needed to deliver the capability
- **Technology** — The technology for automating, scaling, and supporting the capability

#### MITA 3.0 vs. MITA 4.0 Capabilities

MITA 3.0 defines capabilities as the competence of an individual, organization, or system to perform a function or process. The MITA 4.0 framework redefines capabilities by removing the concept of competence. In MITA 4.0, a capability focuses only on the ability that an SMA possesses or seeks to develop: MITA 4.0 is agnostic of how well the SMA performs a capability.

The purpose of the state self-assessment in MITA 4.0 is to assess the maturity of the capability and how well the SMA performs the capability based on the outcomes, roles, business processes, information, and technology that an SMA has defined and implemented to support that capability.

The Capability Domains and Capability Areas in MITA 4.0 closely align to the following concepts in MITA 3.0:

- MITA 3.0 Business Areas and Business Categories
- MITA 3.0 Technical Service Areas and Classifications

### 2.3 Model Structure

A capability reference model is an abstract framework that defines concepts for grouping capabilities that share a common meaning. This reference model establishes a shared definition of capability concepts that cross organizational boundaries and helps identify opportunities for sharing, leverage, and reuse.

The MITA 4.0 Capability Reference Model identifies the key capability concepts for supporting the Medicaid Program and achieving the MITA 4.0 goals and outcomes. The structure consists of two levels:

- **Capability Domain** — High-level capability used to group common capabilities
- **Capability Area** — Detailed capabilities that decompose the capability domain into sub-capabilities that SMAs can use to classify their capabilities. There are one-to-many distinct Capability Areas for each Capability Domain.

### 2.4 Model Application

SMAs will use the MITA 4.0 Capability Reference Model to classify their own capabilities. SMAs will define their specific capabilities to meet their own distinct needs based on the capability domains and capability areas in the reference model. The reference model enables alignment of capabilities across SMAs. The model makes it possible for states and CMS to:

- Identify opportunities to collaborate, leverage, and reuse state capabilities
- Consistently assess and report capability maturity

### 2.5 Model Contents

The MITA 4.0 Capability Reference Model organizes capability domains that an SMA possesses or seeks to develop into three distinct layers:

- **Strategic** — Capabilities that enable an SMA to establish and maintain their enterprise strategy
- **Core** — Capabilities that enable an SMA to meet their mission and achieve their desired outcomes
- **Support** — Capabilities that are not specific to an SMA's mission but are critical for its core and strategic capabilities

---

## 3 Strategic Capability Areas

### Plan and Policy Management

#### Health Plan Administration

**Definition:** Manage the rates and health plan information for Medicaid that will be applied in the future.

**Topics:**

- Rate Structures
- Capitation Models
- Plan Configuration
- Contract Alignment
- Compliance Requirements

#### Health Benefits Administration

**Definition:** Includes the development and implementation of health benefit packages to accommodate service delivery to targeted member populations. The SMA determines benefit terms, limitations, and applicable periods for services.

**Topics:**

- Benefit Package Design
- Service Limitations
- Target Populations
- Cost-Sharing Rules
- Policy Alignment

### Strategy and Planning Management

#### Maintain Strategic Plan

**Definition:** Ensures that a state's Medicaid enterprise remains aligned with its long-term strategic vision while adapting to evolving needs and priorities. Allows for alignment of outcomes and measures at the enterprise level.

**Topics:**

- Enterprise Goals
- Outcome Alignment
- Roadmap Priorities
- Governance Structure
- Regulatory Changes

#### Develop Agency Roadmap

**Definition:** The SMA's roadmap serves a critical function of monitoring and managing the agency's portfolio, projects, and initiatives against federal funding (APDs), architectural vision, goals, and outcomes.

**Topics:**

- Portfolio Scope
- Funding Alignment
- Architectural Vision
- Milestone Planning
- Performance Measures

#### State Plan Administration

**Definition:** Administration of the state plan in alignment with MITA facilitates the desired relationship between the SMA's policy and strategic planning. This collaboration promotes the connection between policy and funding, architecture, and performance monitoring.

**Topics:**

- Policy Updates
- Federal Compliance
- Funding Linkage
- Architecture Alignment
- Performance Monitoring

---

## 4 Core Capability Areas

### Business Relationship Management

#### Manage Business Relationship Lifecycle

**Definition:** Ability to define the exchange of information and Trading Partner Agreements (TPA) between the SMA and its partners, including collaboration among intrastate agencies, interstate agencies, and federal agencies. These agreements address functionality for interoperability, coordination of standards of interoperability, establishment of inter-agency Service Level Agreements (SLA), identification of the types of information exchanged, and security and privacy requirements. Has a common focus (e.g., data exchange standards and SLA) and is responsible for the business relationship data store.

**Topics:**

- Trading Partner Agreements
- Data Exchange Standards
- Interoperability Requirements
- Security & Privacy
- SLA Establishment

#### Monitor Business Relationship

**Definition:** Ability to collect, organize, modify, and report on information about relationships with business partners, including monitoring significant dates, SLAs, points of contact, and limitations or constraints.

**Topics:**

- Relationship Tracking
- SLA Compliance
- Key Dates
- Contact Management
- Constraint Monitoring

### Care and Service Coordination

#### Waiver Management

**Definition:** Medicaid waivers allow a state to waive certain Medicaid eligibility requirements, such as covering care for people who might not otherwise be eligible for Medicaid. A waiver support system could be any enhancement to a MES module that helps the SMA facilitate changes to the Medicaid program operationalized by an approved waiver.

**Topics:**

- Coverage Expansion
- Federal Approval
- Policy Exceptions
- Program Changes

#### Long-Term Care Support Management

**Definition:** Medicaid is the primary payer across the nation for long-term care services. Medicaid allows for the coverage of these services through several vehicles and over a continuum of settings, ranging from institutional care to community-based long-term services and supports (LTSS).

**Topics:**

- Service Coordination
- Care Models
- Provider Network
- Funding Alignment
- Quality Oversight

#### Visit Verification Monitoring

**Definition:** Electronic Visit Verification (EVV) electronically documents and verifies service delivery information, such as date, time, service type and location, for certain Medicaid service visits that occur in the beneficiary's home.

**Topics:**

- EVV Compliance
- Service Verification
- Location Tracking
- Time Validation
- Fraud Prevention

#### Case Management

**Definition:** Manage Cases that use state-specific criteria and rules to ensure appropriate and cost-effective medical, medically-related social and behavioral health services are identified, planned, obtained and monitored for individuals identified as eligible for care management services under such programs as: Medicaid Waiver program case management, Home and Community-Based Services (HCBS), Other agency programs, Disease management, Catastrophic cases, Early Periodic Screening, Diagnosis, and Treatment (EPSDT), and Immunizations for children and adults.

**Topics:**

- Care Coordination
- Service Planning
- Eligibility Criteria
- Program Alignment
- Cost Control
- Outcome Monitoring
- High-Risk Cases
- Multi-Program Support

#### Prior Authorization (PA)

**Definition:** Confirms authorization for services that require prior approval to manage costs or ensure patient safety, and that the services provided are consistent with the authorization. The system accepts use of the authorization by multiple sequential providers during the period as allowed by state rules. Prior-authorization records stored by the system are correctly associated with the relevant claim(s).

**Topics:**

- Service Approval
- Medical Necessity
- Cost Containment
- Sequential Provider Use
- Compliance Rules
- Claim Linkage
- Timeliness Standards
- Audit Readiness
- Interoperability

### Claims and Encounter Management

#### Claims and Encounter Submission Management

**Definition:** Covers the end-to-end intake for both claims and encounter data, including: receiving submissions from providers, MCOs, and clearinghouses; validating data formats and compliance with standards (e.g., HIPAA, NPI); and logging and routing submissions for downstream processing. Ensures that all incoming data is clean, complete, and ready for adjudication or analysis. Serves as the entry point into the Medicaid Enterprise System for service-related transactions.

**Topics:**

- Submission Channels
- Standards Compliance
- Identity Validation
- Routing Logic
- Intake Logging

#### Claims Adjudication

**Definition:** Focuses on the evaluation and determination of submitted claims for payment. Applies Medicaid policy rules, benefit plan logic, provider contracts, and pricing algorithms to assess claim validity and calculate payment amounts. The adjudication process also includes edits for duplicate claims, service limits, and medical necessity. Once adjudicated, claims are either approved, denied, or pended, and remittance advice is generated for provider communication.

**Topics:**

- Policy Rules
- Benefit Logic
- Contract Pricing
- Duplicate Edits
- Service Limits
- Medical Necessity
- Pend / Deny Criteria
- Remittance Advice

#### Encounter Processing

**Definition:** Manages the validation, transformation, and analysis of encounter data submitted by managed care entities. Ensures that encounter records meet quality and completeness standards and are suitable for use in utilization tracking, quality measurement, and federal reporting (e.g., Transformed Medicaid Statistical Information System [T-MSIS]). Supports the integrity of managed care oversight by ensuring that encounter data accurately reflects services rendered to Medicaid beneficiaries.

**Topics:**

- Data Quality
- Transformation Rules
- Completeness Checks
- MCO Oversight
- T-MSIS Reporting
- Utilization Metrics

#### Claims and Encounters Adjustments

**Definition:** Supports the correction and reprocessing of previously submitted claims and encounters. It includes handling adjustments, voids, and resubmissions due to errors, policy changes, or appeals. Maintains a full audit trail of all versions and ensures that reprocessed items are adjudicated or analyzed appropriately. Essential for maintaining data accuracy, supporting provider dispute resolution, and ensuring compliance with audit and oversight requirements.

**Topics:**

- Voids / Adjustments
- Resubmissions
- Version Control
- Appeal Linkage
- Reprocessing Audit

#### Claims and Encounters Lifecycle Management

**Definition:** Provides comprehensive tracking and oversight of the status and performance of claims and encounters throughout their lifecycle. Includes real-time status updates, error tracking, and resolution workflows, as well as operational analytics and performance monitoring. Supports transparency for internal users and external stakeholders, and enables timely interventions, reporting (including preparation and submission of data to T-MSIS), and continuous improvement in processing efficiency and data quality.

**Topics:**

- Status Tracking
- Error Resolution
- Workflow Escalations
- Operational Analytics
- Performance Monitoring
- Transparency Reporting

### Contract Management

#### Contract Lifecycle Management

**Definition:** Supports lifecycle management of contracts from initiation and negotiation through execution, monitoring, and renewal while ensuring alignment with program objectives and regulatory standards.

**Topics:**

- Initiation / Negotiation
- Execution / Renewal
- Compliance Alignment
- Performance Reviews
- Risk/Issue Control

#### Contractor Management

**Definition:** Manage all Medicaid contractors through the award, assessment, and closeout of contracts that support the SMA. Provides ability to analyze and address contractors' operational needs throughout their engagement, including the ability to identify, assemble, and make available tools and information to help contractors be more successful in supporting Medicaid operations.

**Topics:**

- Award Decisions
- Performance Assessments
- Capacity Needs
- Enablement Tools
- Closeout Actions

#### Contract Information Management

**Definition:** Maintain and manage comprehensive contract and contractor information to ensure effective oversight by the SMA. Includes capturing, organizing, and monitoring all contractual elements such as SLAs, performance outcomes, compliance requirements, and formal agreements.

**Topics:**

- SLA Catalog
- Outcome Metrics
- Requirements Register
- Agreement Versions
- Oversight Reporting

### Financial Management

#### Accounts Payable

**Definition:** Enables SMA management of financial transactions related to Medicaid payments, including auditing, processing, and reconciling payables.

**Topics:**

- Invoice Intake
- Payment Approvals
- Reconciliation
- Compliance Checks
- Disbursement Controls

#### Accounts Receivable

**Definition:** Enables an SMA's tracking, management, and reconciliation of incoming payments and obligations owed to the Medicaid program.

**Topics:**

- Receivable Tracking
- Collections Policy
- Reconciliation
- Aging Analysis

#### Fiscal / Budget Management

**Definition:** Ability to formulate and manage budgets.

**Topics:**

- Budget Formulation
- Forecasting
- Variance Control
- Allocation Strategy
- Spend Governance

#### Fund Management

**Definition:** Ability to receive, manage, and allocate Medicaid funds, ensuring the accurate, effective use of the funds for the benefit of members.

**Topics:**

- Fund Tracking (Federal / State)
- Allocation Rules
- Utilization Tracking
- Compliance Controls

#### Third-Party Liability

**Definition:** Ability to identify sources of revenue such as third-party liability, estate recovery, rebates, and other recoverable funds.

**Topics:**

- TPL Identification
- Coordination of Benefits
- Recovery Actions
- Estate Recovery
- Rebate Management

#### Financial Information Management

**Definition:** Ability to collect, manage, and report on financial information about the SMA.

**Topics:**

- Data Collection
- Financial Reporting
- Performance Dashboards
- Audit Trails
- Data Governance

### Member Management

#### Member Eligibility Management

**Definition:** Supports the submission and processing of applications for eligibility for new members, as well as ongoing eligibility-related activities.

**Topics:**

- Application Intake
- Eligibility Rules
- Verification Data
- Redeterminations
- Compliance Timelines

#### Member Enrollment Management

**Definition:** Supports enrollment of eligible members and ongoing enrollment-related support functions. Includes assignment to an appropriate MCO or Fee-for-Service plan based on eligibility, member health needs, and other relevant factors.

**Topics:**

- Plan Assignment
- Enrollment Changes
- Communication Notices

#### Member Support Management

**Definition:** Supports the submission and resolution of member grievances and appeals, maintenance and availability of member information, and communication to existing and potential members of relevant program changes and requirements.

**Topics:**

- Grievance Handling
- Appeal Processing
- Information Access
- Satisfaction Metrics

### Pharmacy Management

#### Pharmacy Benefit Administration

**Definition:** Standardized formulary, Prior Authentication, claims adjudication, rebate, network, and member support processes using Pharmacy Benefit Management (PBM)/Medicaid Management Information System (MMIS) functions. Supports consistent reporting on utilization and spend.

**Topics:**

- Formulary Design
- Prior Authentication Rules
- Claims Pricing
- Rebate Management
- Network Oversight

#### Drug Monitoring Oversight

**Definition:** Enables routine, repeatable oversight of controlled substance monitoring with standard reporting and Drug Utilization Review (DUR) processes. Supports structured audits for compliance.

**Topics:**

- Compliance Audits
- Trend Analysis

### Provider Management

#### Provider Enrollment

**Definition:** Encompasses the required business processes and functions to register providers to participate in the Medicaid program and ensures that only qualified, eligible, and compliant providers are allowed to provide services to Medicaid clients. Includes the intake of new applications, updates to existing provider records, and removal of providers from the network when needed. Ensures provider data is accurate, validated, and aligned with state and federal regulations, while supporting continuity of care for Medicaid clients.

**Topics:**

- Application Intake
- Eligibility Criteria
- Credential Validation
- Network Changes
- Termination Rules

#### Provider Screening

**Definition:** Ensures that all providers meet the eligibility, screening, and compliance requirements necessary to participate in the Medicaid program. Includes validating professional licenses, certifications, education, training, work history, and conducting required screenings such as federal and state exclusion lists, criminal background checks, and site visits to confirm legitimacy and compliance with Medicaid standards. Applies during initial enrollment and on an ongoing basis to protect program integrity, reduce fraud, and safeguard Medicaid client access to qualified providers.

**Topics:**

- License Checks
- Exclusion Lists
- Background Reviews
- Site Visits
- Ongoing Monitoring

#### Provider Monitoring

**Definition:** Supports the continuous process of overseeing provider compliance and performance and maintaining current and accurate provider data. Includes periodic revalidation of provider eligibility, proactive monitoring of provider performance and risk indicators, and interventions when risk factors are identified. Ensures that providers remain compliant and program risk is mitigated as needed. Helps ensure that states maintain a compliant, effective, and reliable Medicaid provider network.

**Topics:**

- Revalidation Cycle
- Performance Indicators
- Data Accuracy

#### Provider Support Management

**Definition:** Provides a comprehensive, standardized capability for the SMA to support providers across the full lifecycle of interactions covering inquiries, onboarding support, training, technical assistance, complaints, grievances, and appeals. Ensures timely, consistent responses; fair resolution of disputes; and continuous improvement driven by performance analytics and stakeholder feedback.

**Topics:**

- Inquiry Support
- Training Resources
- Technical Assistance
- Grievance / Appeal
- Feedback Analytics

---

## 5 Support Capability Areas

### Compliance Management

#### Program Monitoring Management

**Definition:** Ability to monitor, audit, and track performance and behavior to determine the necessity, quality, and appropriateness of services, fraud and abuse, erroneous payments, and administrative abuses.

**Topics:**

- Quality Standards
- Fraud Detection
- Payment Accuracy
- Administrative Oversight

#### Program Performance Evaluation

**Definition:** Ability to evaluate the impact, performance, and costs associated with Medicaid programs, the SMA, partners (contractors/providers), and other associated parties.

**Topics:**

- Program Impact
- Cost Analysis
- Outcome Measures
- Partner Performance
- Efficiency Trends

### Communication Management

#### Communication Development

**Definition:** Ability to collect, organize, and otherwise prepare information as content to be communicated internally and externally, including the ability to draft and format the content as necessary for distribution.

**Topics:**

- Communication Content Creation
- Formatting Standards
- Internal Messaging
- External Messaging
- Compliance and QA

#### Communication Dissemination

**Definition:** Ability to manage and distribute prepared communication content to the intended recipient(s) through various channels.

**Topics:**

- Distribution Channels
- Audience Targeting
- Timing Control
- Delivery Tracking
- Accessibility

#### Communication Intake

**Definition:** Ability to receive communications from internal or external parties, ensure they are routed to the appropriate recipient(s), and satisfy any other handling requirements (e.g., privacy, confidentiality, storage/retention).

**Topics:**

- Message Routing
- Privacy Handling
- Storage / Retention
- Response Workflow
- Escalation Rules

#### Public Affairs

**Definition:** Ability to exchange information and communications between the SMA, members, and stakeholders in direct support of healthcare services, policy, and resources.

**Topics:**

- Stakeholder Engagement
- Policy Updates
- Public Outreach
- Media Relations
- Transparency

---

### Data Management Capability Domain

The Data Management Capability Domain represents the SMA's ability to manage its data. The domain encompasses key data management capability areas organized into two areas:

- **Foundational** — Data management capability areas that all other data management capability areas depend on and are critical for successfully managing data. These foundational capabilities provide oversight and structure to ensure data is fit for use and accessible to the right people.
- **Lifecycle** — Data management capability areas that support the management of data through one or more phases of its lifecycle. These capability areas support data through planning, design, use, enhancement, enablement, and maintenance.

SMAs use the Data Management Capabilities to support the following functions:

- **Classify Data Management Needs** — Provides a common vocabulary for classifying data management needs within and across SMAs
- **Identify Data Management Needs** — Provides a common vocabulary for describing the type of data management capabilities to support a business capability
- **Identify Data Management Solutions** — Illuminates opportunities to leverage, reuse, improve data within an SMA
- **Assessing Data Management Maturity** — Supports assessment of an SMA's maturity to manage data

#### Information vs. Data Management

The Data Management Capability model makes a distinction between managing data and managing information. Data management refers to the key capabilities for managing any type of data. Information management, on the other hand, is business focused and involves managing specific types of information from a business perspective. Within the MITA 4.0 framework, the management of information will be paired with a specific type of data and will be considered a capability area under specific capability domains.

#### Data Management Foundational Capability Areas

##### Data Governance

**Definition:** Provides the ability to establish policies, roles, and processes to ensure data is managed as a strategic asset aligned with organizational objectives. Provides accountability and decision rights over data.

**Topics:**

- Policies and Standards
- Roles and Responsibilities (e.g., Data Steward and Data Owner)
- Compliance and Risk Management

##### Data Quality

**Definition:** Provides the ability to ensure that data is fit for use.

**Topics:**

- Accuracy
- Completeness
- Consistency
- Timeliness
- Validity
- Data Profiling and Assessment
- Data Cleansing and Enrichment
- Quality Metrics and KPIs
- Root Cause Analysis and Remediation

##### Metadata Management

**Definition:** Provides the ability to create, track, store, and maintain information about an SMA's data assets.

**Topics:**

- Metadata Creation
- Metadata Integration
- Metadata Distribution and Delivery
- Metadata Repositories
- Metadata Standards and Taxonomies

##### Data Security & Privacy

**Definition:** Provides the ability to protect data from unauthorized access and ensures compliance with privacy laws and regulations to maintain trust and safeguard sensitive information.

**Topics:**

- Access Controls and Encryption
- Data Masking and Anonymization
- Consent Management, CFR 42 Part 2
- Regulatory Compliance (e.g., HIPAA and ARC-AMPE)

#### Data Management Lifecycle Support Capability Areas

##### Master Data Management

**Definition:** Provides the ability to manage critical business entities' data (e.g., customers and products) to ensure a single, authoritative view across the enterprise for consistency.

**Topics:**

- Master Data Modeling
- Data Consolidation and Synchronization
- Hierarchy Management

##### Reference Data Management

**Definition:** Provides the ability to manage shared, standardized data that is used to characterize or classify other data and to relate data to information internal and external to the SMA.

**Topics:**

- Reference Data Classification
- Controlled Change Management

##### Data Integration and Interoperability

**Definition:** Provides the ability to seamlessly exchange data and consolidate it across diverse systems. Ensures data consistency and accessibility enterprise-wide and with trading partners.

**Topics:**

- Data Durability and Availability
- ETL Processes and API Management
- Data Federation and Virtualization
- Data Standards and Protocols

##### Data Storage and Warehousing

**Definition:** Provides the ability to persistently store, retain, and manage data in a specific location that is accessible to authorized stakeholders.

**Topics:**

- ETL / ELT Governance and Security
- Machine Learning Readiness Structure / Unstructured Storage
- Database Technologies
- Data Warehousing Architecture
- Big Data Platforms
- Storage Optimization and Archiving

##### Data Architecture, Modeling, and Design

**Definition:** Provides the ability to define data structures, models, and standards that support organizational data strategy and ensure data integrity and usability.

**Topics:**

- Conceptual, Logical and Physical Modeling
- Data Standards and Naming Conventions
- Architecture Frameworks
- Metadata Integration

##### Document and Content Management

**Definition:** Provides the ability to capture, track, store, retain, and manage unstructured data such as documents and multimedia. Ensures efficient storage, retrieval, and compliance with retention policies.

**Topics:**

- E-content Capture and Digitization
- Optical Character Recognition processing
- Audit Support
- Content Repositories
- Version Control and Audit Trails
- Records Retention Policies

##### Business Intelligence & Data Science

**Definition:** Provides the ability to collect, prepare, analyze, visualize, and present data to help SMAs make informed business decisions. Includes the ability to apply analytical techniques and advanced algorithms to transform data into actionable insights supporting strategic decision-making.

**Topics:**

- Reporting and Dashboards
- Data Mining and Predictive Analytics
- Machine Learning Models
- Data Visualization

---

### Technical Capability Areas

#### Infrastructure

##### Compute and Hosting

**Definition:** Provides the ability for SMAs to provision servers and cloud platforms for Medicaid systems and applications.

**Topics:**

- Provision of Servers
- Cloud Infrastructure

##### Storage

**Definition:** Provides the ability for SMAs to manage Medicaid data storage, including files and backups for retention.

**Topics:**

- Management of Medicaid Data Storage
- Security and Retention Compliance

##### Networking and Connectivity

**Definition:** Provides the ability for SMAs to enable secure connections between internal systems, external partners, and cloud environments.

**Topics:**

- Secure Connections between Internal Systems and External Partners
- Reliable Communication in Computing and Hosting Environments

##### Resilience and Scaling

**Definition:** Provides the ability for SMAs to maintain system operation during outages through failover and disaster recovery or to make adjustments during peak usage.

**Topics:**

- System Operation during Outages
- Failover and Disaster Recovery
- Adjustments during Peak Usage Times

#### Integration

##### API and Interface Management

**Definition:** Provides the ability for SMAs to facilitate data sharing between systems using standard formats like FHIR, X12, or Representational State Transfer (REST).

**Topics:**

- Digital Connections and Data Sharing
- Common Data Formats (FHIR, X12, REST)

##### System Messaging

**Definition:** Provides the ability for SMAs to enable real-time or scheduled alerts or events between systems.

**Topics:**

- Real-Time or Scheduled Communication
- Clear and Traceable Alerts or Events

##### External Partner Integration

**Definition:** Provides the ability for SMAs to establish secure connections with CMS, MCOs, providers, and other federal or state partners.

**Topics:**

- Secure Connections with CMS, MCOs, Providers
- Coordination of Medicaid Services

#### Platform Services

##### Application Hosting

**Definition:** Provides the ability for SMAs to host managed environments that run Medicaid applications.

**Topics:**

- Managed Environments
- Minimization of Manual Work

##### Business Rules and Workflow

**Definition:** Provides the ability for SMAs to create rules (such as eligibility criteria) and automate processes (like Provider Enrollment).

**Topics:**

- Creation of Business Rules
- Automation of Processes

##### Common Platform Functions

**Definition:** Provides the ability for SMAs to use shared services, such as address verification or file upload services, that multiple systems can use to prevent redundancy and duplication.

**Topics:**

- Shared Tools
- Prevention of Duplication across Systems
- Leverage and Reuse

#### Application Architecture

##### Modular Architecture

**Definition:** Provides the ability for SMAs to divide large Medicaid systems into smaller, manageable components for easier scaling and replacement.

**Topics:**

- Scalability
- Ease of Replacement

##### User Interfaces

**Definition:** Provides the ability for SMAs to design application screens that are easy to access, interact with, and consistent for users, such as members and providers.

**Topics:**

- User Accessibility
- Consistency

##### Session and State Management

**Definition:** Provides the ability for SMAs to monitor user activity during a session, enabling users to confidently and securely continue or finish their actions.

**Topics:**

- User Activity Tracking
- Continuity of Actions

#### Security and Identity

##### Identity and Access Services

**Definition:** Provides the ability for SMAs to control who can log in, what they can do, and how their identity is verified.

**Topics:**

- Authentication and Authorization
- Identity Verification

##### Consent Management

**Definition:** Provides the ability for SMAs to gather and manage member consents and data-sharing preferences.

**Topics:**

- Collection of Member Consents
- Data-Sharing Preferences

##### System and Data Protection

**Definition:** Provides the ability for SMAs to use measures like encryption, firewalls, and secure configurations to prevent unauthorized access and protect sensitive Medicaid and healthcare data.

**Topics:**

- Use of Encryption
- Secure Configurations
- Protection of Medicaid and Healthcare Data

##### Security Monitoring

**Definition:** Provides the ability for SMAs to detect unusual activity, log events, and support audits to better comply with CMS and NIST security standards, e.g., Acceptable Risk Controls for Affordable Care Act (ACA), Medicaid, and Partner Entities (ARC-AMPE).

**Topics:**

- Monitoring for Unusual Activity
- Event Logging
- Audit Support
- Compliance with CMS and NIST Security Standards

#### Operations and Maintenance

##### Systems Monitoring

**Definition:** Provides an SMA's visibility into Medicaid system health, including uptime, performance, and availability.

**Topics:**

- System Health and Availability
- Performance Evaluation

##### Systems Operations

**Definition:** Provides the ability for SMAs to manage systems, perform tasks, and deploy updates across various environments.

**Topics:**

- System Administration
- Environment Management

#### Development and Release

##### Code and Configuration Management

**Definition:** Provides the ability for SMAs to write, track, and securely manage software changes.

**Topics:**

- Creating Software Changes
- Tracking Software Changes
- Managing Software Changes

##### Testing and Release

**Definition:** Provides the ability for SMAs to run tests to identify bugs or issues and deploy code across different environments such as Development, Test, and Production.

**Topics:**

- Testing for Bugs, Issues, or Defects
- Deploying Code across Environments

##### Security Compliance

**Definition:** Provides the ability for SMAs to incorporate security checks throughout the development process to ensure code is secure.

**Topics:**

- Incorporating Security Checks before Deployment
- Adhering to Compliance Standards

---

### 5.3 Enterprise Governance

The Enterprise Governance domain assesses organizational maturity in defining outcomes and managing roles across the Medicaid enterprise. These capabilities apply at the organizational level rather than to specific business functions.

#### Organizational Outcomes

**Definition:** Assesses the organization's maturity in defining, tracking, and achieving desired outcomes across the Medicaid enterprise. Covers culture, capability, quality, alignment, metrics, and reusability of outcome practices.

**Topics:**

- Culture & Mindset
- Outcome Development Capability
- Quality & Consistency
- Goal Alignment
- Metrics & Measurement
- Reusability & Integration

#### Organizational Roles

**Definition:** Assesses the organization's maturity in managing roles, resources, governance, and capacity across the Medicaid enterprise. Covers technology resources, goal alignment, governance, communication, leadership, and staffing.

**Topics:**

- Technology Resources
- Organizational Goals Alignment
- Governance & Standardization
- Communication
- Culture & Leadership
- Resourcing Capacity
