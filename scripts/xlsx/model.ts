/**
 * Node-safe structural view of the MITA 4.0 model, for the build-time workbook
 * generator.
 *
 * ## Why this file exists rather than reusing `src/services/orbit.ts`
 *
 * `src/services/orbit.ts` is the application's model accessor and would be the
 * obvious thing to import. It cannot be: it imports `src/constants/index.ts`,
 * which reads `import.meta.env` at module scope (lines 23 and 41). `import.meta.env`
 * is `undefined` under plain Node, so touching it throws — the whole module graph
 * is unreachable from a Node script. `src/constants/draftNotice.ts` was split out
 * for exactly this reason and *is* imported directly by the generator.
 *
 * So this module re-reads the two JSON files and re-declares the three structural
 * constants it needs. That duplication is a parity risk: if CMS changes which
 * dimension a domain aggregates, the tool and the workbook would silently disagree.
 * `model.test.ts` therefore asserts every re-declared value against
 * `src/constants` — under vitest, where Vite's transform makes `import.meta.env`
 * available and the real module can be imported. The duplication is allowed to
 * exist; it is not allowed to drift.
 *
 * ## Reading the JSON
 *
 * Read with `readFileSync` rather than an `import ... with { type: 'json' }`
 * assertion. Node's type-stripping loader does not process import attributes, and
 * this module has to be loadable both by Node directly (the generator) and by Vite
 * (the tests).
 */

import { readFileSync } from 'node:fs';

import { fromRepoRoot } from './paths.ts';

// Type-only imports are erased entirely, so these never load the modules at
// runtime — which matters, because `src/types/index.ts` has a runtime export and
// would otherwise be pulled in. The explicit `.ts` extension is required by Node's
// ESM resolver and permitted by `allowImportingTsExtensions` in tsconfig.
import type {
  CapabilityArea,
  CapabilityDomain,
  CapabilityReferenceModel,
  LevelKey,
  MaturityLevelMeta,
  OrbitAspect,
  OrbitDimensionId,
  OrbitModel,
  OrganizationalAssessmentId,
  TechnologySubDimensionId,
} from '../../src/types/index.ts';

// =============================================================================
// Re-declared structural constants (see the drift note in the file header)
// =============================================================================

/**
 * Domains whose named dimension is an aggregate rather than a manual input.
 *
 * Mirrors `DOMAIN_AGGREGATE_DIMENSIONS` in `src/constants/index.ts`. Asserted
 * equal to it in `model.test.ts`.
 */
export const DOMAIN_AGGREGATE_DIMENSIONS: Readonly<Record<string, OrbitDimensionId>> = {
  'data-management': 'information',
  technical: 'technology',
};

/**
 * The single capability area assessed organizationally rather than per-dimension.
 * Mirrors `ORGANIZATIONAL_ASSESSMENT_AREA_ID`.
 */
export const ORGANIZATIONAL_ASSESSMENT_AREA_ID = 'enterprise-governance';

/**
 * The organizational sections, in display order. Mirrors `ORGANIZATIONAL_SECTIONS`.
 */
export const ORGANIZATIONAL_SECTIONS: readonly OrganizationalAssessmentId[] = [
  'outcomes',
  'roles',
  'enterprise-architecture',
];

/** The three ORBIT dimensions assessed per capability area, in display order. */
export const ORBIT_DIMENSION_IDS: readonly OrbitDimensionId[] = [
  'businessArchitecture',
  'information',
  'technology',
];

/** The five maturity level keys, in order. */
export const LEVEL_KEYS: readonly LevelKey[] = ['level1', 'level2', 'level3', 'level4', 'level5'];

// =============================================================================
// Data loading
// =============================================================================

function readJson<T>(...segments: string[]): T {
  return JSON.parse(readFileSync(fromRepoRoot(...segments), 'utf8')) as T;
}

