# MITA State Self-Assessment Tool

A browser-based application for state Medicaid agencies to assess the maturity of their Medicaid systems using the MITA NextGen capability-based framework.

## Overview

The MITA State Self-Assessment Tool provides a guided workflow for evaluating Medicaid system capabilities across five ORBIT dimensions: Outcomes, Roles, Business Processes, Information, and Technology. All data is stored locally in the browser—no server required.

**Current Status**: Core assessment functionality complete (~85%). See [ROADMAP.md](ROADMAP.md) for development priorities.

**Documentation**: Detailed specs and guidelines are in `.kiro/specs/` and `.kiro/steering/`.

## Features

### Assessment Management
- **Dashboard**: Create, manage, and track multiple assessments
- **Guided Workflow**: Step-by-step process through capability areas and ORBIT dimensions
- **Auto-Save**: Automatic saving with visual status indicators
- **Progress Tracking**: Real-time completion percentage and step counters

### Navigation
- **Sticky Header**: Assessment context, progress, and quick navigation (Alt+D for dashboard)
- **Collapsible Sidebar**: Capability-based navigation with progress indicators and direct section access
- **Mobile-Responsive**: Overlay navigation for tablets and phones with touch gestures
- **Keyboard Shortcuts**: Alt+S (sidebar toggle), Alt+D (dashboard), Alt+R (results)

### Scoring & Results
- **Enhanced Scoring**: Base maturity levels (1-5) plus checkbox partial credit (0.25 per checkbox)
- **Real-Time Updates**: Scores update instantly as users complete assessments
- **Visualizations**: Bar charts for overall scores, radar charts for ORBIT dimension comparisons
- **Detailed Breakdown**: Results page shows base score + partial credit = final score

### Export & Data Management
- **Multi-Format Export**: PDF, CSV, JSON, and Markdown formats
- **Professional Reports**: PDF exports include charts, scores, and complete assessment data
- **Data Portability**: Export/import functionality for backup and sharing
- **Browser Storage**: localStorage with IndexedDB fallback—no server required

### Accessibility & Error Handling
- **WCAG 2.1 AA Compliance**: Keyboard navigation, screen reader support, proper ARIA labels
- **Error Boundaries**: Comprehensive error handling with data preservation and recovery options
- **Graceful Degradation**: Fallback mechanisms for storage and feature availability

## Quick Start

### Prerequisites
- Node.js 18.0.0 or higher
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/username/mita-ssa-tool.git
cd mita-ssa-tool

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Production Build

```bash
# Build for production
npm run build

# Preview production build
npm start
```

## Project Structure

```
mita-ssa-tool/
├── public/content/      # MITA capability definitions (Markdown)
├── src/
│   ├── components/      # React components
│   ├── hooks/           # Custom React hooks
│   ├── pages/           # Next.js pages and routes
│   ├── services/        # Business logic (Content, Storage, Scoring, Export)
│   ├── types/           # TypeScript type definitions
│   └── utils/           # Utility functions
├── .kiro/               # Development specs and guidelines
├── tests/               # Test files
└── [config files]       # Build and tool configurations
```

## Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run check        # Run all quality checks (format, lint, test, build)
npm run format       # Format code with Prettier
npm run lint:fix     # Fix ESLint issues
npm test             # Run tests
npm run test:coverage # Generate coverage report
```

### Quality Standards

Before committing, always run:
```bash
npm run check
```

This runs formatting checks, linting, tests, and build verification. See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## Deployment

The application deploys automatically to GitHub Pages when changes are pushed to `main`.

**Live URL**: [https://enterprise-cmcs.github.io/mita-ssa-tool]

### Setup
1. Enable GitHub Pages in repository Settings > Pages
2. Set source to "GitHub Actions"
3. Push to `main` branch to trigger deployment

See [GITHUB_PAGES_SETUP.md](GITHUB_PAGES_SETUP.md) for detailed setup and troubleshooting.

## Architecture

### Key Services
- **ContentService**: Loads capability definitions from Markdown files
- **StorageService**: Manages browser storage (localStorage → IndexedDB fallback)
- **ScoringService**: Calculates maturity scores with checkbox partial credit
- **ExportService**: Generates PDF, CSV, JSON, and Markdown exports

### Browser Storage
Assessment data is stored locally using localStorage with automatic IndexedDB fallback for larger datasets. No server or authentication required.

### Performance
- Code splitting with dynamic imports
- In-memory caching with TTL
- Optimized chunk splitting for fast loading

## Technology Stack

- **Framework**: Next.js 15.3.3 with TypeScript
- **UI**: CMS Design System (government-standard components)
- **Visualization**: Chart.js with React Chart.js 2
- **Export**: jsPDF with AutoTable
- **Storage**: IndexedDB (idb library)
- **Content**: Markdown with YAML front matter (gray-matter, react-markdown)
- **Testing**: Jest with React Testing Library

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**Key Resources**:
- [ROADMAP.md](ROADMAP.md) - Development priorities and timeline
- [CHANGELOG.md](CHANGELOG.md) - Version history
- `.kiro/steering/` - Coding standards and workflows
- `.kiro/specs/` - Technical specifications

## License

This project is licensed under the GNU General Public License v3.0 (GPL-3.0) - see the LICENSE file for details.


## Development Roadmap

For detailed development priorities, timelines, and feature planning, see [ROADMAP.md](ROADMAP.md).

### Current Focus (November and December 2025)

The project is currently focused on:
1. **Infrastructure Simplification** - Streamlining deployment to single-branch GitHub Pages
2. **Repository Organization** - Cleaning up specs and documentation structure
3. **Content Updates** - Incorporating latest MITA framework definitions
4. **UX/UI Overhaul** - Modernizing interface with responsive design and improved accessibility

### Project Status

The application has implemented core functionality, with solid foundations in:
- ✅ Assessment workflow and navigation
- ✅ Data visualization and reporting
- ✅ Storage and data management

Target: Minimum Lovable Product (MLP) by December 2025
