/**
 * Guards the generator's Node-safe model layer.
 *
 * Two jobs. First, the anti-drift job: `model.ts` re-declares three structural
 * constants because `src/constants/index.ts` reads `import.meta.env` and cannot be
 * imported from Node. Under vitest, Vite's transform makes that module importable, so
 * this is the one place both copies can be compared. If CMS changes which dimension a
 * domain aggregates and only one copy is updated, the tool and the workbook would
 * report different scores for identical input — a failure that would surface as a
 * state's numbers not reconciling, long after the cause.
 *
 * Second, it re-derives every count the workbook depends on from the JSON, so a model
 * update that changes a count fails here rather than silently producing a workbook
 * with the wrong number of rows.
 */

import { describe, expect, it } from 'vitest';

import {
  DOMAIN_AGGREGATE_DIMENSIONS as APP_DOMAIN_AGGREGATE_DIMENSIONS,
  isOrganizationalAssessmentArea as appIsOrganizationalAssessmentArea,
  ORGANIZATIONAL_ASSESSMENT_AREA_ID as APP_ORGANIZATIONAL_ASSESSMENT_AREA_ID,
  ORGANIZATIONAL_SECTIONS as APP_ORGANIZATIONAL_SECTIONS,
} from '../../src/constants';
import {
  getAggregatedDimensionForDomain as appGetAggregatedDimensionForDomain,
  getAllDimensionIds as appGetAllDimensionIds,
  getAspectsForDimension as appGetAspectsForDimension,
  getAspectCountForDimension as appGetAspectCountForDimension,
  getAssessableAspectCountForArea as appGetAssessableAspectCountForArea,
  getTotalAspectCount as appGetTotalAspectCount,
  getTotalOrganizationalAspectCount as appGetTotalOrganizationalAspectCount,
} from '../../src/services/orbit';

import {
  DOMAIN_AGGREGATE_DIMENSIONS,
  getAggregatedDimensionForDomain,
  getAllAreasWithDomains,
  getAllDomains,
  getAllOrganizationalAspectLocations,
  getAllStandardAspectLocations,
  getAspectCountForDimension,
  getAspectLocationsForDimension,
  getAssessableAspectCountForArea,
  getInputDimensionsForArea,
  getMaturityLevels,
  isOrganizationalAssessmentArea,
  getStandardAreasWithDomains,
  getTotalStandardAspectCount,
  LEVEL_KEYS,
  ORBIT_DIMENSION_IDS,
  ORGANIZATIONAL_ASSESSMENT_AREA_ID,
  ORGANIZATIONAL_SECTIONS,
} from './model.ts';

