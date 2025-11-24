import { extractSections, parseMarkdown } from './markdownParser';

import type { CapabilityDefinition, CapabilityFrontMatter, DimensionDefinition } from '../types';

/**
 * Interface for capability dimensions (backward compatibility)
 */
export interface CapabilityDimension extends DimensionDefinition {
  assessmentQuestions?: string[];
}

/**
 * Parse capability markdown content
 * @param markdown Raw markdown content
 * @returns Parsed capability definition
 */
export function parseCapabilityMarkdown(markdown: string): CapabilityDefinition {
  const { metadata, content } = parseMarkdown(markdown);
  const sections = extractSections(content);
  // Map ContentMetadata to CapabilityFrontMatter
  const frontMatter: CapabilityFrontMatter = {
    capabilityDomain: (metadata.capabilityDomain as string) || metadata.businessArea || '',
    capabilityArea: (metadata.capabilityArea as string) || metadata.title || '',
    capabilityVersion: (metadata.capabilityVersion as string) || metadata.version || '1.0',
    capabilityAreaCreated:
      (metadata.capabilityAreaCreated as string) ||
      metadata.lastUpdated ||
      new Date().toISOString().split('T')[0],
    capabilityAreaLastUpdated:
      (metadata.capabilityAreaLastUpdated as string) ||
      metadata.lastUpdated ||
      new Date().toISOString().split('T')[0],
  };

  // Extract capability domain and area descriptions directly from the content
  let domainDescription = '';
  let areaDescription = '';

  if (content.includes('## Capability Domain:')) {
    domainDescription = content
      .split('## Capability Domain:')[1]
      .split('## Capability Area:')[0]
      .trim();
  }

  if (content.includes('## Capability Area:')) {
    areaDescription = content.split('## Capability Area:')[1].split('## ')[0].trim();
  }

  // Keep the original description for backward compatibility
  const description = areaDescription || domainDescription || '';

  // Extract dimensions based on the new structure
  const dimensions = {
    outcome: parseDimension(sections['Outcomes'] || ''),
    role: parseDimension(sections['Roles'] || ''),
    businessProcess: parseDimension(sections['Business Processes'] || ''),
    information: parseDimension(sections['Information'] || ''),
    technology: parseDimension(sections['Technology'] || ''),
  };

  // Generate ID from domain and area names
  const id = `${frontMatter.capabilityDomain}-${frontMatter.capabilityArea}`
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

  return {
    id,
    capabilityDomainName: frontMatter.capabilityDomain,
    capabilityAreaName: frontMatter.capabilityArea,
    capabilityVersion: frontMatter.capabilityVersion || '1.0',
    capabilityAreaCreated: frontMatter.capabilityAreaCreated,
    capabilityAreaLastUpdated: frontMatter.capabilityAreaLastUpdated,
    description,
    domainDescription,
    areaDescription,
    dimensions,
  };
}

/**
 * Parse dimension section
 * @param content Dimension section content
 * @returns Parsed dimension
 */
function parseDimension(content: string): DimensionDefinition {
  // Extract description from the Description subsection
  const descriptionMatch = content.match(/### Description\s*\n([\s\S]*?)(?=###|$)/m);
  const description = descriptionMatch ? descriptionMatch[1].trim() : '';

  // Extract maturity assessment text
  const assessmentMatch = content.match(/### Maturity Level Assessment\s*\n([\s\S]*?)(?=####|$)/m);
  const assessmentText = assessmentMatch ? assessmentMatch[1].trim() : '';
  const maturityAssessment = assessmentText ? [assessmentText] : [];

  // Extract maturity levels with more specific patterns
  const level1Content = extractMaturityLevel(content, 'Level 1: Ad Hoc');
  const level2Content = extractMaturityLevel(content, 'Level 2: Compliant');
  const level3Content = extractMaturityLevel(content, 'Level 3: Efficient');
  const level4Content = extractMaturityLevel(content, 'Level 4: Optimized');
  const level5Content = extractMaturityLevel(content, 'Level 5: Pioneering');

  const maturityLevels = {
    level1: level1Content,
    level2: level2Content,
    level3: level3Content,
    level4: level4Content,
    level5: level5Content,
  };

  // Extract checkbox items for each level
  const checkboxItems = {
    level1: extractCheckboxItems(level1Content),
    level2: extractCheckboxItems(level2Content),
    level3: extractCheckboxItems(level3Content),
    level4: extractCheckboxItems(level4Content),
    level5: extractCheckboxItems(level5Content),
  };

  return {
    description,
    maturityAssessment,
    maturityLevels,
    checkboxItems: Object.values(checkboxItems).some(items => items.length > 0)
      ? checkboxItems
      : undefined,
  };
}

/**
 * Extract maturity level content and checkboxes
 * @param content Dimension content
 * @param levelName Level name to extract (e.g., "Level 1: Initial")
 * @returns Level content
 */
function extractMaturityLevel(content: string, levelName: string): string {
  // Simple string splitting approach that's more reliable
  const levelHeader = `#### ${levelName}`;
  const startIndex = content.indexOf(levelHeader);

  if (startIndex === -1) {
    return '';
  }

  // Find the start of content after the header
  const contentStart = startIndex + levelHeader.length;
  let contentEnd = content.length;

  // Find the next level header
  const nextLevelIndex = content.indexOf('#### Level', contentStart);
  if (nextLevelIndex !== -1) {
    contentEnd = nextLevelIndex;
  }

  const result = content.substring(contentStart, contentEnd).trim();
  return result;
}

/**
 * Extract checkbox items from maturity level content
 * @param content Level content
 * @returns Array of checkbox items
 */
function extractCheckboxItems(content: string): string[] {
  const checkboxRegex = /^\s*-\s*\[\s*\]\s*(.+)$/gm;
  const items: string[] = [];
  let match;

  while ((match = checkboxRegex.exec(content)) !== null) {
    items.push(match[1].trim());
  }

  return items;
}

/**
 * Load all capability definitions from a directory
 * This function is meant to be used in a server context or during build time
 * @param capabilities Array of capability data objects
 * @returns Array of capability definitions
 */
export function loadCapabilityDefinitions(capabilityData: string[]): CapabilityDefinition[] {
  const capabilities: CapabilityDefinition[] = [];

  try {
    for (const content of capabilityData) {
      try {
        const capability = parseCapabilityMarkdown(content);
        capabilities.push(capability);
      } catch (error) {
        console.error(`Error parsing capability content:`, error);
      }
    }
  } catch (error) {
    console.error('Error loading capability definitions:', error);
  }

  return capabilities;
}
