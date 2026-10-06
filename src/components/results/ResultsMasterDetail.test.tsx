/**
 * ResultsMasterDetail Component Tests
 *
 * Narrowly scoped to the navigation tree's markup. This is the file where the
 * Wave 4 accessibility work first traded one axe violation for another —
 * wrapping rows in `ListItem` moved `aria-expanded`-style problems around but
 * put `<li>`s inside the `<Collapse>` div rather than inside a `<ul>`, producing
 * `listitem` violations. That was caught by a browser sweep, not by the suite;
 * these assertions close that gap.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { axe } from 'vitest-axe';
import { ResultsMasterDetail } from './ResultsMasterDetail';
import { clearDatabase } from '../../services/db';
import type { CapabilityDomain } from '../../types';

/**
 * Two domains across two layers, each with areas, so the tree renders every
 * level: layer header, domain row, and area rows.
 */
const domains: CapabilityDomain[] = [
  {
    id: 'claims-encounter-management',
    name: 'Claims and Encounter Management',
    layer: 'core',
    description: 'Claims domain',
    areas: [
      { id: 'claims-adjudication', name: 'Claims Adjudication', description: 'Adjudication' },
      { id: 'encounter-processing', name: 'Encounter Processing', description: 'Encounters' },
    ],
  },
  {
    id: 'strategy-planning-management',
    name: 'Strategy and Planning Management',
    layer: 'strategic',
    description: 'Strategy domain',
    areas: [
      { id: 'strategic-plan-maintenance', name: 'Strategic Plan Maintenance', description: 'Plan' },
    ],
  },
] as CapabilityDomain[];

function renderTree(): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <ResultsMasterDetail domains={domains} />
    </MemoryRouter>
  );
}

/** Every `ul` in the subtree may contain only `li` children. */
function illegalListChildren(container: HTMLElement): string[] {
  const offenders: string[] = [];
  for (const list of container.querySelectorAll('ul')) {
    for (const child of list.children) {
      if (child.tagName !== 'LI') offenders.push(`ul > ${child.tagName}`);
    }
  }
  return offenders;
}

/** Every `li` must have a list as its nearest list-ish ancestor. */
function orphanedListItems(container: HTMLElement): number {
  return [...container.querySelectorAll('li')].filter(
    (li) => li.parentElement?.tagName !== 'UL' && li.parentElement?.tagName !== 'OL'
  ).length;
}

describe('ResultsMasterDetail navigation tree', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  it('should render a layer header for each represented layer', async () => {
    renderTree();
    await waitFor(() => {
      expect(screen.getByText('Domains & Areas')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /Strategic layer/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Core Operations layer/i })).toBeInTheDocument();
  });

  it('should keep list markup valid while collapsed', async () => {
    const { container } = renderTree();
    await waitFor(() => {
      expect(screen.getByText('Domains & Areas')).toBeInTheDocument();
    });
    expect(illegalListChildren(container)).toEqual([]);
    expect(orphanedListItems(container)).toBe(0);
  });

  it('should keep list markup valid with a domain expanded to show its areas', async () => {
    const user = userEvent.setup();
    const { container } = renderTree();
    // Layers start expanded (`new Set(LAYER_ORDER)`), so domain rows are already
    // visible; only the area level needs a click to reveal.
    const domainRow = await screen.findByRole('button', {
      name: /Claims and Encounter Management/i,
    });
    expect(illegalListChildren(container)).toEqual([]);
    expect(orphanedListItems(container)).toBe(0);

    // Clicking a domain both selects it (populating the detail panel) and
    // expands it, so the area name can legitimately match more than one button.
    await user.click(domainRow);
    await waitFor(() => {
      expect(
        screen.getAllByRole('button', { name: /Claims Adjudication/i }).length
      ).toBeGreaterThan(0);
    });
    expect(illegalListChildren(container)).toEqual([]);
    expect(orphanedListItems(container)).toBe(0);
  });

  it('should keep list markup valid after a layer is collapsed', async () => {
    const user = userEvent.setup();
    const { container } = renderTree();
    const layerRow = await screen.findByRole('button', { name: /Core Operations layer/i });
    await user.click(layerRow);
    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: /Claims and Encounter Management/i })
      ).not.toBeInTheDocument();
    });
    expect(illegalListChildren(container)).toEqual([]);
    expect(orphanedListItems(container)).toBe(0);
  });

  it('should have no accessibility violations with the tree fully expanded', async () => {
    const user = userEvent.setup();
    const { container } = renderTree();
    await user.click(
      await screen.findByRole('button', { name: /Claims and Encounter Management/i })
    );
    await waitFor(() => {
      expect(
        screen.getAllByRole('button', { name: /Claims Adjudication/i }).length
      ).toBeGreaterThan(0);
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
