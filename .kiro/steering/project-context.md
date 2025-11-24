# MITA State Self-Assessment Tool - Project Context

## Project Overview
This is the MITA State Self-Assessment (SS-A) Tool, a browser-based application designed to help state Medicaid agencies assess the maturity of their Medicaid systems using the MITA NextGen capability-based framework.

## Key Project Characteristics
- **Technology Stack**: Next.js with TypeScript, CMS Design System
- **Architecture**: Client-side only, no server dependencies
- **Storage**: Browser localStorage/IndexedDB for data persistence
- **Deployment**: GitHub Pages static hosting
- **Content Management**: YAML/Markdown files for capability definitions
- **Target**: Minimum Lovable Product (MLP) by August 2025

## Development Approach
- Previously developed with Amazon Q Developer
- Strong emphasis on content-code separation
- Incremental implementation with frequent deployments
- Accessibility compliance (WCAG 2.1 AA)
- Open-source approach for community contributions

## Key Constraints
- Client-side processing only
- Browser compatibility (Chrome, Firefox, Safari, Edge)
- Mobile responsiveness (desktop, tablet, and phone support required)
- No authentication/server-side storage for MLP

## Reference Documentation
The project has comprehensive documentation in the `instructions/` folder:
- Architecture overview and technical decisions
- MITA framework structure and assessment workflow
- Data models and development guidelines
- Prompt library for effective AI assistance

When working on this project, always consider these constraints and refer to the existing documentation for context.