describe('generator model layer', () => {
  describe('parity with src/constants (anti-drift)', () => {
    it('re-declares DOMAIN_AGGREGATE_DIMENSIONS identically to the app', () => {
      expect(DOMAIN_AGGREGATE_DIMENSIONS).toEqual(APP_DOMAIN_AGGREGATE_DIMENSIONS);
    });

    it('re-declares ORGANIZATIONAL_SECTIONS identically to the app, in the same order', () => {
      expect(ORGANIZATIONAL_SECTIONS).toEqual(APP_ORGANIZATIONAL_SECTIONS);
    });

    it('re-declares ORGANIZATIONAL_ASSESSMENT_AREA_ID identically to the app', () => {
      expect(ORGANIZATIONAL_ASSESSMENT_AREA_ID).toBe(APP_ORGANIZATIONAL_ASSESSMENT_AREA_ID);
    });

    it('lists the ORBIT dimensions identically to the app, in the same order', () => {
      expect(ORBIT_DIMENSION_IDS).toEqual(appGetAllDimensionIds());
    });

    /**
     * The constant is not the whole contract — the **predicate** is. If the app ever
     * recognised a second organizational area, `ORGANIZATIONAL_ASSESSMENT_AREA_ID` could
     * stay identical, the constant parity test above would stay green, and the generator
     * would emit that area's 26 B-I-T rows onto sheet `04` for an area the tool never
     * asks about that way.
     */
    it('agrees with the app on whether each of the 72 areas is organizational', () => {
      const areas = getAllAreasWithDomains();
      expect(areas).toHaveLength(72);

      for (const { area } of areas) {
        expect(isOrganizationalAssessmentArea(area.id), area.id).toBe(
          appIsOrganizationalAssessmentArea(area.id)
        );
      }

      // And exactly one area is, so a change in either direction fails.
      expect(areas.filter(({ area }) => isOrganizationalAssessmentArea(area.id))).toHaveLength(1);
    });
  });

  describe('parity with src/services/orbit (anti-drift)', () => {
    it('agrees on the aspect count for every dimension', () => {
      for (const dimensionId of ORBIT_DIMENSION_IDS) {
        expect(getAspectCountForDimension(dimensionId)).toBe(
          appGetAspectCountForDimension(dimensionId)
        );
      }
    });

    it('agrees on the total standard aspect count', () => {
      expect(getTotalStandardAspectCount()).toBe(appGetTotalAspectCount());
    });

    it('agrees on the total organizational aspect count', () => {
      expect(getAllOrganizationalAspectLocations()).toHaveLength(
        appGetTotalOrganizationalAspectCount()
      );
    });

    it('agrees on the aggregated dimension for every domain', () => {
      for (const domain of getAllDomains()) {
        expect(getAggregatedDimensionForDomain(domain.id)).toBe(
          appGetAggregatedDimensionForDomain(domain.id)
        );
      }
    });

    /**
     * The one that matters most for scoring parity. The app uses this count as its
     * completion-percentage denominator, so a disagreement means the workbook and the
     * tool report different progress for the same state.
     */
    it('agrees on the assessable aspect count for all 72 areas', () => {
      const areas = getAllAreasWithDomains();
      expect(areas).toHaveLength(72);

      for (const { domain, area } of areas) {
        expect(getAssessableAspectCountForArea(area.id, domain.id)).toBe(
          appGetAssessableAspectCountForArea(area.id, domain.id)
        );
      }
    });
  });

  describe('structural counts, derived from the JSON', () => {
    it('has 14 domains across 3 layers, 3 strategic / 7 core / 4 support', () => {
      const domains = getAllDomains();
      expect(domains).toHaveLength(14);

      const byLayer = domains.reduce<Record<string, number>>((counts, domain) => {
        counts[domain.layer] = (counts[domain.layer] ?? 0) + 1;
        return counts;
      }, {});
      expect(byLayer).toEqual({ strategic: 3, core: 7, support: 4 });
    });

    it('has 72 areas, of which 71 are standard', () => {
      expect(getAllAreasWithDomains()).toHaveLength(72);
      expect(getStandardAreasWithDomains()).toHaveLength(71);
    });

    it('has 26 standard aspects: 5 Business Architecture, 10 Information, 11 Technology', () => {
      expect(getAspectCountForDimension('businessArchitecture')).toBe(5);
      expect(getAspectCountForDimension('information')).toBe(10);
      expect(getAspectCountForDimension('technology')).toBe(11);
      expect(getTotalStandardAspectCount()).toBe(26);
    });

    it('has 15 organizational aspects: 6 outcomes, 5 roles, 4 enterprise architecture', () => {
      const bySection = getAllOrganizationalAspectLocations().reduce<Record<string, number>>(
        (counts, location) => {
          counts[location.sectionId] = (counts[location.sectionId] ?? 0) + 1;
          return counts;
        },
        {}
      );
      expect(bySection).toEqual({
        outcomes: 6,
        roles: 5,
        'enterprise-architecture': 4,
      });
      expect(getAllOrganizationalAspectLocations()).toHaveLength(15);
    });

    it('has 41 aspects in total across standard and organizational', () => {
      expect(
        getAllStandardAspectLocations().length + getAllOrganizationalAspectLocations().length
      ).toBe(41);
    });

    it('defines exactly 5 levels for all 41 aspects', () => {
      const allAspects = [
        ...getAllStandardAspectLocations().map((location) => location.aspect),
        ...getAllOrganizationalAspectLocations().map((location) => location.aspect),
      ];
      expect(allAspects).toHaveLength(41);
      for (const aspect of allAspects) {
        expect(Object.keys(aspect.levels)).toEqual([...LEVEL_KEYS]);
      }
    });

    it('exposes level metadata for levels 1-5 plus Not Applicable', () => {
      const levels = getMaturityLevels();
      expect(Object.keys(levels)).toEqual([...LEVEL_KEYS, 'notApplicable']);
      expect(levels.level1.name).toBe('Initial');
      expect(levels.level5.name).toBe('Optimized');
      expect(levels.notApplicable.name).toBe('Not Applicable');
    });
  });

  describe('aggregate dimension omission (Decision P1)', () => {
    it('omits Information for Data Management areas', () => {
      const dataManagement = getAllDomains().find((domain) => domain.id === 'data-management');
      expect(dataManagement).toBeDefined();
      expect(dataManagement?.areas).toHaveLength(10);

      for (const area of dataManagement?.areas ?? []) {
        expect(getInputDimensionsForArea(area.id, 'data-management')).toEqual([
          'businessArchitecture',
          'technology',
        ]);
        expect(getAssessableAspectCountForArea(area.id, 'data-management')).toBe(16);
      }
    });

    it('omits Technology for Technology Management areas', () => {
      const technical = getAllDomains().find((domain) => domain.id === 'technical');
      expect(technical).toBeDefined();
      expect(technical?.areas).toHaveLength(11);

      for (const area of technical?.areas ?? []) {
        expect(getInputDimensionsForArea(area.id, 'technical')).toEqual([
          'businessArchitecture',
          'information',
        ]);
        expect(getAssessableAspectCountForArea(area.id, 'technical')).toBe(15);
      }
    });

    it('collects all three dimensions for every other standard area', () => {
      const aggregateDomainIds = new Set(Object.keys(DOMAIN_AGGREGATE_DIMENSIONS));
      const ordinary = getStandardAreasWithDomains().filter(
        ({ domain }) => !aggregateDomainIds.has(domain.id)
      );
      expect(ordinary).toHaveLength(50);

      for (const { domain, area } of ordinary) {
        expect(getInputDimensionsForArea(area.id, domain.id)).toEqual([...ORBIT_DIMENSION_IDS]);
        expect(getAssessableAspectCountForArea(area.id, domain.id)).toBe(26);
      }
    });

    it('collects no B-I-T dimensions for the organizational area', () => {
      expect(
        getInputDimensionsForArea(
          ORGANIZATIONAL_ASSESSMENT_AREA_ID,
          'enterprise-architecture-domain'
        )
      ).toEqual([]);
      expect(
        getAssessableAspectCountForArea(
          ORGANIZATIONAL_ASSESSMENT_AREA_ID,
          'enterprise-architecture-domain'
        )
      ).toBe(15);
    });

    /**
     * The arithmetic behind the 1,625 figure, spelled out so a future model change
     * shows which bucket moved rather than just that a total changed.
     */
    it('sums to 1,625 assessable standard rows: 50x26 + 10x16 + 11x15', () => {
      expect(50 * 26 + 10 * 16 + 11 * 15).toBe(1625);

      const total = getStandardAreasWithDomains().reduce(
        (sum, { domain, area }) => sum + getAssessableAspectCountForArea(area.id, domain.id),
        0
      );
      expect(total).toBe(1625);
    });
  });

  describe('Technology sub-dimension attribution', () => {
    /**
     * Wave 7's Technology formula is the mean of the two sub-dimension means, so it
     * must address each sub-dimension's rows separately. That is only possible if
     * every Technology aspect row carries its sub-dimension id — the app's own
     * `getAspectsForDimension` flattens and loses it.
     */
    it('attributes all 11 Technology aspects to a sub-dimension, 6 then 5', () => {
      const technologyAspects = getAllStandardAspectLocations().filter(
        (location) => location.dimensionId === 'technology'
      );
      expect(technologyAspects).toHaveLength(11);
      expect(technologyAspects.every((location) => location.subDimensionId !== null)).toBe(true);

      const bySubDimension = technologyAspects.reduce<Record<string, number>>(
        (counts, location) => {
          const key = location.subDimensionId ?? 'none';
          counts[key] = (counts[key] ?? 0) + 1;
          return counts;
        },
        {}
      );
      expect(bySubDimension).toEqual({
        technologyInfrastructureManagement: 6,
        applicationManagement: 5,
      });
    });

    it('attributes no sub-dimension to non-Technology aspects', () => {
      const others = getAllStandardAspectLocations().filter(
        (location) => location.dimensionId !== 'technology'
      );
      expect(others).toHaveLength(15);
      expect(others.every((location) => location.subDimensionId === null)).toBe(true);
    });

    /**
     * The sub-dimension whose id says "technology" but whose display name says
     * "Technical". Pinned because deriving one from the other is an easy and
     * plausible mistake, and it would put the wrong label on 6 aspects x 71 areas.
     */
    it('keeps the technologyInfrastructureManagement id and Technical Infrastructure Management name distinct', () => {
      const infrastructure = getAllStandardAspectLocations().find(
        (location) => location.subDimensionId === 'technologyInfrastructureManagement'
      );
      expect(infrastructure?.subDimensionName).toBe('Technical Infrastructure Management');
    });

    /**
     * Aspect **order** within a dimension, asserted against the app rather than left to
     * both sides happening to read the same JSON array. Wave 7's `AVERAGEIFS` ranges are
     * contiguous per sub-dimension, so a reordering that split a sub-dimension's rows
     * would silently change what those ranges cover.
     */
    it('emits aspects in the same order the app does, for every dimension', () => {
      for (const dimensionId of ORBIT_DIMENSION_IDS) {
        expect(
          getAspectLocationsForDimension(dimensionId).map((location) => location.aspect.id),
          dimensionId
        ).toEqual(appGetAspectsForDimension(dimensionId).map((aspect) => aspect.id));
      }
    });

    /**
     * And that each Technology sub-dimension's aspects are contiguous, which is the
     * property the formula ranges actually rely on.
     */
    it('keeps each Technology sub-dimension contiguous', () => {
      const subDimensionSequence = getAspectLocationsForDimension('technology').map(
        (location) => location.subDimensionId
      );
      const boundaries = subDimensionSequence.filter(
        (id, index) => index > 0 && id !== subDimensionSequence[index - 1]
      );
      expect(boundaries, 'Technology sub-dimensions are interleaved').toHaveLength(1);
    });
  });

  describe('id collisions', () => {
    /**
     * All 11 Technology aspect ids equal the 11 area ids in the `technical` domain,
     * and `enterprise-architecture` is both an organizational section id and an aspect
     * id inside that section. Pinned so that anyone tempted to key a lookup on an
     * aspect id alone sees why that breaks.
     */
    it('confirms Technology aspect ids collide with technical-domain area ids', () => {
      const technicalAreaIds = new Set(
        getAllDomains()
          .find((domain) => domain.id === 'technical')
          ?.areas.map((area) => area.id) ?? []
      );
      const technologyAspectIds = getAllStandardAspectLocations()
        .filter((location) => location.dimensionId === 'technology')
        .map((location) => location.aspect.id);

      const colliding = technologyAspectIds.filter((id) => technicalAreaIds.has(id));
      expect(colliding).toHaveLength(11);
    });

    it('confirms enterprise-architecture is both a section id and an aspect id', () => {
      expect(ORGANIZATIONAL_SECTIONS).toContain('enterprise-architecture');
      const aspectIds = getAllOrganizationalAspectLocations().map((location) => location.aspect.id);
      expect(aspectIds).toContain('enterprise-architecture');
    });
  });
});
