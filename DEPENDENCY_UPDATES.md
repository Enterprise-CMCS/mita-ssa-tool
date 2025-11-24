# Dependency Updates

## Recent Updates

```

## Notable Dependencies

### CMS Design System
The project uses the official CMS Design System:
- `@cmsgov/design-system` v12.3.0 - Provides UI components that follow CMS design guidelines

### PDF Generation
For report generation and exports:
- `jspdf` v3.0.1 - Used for generating PDF reports
- `jspdf-autotable` v5.0.2 - Extension for creating tables in PDF exports

### Data Storage
- `idb` v7.1.1 - IndexedDB wrapper for client-side storage of assessment data

### Markdown Processing
- `react-markdown` v8.0.7 - For rendering markdown content
- `remark-gfm` v3.0.1 - GitHub Flavored Markdown support
- `gray-matter` v4.0.3 - For parsing frontmatter in markdown files

### Visualization
- `chart.js` v4.4.0 and `react-chartjs-2` v5.2.0 - For creating assessment visualizations and dashboards

## Node Version Requirement

The project requires Node.js 18.0.0 or higher as specified in the engines field:

```json
"engines": {
  "node": ">=18.0.0"
}
```

## Browser Compatibility

The project uses different browser targets for production and development:

### Production
```
">0.2%",
"not dead",
"not op_mini all"
```

### Development
```
"last 2 chrome version",
"last 2 firefox version",
"last 2 safari version",
"last 2 edge version"
```