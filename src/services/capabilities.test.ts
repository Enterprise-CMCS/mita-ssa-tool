/**
 * Tests for Capability Data Service
 */

import { describe, it, expect } from 'vitest';
import {
  getCapabilityModel,
  getAllDomains,
  getDomainById,
  getDomainByName,
  getDomainsByLayer,
  getAllAreas,
  getAreasByDomainId,
  getAreaById,
  getAreaWithDomain,
  getDomainForArea,
  getTotalAreaCount,
  getTotalDomainCount,
  searchAreas,
  getCapabilityModelVersion,
} from './capabilities';
import { ORGANIZATIONAL_ASSESSMENT_AREA_ID } from '../constants';

describe('capabilities service', () => {
  describe('getCapabilityModel', () => {
    it('should return the complete capability model', () => {
      const model = getCapabilityModel();
      expect(model).toBeDefined();
      expect(model.version).toBe('4.0');
      expect(model.domains).toBeInstanceOf(Array);
      expect(model.domains.length).toBeGreaterThan(0);
    });
  });

  describe('getAllDomains', () => {
    it('should return all capability domains', () => {
      const domains = getAllDomains();
      expect(domains).toBeInstanceOf(Array);
      expect(domains.length).toBe(14);
    });

    it('should have required properties on each domain', () => {
      const domains = getAllDomains();
      for (const domain of domains) {
        expect(domain.id).toBeDefined();
        expect(domain.name).toBeDefined();
        expect(domain.description).toBeDefined();
        expect(domain.layer).toBeDefined();
        expect(domain.areas).toBeInstanceOf(Array);
        expect(domain.areas.length).toBeGreaterThan(0);
      }
    });

    it('should have no category tier (metamodel is strictly Domain -> Area)', () => {
      const domains = getAllDomains();
      for (const domain of domains) {
        expect('categories' in domain).toBe(false);
      }
    });
  });

  describe('getDomainsByLayer', () => {
    it('should return strategic domains', () => {
      const domains = getDomainsByLayer('strategic');
      expect(domains.length).toBe(3);
      expect(domains.every((d) => d.layer === 'strategic')).toBe(true);
    });

    it('should return core domains', () => {
      const domains = getDomainsByLayer('core');
      expect(domains.length).toBe(7);
      expect(domains.every((d) => d.layer === 'core')).toBe(true);
    });

    it('should return support domains', () => {
      const domains = getDomainsByLayer('support');
      expect(domains.length).toBe(4);
      expect(domains.every((d) => d.layer === 'support')).toBe(true);
    });

    it('should place Enterprise Architecture in the strategic layer', () => {
      const domains = getDomainsByLayer('strategic');
      expect(domains.some((d) => d.id === 'enterprise-architecture-domain')).toBe(true);
    });
  });

  describe('getDomainById', () => {
    it('should return domain when found', () => {
      const domain = getDomainById('provider-management');
      expect(domain).toBeDefined();
      expect(domain?.name).toBe('Provider Management');
    });

    it('should return renamed domains under their new names', () => {
      expect(getDomainById('data-management')?.name).toBe('Data Management');
      expect(getDomainById('technical')?.name).toBe('Technology Management');
    });

    it('should not contain removed domains', () => {
      expect(getDomainById('business-relationship-management')).toBeUndefined();
      expect(getDomainById('enterprise-governance')).toBeUndefined();
    });

    it('should return undefined when not found', () => {
      const domain = getDomainById('non-existent');
      expect(domain).toBeUndefined();
    });
  });

  describe('getDomainByName', () => {
    it('should return domain when found (case-insensitive)', () => {
      const domain = getDomainByName('PROVIDER MANAGEMENT');
      expect(domain).toBeDefined();
      expect(domain?.id).toBe('provider-management');
    });

    it('should return undefined when not found', () => {
      const domain = getDomainByName('Non Existent Domain');
      expect(domain).toBeUndefined();
    });
  });

  describe('getAllAreas', () => {
    it('should return all 72 capability areas', () => {
      const areas = getAllAreas();
      expect(areas).toBeInstanceOf(Array);
      expect(areas.length).toBe(72);
    });

    it('should have required properties on each area', () => {
      const areas = getAllAreas();
      for (const area of areas) {
        expect(area.id).toBeDefined();
        expect(area.name).toBeDefined();
        expect(area.description).toBeDefined();
        expect(area.topics).toBeInstanceOf(Array);
      }
    });

    it('should have unique area ids', () => {
      const areas = getAllAreas();
      const ids = new Set(areas.map((a) => a.id));
      expect(ids.size).toBe(areas.length);
    });

    it('should flag exactly 11 Information Management areas', () => {
      const flagged = getAllAreas().filter((a) => a.informationManagement);
      expect(flagged.length).toBe(11);
      expect(flagged.every((a) => a.name.endsWith('Information Management'))).toBe(true);
    });
  });

  describe('getAreasByDomainId', () => {
    it('should return areas for a standard domain', () => {
      const areas = getAreasByDomainId('provider-management');
      expect(areas).toBeInstanceOf(Array);
      expect(areas.length).toBe(5);
    });

    it('should return flat areas for Data Management', () => {
      const areas = getAreasByDomainId('data-management');
      expect(areas).toBeInstanceOf(Array);
      expect(areas.length).toBe(10);
    });

    it('should return flat areas for Technology Management', () => {
      const areas = getAreasByDomainId('technical');
      expect(areas.length).toBe(11);
    });

    it('should return the single combined organizational area for Enterprise Architecture', () => {
      const areas = getAreasByDomainId('enterprise-architecture-domain');
      expect(areas.length).toBe(1);
      expect(areas[0]?.id).toBe(ORGANIZATIONAL_ASSESSMENT_AREA_ID);
    });

    it('should return empty array for invalid domain', () => {
      const areas = getAreasByDomainId('non-existent');
      expect(areas).toEqual([]);
    });
  });

  describe('getAreaById', () => {
    it('should return area when found', () => {
      const area = getAreaById('provider-enrollment');
      expect(area).toBeDefined();
      expect(area?.name).toBe('Provider Enrollment');
    });

    it('should return renamed areas under their new ids', () => {
      expect(getAreaById('provider-eligibility')?.name).toBe('Provider Eligibility');
      expect(getAreaById('member-eligibility')?.name).toBe('Member Eligibility');
      expect(getAreaById('data-quality-management')?.name).toBe('Data Quality Management');
    });

    it('should not contain removed or superseded area ids', () => {
      expect(getAreaById('provider-screening')).toBeUndefined();
      expect(getAreaById('state-plan-administration')).toBeUndefined();
      expect(getAreaById('business-intelligence-data-science')).toBeUndefined();
      expect(getAreaById('organizational-outcomes')).toBeUndefined();
      expect(getAreaById('organizational-roles')).toBeUndefined();
      expect(getAreaById('organizational-enterprise-architecture')).toBeUndefined();
    });

    it('should return undefined when not found', () => {
      const area = getAreaById('non-existent');
      expect(area).toBeUndefined();
    });
  });

  describe('getAreaWithDomain', () => {
    it('should return area with its parent domain', () => {
      const result = getAreaWithDomain('provider-enrollment');
      expect(result).toBeDefined();
      expect(result?.area.id).toBe('provider-enrollment');
      expect(result?.domain.id).toBe('provider-management');
    });

    it('should place Waiver Management under Plan and Policy Management', () => {
      const result = getAreaWithDomain('waiver-management');
      expect(result?.domain.id).toBe('plan-policy-management');
    });

    it('should return undefined when area not found', () => {
      const result = getAreaWithDomain('non-existent');
      expect(result).toBeUndefined();
    });
  });

  describe('getDomainForArea', () => {
    it('should return parent domain for an area', () => {
      const domain = getDomainForArea('provider-enrollment');
      expect(domain).toBeDefined();
      expect(domain?.id).toBe('provider-management');
    });

    it('should return parent domain for a Data Management area', () => {
      const domain = getDomainForArea('data-governance');
      expect(domain).toBeDefined();
      expect(domain?.id).toBe('data-management');
    });

    it('should return undefined when area not found', () => {
      const domain = getDomainForArea('non-existent');
      expect(domain).toBeUndefined();
    });
  });

  describe('getTotalAreaCount', () => {
    it('should return total count of all areas', () => {
      const count = getTotalAreaCount();
      expect(count).toBe(72);
    });
  });

  describe('getTotalDomainCount', () => {
    it('should return total count of all domains', () => {
      const count = getTotalDomainCount();
      expect(count).toBe(14);
    });
  });

  describe('searchAreas', () => {
    it('should find areas by name', () => {
      const results = searchAreas('provider');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.area.id === 'provider-enrollment')).toBe(true);
    });

    it('should find areas by description', () => {
      const results = searchAreas('enrollment');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should find areas by topics', () => {
      const results = searchAreas('HIPAA');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should be case-insensitive', () => {
      const results = searchAreas('PROVIDER');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should return empty array when no matches', () => {
      const results = searchAreas('xyznonexistent');
      expect(results).toEqual([]);
    });

    it('should include the parent domain in results', () => {
      const results = searchAreas('data governance');
      const dataGovResult = results.find((r) => r.area.id === 'data-governance');
      expect(dataGovResult).toBeDefined();
      expect(dataGovResult?.domain.id).toBe('data-management');
    });
  });

  describe('getCapabilityModelVersion', () => {
    it('should return the model version', () => {
      const version = getCapabilityModelVersion();
      expect(version).toBe('4.0');
    });
  });

  describe('placeholder descriptions', () => {
    it('should mark new areas with an explicit placeholder prefix', () => {
      const newArea = getAreaById('program-administration');
      expect(newArea?.description.startsWith('[Placeholder')).toBe(true);
    });

    it('should not mark carried-forward areas as placeholders', () => {
      const existing = getAreaById('provider-enrollment');
      expect(existing?.description.startsWith('[Placeholder')).toBe(false);
    });
  });
});
