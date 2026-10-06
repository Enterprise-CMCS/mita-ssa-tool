/**
 * CSV Export Service
 *
 * Generates CSV files in the CMS Maturity Profile format.
 * Format follows the MITA 4.0 Maturity Profile template structure.
 * Supports both standard capability assessments (B-I-T dimensions) and
 * organizational assessments (Outcomes/Roles with direct aspects).
 */

import { DRAFT_NOTICE_LABEL, DRAFT_NOTICE_LINE, IS_DRAFT } from '../../constants';
import type { MaturityProfile, CapabilityAreaProfile } from './types';

/** CSV column headers for standard assessments */
const CSV_HEADERS_STANDARD = 'ORBIT,As Is,To Be,Notes,Barriers & Challenges,Advancement Plans';

/**
 * Prefixes that identify a notice line in a generated profile, so the parser can skip
 * it rather than read it as a data row.
 *
 * More than one on purpose. `DRAFT:` was the prefix before CMS supplied the
 * predecisional wording, and a profile exported under the old copy must keep parsing —
 * dropping it would make previously exported files silently unreadable, which is the
 * cost of treating a wire format as presentation. Add to this list, never replace it.
 */
const NOTICE_CSV_PREFIXES = [`${DRAFT_NOTICE_LABEL}:`, 'DRAFT:'] as const;

/**
 * Emits the draft notice line, or nothing when the tool is built for go-live.
 *
 * Placement is constrained: this must sit *below* the
 * `MITA 4.0 Maturity Profile: <state>` header, never above it, because
 * `parseMaturityProfileCsv` reads the state name from `lines[0]` specifically. A
 * notice on the first line would make every parsed state name `Unknown`.
 */
function draftNoticeLines(): string[] {
  if (!IS_DRAFT) return [];
  return [`${escapeCSVField(DRAFT_NOTICE_LINE)},,,,,`];
}

/** CSV column headers for organizational assessments */
const CSV_HEADERS_ORGANIZATIONAL =
  'Aspect,As Is,To Be,Notes,Barriers & Challenges,Advancement Plans';

/** Standard ORBIT dimension names for CSV output (B-I-T) */
const ORBIT_DIMENSIONS = ['Business Architecture', 'Information', 'Technology'];

/**
 * Generates a CSV string from a maturity profile (single domain)
 * Format matches the CMS standard Maturity Profile template
 */
export function generateMaturityProfileCsv(profile: MaturityProfile): string {
  const lines: string[] = [];

  // Header row with state name
  lines.push(`MITA 4.0 Maturity Profile: ${profile.stateName},,,,,`);
  lines.push(...draftNoticeLines());
  lines.push(',,,,,');

  // Generate section for each capability area
  for (const area of profile.areas) {
    lines.push(...generateAreaSection(area));
    lines.push(',,,,,'); // Blank line between areas
  }

  return lines.join('\n');
}

/**
 * Generates CSV lines for a single capability area
 * Handles both standard (B-I-T dimensions) and organizational (direct aspects) assessments
 */
function generateAreaSection(area: CapabilityAreaProfile): string[] {
  const lines: string[] = [];

  // Domain and area headers
  lines.push(`Capability Domain: ${escapeCSVField(area.domainName)},,,,,`);
  lines.push(`Capability Area: ${escapeCSVField(area.areaName)},,,,,`);

  // Check if this is an organizational assessment
  const isOrganizational = area.isOrganizationalAssessment ?? false;

  // Column headers - different for organizational vs standard
  lines.push(isOrganizational ? CSV_HEADERS_ORGANIZATIONAL : CSV_HEADERS_STANDARD);

  if (isOrganizational) {
    // For organizational assessments, output section label rows followed by
    // their aspect rows (Outcomes, Roles, Enterprise Architecture)
    for (const row of area.rows) {
      if (row.isSectionLabel) {
        lines.push(`Section: ${escapeCSVField(row.dimension)},,,,,`);
      } else {
        lines.push(
          `${row.dimension},${row.asIs},${row.toBe},${escapeCSVField(row.notes)},${escapeCSVField(row.barriers)},${escapeCSVField(row.plans)}`
        );
      }
    }
  } else {
    // For standard assessments, ensure all B-I-T dimensions are present in order
    for (const dimName of ORBIT_DIMENSIONS) {
      const row = area.rows.find((r) => r.dimension === dimName);
      if (row) {
        lines.push(
          `${row.dimension},${row.asIs},${row.toBe},${escapeCSVField(row.notes)},${escapeCSVField(row.barriers)},${escapeCSVField(row.plans)}`
        );
      } else {
        // Empty row for dimensions without data
        lines.push(`${dimName},,,,,`);
      }
    }
  }

  return lines;
}

