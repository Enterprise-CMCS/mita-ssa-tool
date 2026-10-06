/**
 * CSV Export Service Tests
 *
 * Tests for CSV generation and parsing of maturity profiles.
 * Standard assessments use B-EA-I-T dimensions only.
 * Organizational assessments use direct aspects with "Aspect" header.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  generateMaturityProfileCsv,
  generateCombinedMaturityProfileCsv,
  parseMaturityProfileCsv,
} from './csvExport';
import { DRAFT_NOTICE_LINE } from '../../constants';
import type { MaturityProfile, CapabilityAreaProfile } from './types';

describe('csvExport', () => {
  /**
   * Creates a standard capability area profile with B-EA-I-T dimensions
   */
  const createStandardAreaProfile = (
    domainName: string,
    areaName: string,
    rows: CapabilityAreaProfile['rows'] = []
  ): CapabilityAreaProfile => ({
    domainName,
    areaName,
    rows:
      rows.length > 0
        ? rows
        : [
            {
              dimension: 'Business Architecture',
              asIs: '3.5',
              toBe: '4.5',
              notes: 'BA notes',
              barriers: '',
              plans: 'BA plans',
            },
            {
              dimension: 'Information',
              asIs: '2.0',
              toBe: '3.0',
              notes: '',
              barriers: 'Data barriers',
              plans: '',
            },
            {
              dimension: 'Technology',
              asIs: '3.0',
              toBe: '4.0',
              notes: 'Tech notes',
              barriers: 'Tech barriers',
              plans: 'Tech plans',
            },
          ],
  });

  /**
   * Creates an organizational assessment profile (Outcomes or Roles)
   */
  const createOrganizationalAreaProfile = (
    domainName: string,
    areaName: string,
    rows: CapabilityAreaProfile['rows'] = []
  ): CapabilityAreaProfile => ({
    domainName,
    areaName,
    isOrganizationalAssessment: true,
    rows:
      rows.length > 0
        ? rows
        : [
            {
              dimension: 'Aspect 1',
              asIs: '3.0',
              toBe: '4.0',
              notes: 'Aspect 1 notes',
              barriers: '',
              plans: '',
            },
            {
              dimension: 'Aspect 2',
              asIs: '2.5',
              toBe: '3.5',
              notes: '',
              barriers: 'Some barriers',
              plans: 'Some plans',
            },
          ],
  });

  const createProfile = (
    stateName: string,
    domainName: string,
    areas: CapabilityAreaProfile[]
  ): MaturityProfile => ({
    stateName,
    domainName,
    areas,
  });

  describe('generateMaturityProfileCsv - Standard Assessments', () => {
    it('should generate CSV with correct header', () => {
      const profile = createProfile('Test State', 'Provider Management', [
        createStandardAreaProfile('Provider Management', 'Provider Enrollment'),
      ]);

      const csv = generateMaturityProfileCsv(profile);

      expect(csv).toContain('MITA 4.0 Maturity Profile: Test State');
    });

    it('should include domain and area headers', () => {
      const profile = createProfile('Test State', 'Provider Management', [
        createStandardAreaProfile('Provider Management', 'Provider Enrollment'),
      ]);

      const csv = generateMaturityProfileCsv(profile);

      expect(csv).toContain('Capability Domain: Provider Management');
      expect(csv).toContain('Capability Area: Provider Enrollment');
    });

    it('should include ORBIT column headers for standard assessments', () => {
      const profile = createProfile('Test State', 'Provider Management', [
        createStandardAreaProfile('Provider Management', 'Provider Enrollment'),
      ]);

      const csv = generateMaturityProfileCsv(profile);

      expect(csv).toContain('ORBIT,As Is,To Be,Notes,Barriers & Challenges,Advancement Plans');
    });

    it('should include B-EA-I-T dimensions in order', () => {
      const profile = createProfile('Test State', 'Provider Management', [
        createStandardAreaProfile('Provider Management', 'Provider Enrollment'),
      ]);

      const csv = generateMaturityProfileCsv(profile);
      const lines = csv.split('\n');

      // Find the data rows (after column headers)
      const headerIndex = lines.findIndex((l) => l.startsWith('ORBIT,'));
      expect(headerIndex).toBeGreaterThan(-1);

      const dataLines = lines.slice(headerIndex + 1, headerIndex + 5);
      expect(dataLines[0]).toContain('Business Architecture');
      expect(dataLines[1]).toContain('Information');
      expect(dataLines[2]).toContain('Technology');
    });

    it('should NOT include Outcomes or Roles dimensions', () => {
      const profile = createProfile('Test State', 'Provider Management', [
        createStandardAreaProfile('Provider Management', 'Provider Enrollment'),
      ]);

      const csv = generateMaturityProfileCsv(profile);
      const lines = csv.split('\n');

      // Find data rows
      const headerIndex = lines.findIndex((l) => l.startsWith('ORBIT,'));
      const dataLines = lines.slice(headerIndex + 1, headerIndex + 6);

      // Should only have 3 dimension rows (B-I-T)
      const dimensionRows = dataLines.filter((l) => l && !l.startsWith(',,,,,') && l.trim() !== '');
      expect(dimensionRows.length).toBe(3);

      // Should not contain Outcomes or Roles
      expect(csv).not.toMatch(/^Outcomes,/m);
      expect(csv).not.toMatch(/^Roles,/m);
    });

    it('should include score values', () => {
      const profile = createProfile('Test State', 'Provider Management', [
        createStandardAreaProfile('Provider Management', 'Provider Enrollment'),
      ]);

      const csv = generateMaturityProfileCsv(profile);

      expect(csv).toContain('Business Architecture,3.5,4.5');
      expect(csv).toContain('Information,2.0,3.0');
      expect(csv).toContain('Technology,3.0,4.0');
    });

    it('should handle multiple capability areas', () => {
      const profile = createProfile('Test State', 'Provider Management', [
        createStandardAreaProfile('Provider Management', 'Provider Enrollment'),
        createStandardAreaProfile('Provider Management', 'Provider Screening'),
      ]);

      const csv = generateMaturityProfileCsv(profile);

      expect(csv).toContain('Capability Area: Provider Enrollment');
      expect(csv).toContain('Capability Area: Provider Screening');
    });

    it('should escape fields with commas', () => {
      const areaProfile = createStandardAreaProfile('Provider Management', 'Provider Enrollment', [
        {
          dimension: 'Business Architecture',
          asIs: '3.0',
          toBe: '4.0',
          notes: 'Note with, comma',
          barriers: '',
          plans: '',
        },
      ]);
      const profile = createProfile('Test State', 'Provider Management', [areaProfile]);

      const csv = generateMaturityProfileCsv(profile);

      expect(csv).toContain('"Note with, comma"');
    });

    it('should escape fields with quotes', () => {
      const areaProfile = createStandardAreaProfile('Provider Management', 'Provider Enrollment', [
        {
          dimension: 'Business Architecture',
          asIs: '3.0',
          toBe: '4.0',
          notes: 'Note with "quotes"',
          barriers: '',
          plans: '',
        },
      ]);
      const profile = createProfile('Test State', 'Provider Management', [areaProfile]);

      const csv = generateMaturityProfileCsv(profile);

      expect(csv).toContain('"Note with ""quotes"""');
    });

    it('should escape fields with newlines', () => {
      const areaProfile = createStandardAreaProfile('Provider Management', 'Provider Enrollment', [
        {
          dimension: 'Business Architecture',
          asIs: '3.0',
          toBe: '4.0',
          notes: 'Note with\nnewline',
          barriers: '',
          plans: '',
        },
      ]);
      const profile = createProfile('Test State', 'Provider Management', [areaProfile]);

      const csv = generateMaturityProfileCsv(profile);

      expect(csv).toContain('"Note with\nnewline"');
    });

    it('should handle empty notes/barriers/plans', () => {
      const areaProfile = createStandardAreaProfile('Provider Management', 'Provider Enrollment', [
        {
          dimension: 'Business Architecture',
          asIs: '3.0',
          toBe: '4.0',
          notes: '',
          barriers: '',
          plans: '',
        },
      ]);
      const profile = createProfile('Test State', 'Provider Management', [areaProfile]);

      const csv = generateMaturityProfileCsv(profile);

      expect(csv).toContain('Business Architecture,3.0,4.0,,,');
    });
  });

  describe('generateMaturityProfileCsv - Organizational Assessments', () => {
    it('should use Aspect column header for organizational assessments', () => {
      const profile = createProfile('Test State', 'Enterprise Governance', [
        createOrganizationalAreaProfile('Enterprise Governance', 'Outcomes Assessment'),
      ]);

      const csv = generateMaturityProfileCsv(profile);

      expect(csv).toContain('Aspect,As Is,To Be,Notes,Barriers & Challenges,Advancement Plans');
      expect(csv).not.toContain('ORBIT,');
    });

    it('should include aspect rows for organizational assessments', () => {
      const profile = createProfile('Test State', 'Enterprise Governance', [
        createOrganizationalAreaProfile('Enterprise Governance', 'Outcomes Assessment'),
      ]);

      const csv = generateMaturityProfileCsv(profile);

      expect(csv).toContain('Aspect 1,3.0,4.0');
      expect(csv).toContain('Aspect 2,2.5,3.5');
    });

    it('should handle organizational assessment notes and barriers', () => {
      const profile = createProfile('Test State', 'Enterprise Governance', [
        createOrganizationalAreaProfile('Enterprise Governance', 'Roles Assessment', [
          {
            dimension: 'Role Aspect',
            asIs: '2.0',
            toBe: '3.0',
            notes: 'Role notes',
            barriers: 'Role barriers',
            plans: 'Role plans',
          },
        ]),
      ]);

      const csv = generateMaturityProfileCsv(profile);

      expect(csv).toContain('Role Aspect,2.0,3.0,Role notes,Role barriers,Role plans');
    });
  });

  describe('generateCombinedMaturityProfileCsv', () => {
    it('should combine multiple profiles into one CSV', () => {
      const profiles: MaturityProfile[] = [
        createProfile('Test State', 'Provider Management', [
          createStandardAreaProfile('Provider Management', 'Provider Enrollment'),
        ]),
        createProfile('Test State', 'Member Management', [
          createStandardAreaProfile('Member Management', 'Member Enrollment'),
        ]),
      ];

      const csv = generateCombinedMaturityProfileCsv(profiles, 'Test State');

      expect(csv).toContain('MITA 4.0 Maturity Profile: Test State');
      expect(csv).toContain('Capability Domain: Provider Management');
      expect(csv).toContain('Capability Domain: Member Management');
      expect(csv).toContain('Capability Area: Provider Enrollment');
      expect(csv).toContain('Capability Area: Member Enrollment');
    });

    it('should use provided state name', () => {
      const profiles: MaturityProfile[] = [
        createProfile('Original State', 'Provider Management', [
          createStandardAreaProfile('Provider Management', 'Provider Enrollment'),
        ]),
      ];

      const csv = generateCombinedMaturityProfileCsv(profiles, 'Override State');

      expect(csv).toContain('MITA 4.0 Maturity Profile: Override State');
    });

    it('should handle empty profiles array', () => {
      const csv = generateCombinedMaturityProfileCsv([], 'Test State');

      expect(csv).toContain('MITA 4.0 Maturity Profile: Test State');
      // No area sections, so the only content is the preamble: the state header
      // plus the draft notice while the tool is built in draft mode. Asserted by
      // absence of area markup rather than by a line count, which would have to be
      // rewritten again at go-live when the notice disappears.
      const lines = csv.split('\n').filter((l) => l.trim() !== '' && l !== ',,,,,');
      expect(lines[0]).toContain('MITA 4.0 Maturity Profile: Test State');
      expect(csv).not.toContain('Capability Domain:');
      expect(csv).not.toContain('Capability Area:');
      expect(lines.length).toBeLessThanOrEqual(2);
    });

    it('should handle mixed standard and organizational assessments', () => {
      const profiles: MaturityProfile[] = [
        createProfile('Test State', 'Provider Management', [
          createStandardAreaProfile('Provider Management', 'Provider Enrollment'),
        ]),
        createProfile('Test State', 'Enterprise Governance', [
          createOrganizationalAreaProfile('Enterprise Governance', 'Outcomes Assessment'),
        ]),
      ];

      const csv = generateCombinedMaturityProfileCsv(profiles, 'Test State');

      // Should have both ORBIT and Aspect headers
      expect(csv).toContain('ORBIT,As Is,To Be');
      expect(csv).toContain('Aspect,As Is,To Be');
    });
  });

  describe('parseMaturityProfileCsv', () => {
    it('should parse a valid CSV back to MaturityProfile', () => {
      const originalProfile = createProfile('Test State', 'Provider Management', [
        createStandardAreaProfile('Provider Management', 'Provider Enrollment'),
      ]);

      const csv = generateMaturityProfileCsv(originalProfile);
      const parsed = parseMaturityProfileCsv(csv);

      expect(parsed).not.toBeNull();
      expect(parsed?.stateName).toBe('Test State');
      expect(parsed?.areas.length).toBe(1);
      expect(parsed?.areas[0]?.areaName).toBe('Provider Enrollment');
    });

    it('should parse dimension rows correctly for B-EA-I-T', () => {
      const originalProfile = createProfile('Test State', 'Provider Management', [
        createStandardAreaProfile('Provider Management', 'Provider Enrollment'),
      ]);

      const csv = generateMaturityProfileCsv(originalProfile);
      const parsed = parseMaturityProfileCsv(csv);

      expect(parsed?.areas[0]?.rows.length).toBe(3);
      const baRow = parsed?.areas[0]?.rows.find((r) => r.dimension === 'Business Architecture');
      expect(baRow?.asIs).toBe('3.5');
      expect(baRow?.toBe).toBe('4.5');
      expect(baRow?.notes).toBe('BA notes');
    });

    it('should handle multiple areas', () => {
      const originalProfile = createProfile('Test State', 'Provider Management', [
        createStandardAreaProfile('Provider Management', 'Provider Enrollment'),
        createStandardAreaProfile('Provider Management', 'Provider Screening'),
      ]);

      const csv = generateMaturityProfileCsv(originalProfile);
      const parsed = parseMaturityProfileCsv(csv);

      expect(parsed?.areas.length).toBe(2);
      expect(parsed?.areas[0]?.areaName).toBe('Provider Enrollment');
      expect(parsed?.areas[1]?.areaName).toBe('Provider Screening');
    });

    it('should return null for invalid CSV', () => {
      const result = parseMaturityProfileCsv('invalid csv content');
      expect(result).toBeNull();
    });

    it('should return null for empty CSV', () => {
      const result = parseMaturityProfileCsv('');
      expect(result).toBeNull();
    });

    it('should return null for CSV with only headers', () => {
      const result = parseMaturityProfileCsv('MITA 4.0 Maturity Profile: Test\n,,,,,');
      expect(result).toBeNull();
    });

    it('should handle quoted fields with commas', () => {
      const areaProfile = createStandardAreaProfile('Provider Management', 'Provider Enrollment', [
        {
          dimension: 'Business Architecture',
          asIs: '3.0',
          toBe: '4.0',
          notes: 'Note with, comma',
          barriers: '',
          plans: '',
        },
      ]);
      const profile = createProfile('Test State', 'Provider Management', [areaProfile]);

      const csv = generateMaturityProfileCsv(profile);
      const parsed = parseMaturityProfileCsv(csv);

      expect(parsed?.areas[0]?.rows[0]?.notes).toBe('Note with, comma');
    });

    it('should handle quoted fields with escaped quotes', () => {
      const areaProfile = createStandardAreaProfile('Provider Management', 'Provider Enrollment', [
        {
          dimension: 'Business Architecture',
          asIs: '3.0',
          toBe: '4.0',
          notes: 'Note with "quotes"',
          barriers: '',
          plans: '',
        },
      ]);
      const profile = createProfile('Test State', 'Provider Management', [areaProfile]);

      const csv = generateMaturityProfileCsv(profile);
      const parsed = parseMaturityProfileCsv(csv);

      expect(parsed?.areas[0]?.rows[0]?.notes).toBe('Note with "quotes"');
    });

    it('should extract state name from header', () => {
      const csv = `MITA 4.0 Maturity Profile: California,,,,,
,,,,,
Capability Domain: Test Domain,,,,,
Capability Area: Test Area,,,,,
ORBIT,As Is,To Be,Notes,Barriers & Challenges,Advancement Plans
Business Architecture,3.0,4.0,,,`;

      const parsed = parseMaturityProfileCsv(csv);

      expect(parsed?.stateName).toBe('California');
    });

    it('should parse organizational assessment CSV with Aspect header', () => {
      const csv = `MITA 4.0 Maturity Profile: Test State,,,,,
,,,,,
Capability Domain: Enterprise Governance,,,,,
Capability Area: Outcomes Assessment,,,,,
Aspect,As Is,To Be,Notes,Barriers & Challenges,Advancement Plans
Aspect 1,3.0,4.0,Notes here,,
Aspect 2,2.5,3.5,,,Plans here`;

      const parsed = parseMaturityProfileCsv(csv);

      expect(parsed).not.toBeNull();
      expect(parsed?.areas[0]?.rows.length).toBe(2);
      expect(parsed?.areas[0]?.rows[0]?.dimension).toBe('Aspect 1');
      expect(parsed?.areas[0]?.rows[1]?.dimension).toBe('Aspect 2');
    });
  });

  describe('round-trip parsing', () => {
    it('should preserve data through generate -> parse cycle for standard assessments', () => {
      const original = createProfile('Round Trip State', 'Test Domain', [
        createStandardAreaProfile('Test Domain', 'Test Area', [
          {
            dimension: 'Business Architecture',
            asIs: '4.0',
            toBe: '5.0',
            notes: 'BA specific',
            barriers: '',
            plans: '',
          },
          {
            dimension: 'Information',
            asIs: '2.0',
            toBe: '3.0',
            notes: '',
            barriers: 'Data challenges',
            plans: '',
          },
          {
            dimension: 'Technology',
            asIs: '3.5',
            toBe: '4.5',
            notes: '',
            barriers: '',
            plans: 'Tech roadmap',
          },
        ]),
      ]);

      const csv = generateMaturityProfileCsv(original);
      const parsed = parseMaturityProfileCsv(csv);

      expect(parsed?.stateName).toBe('Round Trip State');
      expect(parsed?.areas[0]?.domainName).toBe('Test Domain');
      expect(parsed?.areas[0]?.areaName).toBe('Test Area');

      const rows = parsed?.areas[0]?.rows ?? [];
      expect(rows.length).toBe(3);

      const ba = rows.find((r) => r.dimension === 'Business Architecture');
      expect(ba?.asIs).toBe('4.0');
      expect(ba?.toBe).toBe('5.0');
      expect(ba?.notes).toBe('BA specific');

      const info = rows.find((r) => r.dimension === 'Information');
      expect(info?.barriers).toBe('Data challenges');

      const tech = rows.find((r) => r.dimension === 'Technology');
      expect(tech?.plans).toBe('Tech roadmap');
    });

    it('should preserve data through generate -> parse cycle for organizational assessments', () => {
      const original = createProfile('Round Trip State', 'Enterprise Governance', [
        createOrganizationalAreaProfile('Enterprise Governance', 'Outcomes Assessment', [
          {
            dimension: 'Outcome Aspect 1',
            asIs: '3.0',
            toBe: '4.0',
            notes: 'Important notes',
            barriers: 'Some barriers',
            plans: 'Future plans',
          },
          {
            dimension: 'Outcome Aspect 2',
            asIs: '2.5',
            toBe: '3.5',
            notes: '',
            barriers: '',
            plans: '',
          },
        ]),
      ]);

      const csv = generateMaturityProfileCsv(original);
      const parsed = parseMaturityProfileCsv(csv);

      expect(parsed?.stateName).toBe('Round Trip State');
      expect(parsed?.areas[0]?.areaName).toBe('Outcomes Assessment');

      const rows = parsed?.areas[0]?.rows ?? [];
      expect(rows.length).toBe(2);

      expect(rows[0]?.dimension).toBe('Outcome Aspect 1');
      expect(rows[0]?.asIs).toBe('3.0');
      expect(rows[0]?.notes).toBe('Important notes');
      expect(rows[0]?.barriers).toBe('Some barriers');
      expect(rows[0]?.plans).toBe('Future plans');
    });
  });

  describe('organizational section labels', () => {
    const sectionedProfile = (): MaturityProfile =>
      createProfile('Test State', 'Enterprise Architecture', [
        {
          domainName: 'Enterprise Architecture',
          areaName: 'Enterprise Governance',
          isOrganizationalAssessment: true,
          rows: [
            {
              dimension: 'Organizational Outcomes',
              asIs: '',
              toBe: '',
              notes: '',
              barriers: '',
              plans: '',
              isSectionLabel: true,
            },
            {
              dimension: 'Culture Mindset',
              asIs: '3',
              toBe: '4',
              notes: 'outcome note',
              barriers: '',
              plans: '',
            },
            {
              dimension: 'Organizational Roles',
              asIs: '',
              toBe: '',
              notes: '',
              barriers: '',
              plans: '',
              isSectionLabel: true,
            },
            {
              dimension: 'Communication',
              asIs: '2',
              toBe: '3',
              notes: 'roles note',
              barriers: '',
              plans: '',
            },
          ],
        },
      ]);

    it('should emit a Section label row before each section', () => {
      const csv = generateMaturityProfileCsv(sectionedProfile());

      expect(csv).toContain('Section: Organizational Outcomes,,,,,');
      expect(csv).toContain('Section: Organizational Roles,,,,,');

      // Labels appear before their aspects
      const outcomesIndex = csv.indexOf('Section: Organizational Outcomes');
      const cultureIndex = csv.indexOf('Culture Mindset');
      const rolesIndex = csv.indexOf('Section: Organizational Roles');
      expect(outcomesIndex).toBeLessThan(cultureIndex);
      expect(cultureIndex).toBeLessThan(rolesIndex);
    });

    it('should skip Section label rows when parsing (round-trip preserves aspects)', () => {
      const csv = generateMaturityProfileCsv(sectionedProfile());
      const parsed = parseMaturityProfileCsv(csv);

      expect(parsed).not.toBeNull();
      const rows = parsed?.areas[0]?.rows ?? [];

      // Only the two aspect rows survive parsing; labels are structural
      expect(rows).toHaveLength(2);
      expect(rows.map((r) => r.dimension)).toEqual(['Culture Mindset', 'Communication']);
      expect(rows[0]?.asIs).toBe('3');
      expect(rows[1]?.notes).toBe('roles note');
    });
  });

  describe('draft notice (Decision 4)', () => {
    const profile = (): MaturityProfile =>
      createProfile('Test State', 'Provider Management', [
        createStandardAreaProfile('Provider Management', 'Provider Enrollment'),
      ]);

    it('emits the notice in the single-domain profile', () => {
      const csv = generateMaturityProfileCsv(profile());

      expect(csv).toContain(DRAFT_NOTICE_LINE);
    });

    it('pins the literal notice prefix, which is a wire format', () => {
      // Deliberately the literal, not the constant. `parseMaturityProfileCsv` derives
      // its skip prefix from DRAFT_NOTICE_LABEL, so renaming the label would keep this
      // whole suite green while making every CSV already exported during the pilot
      // unparseable. Asserting the constant here would defeat the point.
      expect(DRAFT_NOTICE_LINE.startsWith('Predecisional Pilot Materials:')).toBe(true);
    });

    it('still skips the earlier DRAFT: prefix, so older exports keep parsing', () => {
      // The notice wording changed once already, at CMS's request. Files exported under
      // the old copy must not become unreadable, so the parser recognises both prefixes
      // and this pins the legacy one specifically.
      const csv = [
        'MITA 4.0 Maturity Profile: Legacy State,,,,,',
        'DRAFT: This is a draft version of the MITA 4.0 State Self-Assessment Tool.,,,,,',
        ',,,,,',
        'Capability Domain: Provider Management,,,,,',
        'Capability Area: Provider Enrollment,,,,,',
        'ORBIT,As Is,To Be,Notes,Barriers & Challenges,Advancement Plans',
        'Business Architecture,3.0,4.0,,,',
        ',,,,,',
      ].join('\n');

      const parsed = parseMaturityProfileCsv(csv);

      expect(parsed?.stateName).toBe('Legacy State');
      expect(parsed?.areas[0]?.rows.map((r) => r.dimension)).toEqual(['Business Architecture']);
    });

    it('quotes the notice, because the approved wording contains commas', () => {
      // `escapeCSVField` wraps any field containing a comma. The PRA sentence has two,
      // so the emitted row is quoted — and the parser's skip has to cope with a leading
      // quote. Pinned because it is the interaction between two things that were
      // written independently.
      const noticeLine = generateMaturityProfileCsv(profile())
        .split('\n')
        .find((l) => l.includes('Predecisional Pilot Materials'));

      expect(noticeLine?.startsWith('"')).toBe(true);
      expect(parseMaturityProfileCsv(generateMaturityProfileCsv(profile()))?.stateName).toBe(
        'Test State'
      );
    });

    it('emits the notice in the combined profile', () => {
      const csv = generateCombinedMaturityProfileCsv([profile()], 'Test State');

      expect(csv).toContain(DRAFT_NOTICE_LINE);
    });

    it('places the notice below the state header, never above it', () => {
      // This ordering is load-bearing, not cosmetic. `parseMaturityProfileCsv` reads
      // the state name from `lines[0]` specifically, so a notice on the first line
      // would make every parsed state name `Unknown`.
      const lines = generateMaturityProfileCsv(profile()).split('\n');

      expect(lines[0]).toContain('MITA 4.0 Maturity Profile: Test State');
      expect(lines[1]).toContain(DRAFT_NOTICE_LINE);
    });

    it('pads the notice row to the full six columns', () => {
      // Matches the file's existing `,,,,,` convention so the row does not read as a
      // ragged one-column line to a spreadsheet.
      const noticeLine = generateMaturityProfileCsv(profile())
        .split('\n')
        .find((l) => l.includes(DRAFT_NOTICE_LINE));

      expect(noticeLine).toBeDefined();
      expect(noticeLine?.endsWith(',,,,,')).toBe(true);
    });

    it('still parses the state name with the notice present', () => {
      const csv = generateMaturityProfileCsv(profile());
      const parsed = parseMaturityProfileCsv(csv);

      expect(parsed?.stateName).toBe('Test State');
    });

    it('does not read the notice as a data row', () => {
      const csv = generateMaturityProfileCsv(profile());
      const parsed = parseMaturityProfileCsv(csv);
      const dimensions = parsed?.areas.flatMap((a) => a.rows.map((r) => r.dimension)) ?? [];

      expect(dimensions).toEqual(['Business Architecture', 'Information', 'Technology']);
      expect(dimensions.some((d) => d.includes('DRAFT'))).toBe(false);
    });

    it('omits the notice entirely at go-live', async () => {
      // Decision 13: `VITE_DRAFT_MODE=false` has to strip the disclaimer from every
      // surface, not just the app. `IS_DRAFT` resolves at module load, so the module
      // has to be re-imported after stubbing rather than merely re-called.
      vi.resetModules();
      vi.stubEnv('VITE_DRAFT_MODE', 'false');
      try {
        const { generateMaturityProfileCsv: generateAtGoLive } = await import('./csvExport');
        const csv = generateAtGoLive(profile());

        expect(csv).not.toContain('DRAFT');
        expect(csv).not.toContain('still being piloted');
        // The state header is still first, and nothing else was disturbed.
        expect(csv.split('\n')[0]).toContain('MITA 4.0 Maturity Profile: Test State');
        expect(csv).toContain('Capability Area: Provider Enrollment');
      } finally {
        vi.unstubAllEnvs();
        vi.resetModules();
      }
    });

    it('skips a notice line by content, so a pilot-era file still parses after go-live', () => {
      // The parser must not depend on the current `IS_DRAFT` value: a profile
      // exported during the pilot may be imported once the flag is off, and it will
      // still carry the line. Hand-built rather than generated, so this holds whatever
      // the flag is set to in the test environment.
      const csv = [
        'MITA 4.0 Maturity Profile: Pilot State,,,,,',
        `${DRAFT_NOTICE_LINE},,,,,`,
        ',,,,,',
        'Capability Domain: Provider Management,,,,,',
        'Capability Area: Provider Enrollment,,,,,',
        'ORBIT,As Is,To Be,Notes,Barriers & Challenges,Advancement Plans',
        'Business Architecture,3.0,4.0,,,',
        ',,,,,',
      ].join('\n');

      const parsed = parseMaturityProfileCsv(csv);

      expect(parsed?.stateName).toBe('Pilot State');
      expect(parsed?.areas[0]?.rows.map((r) => r.dimension)).toEqual(['Business Architecture']);
    });
  });
});
