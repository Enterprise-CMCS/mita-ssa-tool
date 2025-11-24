# MITA State Self-Assessment (SS-A) Tool - Project Overview

> **⚠️ DEPRECATED NOTICE**
> 
> **This instructions folder has been superseded by comprehensive Kiro specs.**
> 
> **For current development guidance, please use:**
> - **Kiro Specs**: `.kiro/specs/` - Detailed requirements, design, and implementation tasks
> - **Kiro Steering**: `.kiro/steering/` - Development standards and architectural guidelines  
> - **Kiro Hooks**: `.kiro/hooks/` - Automated quality checks and workflows
> 
> **This folder is maintained for historical reference only.**

## Introduction

This document serves as the main entry point for understanding the MITA State Self-Assessment (SS-A) Tool project. The SS-A Tool is designed to help state Medicaid agencies assess the maturity of their Medicaid systems using the new MITA NextGen capability-based framework.

## Project Purpose

State Medicaid agencies currently struggle with an outdated, cumbersome assessment process that fails to provide meaningful insights. The reimagined SS-A Tool addresses this by offering:

1. A modern, browser-based application with intuitive user experience
2. Integration with the MITA NextGen capability-based framework
3. Efficient assessment workflows with decision tree navigation
4. Local browser storage for data persistence
5. Visualization and export capabilities for actionable reporting

## Key Documents

This Instructions folder contains essential context for developing the SS-A Tool using Amazon Q Developer:

1. [Architecture Overview](architecture.md) - Technical architecture and system design
2. [MITA Framework Structure](mita_framework.md) - Details of the MITA NextGen capability model and ORBIT dimensions
3. [Assessment Workflow](assessment_workflow.md) - User journey and assessment processes
4. [Data Models](data_models.md) - Data structures and storage approach
5. [Development Guide](development_guide.md) - Implementation guidelines and best practices
6. [Prompt Library](prompt_library.md) - Effective prompts for Amazon Q Developer

## Project Status

The Minimum Lovable Product (MLP) is substantially complete with core functionality delivered:

### Completed Core Capabilities ✅

* ✅ Complete in-browser functionality with robust localStorage/IndexedDB storage
* ✅ Full MITA NextGen Framework integration with capability definition parsing
* ✅ Comprehensive guided assessment workflow with step-by-step navigation
* ✅ Interactive maturity level selection with card-based UI
* ✅ Advanced maturity visualization with Bar and Radar charts using Chart.js
* ✅ Professional reporting with PDF and CSV export functionality
* ✅ Auto-save functionality with real-time progress tracking
* ✅ Assessment state management and restoration
* ✅ Multi-branch deployment infrastructure (production, dev, test)

### In Progress 🚧

* Test suite improvements and bug fixes
* Accessibility validation and enhancements
* Performance optimization for large assessments

### Future Enhancements (Post-MLP)

* Authentication and access control
* Advanced collaboration features
* Assessment comparison and analytics
* Centralized data repository
* APD integration
* Advanced analytics and insights

## Technical Stack

* **Framework**: Next.js with TypeScript
* **UI Components**: CMS Design System (latest version)
* **Content Storage**: YAML/Markdown files for capability definitions
* **Data Persistence**: Browser localStorage/IndexedDB
* **Deployment**: GitHub Pages for static hosting

## Development Approach

This project uses Amazon Q Developer in VS Code to implement the application without requiring specialized technical resources. The development process follows these key principles:

1. Incremental implementation with frequent deployments
2. Strong separation between content and code
3. Client-side processing with no server dependencies
4. Emphasis on accessibility and usability
5. Open-source approach to enable community contributions

## Getting Started

To begin development:

1. Review all files in the Instructions folder to understand the project context
2. Set up the development environment as described in the [Development Guide](development_guide.md)
3. Follow the phased implementation approach in the GenAI Implementation Plan
4. Use the prompt library to effectively leverage Amazon Q Developer

## Success Criteria Status

The MLP has achieved significant progress toward success criteria:

1. ✅ **Working Prototype**: Core functionality is 85-90% complete and operational
2. 🚧 **Pilot Testing**: Ready for pilot state testing with minor bug fixes needed
3. ✅ **User Experience**: Professional UI with CMS Design System integration
4. ✅ **Documentation**: Comprehensive documentation for open-source collaboration
5. ✅ **Design Standards**: Full alignment with CMS Design System standards
6. ✅ **Foundation**: Solid architecture established for future enhancements

### Current Status
The assessment workflow is functionally complete with users able to:
- Select capability domains and areas for assessment
- Complete guided assessments across all ORBIT dimensions
- View comprehensive results with interactive visualizations
- Export detailed reports in PDF and CSV formats
- Manage multiple assessments through an intuitive dashboard

