/**
 * AssessmentSidebar Component Tests
 *
 * Focused on the combined organizational assessment navigation:
 * section headers, aspect rows, and aspect selection.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { AssessmentSidebar } from './AssessmentSidebar';
import type {
  OrbitDimensionId,
  OrganizationalAssessmentId,
  TechnologySubDimensionId,
} from '../../types';

/**
 * Build organizational sidebar entries mirroring what the Assessment and
 * HistoryView pages produce for the combined Enterprise Governance area.
 */
function buildOrgDimensions(): Array<{
  dimensionId: OrbitDimensionId;
  aspectId: string;
  name: string;
  assessedCount: number;
  totalCount: number;
  averageScore: number | null;
  isRequired: boolean;
  isAggregate: boolean;
  isOrganizational: boolean;
  organizationalType: OrganizationalAssessmentId;
}> {
  const entry = (
    organizationalType: OrganizationalAssessmentId,
    aspectId: string,
    name: string,
    score: number | null = null
  ): ReturnType<typeof buildOrgDimensions>[number] => ({
    dimensionId: organizationalType as OrbitDimensionId,
    aspectId,
    name,
    assessedCount: score !== null ? 1 : 0,
    totalCount: 1,
    averageScore: score,
    isRequired: true,
    isAggregate: false,
    isOrganizational: true,
    organizationalType,
  });

  return [
    entry('outcomes', 'culture-mindset', 'Culture Mindset', 3),
    entry('outcomes', 'capability', 'Capability'),
    entry('roles', 'communication', 'Communication', 4),
    entry('enterprise-architecture', 'business-capability', 'Business Capability'),
  ];
}

function renderOrgSidebar(
  onDimensionSelect = vi.fn()
): ReturnType<typeof render> & { onDimensionSelect: ReturnType<typeof vi.fn> } {
  const result = render(
    <AssessmentSidebar
      overallScore={3.5}
      overallProgress={40}
      dimensions={buildOrgDimensions()}
      currentDimensionId={'culture-mindset' as OrbitDimensionId}
      currentAspectId="culture-mindset"
      onDimensionSelect={onDimensionSelect}
      onReviewSelect={vi.fn()}
      isOrganizationalAssessment
    />
  );
  return { ...result, onDimensionSelect };
}

