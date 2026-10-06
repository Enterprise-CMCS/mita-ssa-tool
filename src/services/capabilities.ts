/**
 * Capability Data Service
 *
 * Provides access to the capability reference model data.
 * Capabilities define WHAT can be assessed (domains and areas).
 * The ORBIT model defines HOW they are assessed (maturity criteria).
 */

import capabilitiesData from '../data/capabilities.json';
import type {
  CapabilityReferenceModel,
  CapabilityDomain,
  CapabilityArea,
  CapabilityLayer,
} from '../types';

// Type assertion for imported JSON
const capabilities = capabilitiesData as CapabilityReferenceModel;

/**
 * Get the complete capability reference model
 * @returns The full capability reference model with all domains and areas
 */
export function getCapabilityModel(): CapabilityReferenceModel {
  return capabilities;
}

/**
 * Get all capability domains
 * @returns Array of all capability domains
 */
export function getAllDomains(): CapabilityDomain[] {
  return capabilities.domains;
}

/**
 * Get capability domains by layer
 * @param layer - The layer to filter by
 * @returns Array of domains in the specified layer
 */
export function getDomainsByLayer(layer: CapabilityLayer): CapabilityDomain[] {
  return capabilities.domains.filter((d) => d.layer === layer);
}

/**
 * Get a specific domain by ID
 * @param domainId - The domain ID to find
 * @returns The domain if found, undefined otherwise
 */
export function getDomainById(domainId: string): CapabilityDomain | undefined {
  return capabilities.domains.find((d) => d.id === domainId);
}

/**
 * Get a specific domain by name (case-insensitive)
 * @param name - The domain name to find
 * @returns The domain if found, undefined otherwise
 */
export function getDomainByName(name: string): CapabilityDomain | undefined {
  const lowerName = name.toLowerCase();
  return capabilities.domains.find((d) => d.name.toLowerCase() === lowerName);
}

/**
 * Get all capability areas across all domains
 * @returns Flat array of all capability areas
 */
export function getAllAreas(): CapabilityArea[] {
  return capabilities.domains.flatMap((d) => d.areas);
}

/**
 * Get all capability areas for a specific domain
 * @param domainId - The domain ID
 * @returns Array of capability areas in the domain
 */
export function getAreasByDomainId(domainId: string): CapabilityArea[] {
  const domain = getDomainById(domainId);
  return domain?.areas ?? [];
}

/**
 * Get a specific capability area by ID
 * @param areaId - The area ID to find
 * @returns The area if found, undefined otherwise
 */
export function getAreaById(areaId: string): CapabilityArea | undefined {
  for (const domain of capabilities.domains) {
    const area = domain.areas.find((a) => a.id === areaId);
    if (area) return area;
  }
  return undefined;
}

/**
 * Get a capability area with its parent domain info
 * @param areaId - The area ID to find
 * @returns Object with area and domain, or undefined if not found
 */
export function getAreaWithDomain(areaId: string):
  | {
      area: CapabilityArea;
      domain: CapabilityDomain;
    }
  | undefined {
  for (const domain of capabilities.domains) {
    const area = domain.areas.find((a) => a.id === areaId);
    if (area) {
      return { area, domain };
    }
  }
  return undefined;
}

/**
 * Get the domain that contains a specific area
 * @param areaId - The area ID
 * @returns The parent domain if found, undefined otherwise
 */
export function getDomainForArea(areaId: string): CapabilityDomain | undefined {
  return capabilities.domains.find((d) => d.areas.some((a) => a.id === areaId));
}

/**
 * Get total count of capability areas
 * @returns Total number of capability areas across all domains
 */
export function getTotalAreaCount(): number {
  return capabilities.domains.reduce((sum, d) => sum + d.areas.length, 0);
}

/**
 * Get total count of capability domains
 * @returns Total number of capability domains
 */
export function getTotalDomainCount(): number {
  return capabilities.domains.length;
}

/**
 * Search capability areas by name, description, or topics (case-insensitive partial match)
 * @param query - Search query string
 * @returns Array of matching areas with their parent domains
 */
export function searchAreas(query: string): Array<{
  area: CapabilityArea;
  domain: CapabilityDomain;
}> {
  const lowerQuery = query.toLowerCase();
  const results: Array<{
    area: CapabilityArea;
    domain: CapabilityDomain;
  }> = [];

  for (const domain of capabilities.domains) {
    for (const area of domain.areas) {
      if (matchesSearch(area, lowerQuery)) {
        results.push({ area, domain });
      }
    }
  }

  return results;
}

/**
 * Check if an area matches a search query
 */
function matchesSearch(area: CapabilityArea, lowerQuery: string): boolean {
  return (
    area.name.toLowerCase().includes(lowerQuery) ||
    area.description.toLowerCase().includes(lowerQuery) ||
    area.topics.some((t) => t.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Get capability model version
 * @returns The version string of the capability model
 */
export function getCapabilityModelVersion(): string {
  return capabilities.version;
}