/**
 * Generates a combined CSV string from multiple maturity profiles
 * All capability areas in a single file
 */
export function generateCombinedMaturityProfileCsv(
  profiles: MaturityProfile[],
  stateName: string
): string {
  const lines: string[] = [];

  // Header row with state name
  lines.push(`MITA 4.0 Maturity Profile: ${stateName},,,,,`);
  lines.push(...draftNoticeLines());
  lines.push(',,,,,');

  // Generate sections for all areas across all domains
  for (const profile of profiles) {
    for (const area of profile.areas) {
      lines.push(...generateAreaSection(area));
      lines.push(',,,,,'); // Blank line between areas
    }
  }

  return lines.join('\n');
}

/**
 * Escapes a CSV field value
 * Wraps in quotes if contains comma, newline, or quote
 */
function escapeCSVField(value: string): string {
  if (!value) return '';

  // Check if escaping is needed
  if (value.includes(',') || value.includes('\n') || value.includes('"')) {
    // Escape quotes by doubling them
    const escaped = value.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  return value;
}

/**
 * Parses a CSV maturity profile back into structured data
 * Used for import validation
 */
export function parseMaturityProfileCsv(csv: string): MaturityProfile | null {
  const lines = csv.split('\n').map((line) => line.trim());

  if (lines.length < 5) return null;

  // Parse header for state name
  const headerLine = lines[0];
  const headerMatch = headerLine?.match(/MITA 4\.0 Maturity Profile:\s*([^,]+)/);
  const stateName = headerMatch?.[1]?.trim() ?? 'Unknown';

  const areas: CapabilityAreaProfile[] = [];
  let currentDomain = '';
  let currentArea: CapabilityAreaProfile | null = null;
  let inDataSection = false;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line === ',,,,,') {
      // End of current area section
      if (currentArea && currentArea.rows.length > 0) {
        areas.push(currentArea);
        currentArea = null;
      }
      inDataSection = false;
      continue;
    }

    // Skip the disclaimer notice that sits directly below the state header.
    //
    // Matched by content rather than by the current `IS_DRAFT` value on purpose: a
    // profile exported during the pilot may be imported after go-live, when the
    // flag is off, and it would still carry the line. The leading-quote case covers
    // the notice being CSV-escaped, which the current wording requires — it contains
    // commas, so `escapeCSVField` wraps it in quotes.
    const unquoted = line.startsWith('"') ? line.slice(1) : line;
    if (NOTICE_CSV_PREFIXES.some((prefix) => unquoted.startsWith(prefix))) {
      continue;
    }

    // Check for domain header
    const domainMatch = line.match(/^Capability Domain:\s*([^,]+)/);
    if (domainMatch) {
      currentDomain = domainMatch[1]?.trim() ?? '';
      continue;
    }

    // Check for area header
    const areaMatch = line.match(/^Capability Area:\s*([^,]+)/);
    if (areaMatch) {
      currentArea = {
        domainName: currentDomain,
        areaName: areaMatch[1]?.trim() ?? '',
        rows: [],
      };
      continue;
    }

    // Check for column headers (ORBIT for standard, Aspect for organizational)
    if (line.startsWith('ORBIT,') || line.startsWith('Aspect,')) {
      inDataSection = true;
      continue;
    }

    // Skip organizational section label rows (e.g., "Section: Organizational
    // Outcomes") - they group aspect rows but carry no rating data
    if (line.startsWith('Section:')) {
      continue;
    }

    // Parse data row
    if (inDataSection && currentArea) {
      const parts = parseCSVLine(line);
      if (parts.length >= 1 && parts[0]) {
        currentArea.rows.push({
          dimension: parts[0],
          asIs: parts[1] ?? '',
          toBe: parts[2] ?? '',
          notes: parts[3] ?? '',
          barriers: parts[4] ?? '',
          plans: parts[5] ?? '',
        });
      }
    }
  }

  // Add last area if exists
  if (currentArea && currentArea.rows.length > 0) {
    areas.push(currentArea);
  }

  if (areas.length === 0) return null;

  return {
    stateName,
    domainName: areas[0]?.domainName ?? 'Unknown',
    areas,
  };
}

/**
 * Parses a single CSV line handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        // Check for escaped quote
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
  }

  result.push(current.trim());
  return result;
}
