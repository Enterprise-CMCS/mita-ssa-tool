/**
 * Tests for ORBIT Model Service
 */

import { describe, it, expect } from 'vitest';
import {
  getOrbitModel,
  getOrbitModelVersion,
  getAllDimensionIds,
  getRequiredDimensionIds,
  getOptionalDimensionIds,
  getDimension,
  getStandardDimensions,
  getTechnologyDimension,
  getTechnologySubDimensions,
  getTechnologySubDimension,
  getAspectsForDimension,
  getAspectsForSubDimension,
  getAspect,
  getMaturityLevelMeta,
  getAllMaturityLevels,
  getTotalAspectCount,
  getAspectCountForDimension,
  getRequiredAspectCount,
  isDimensionRequired,
  getSubDimensionForAspect,
  getAspectIdsForDimension,
  getAspectLocation,
  getOrganizationalAssessment,
  getOrganizationalAspects,
  getOrganizationalAspectCount,
  getOrganizationalAspect,
  getOrganizationalAssessmentTypes,
  getTotalOrganizationalAspectCount,
} from './orbit';

describe('orbit service', () => {
  describe('getOrbitModel', () => {
    it('should return the complete ORBIT model', () => {
      const model = getOrbitModel();
      expect(model).toBeDefined();
      expect(model.version).toBe('4.0');
      expect(model.dimensions).toBeDefined();
      expect(model.organizationalAssessments).toBeDefined();
    });
  });

  describe('getOrbitModelVersion', () => {
    it('should return the model version', () => {
      const version = getOrbitModelVersion();
      expect(version).toBe('4.0');
    });
  });

  describe('getAllDimensionIds', () => {
    it('should return the three B-I-T dimension IDs', () => {
      const ids = getAllDimensionIds();
      expect(ids).toEqual(['businessArchitecture', 'information', 'technology']);
    });
  });

  describe('getRequiredDimensionIds', () => {
    it('should return required dimension IDs (all B-I-T)', () => {
      const ids = getRequiredDimensionIds();
      expect(ids).toEqual(['businessArchitecture', 'information', 'technology']);
    });
  });

  describe('getOptionalDimensionIds', () => {
    it('should return empty array (O&R are now organizational assessments)', () => {
      const ids = getOptionalDimensionIds();
      expect(ids).toEqual([]);
    });
  });

  describe('getDimension', () => {
    it('should return the businessArchitecture dimension', () => {
      const dimension = getDimension('businessArchitecture');
      expect(dimension).toBeDefined();
      expect(dimension?.name).toBe('Business Architecture');
      expect(dimension?.required).toBe(true);
    });

    it('should return the information dimension', () => {
      const dimension = getDimension('information');
      expect(dimension).toBeDefined();
      expect(dimension?.name).toBe('Information');
      expect(dimension?.required).toBe(true);
    });

    it('should return the technology dimension', () => {
      const dimension = getDimension('technology');
      expect(dimension).toBeDefined();
      expect(dimension?.name).toBe('Technology');
      expect(dimension?.required).toBe(true);
    });
  });

  describe('getStandardDimensions', () => {
    it('should return two standard dimensions (B, I)', () => {
      const dimensions = getStandardDimensions();
      expect(dimensions.length).toBe(2);
      expect(dimensions.map((d) => d.id)).toEqual(['businessArchitecture', 'information']);
    });
  });

  describe('getTechnologyDimension', () => {
    it('should return the technology dimension with sub-dimensions', () => {
      const tech = getTechnologyDimension();
      expect(tech).toBeDefined();
      expect(tech.id).toBe('technology');
      expect(tech.subDimensions).toBeInstanceOf(Array);
      expect(tech.subDimensions.length).toBe(2);
    });
  });

  describe('getTechnologySubDimensions', () => {
    it('should return all technology sub-dimensions', () => {
      const subDimensions = getTechnologySubDimensions();
      expect(subDimensions.length).toBe(2);
    });
  });

  describe('getTechnologySubDimension', () => {
    it('should return a specific sub-dimension', () => {
      const subDim = getTechnologySubDimension('technologyInfrastructureManagement');
      expect(subDim).toBeDefined();
      expect(subDim?.name).toBe('Technical Infrastructure Management');
    });

    it('should return undefined for invalid sub-dimension', () => {
      const subDim = getTechnologySubDimension('invalid' as never);
      expect(subDim).toBeUndefined();
    });
  });

  describe('getAspectsForDimension', () => {
    it('should return aspects for businessArchitecture dimension', () => {
      const aspects = getAspectsForDimension('businessArchitecture');
      expect(aspects.length).toBeGreaterThan(0);
    });

    it('should return aspects for information dimension', () => {
      const aspects = getAspectsForDimension('information');
      expect(aspects.length).toBeGreaterThan(0);
    });

    it('should return all aspects for technology dimension', () => {
      const aspects = getAspectsForDimension('technology');
      expect(aspects.length).toBeGreaterThan(0);
    });

    it('should return empty array for invalid dimension', () => {
      const aspects = getAspectsForDimension('invalid' as never);
      expect(aspects).toEqual([]);
    });
  });

  describe('getAspectsForSubDimension', () => {
    it('should return aspects for a technology sub-dimension', () => {
      const aspects = getAspectsForSubDimension('technologyInfrastructureManagement');
      expect(aspects.length).toBeGreaterThan(0);
    });
  });

  describe('getAspect', () => {
    it('should return an aspect from businessArchitecture dimension', () => {
      const aspects = getAspectsForDimension('businessArchitecture');
      expect(aspects.length).toBeGreaterThan(0);
      const firstAspect = aspects[0];
      expect(firstAspect).toBeDefined();
      const aspect = getAspect('businessArchitecture', firstAspect!.id);
      expect(aspect).toBeDefined();
      expect(aspect?.id).toBe(firstAspect!.id);
    });

    it('should return an aspect from a technology sub-dimension', () => {
      const aspect = getAspect(
        'technology',
        'compute-and-storage',
        'technologyInfrastructureManagement'
      );
      expect(aspect).toBeDefined();
    });

    it('should return undefined for invalid aspect', () => {
      const aspect = getAspect('businessArchitecture', 'invalid');
      expect(aspect).toBeUndefined();
    });
  });

  describe('getMaturityLevelMeta', () => {
    it('should return metadata for a maturity level', () => {
      const meta = getMaturityLevelMeta('level1');
      expect(meta).toBeDefined();
      expect(meta.name).toBe('Initial');
    });

    it('should return metadata for N/A', () => {
      const meta = getMaturityLevelMeta('notApplicable');
      expect(meta).toBeDefined();
      expect(meta.name).toBe('Not Applicable');
    });
  });

  describe('getAllMaturityLevels', () => {
    it('should return all maturity level metadata', () => {
      const levels = getAllMaturityLevels();
      expect(levels.level1).toBeDefined();
      expect(levels.level2).toBeDefined();
      expect(levels.level3).toBeDefined();
      expect(levels.level4).toBeDefined();
      expect(levels.level5).toBeDefined();
      expect(levels.notApplicable).toBeDefined();
    });
  });

  describe('getTotalAspectCount', () => {
    it('should return total count of B-EA-I-T aspects', () => {
      const count = getTotalAspectCount();
      expect(count).toBe(26);
    });
  });

  describe('getAspectCountForDimension', () => {
    it('should return aspect count for businessArchitecture', () => {
      const count = getAspectCountForDimension('businessArchitecture');
      expect(count).toBeGreaterThan(0);
    });

    it('should return aspect count for information', () => {
      const count = getAspectCountForDimension('information');
      expect(count).toBeGreaterThan(0);
    });

    it('should return aspect count for technology (all sub-dimensions)', () => {
      const count = getAspectCountForDimension('technology');
      expect(count).toBe(11);
    });
  });

  describe('getRequiredAspectCount', () => {
    it('should return count of aspects in required dimensions only', () => {
      const count = getRequiredAspectCount();
      const businessCount = getAspectCountForDimension('businessArchitecture');
      const infoCount = getAspectCountForDimension('information');
      const techCount = getAspectCountForDimension('technology');
      expect(count).toBe(businessCount + infoCount + techCount);
    });
  });

  describe('isDimensionRequired', () => {
    it('should return true for businessArchitecture', () => {
      expect(isDimensionRequired('businessArchitecture')).toBe(true);
    });

    it('should return true for information', () => {
      expect(isDimensionRequired('information')).toBe(true);
    });

    it('should return true for technology', () => {
      expect(isDimensionRequired('technology')).toBe(true);
    });
  });

  describe('getSubDimensionForAspect', () => {
    it('should return sub-dimension for a technology aspect', () => {
      const subDim = getSubDimensionForAspect('compute-and-storage');
      expect(subDim).toBeDefined();
      expect(subDim?.id).toBe('technologyInfrastructureManagement');
    });

    it('should return undefined for non-technology aspect', () => {
      // Use a businessArchitecture aspect
      const aspects = getAspectsForDimension('businessArchitecture');
      expect(aspects.length).toBeGreaterThan(0);
      const subDim = getSubDimensionForAspect(aspects[0]!.id);
      expect(subDim).toBeUndefined();
    });
  });

  describe('getAspectIdsForDimension', () => {
    it('should return aspect IDs for businessArchitecture dimension', () => {
      const ids = getAspectIdsForDimension('businessArchitecture');
      expect(ids.length).toBeGreaterThan(0);
    });
  });

  describe('getAspectLocation', () => {
    it('should return location for a businessArchitecture aspect', () => {
      const aspects = getAspectsForDimension('businessArchitecture');
      expect(aspects.length).toBeGreaterThan(0);
      const location = getAspectLocation(aspects[0]!.id);
      expect(location).toBeDefined();
      expect(location?.dimensionId).toBe('businessArchitecture');
      expect(location?.subDimensionId).toBeUndefined();
    });

    it('should return location for a technology aspect', () => {
      const location = getAspectLocation('compute-and-storage');
      expect(location).toBeDefined();
      expect(location?.dimensionId).toBe('technology');
      expect(location?.subDimensionId).toBe('technologyInfrastructureManagement');
    });

    it('should return undefined for invalid aspect', () => {
      const location = getAspectLocation('invalid');
      expect(location).toBeUndefined();
    });
  });

  // Organizational Assessment Tests
  describe('getOrganizationalAssessment', () => {
    it('should return outcomes organizational assessment', () => {
      const assessment = getOrganizationalAssessment('outcomes');
      expect(assessment).toBeDefined();
      expect(assessment.id).toBe('outcomes');
      expect(assessment.name).toBe('Organizational Outcomes');
      expect(assessment.capabilityAreaId).toBe('enterprise-governance');
    });

    it('should return roles organizational assessment', () => {
      const assessment = getOrganizationalAssessment('roles');
      expect(assessment).toBeDefined();
      expect(assessment.id).toBe('roles');
      expect(assessment.name).toBe('Organizational Roles');
      expect(assessment.capabilityAreaId).toBe('enterprise-governance');
    });

    it('should point all organizational assessments at the combined area', () => {
      const ea = getOrganizationalAssessment('enterprise-architecture');
      expect(ea.capabilityAreaId).toBe('enterprise-governance');
    });
  });

  describe('getOrganizationalAspects', () => {
    it('should return aspects for outcomes', () => {
      const aspects = getOrganizationalAspects('outcomes');
      expect(aspects.length).toBe(6);
    });

    it('should return aspects for roles', () => {
      const aspects = getOrganizationalAspects('roles');
      expect(aspects.length).toBe(5);
    });
  });

  describe('getOrganizationalAspectCount', () => {
    it('should return 6 for outcomes', () => {
      const count = getOrganizationalAspectCount('outcomes');
      expect(count).toBe(6);
    });

    it('should return 5 for roles', () => {
      const count = getOrganizationalAspectCount('roles');
      expect(count).toBe(5);
    });
  });

  describe('getOrganizationalAspect', () => {
    it('should return a specific outcomes aspect', () => {
      const aspect = getOrganizationalAspect('outcomes', 'culture-mindset');
      expect(aspect).toBeDefined();
      expect(aspect?.name).toBe('Culture & Mindset');
    });

    it('should return undefined for invalid aspect', () => {
      const aspect = getOrganizationalAspect('outcomes', 'invalid');
      expect(aspect).toBeUndefined();
    });
  });

  describe('getOrganizationalAssessmentTypes', () => {
    it('should return all organizational assessment types', () => {
      const types = getOrganizationalAssessmentTypes();
      expect(types).toEqual(['outcomes', 'roles', 'enterprise-architecture']);
    });
  });

  describe('getTotalOrganizationalAspectCount', () => {
    it('should return 15 (6 outcomes + 5 roles + 4 enterprise architecture)', () => {
      const count = getTotalOrganizationalAspectCount();
      expect(count).toBe(15);
    });
  });
});