const capabilityModel = readJson<CapabilityReferenceModel>('src', 'data', 'capabilities.json');
const orbitModel = readJson<OrbitModel>('src', 'data', 'orbit-model.json');

/** The capability reference model, as shipped in `src/data/capabilities.json`. */
export function getCapabilityModel(): CapabilityReferenceModel {
  return capabilityModel;
}

/** The ORBIT maturity model, as shipped in `src/data/orbit-model.json`. */
export function getOrbitModel(): OrbitModel {
  return orbitModel;
}

/** All 14 capability domains, in model order. */
export function getAllDomains(): CapabilityDomain[] {
  return capabilityModel.domains;
}

/** Maturity level metadata (names and generic descriptions), levels 1-5 plus N/A. */
export function getMaturityLevels(): Record<LevelKey | 'notApplicable', MaturityLevelMeta> {
  return orbitModel.maturityLevels;
}

// =============================================================================
// Dimension and aspect traversal
// =============================================================================

/**
 * One aspect together with its full location in the model.
 *
 * `subDimensionId` is set only for Technology aspects. Every id needed to key a
 * rating is present, because **aspect ids are not globally unique**: all 11
 * Technology aspect ids collide with the 11 capability area ids in the
 * `technical` domain, and `enterprise-architecture` is simultaneously an
 * organizational section id and an aspect id inside that section. Nothing may be
 * keyed on an aspect id alone.
 */
export interface AspectLocation {
  dimensionId: OrbitDimensionId;
  dimensionName: string;
  subDimensionId: TechnologySubDimensionId | null;
  subDimensionName: string | null;
  aspect: OrbitAspect;
}

/** Display name of a standard ORBIT dimension. */
export function getDimensionName(dimensionId: OrbitDimensionId): string {
  return orbitModel.dimensions[dimensionId].name;
}

/**
 * Every aspect of one dimension, with its location attached.
 *
 * For `technology` this walks the two sub-dimensions in order and preserves
 * sub-dimension attribution — unlike `getAspectsForDimension` in
 * `src/services/orbit.ts`, which flattens and discards it. The workbook needs the
 * attribution because Wave 7's Technology score is the mean of the two
 * sub-dimension means, so the formulas must address each sub-dimension's rows
 * separately.
 */
export function getAspectLocationsForDimension(dimensionId: OrbitDimensionId): AspectLocation[] {
  if (dimensionId === 'technology') {
    const dimension = orbitModel.dimensions.technology;
    return dimension.subDimensions.flatMap((subDimension) =>
      subDimension.aspects.map((aspect) => ({
        dimensionId,
        dimensionName: dimension.name,
        subDimensionId: subDimension.id,
        subDimensionName: subDimension.name,
        aspect,
      }))
    );
  }

  const dimension = orbitModel.dimensions[dimensionId];
  return dimension.aspects.map((aspect) => ({
    dimensionId,
    dimensionName: dimension.name,
    subDimensionId: null,
    subDimensionName: null,
    aspect,
  }));
}

/** Every standard aspect across all three dimensions, in display order. 26 of them. */
export function getAllStandardAspectLocations(): AspectLocation[] {
  return ORBIT_DIMENSION_IDS.flatMap((dimensionId) => getAspectLocationsForDimension(dimensionId));
}

/** Aspect count for one dimension: 5, 10, or 11. */
export function getAspectCountForDimension(dimensionId: OrbitDimensionId): number {
  return getAspectLocationsForDimension(dimensionId).length;
}

/** Total standard aspect count across all three dimensions. */
export function getTotalStandardAspectCount(): number {
  return getAllStandardAspectLocations().length;
}

// =============================================================================
// Organizational assessment
// =============================================================================

/** One organizational aspect with its section attached. */
export interface OrganizationalAspectLocation {
  sectionId: OrganizationalAssessmentId;
  sectionName: string;
  aspect: OrbitAspect;
}

