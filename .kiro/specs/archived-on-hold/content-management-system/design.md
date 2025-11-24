# Design Document - Content Management System

## Overview

The Content Management System (CMS) provides a robust, client-side solution for loading, parsing, and managing MITA capability area definitions from YAML/Markdown files. The system implements a content-code separation architecture that allows subject matter experts to update capability definitions without requiring code changes while providing the application with structured, type-safe data for assessments.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Content Management System                │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │   ContentService │    │  Content Cache  │                │
│  │                 │    │                 │                │
│  │ - Load content  │◄──►│ - Memory cache  │                │
│  │ - Parse files   │    │ - TTL management│                │
│  │ - Validate data │    │ - Batch loading │                │
│  └─────────────────┘    └─────────────────┘                │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │ Capability      │    │   Markdown      │                │
│  │ Parser          │    │   Parser        │                │
│  │                 │    │                 │                │
│  │ - YAML parsing  │◄──►│ - Section       │                │
│  │ - Structure     │    │   extraction    │                │
│  │   validation    │    │ - ORBIT parsing │                │
│  └─────────────────┘    └─────────────────┘                │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │   File System   │    │  Error Handling │                │
│  │   Interface     │    │                 │                │
│  │                 │    │ - Validation    │                │
│  │ - Fetch content │◄──►│ - Fallbacks     │                │
│  │ - Base path     │    │ - Recovery      │                │
│  │   detection     │    │ - Logging       │                │
│  └─────────────────┘    └─────────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Content Discovery**: ContentService discovers capability files using naming convention
2. **File Loading**: Fetch content from public/content directory with base path detection
3. **YAML Parsing**: Extract front matter metadata using gray-matter
4. **Markdown Processing**: Parse markdown content and extract ORBIT dimension sections
5. **Structure Validation**: Validate required fields and data integrity
6. **Caching**: Store parsed content in memory cache with TTL
7. **API Exposure**: Provide structured access through service methods

## Components and Interfaces

### ContentService

The main service class that orchestrates content loading and management:

```typescript
export class ContentService {
  private capabilities: CapabilityDefinition[] = [];
  private contentDirectory: string;
  private cache: Map<string, CachedContent> = new Map();
  private isClient: boolean;

  // Core methods
  async initialize(): Promise<void>
  getAllCapabilities(): CapabilityDefinition[]
  getCapability(id: string): CapabilityDefinition | null
  getCapabilitiesByDomain(domainName: string): CapabilityDefinition[]
  parseCapabilityContent(content: string): CapabilityDefinition
  
  // Private methods
  private async fetchCapabilitiesFromAPI(): Promise<void>
  private async loadCapabilityFile(filename: string): Promise<CapabilityDefinition>
  private getBasePath(): string
  private validateCapability(capability: CapabilityDefinition): boolean
}
```

### Capability Parser

Handles the parsing of YAML front matter and markdown content:

```typescript
export function parseCapabilityMarkdown(markdown: string): CapabilityDefinition {
  // Parse YAML front matter and markdown content
  // Extract ORBIT dimensions from structured sections
  // Validate data integrity
  // Return structured capability definition
}

export function parseDimension(content: string): DimensionDefinition {
  // Extract dimension description
  // Parse maturity level assessments
  // Extract individual maturity levels (1-5)
  // Return structured dimension data
}
```

### Content Cache

In-memory caching system for parsed content:

```typescript
interface CachedContent {
  data: CapabilityDefinition;
  timestamp: number;
  ttl: number;
}

class ContentCache {
  private cache: Map<string, CachedContent> = new Map();
  private defaultTTL: number = 300000; // 5 minutes
  
  set(key: string, data: CapabilityDefinition, ttl?: number): void
  get(key: string): CapabilityDefinition | null
  has(key: string): boolean
  clear(): void
  cleanup(): void
}
```

## Data Models

### Core Interfaces

