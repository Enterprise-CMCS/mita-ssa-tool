/**
 * MaturityLevelSelector Component Tests
 *
 * Written BEFORE the OBS-29 rewrite, deliberately. This is the most-used control
 * in the app — every one of the 26 aspects per assessment is rated through it —
 * and it had no test file at all, so there was no safety net for restructuring
 * it. These tests describe observable behaviour (what a user can select, what the
 * callbacks receive, what assistive technology is told) rather than markup, so
 * they should hold across the implementation change.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { MaturityLevelSelector } from './MaturityLevelSelector';
import type { MaturityLevelWithNA } from '../../types';

const LEVELS = [
  { level: 1 as MaturityLevelWithNA, name: 'Initial', description: 'Ad hoc and undocumented.' },
  { level: 2 as MaturityLevelWithNA, name: 'Developing', description: 'Documented in SOPs.' },
  { level: 3 as MaturityLevelWithNA, name: 'Defined', description: 'Standardized org-wide.' },
  { level: 4 as MaturityLevelWithNA, name: 'Managed', description: 'Measured and monitored.' },
  { level: 5 as MaturityLevelWithNA, name: 'Optimized', description: 'Continuously improved.' },
];

interface Overrides {
  asIsValue?: MaturityLevelWithNA;
  toBeValue?: MaturityLevelWithNA | undefined;
  previousAsIsValue?: MaturityLevelWithNA;
  disabled?: boolean;
}

function setup(overrides: Overrides = {}): {
  onAsIsChange: ReturnType<typeof vi.fn>;
  onToBeChange: ReturnType<typeof vi.fn>;
  user: ReturnType<typeof userEvent.setup>;
  container: HTMLElement;
} {
  const onAsIsChange = vi.fn();
  const onToBeChange = vi.fn();
  const user = userEvent.setup();
  const { container } = render(
    <MaturityLevelSelector
      asIsValue={overrides.asIsValue ?? 0}
      toBeValue={overrides.toBeValue}
      onAsIsChange={onAsIsChange}
      onToBeChange={onToBeChange}
      levelDescriptions={LEVELS}
      previousAsIsValue={overrides.previousAsIsValue}
      disabled={overrides.disabled}
    />
  );
  return { onAsIsChange, onToBeChange, user, container };
}

/**
 * The As-Is radio for a given level, found by its accessible name. The name is
 * the short visible label (`L3: Defined`) rather than the full criteria text,
 * which lives in `aria-describedby` — see the component for why.
 */
function asIsRadio(level: number): HTMLElement {
  return screen.getByRole('radio', { name: new RegExp(`^L${level}:`) });
}

/** The To-Be radio for a given level. */
function toBeRadio(level: number): HTMLElement {
  return screen.getByRole('radio', { name: new RegExp(`To-Be target.*Level ${level}`, 'i') });
}

