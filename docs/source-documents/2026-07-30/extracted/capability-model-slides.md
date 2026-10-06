# Capability Model — Authoritative Slide Extraction (Slides 4–6)

**Source:** `Business Architecture Capability Overview.pptx` (BA working group, July 2026)
**Extracted with:** `scripts/extract-pptx.py`
**Authority:** Per Chris (model owner), **only slides 4–6 are authoritative**. All other
slides are stale content from earlier decks and must be ignored. See
`docs/decisions/CAPABILITY_MODEL_UPDATE_PLAN.md` for the full decision log.

Known source errata (confirmed fix-silently by Chris):

- Slide 6: "Networking & Technical Recover" → "Recovery"
- Slide 6: "Reference Data Management" is listed twice under Data Management (duplicate)

Layer assignment on slide 4 was verified from shape y-coordinates in the slide XML
(the plain-text extraction loses the band layout): Core band = 7 domains,
Strategic band = 3 domains, Support band = 4 domains.

---

## Slide 4 — MITA Capability Model (domain map)

**Core:**

- Provider Management
- Claims and Encounter Management
- Care and Service Coordination
- Contract Management
- Pharmacy Management
- Financial Management
- Member Management

**Strategic:**

- Enterprise Architecture
- Plan and Policy Management
- Strategy and Planning Management

**Support:**

- Communication Management
- Compliance Management
- Data Management
- Technology Management

---

## Slide 5 — Core Capabilities

**Provider Management**

- Provider Enrollment
- Provider Eligibility
- Provider Monitoring
- Provider Support Management
- Provider Information Management

**Claims and Encounter Management**

- Claims and Encounter Submission Management
- Claims Adjudication
- Encounter Processing
- Claims and Encounters Adjustments
- Claims and Encounters Lifecycle Management
- Claim and Encounter Information Management

**Care and Service Coordination**

- Long-Term Care Support Management
- Visit Verification Monitoring
- Case Management
- Prior Authorization
- Care Information Management

**Contract Management**

- Contract Lifecycle Management
- Contractor Management
- Contractor Support Management
- Contract Information Management

**Pharmacy Management**

- Pharmacy Benefit Administration
- Drug Monitoring Oversight
- Pharmacy Information Management

**Financial Management**

- Accounts Receivable Management
- Accounts Payable Management
- Fiscal/Budget Management
- Fund Management
- Third Party Liability
- Financial Information Management

**Member Management**

- Member Eligibility
- Member Enrollment
- Member Support Management
- Member Information Management

---

## Slide 6 — Strategic and Support Capabilities

**Plan and Policy Management**

- Health Plan Administration
- Health Benefits Administration
- Program Administration
- Waiver Management
- Plan Information Management

**Compliance Management**

- Program Monitoring Management
- Program Performance Evaluation
- Compliance Information Management

**Communication Management**

- Communication Development
- Communication Intake
- Communication Dissemination
- Public Affairs
- Communication Information Management

**Strategy and Planning Management**

- Strategic Plan Maintenance
- Strategic Roadmap Management
- Strategy Oversight & Accountability
- Strategy Information Management

**Enterprise Architecture**

- EA Planning
- EA Analysis
- EA Design
- EA Assessment
- EA Maintenance
- Enterprise Governance

> Tool note: per Chris's follow-up, the tool implements **one** capability area under
> the Enterprise Architecture domain — Enterprise Governance, holding all 15
> organizational aspects in 3 sections. The five EA lifecycle areas above are
> companion-guide / reference-document content only.

**Data Management**

- Data Governance
- Data Storage, Operations, & Warehousing
- Data Architecture, Modeling, & Design
- Master Data Management
- Reference Data Management _(listed twice in source — duplicate)_
- Document & Content Management
- Data Integration & Interoperability
- Data Quality Management
- Data Security & Privacy
- Metadata Management

**Technology Management**

- Compute & Storage
- Networking & Technical Recover _(sic — "Recovery")_
- Identity, Access, & Consent
- Security Protection & Monitoring
- System Operations & Monitoring
- Development, Testing, Release, & Security Compliance
- API, Messaging, & Integration
- Application Hosting and Platform Services
- Business Rules & Workflows
- Modular Architecture
- User Interfaces & Session Management