/**
 * Display name of an organizational section.
 *
 * Deleted in Wave 6 as an unused export and reinstated here, now that `06_Maturity_Profile` has a
 * row per section and needs to label it. That is the rule working as intended rather than churn:
 * an export lands when its consumer exists, not a wave early.
 */
export function getOrganizationalSectionName(sectionId: OrganizationalAssessmentId): string {
  return orbitModel.organizationalAssessments[sectionId].name;
}

/** Every organizational aspect across the three sections, in display order. 15 of them. */
export function getAllOrganizationalAspectLocations(): OrganizationalAspectLocation[] {
  return ORGANIZATIONAL_SECTIONS.flatMap((sectionId) => {
    const section = orbitModel.organizationalAssessments[sectionId];
    return section.aspects.map((aspect) => ({
      sectionId,
      sectionName: section.name,
      aspect,
    }));
  });
}

/** Whether an area is the combined organizational assessment area. */
export function isOrganizationalAssessmentArea(areaId: string): boolean {
  return areaId === ORGANIZATIONAL_ASSESSMENT_AREA_ID;
}

// =============================================================================
// Aggregate dimensions (Decision P1)
// =============================================================================

/**
 * The dimension a domain aggregates instead of assessing, or `null`.
 *
 * Mirrors `getAggregatedDimensionForDomain` in `src/services/orbit.ts`.
 */
export function getAggregatedDimensionForDomain(domainId: string): OrbitDimensionId | null {
  return DOMAIN_AGGREGATE_DIMENSIONS[domainId] ?? null;
}

/**
 * The dimensions a given area actually takes input for, in display order.
 *
 * Under Decision P1(a) the workbook omits input rows for a domain's aggregated
 * dimension, matching the tool: `buildStandardNavItems` in
 * `src/pages/Assessment.tsx` renders no aspect rows for it, so a state using the
 * workbook must not be asked for values the tool never collects.
 *
 * Returns an empty array for the organizational area, which has no B-I-T
 * dimensions at all — its aspects live on their own sheet.
 */
export function getInputDimensionsForArea(areaId: string, domainId: string): OrbitDimensionId[] {
  if (isOrganizationalAssessmentArea(areaId)) {
    return [];
  }
  const aggregated = getAggregatedDimensionForDomain(domainId);
  return ORBIT_DIMENSION_IDS.filter((dimensionId) => dimensionId !== aggregated);
}

/**
 * Count of aspects a state can actually enter for an area.
 *
 * Mirrors `getAssessableAspectCountForArea` in `src/services/orbit.ts`, which is
 * the tool's completion-percentage denominator. Keeping these equal is what stops
 * the workbook and the tool reporting different progress for the same input.
 */
export function getAssessableAspectCountForArea(areaId: string, domainId: string): number {
  if (isOrganizationalAssessmentArea(areaId)) {
    return getAllOrganizationalAspectLocations().length;
  }
  return getInputDimensionsForArea(areaId, domainId).reduce(
    (total, dimensionId) => total + getAspectCountForDimension(dimensionId),
    0
  );
}

// =============================================================================
// Flattened area list
// =============================================================================

/** A capability area together with its parent domain's fields. */
export interface AreaWithDomain {
  domain: CapabilityDomain;
  area: CapabilityArea;
}

/** All 72 capability areas with their domains, in model order. */
export function getAllAreasWithDomains(): AreaWithDomain[] {
  return capabilityModel.domains.flatMap((domain) =>
    domain.areas.map((area) => ({ domain, area }))
  );
}

/**
 * The 71 standard capability areas — every area except the organizational one.
 *
 * These are the areas sheet `04_Assessment_Input` covers. The organizational area
 * is excluded because its 15 aspects are not B-I-T aspects and go on sheet `05`.
 */
export function getStandardAreasWithDomains(): AreaWithDomain[] {
  return getAllAreasWithDomains().filter(({ area }) => !isOrganizationalAssessmentArea(area.id));
}