describe('AssessmentSidebar (organizational mode)', () => {
  it('should render a header for each organizational section', () => {
    renderOrgSidebar();

    expect(screen.getByText('Organizational Outcomes')).toBeInTheDocument();
    expect(screen.getByText('Organizational Roles')).toBeInTheDocument();
    expect(screen.getByText('Organizational Enterprise Architecture')).toBeInTheDocument();
  });

  it('should render section headers only when the section changes', () => {
    renderOrgSidebar();

    // Two consecutive outcomes aspects share one "Organizational Outcomes" header
    expect(screen.getAllByText('Organizational Outcomes')).toHaveLength(1);
  });

  it('should render all aspect rows with their names', () => {
    renderOrgSidebar();

    expect(screen.getByText('Culture Mindset')).toBeInTheDocument();
    expect(screen.getByText('Capability')).toBeInTheDocument();
    expect(screen.getByText('Communication')).toBeInTheDocument();
    expect(screen.getByText('Business Capability')).toBeInTheDocument();
  });

  it('should call onDimensionSelect with the aspect id when an aspect is clicked', () => {
    const { onDimensionSelect } = renderOrgSidebar();

    fireEvent.click(screen.getByText('Communication'));

    expect(onDimensionSelect).toHaveBeenCalledWith('communication');
  });

  it('should mark the current aspect as selected', () => {
    renderOrgSidebar();

    const selected = screen.getByRole('button', { current: true });
    expect(selected).toHaveTextContent('Culture Mindset');
  });

  it('should have no accessibility violations', async () => {
    const { container } = renderOrgSidebar();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

/**
 * Build standard B-I-T sidebar entries, including both Technology
 * sub-dimensions so the Technology parent-row branch is exercised.
 */
function buildStandardDimensions(
  overrides: Partial<{ technologyIsAggregate: boolean }> = {}
): Array<{
  dimensionId: OrbitDimensionId;
  subDimensionId?: TechnologySubDimensionId;
  name: string;
  assessedCount: number;
  totalCount: number;
  averageScore: number | null;
  isRequired: boolean;
  isAggregate?: boolean;
  aggregateScore?: number | null;
  aggregateCount?: number;
}> {
  if (overrides.technologyIsAggregate) {
    return [
      {
        dimensionId: 'businessArchitecture',
        name: 'Business Architecture',
        assessedCount: 5,
        totalCount: 5,
        averageScore: 3,
        isRequired: true,
      },
      {
        dimensionId: 'information',
        name: 'Information',
        assessedCount: 10,
        totalCount: 10,
        averageScore: 3,
        isRequired: true,
      },
      {
        dimensionId: 'technology',
        name: 'Technology',
        assessedCount: 0,
        totalCount: 0,
        averageScore: null,
        isRequired: true,
        isAggregate: true,
        aggregateScore: 2.8,
        aggregateCount: 4,
      },
    ];
  }
  return [
    {
      dimensionId: 'businessArchitecture',
      name: 'Business Architecture',
      assessedCount: 5,
      totalCount: 5,
      averageScore: 3,
      isRequired: true,
    },
    {
      dimensionId: 'information',
      name: 'Information',
      assessedCount: 10,
      totalCount: 10,
      averageScore: 3,
      isRequired: true,
    },
    {
      dimensionId: 'technology',
      subDimensionId: 'technologyInfrastructureManagement',
      name: 'Technical Infrastructure Management',
      assessedCount: 6,
      totalCount: 6,
      averageScore: 2.8,
      isRequired: true,
    },
    {
      dimensionId: 'technology',
      subDimensionId: 'applicationManagement',
      name: 'Application Management',
      assessedCount: 5,
      totalCount: 5,
      averageScore: 3,
      isRequired: true,
    },
  ];
}

function renderStandardSidebar(
  options: Partial<{ technologyIsAggregate: boolean }> = {}
): ReturnType<typeof render> {
  return render(
    <AssessmentSidebar
      overallScore={3}
      overallProgress={100}
      dimensions={buildStandardDimensions(options)}
      currentDimensionId="businessArchitecture"
      onDimensionSelect={vi.fn()}
      onReviewSelect={vi.fn()}
    />
  );
}

describe('AssessmentSidebar (standard B-I-T mode)', () => {
  /**
   * Regression guard for the Wave 4 accessibility audit. The standard branch
   * previously rendered `ListItemButton` (a `div[role=button]`) as a direct
   * child of `List` (a `ul`), and the Technology rollup row as a bare `Box`.
   * axe reported `aria-required-children` at CRITICAL impact on every
   * assessment page. Only the organizational branch wrapped rows in `ListItem`.
   */
  it('should only place list items directly inside the navigation list', () => {
    const { container } = renderStandardSidebar();
    const lists = container.querySelectorAll('ul');
    expect(lists.length).toBeGreaterThan(0);
    for (const list of lists) {
      const illegal = [...list.children].filter((child) => child.tagName !== 'LI');
      expect(illegal.map((c) => c.tagName)).toEqual([]);
    }
    // Guard against the assertion above passing vacuously on an empty list:
    // BA, Information, the Technology rollup row, and two sub-dimensions.
    const navList = container.querySelector('nav ul');
    expect(navList?.children).toHaveLength(5);
  });

  it('should render the Technology rollup row and both sub-dimensions', () => {
    renderStandardSidebar();
    expect(screen.getByText('Technology')).toBeInTheDocument();
    expect(screen.getByText('Technical Infrastructure Management')).toBeInTheDocument();
    expect(screen.getByText('Application Management')).toBeInTheDocument();
  });

  it('should have no accessibility violations', async () => {
    const { container } = renderStandardSidebar();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations when Technology is an aggregate dimension', async () => {
    const { container } = renderStandardSidebar({ technologyIsAggregate: true });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should keep list structure valid when Technology is an aggregate dimension', () => {
    const { container } = renderStandardSidebar({ technologyIsAggregate: true });
    for (const list of container.querySelectorAll('ul')) {
      const illegal = [...list.children].filter((child) => child.tagName !== 'LI');
      expect(illegal.map((c) => c.tagName)).toEqual([]);
    }
  });
});
