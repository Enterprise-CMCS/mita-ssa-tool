/**
 * Maturity Level Selector Component
 *
 * Two independent choices per aspect, presented as one row per maturity level:
 * the **As-Is** level (current state) and an optional **To-Be** target.
 *
 * Both are single-select, so both are native radio groups. That is a deliberate
 * change from the previous implementation, which was inaccessible in three
 * distinct ways (OBS-29):
 *
 * 1. `role="radiogroup"` and `role="radio"` were applied to `div`s, so arrow-key
 *    navigation and a roving tabindex would have had to be hand-rolled, and
 *    neither was — arrow keys did nothing at all.
 * 2. Every row carried `tabIndex={0}`, so Tab visited all six options and then
 *    interleaved the To-Be control: 11 stops per aspect — six rows plus five
 *    checkbox inputs — and 110 to cross a ten-aspect dimension. A native radio
 *    group is one stop.
 * 3. The To-Be control was a checkbox nested **inside** a `role="radio"`. ARIA
 *    gives `radio` presentational children, so assistive technology erased it
 *    entirely even though it stayed focusable — the To-Be feature was
 *    effectively unavailable to screen reader users, and axe reported it as
 *    `nested-interactive`.
 *
 * Using real `<input type="radio">` elements grouped by `name` gets arrow keys,
 * the roving tabindex, and correct "n of m" announcements from the browser
 * rather than from code here. The two groups are siblings, never nested.
 *
 * To-Be was previously a checkbox that toggled off when re-clicked. Radios do
 * not untoggle, so clearing a target is now an explicit button — which is also
 * more discoverable than "click the checked thing again".
 */

import { JSX, useId } from 'react';
import {
  Box,
  Typography,
  Paper,
  Radio,
  FormControlLabel,
  Button,
  alpha,
  useTheme,
} from '@mui/material';
import BlockIcon from '@mui/icons-material/Block';
import FlagIcon from '@mui/icons-material/Flag';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import type { MaturityLevelWithNA } from '../../types';

interface LevelDescription {
  level: MaturityLevelWithNA;
  name: string;
  description: string;
}

interface MaturityLevelSelectorProps {
  asIsValue: MaturityLevelWithNA;
  toBeValue: MaturityLevelWithNA | undefined;
  onAsIsChange: (level: MaturityLevelWithNA) => void;
  onToBeChange: (level: MaturityLevelWithNA | undefined) => void;
  levelDescriptions: LevelDescription[];
  previousAsIsValue?: MaturityLevelWithNA;
  disabled?: boolean;
}

/** The sentinel stored for "not applicable to this capability area". */
const NOT_APPLICABLE: MaturityLevelWithNA = -1;

/**
 * Maturity level selector: one radio per level for As-Is, plus an optional To-Be
 * target on each level row.
 */