```typescript
interface CapabilityDefinition {
  id: string;
  capabilityDomainName: string;
  capabilityAreaName: string;
  capabilityVersion: string;
  capabilityAreaCreated: string;
  capabilityAreaLastUpdated: string;
  description: string;
  domainDescription: string;
  areaDescription: string;
  dimensions: {
    outcome: DimensionDefinition;
    role: DimensionDefinition;
    businessProcess: DimensionDefinition;
    information: DimensionDefinition;
    technology: DimensionDefinition;
  };
}

interface DimensionDefinition {
  description: string;
  maturityAssessment: string[];
  maturityLevels: {
    level1: string;
    level2: string;
    level3: string;
    level4: string;
    level5: string;
  };
}

interface CapabilityFrontMatter {
  capabilityDomain: string;
  capabilityArea: string;
  capabilityVersion?: string;
  capabilityAreaCreated: string;
  capabilityAreaLastUpdated: string;
  assessmentCreated?: string;
  assessmentUpdated?: string;
  assessmentStatus?: string;
}
```

### File Structure

Content files follow the naming convention: `[domain]-[capability-area].md`

Example: `provider-enrollment.md`

```yaml
---
capabilityDomain: Provider
capabilityArea: Provider Enrollment
capabilityVersion: 1.1
capabilityAreaCreated: 2025-06-01
capabilityAreaLastUpdated: 2025-06-05
---

## Capability Domain: Provider
[Domain description]

## Capability Area: Provider Enrollment
[Area description]

## Outcomes
### Description
[Dimension description]

### Maturity Level Assessment
[Assessment guidance]

#### Level 1: Initial
[Level 1 description]

#### Level 2: Repeatable
[Level 2 description]

[... additional levels and dimensions]
```

## Error Handling

### Validation Strategy

1. **File Loading Errors**:
   - Network failures: Retry with exponential backoff
   - Missing files: Log warning and continue with available content
   - Invalid responses: Provide fallback content

2. **Parsing Errors**:
   - Invalid YAML: Log error and skip file
   - Malformed markdown: Attempt partial parsing
   - Missing required fields: Use default values where possible

3. **Content Validation**:
   - Missing ORBIT dimensions: Log warning and create empty dimension
   - Invalid maturity levels: Provide default level structure
   - Inconsistent structure: Report validation errors

### Error Recovery

```typescript
class ContentErrorHandler {
  handleFileLoadError(filename: string, error: Error): void
  handleParsingError(content: string, error: Error): CapabilityDefinition | null
  handleValidationError(capability: CapabilityDefinition, errors: ValidationError[]): CapabilityDefinition
  generateFallbackCapability(id: string): CapabilityDefinition
}
```

## Testing Strategy

### Unit Tests

1. **ContentService Tests**:
   - Content loading and caching
   - Error handling and recovery
   - API method functionality

2. **Parser Tests**:
   - YAML front matter parsing
   - Markdown section extraction
   - ORBIT dimension parsing
   - Maturity level extraction

3. **Validation Tests**:
   - Required field validation
   - Data structure integrity
   - Cross-reference validation

### Integration Tests

1. **End-to-End Content Loading**:
   - Load actual content files
   - Validate parsed structure
   - Test error scenarios

2. **Cache Performance**:
   - Memory usage optimization
   - TTL functionality
   - Batch loading efficiency

### Mock Data Strategy

```typescript
export const mockCapabilityContent = `
---
capabilityDomain: Test Domain
capabilityArea: Test Area
capabilityVersion: 1.0
capabilityAreaCreated: 2025-01-01
capabilityAreaLastUpdated: 2025-01-01
---

## Capability Domain: Test Domain
Test domain description

## Capability Area: Test Area
Test area description

## Outcomes
### Description
Test outcomes description

### Maturity Level Assessment
Test assessment guidance

#### Level 1: Initial
Test level 1 description
`;
```

## Performance Considerations

### Optimization Strategies

1. **Lazy Loading**: Load content files only when requested
2. **Batch Loading**: Group related content requests
3. **Memory Management**: Implement cache cleanup and TTL
4. **Base Path Detection**: Optimize for multi-branch deployment

### Caching Strategy

- **Memory Cache**: 5-minute TTL for parsed content
- **Browser Cache**: Leverage HTTP caching for static files
- **Preloading**: Load critical content during initialization

### Bundle Size Impact

- **Tree Shaking**: Ensure unused parsing utilities are removed
- **Code Splitting**: Separate content loading from core application
- **Compression**: Optimize markdown content for size