describe('MaturityLevelSelector', () => {
  describe('rendering', () => {
    it('should render every level with its name and description', () => {
      setup();
      for (const { level, name, description } of LEVELS) {
        expect(screen.getByText(`L${level}: ${name}`)).toBeInTheDocument();
        expect(screen.getByText(description)).toBeInTheDocument();
      }
    });

    it('should offer a Not Applicable option alongside the five levels', () => {
      setup();
      expect(screen.getByText('Not Applicable')).toBeInTheDocument();
    });

    it('should show the previous level when one is supplied', () => {
      setup({ previousAsIsValue: 3 });
      expect(screen.getByText(/Previous: Level 3/)).toBeInTheDocument();
    });

    it('should mark the previous level row with a dashed border', () => {
      // The carry-forward affordance: the row a previous assessment selected is
      // outlined dashed until the user picks something. Once it IS the current
      // selection the solid selected border takes over.
      const { container } = setup({ previousAsIsValue: 3, asIsValue: 0 });
      const rows = [...container.querySelectorAll<HTMLElement>('.MuiPaper-root')];
      const dashed = rows.filter((r) => getComputedStyle(r).borderStyle === 'dashed');
      expect(dashed).toHaveLength(1);
      expect(dashed[0]).toHaveTextContent('L3: Defined');
    });

    it('should not dash the previous row once it is the current selection', () => {
      const { container } = setup({ previousAsIsValue: 3, asIsValue: 3 });
      const dashed = [...container.querySelectorAll<HTMLElement>('.MuiPaper-root')].filter(
        (r) => getComputedStyle(r).borderStyle === 'dashed'
      );
      expect(dashed).toHaveLength(0);
    });

    it('should not show a previous level for an unassessed aspect', () => {
      setup({ previousAsIsValue: 0 });
      expect(screen.queryByText(/Previous:/)).not.toBeInTheDocument();
    });
  });

  describe('As-Is selection', () => {
    it('should report the chosen level', async () => {
      const { onAsIsChange, user } = setup();
      await user.click(asIsRadio(3));
      expect(onAsIsChange).toHaveBeenCalledWith(3);
    });

    it('should mark the current level as checked and the others as not', () => {
      setup({ asIsValue: 4 });
      expect(asIsRadio(4)).toBeChecked();
      expect(asIsRadio(1)).not.toBeChecked();
      expect(asIsRadio(5)).not.toBeChecked();
    });

    it('should report -1 when Not Applicable is chosen', async () => {
      const { onAsIsChange, user } = setup();
      await user.click(screen.getByRole('radio', { name: /Not Applicable/i }));
      expect(onAsIsChange).toHaveBeenCalledWith(-1);
    });

    it('should show Not Applicable as checked when the value is -1', () => {
      setup({ asIsValue: -1 });
      expect(screen.getByRole('radio', { name: /Not Applicable/i })).toBeChecked();
    });

    it('should leave every option unchecked for an unassessed aspect', () => {
      setup({ asIsValue: 0 });
      for (const { level } of LEVELS) expect(asIsRadio(level)).not.toBeChecked();
      expect(screen.getByRole('radio', { name: /Not Applicable/i })).not.toBeChecked();
    });
  });

  describe('To-Be target', () => {
    it('should report the chosen target level', async () => {
      const { onToBeChange, user } = setup();
      await user.click(toBeRadio(4));
      expect(onToBeChange).toHaveBeenCalledWith(4);
    });

    it('should mark only the chosen target as checked', () => {
      setup({ toBeValue: 2 });
      expect(toBeRadio(2)).toBeChecked();
      expect(toBeRadio(5)).not.toBeChecked();
    });

    it('should allow the target to be cleared back to none', async () => {
      const { onToBeChange, user } = setup({ toBeValue: 3 });
      await user.click(screen.getByRole('button', { name: /clear to-be/i }));
      expect(onToBeChange).toHaveBeenCalledWith(undefined);
    });

    it('should not offer a clear control when no target is set', () => {
      setup({ toBeValue: undefined });
      expect(screen.queryByRole('button', { name: /clear to-be/i })).not.toBeInTheDocument();
    });

    it('should keep As-Is and To-Be independent', async () => {
      const { onAsIsChange, onToBeChange, user } = setup({ asIsValue: 2 });
      await user.click(toBeRadio(5));
      expect(onToBeChange).toHaveBeenCalledWith(5);
      // Choosing a target must not also move the current level.
      expect(onAsIsChange).not.toHaveBeenCalled();
    });
  });

  describe('disabled state', () => {
    it('should not report changes while disabled', async () => {
      const { onAsIsChange, onToBeChange } = setup({ disabled: true });
      // MUI sets `pointer-events: none` on disabled controls, so the default
      // userEvent guard would refuse to click and the test would pass without
      // exercising anything. Clicking through proves the browser's own
      // disabled-input behaviour suppresses the change event.
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      await user.click(asIsRadio(3));
      await user.click(toBeRadio(3));
      expect(onAsIsChange).not.toHaveBeenCalled();
      expect(onToBeChange).not.toHaveBeenCalled();
    });

    it('should mark every control as disabled, including clear and Not Applicable', () => {
      setup({ disabled: true, toBeValue: 2 });
      for (const { level } of LEVELS) {
        expect(asIsRadio(level)).toBeDisabled();
        expect(toBeRadio(level)).toBeDisabled();
      }
      expect(screen.getByRole('radio', { name: /Not Applicable/i })).toBeDisabled();
      // The clear control is a Button rather than a radio, so it needs its own
      // check — otherwise view mode would still let a target be removed.
      expect(screen.getByRole('button', { name: /clear to-be/i })).toBeDisabled();
    });
  });

  describe('accessibility semantics', () => {
    /**
     * The core of OBS-29. The old markup put `role="radiogroup"` and
     * `role="radio"` on `div`s and nested a checkbox INSIDE each radio, which
     * ARIA erases (radio has presentational children) and axe reports as
     * `nested-interactive`.
     */
    it('should use real radio inputs, not ARIA roles on generic elements', () => {
      const { container } = setup();
      const radios = container.querySelectorAll('input[type="radio"]');
      // 6 As-Is options (5 levels + N/A) plus 5 To-Be targets.
      expect(radios).toHaveLength(11);
      expect(container.querySelector('[role="radio"]')).toBeNull();
      expect(container.querySelector('[role="radiogroup"]')).toBeNull();
    });

    it('should not nest one interactive control inside another', () => {
      const { container } = setup();
      for (const input of container.querySelectorAll('input')) {
        const ancestor = input.parentElement?.closest('input,[role="radio"],[role="checkbox"]');
        expect(ancestor).toBeNull();
      }
    });

    it('should group As-Is and To-Be as two separate native radio groups', () => {
      const { container } = setup();
      const names = new Set(
        [...container.querySelectorAll<HTMLInputElement>('input[type="radio"]')].map((r) => r.name)
      );
      // Exactly two groups. Native `name` grouping is what gives arrow-key
      // navigation and a roving tabindex without hand-rolling either.
      expect(names.size).toBe(2);
      for (const name of names) expect(name).toBeTruthy();
    });

    it('should give each instance distinct group names so aspects do not merge', () => {
      // Two selectors on one page must not form one radio group, or choosing a
      // level for one aspect would clear the other. The assessment page renders
      // one of these per aspect.
      const { container: first } = setup();
      const { container: second } = setup();
      const namesOf = (c: HTMLElement): string[] => [
        ...new Set(
          [...c.querySelectorAll<HTMLInputElement>('input[type="radio"]')].map((r) => r.name)
        ),
      ];
      expect(namesOf(first).some((n) => namesOf(second).includes(n))).toBe(false);
    });

    it('should label the control as a group', () => {
      setup();
      const group = screen.getByRole('group', { name: /maturity level/i });
      expect(within(group).getAllByRole('radio').length).toBeGreaterThan(0);
    });

    it('should have no accessibility violations', async () => {
      const { container } = setup({ asIsValue: 3, toBeValue: 4, previousAsIsValue: 2 });
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('keyboard operation', () => {
    /**
     * The headline win of OBS-29. The old markup gave all six level rows
     * `tabIndex={0}` and interleaved the To-Be checkbox between them, so a single
     * aspect cost 11 tab stops and a ten-aspect dimension 110. Two native
     * radio groups cost two — one entry point each.
     *
     * Note the order: the As-Is group's tabbable member is its *checked* radio,
     * while the To-Be group (nothing checked) exposes its first radio. So on a
     * row-interleaved layout the To-Be flag of row 1 can precede the As-Is
     * selection. Both are labelled and operable; only the count is asserted here
     * because the order is a consequence of the visual layout, not a contract.
     */
    it('should not hand-roll tab stops on the level rows', () => {
      // Asserted with a To-Be target set, so the Clear button is present: MUI
      // renders that with `tabindex="0"`, and a blanket `[tabindex]` count would
      // pass only on a fixture that happens to omit `toBeValue`.
      const { container } = setup({ asIsValue: 2, toBeValue: 4 });
      // The old implementation put `tabIndex={0}` on all six level rows, and the
      // nested checkbox inputs added five more — 11 stops for one aspect. Native
      // radio groups manage a roving tabindex themselves, so no row or control
      // inside the groups should declare a tab stop of its own.
      const rows = container.querySelectorAll('.MuiPaper-root[tabindex]');
      expect(rows).toHaveLength(0);
      expect(container.querySelectorAll('input[tabindex]')).toHaveLength(0);
      expect(container.querySelectorAll('input[type="radio"]')).toHaveLength(11);
    });

    /**
     * Deliberately NOT asserting the total number of tab stops here. `user-event`
     * prunes a radio group to its checked member when computing the next tab
     * destination, but with nothing checked there is no member to prune to, so it
     * treats every radio in that group as tabbable — where Chrome exposes only
     * the first. (jsdom itself implements no Tab handling at all; this is
     * `user-event` behaviour.) A count measured here would therefore be wrong.
     * Measured in real Chromium instead: 2 stops for the whole control, down from
     * 11. See the Wave 4 audit record.
     */
    it('should expose one entry point per group once a value is chosen', async () => {
      const { user, container } = setup({ asIsValue: 2, toBeValue: 4 });
      const inputs = [...container.querySelectorAll('input[type="radio"]')];
      const visited: string[] = [];
      for (let i = 0; i < 5; i++) {
        await user.tab();
        const active = document.activeElement;
        if (!active || !inputs.includes(active as Element)) break;
        visited.push(active.getAttribute('aria-label') ?? '');
      }
      // With both groups having a checked member, `user-event` and Chrome agree:
      // the checked radio is the group's only tab stop.
      expect(visited).toHaveLength(2);
      expect(visited.some((label) => label === 'L2: Developing')).toBe(true);
      expect(visited.some((label) => label.includes('Level 4'))).toBe(true);
    });

    it('should move between levels with arrow keys and select on the way', async () => {
      const { onAsIsChange, user } = setup({ asIsValue: 2 });
      asIsRadio(2).focus();
      expect(asIsRadio(2)).toHaveFocus();
      await user.keyboard('{ArrowDown}');
      // A native radio group both moves focus and selects, which is exactly the
      // behaviour the hand-rolled `role="radio"` version never implemented.
      expect(onAsIsChange).toHaveBeenCalledWith(3);
    });

    it('should move backwards with arrow keys', async () => {
      const { onAsIsChange, user } = setup({ asIsValue: 2 });
      asIsRadio(2).focus();
      await user.keyboard('{ArrowUp}');
      expect(onAsIsChange).toHaveBeenCalledWith(1);
    });

    it('should wrap from the first option round to Not Applicable', async () => {
      // Not Applicable is the last member of the As-Is group, so arrowing up from
      // Level 1 wraps to it. Worth pinning because it is the one place the N/A
      // sentinel (-1) meets native group navigation.
      const { onAsIsChange, user } = setup({ asIsValue: 1 });
      asIsRadio(1).focus();
      await user.keyboard('{ArrowUp}');
      expect(onAsIsChange).toHaveBeenCalledWith(-1);
    });

    it('should keep arrow keys inside the To-Be group', async () => {
      const { onAsIsChange, onToBeChange, user } = setup({ toBeValue: 2 });
      toBeRadio(2).focus();
      await user.keyboard('{ArrowDown}');
      expect(onToBeChange).toHaveBeenCalledWith(3);
      // Crucially, arrowing through targets must not change the current level.
      expect(onAsIsChange).not.toHaveBeenCalled();
    });

    it('should select with the space key', async () => {
      const { onAsIsChange, user } = setup();
      asIsRadio(1).focus();
      await user.keyboard(' ');
      expect(onAsIsChange).toHaveBeenCalledWith(1);
    });
  });
});