export function MaturityLevelSelector({
  asIsValue,
  toBeValue,
  onAsIsChange,
  onToBeChange,
  levelDescriptions,
  previousAsIsValue,
  disabled = false,
}: MaturityLevelSelectorProps): JSX.Element {
  const theme = useTheme();

  /**
   * Radio grouping is by `name`, not by DOM ancestry, so these must be unique
   * per instance. The assessment page renders one selector per aspect and several
   * can be expanded at once; sharing a name would merge every aspect into a
   * single group, so choosing a level for one would silently clear another.
   */
  // `useId()` yields values like `:r3:`. Colons are legal in a `name` attribute
  // but break unescaped CSS attribute selectors, so strip them.
  const instanceId = useId().replace(/:/g, '');
  const asIsGroup = `as-is-${instanceId}`;
  const toBeGroup = `to-be-${instanceId}`;

  const rowSx = (isSelected: boolean, isPrevious: boolean): Record<string, unknown> => ({
    display: 'flex',
    alignItems: 'flex-start',
    p: 1,
    pl: 0.5,
    borderColor: isSelected ? 'primary.main' : isPrevious ? 'info.light' : 'divider',
    borderWidth: isSelected ? 2 : 1,
    borderStyle: isPrevious && !isSelected ? 'dashed' : 'solid',
    bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.05) : 'background.paper',
    transition: 'all 0.15s ease',
    '&:hover': disabled
      ? {}
      : {
          bgcolor: isSelected
            ? alpha(theme.palette.primary.main, 0.08)
            : alpha(theme.palette.action.hover, 0.04),
        },
  });

  return (
    /**
     * A `fieldset` with a `legend` names the whole control for assistive
     * technology. It wraps *both* radio groups: the two are interleaved row by
     * row, so neither can have its own fieldset, and each radio instead carries a
     * self-describing accessible name.
     */
    <Box component="fieldset" sx={{ border: 0, m: 0, p: 0, minWidth: 0 }}>
      {/* `legend` takes phrasing content only, so every child here is a span —
          a `div` inside a `legend` is outside its content model. */}
      <Box
        component="legend"
        sx={{ p: 0, mb: 1, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}
      >
        <Typography variant="subtitle2" component="span" color="text.secondary">
          Select Maturity Level
        </Typography>
        {previousAsIsValue !== undefined && previousAsIsValue > 0 && (
          <Typography
            variant="caption"
            component="span"
            sx={{
              px: 1,
              py: 0.25,
              bgcolor: alpha(theme.palette.info.main, 0.1),
              color: 'info.dark',
              borderRadius: 1,
            }}
          >
            {/* Leading separator: the legend is the group's accessible name, and
                without it the two spans concatenate to
                "Select Maturity LevelPrevious: Level 3". */}
            {'\u2014 '}Previous: Level {previousAsIsValue}
          </Typography>
        )}
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {levelDescriptions.map((levelDesc) => {
          const isAsIsSelected = asIsValue === levelDesc.level;
          const isToBeSelected = toBeValue === levelDesc.level;
          const isPrevious = previousAsIsValue === levelDesc.level;

          return (
            <Paper key={levelDesc.level} variant="outlined" sx={rowSx(isAsIsSelected, isPrevious)}>
              {/* As-Is: the label covers the level text, so clicking the row body
                  selects the level, as it did before. */}
              <FormControlLabel
                sx={{ flex: 1, m: 0, alignItems: 'flex-start' }}
                control={
                  <Radio
                    name={asIsGroup}
                    value={String(levelDesc.level)}
                    checked={isAsIsSelected}
                    disabled={disabled}
                    onChange={() => onAsIsChange(levelDesc.level)}
                    size="small"
                    /**
                     * Name is the short label only; the criteria text is a
                     * *description*. Two reasons. Arrow-keying through the group
                     * re-announces the name on every step, and the real ORBIT
                     * descriptions run 190-431 characters — a name cannot be
                     * skipped, a description can. And WCAG 2.5.3 (Label in Name)
                     * wants the name to contain the visible text, which is
                     * "L3: Defined", not "Level 3: Defined ...".
                     */
                    inputProps={{
                      'aria-label': `L${levelDesc.level}: ${levelDesc.name}`,
                      'aria-describedby': `${instanceId}-level-${levelDesc.level}-desc`,
                    }}
                    sx={{ mt: 0.25, mr: 1 }}
                  />
                }
                label={
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" component="span" sx={{ fontWeight: 600 }}>
                      L{levelDesc.level}: {levelDesc.name}
                    </Typography>
                    <Typography
                      id={`${instanceId}-level-${levelDesc.level}-desc`}
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.5, lineHeight: 1.5, fontSize: '0.85rem' }}
                    >
                      {levelDesc.description}
                    </Typography>
                  </Box>
                }
              />

              {/* To-Be: a sibling of the As-Is label, never a descendant of it.
                  Nesting it inside was the `nested-interactive` failure. */}
              <FormControlLabel
                sx={{ m: 0, ml: 1, flexShrink: 0, alignItems: 'center' }}
                control={
                  <Radio
                    name={toBeGroup}
                    value={String(levelDesc.level)}
                    checked={isToBeSelected}
                    disabled={disabled}
                    onChange={() => onToBeChange(levelDesc.level)}
                    size="small"
                    icon={<FlagOutlinedIcon sx={{ fontSize: 18 }} />}
                    checkedIcon={<FlagIcon sx={{ fontSize: 18 }} />}
                    // The visible text is just "To-Be" on every row, so the
                    // accessible name has to carry the level or all five targets
                    // announce identically.
                    inputProps={{
                      'aria-label': `To-Be target: Level ${levelDesc.level} ${levelDesc.name}`,
                    }}
                    sx={{ p: 0.5, color: 'secondary.dark' }}
                  />
                }
                label={
                  <Typography
                    variant="caption"
                    component="span"
                    aria-hidden="true"
                    sx={{
                      color: isToBeSelected ? 'secondary.dark' : 'text.secondary',
                      fontWeight: isToBeSelected ? 600 : 400,
                      userSelect: 'none',
                    }}
                  >
                    To-Be
                  </Typography>
                }
              />
            </Paper>
          );
        })}

        {/* Not Applicable is an As-Is choice only — a target level for something
            that does not apply is meaningless, so it has no To-Be radio. */}
        <Paper variant="outlined" sx={rowSx(asIsValue === NOT_APPLICABLE, false)}>
          <FormControlLabel
            sx={{ flex: 1, m: 0, alignItems: 'center' }}
            control={
              <Radio
                name={asIsGroup}
                value={String(NOT_APPLICABLE)}
                checked={asIsValue === NOT_APPLICABLE}
                disabled={disabled}
                onChange={() => onAsIsChange(NOT_APPLICABLE)}
                size="small"
                inputProps={{
                  'aria-label': 'Not Applicable',
                  'aria-describedby': `${instanceId}-na-desc`,
                }}
                sx={{ mr: 1 }}
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <BlockIcon
                  fontSize="small"
                  sx={{ color: 'text.secondary', mr: 1 }}
                  aria-hidden="true"
                />
                <Box>
                  <Typography variant="body2" component="span" sx={{ fontWeight: 600 }}>
                    Not Applicable
                  </Typography>
                  <Typography
                    id={`${instanceId}-na-desc`}
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block' }}
                  >
                    This aspect does not apply to this capability
                  </Typography>
                </Box>
              </Box>
            }
          />
        </Paper>
      </Box>

      {/* Legend, plus the clear control. A radio cannot be unchecked by clicking
          it again, so removing a To-Be target needs its own affordance. */}
      <Box sx={{ mt: 1.5, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="caption" color="text.secondary">
          Choose a level to set the current state
        </Typography>
        <Typography variant="caption" color="text.secondary">
          <FlagIcon
            sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5, color: 'secondary.dark' }}
            aria-hidden="true"
          />
          Flag a level to set the To-Be target
        </Typography>
        {toBeValue !== undefined && (
          <Button
            size="small"
            variant="text"
            disabled={disabled}
            onClick={() => onToBeChange(undefined)}
            sx={{ minHeight: 0, py: 0.25 }}
          >
            Clear To-Be target
          </Button>
        )}
      </Box>
    </Box>
  );
}
