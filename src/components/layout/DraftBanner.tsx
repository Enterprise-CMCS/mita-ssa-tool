/**
 * Site-wide predecisional pilot disclaimer, rendered twice: once below the header and
 * once at the foot of the viewport. CMS requires both, with different wording — the
 * bottom one carries the Paperwork Reduction Act statement.
 *
 * Both render on every page while `IS_DRAFT` is set, so anyone looking at the tool —
 * including in a screenshot circulated for review — can see it is not final.
 *
 * Announcement semantics, which took a couple of passes to get right:
 *
 *  - Not `role="alert"`. That is assertive and would interrupt a screen reader on
 *    every navigation, for text that has not changed.
 *  - Not a live region either, though not for the reason first written here: a
 *    live region announces *mutations*, so a static one would simply never fire.
 *    It would be inert rather than noisy — still the wrong tool, but it is worth
 *    the record being accurate.
 *  - A labelled landmark, which is what actually helps: the notice becomes
 *    discoverable in a screen reader's landmark list instead of relying on the
 *    user happening to traverse it. `<section>` with an accessible name follows the
 *    USWDS Site Alert pattern, which is the closest precedent for a government
 *    tool, and it also satisfies axe's `region` rule that flags top-level content
 *    sitting outside any landmark.
 *  - **The two landmarks must not share an accessible name.** Two same-named
 *    landmarks is an axe `landmark-unique` violation, and it is exactly the defect
 *    Wave 4 found when `AspectCard` duplicated MUI's accordion region. The names
 *    below are deliberately different and describe what each notice adds.
 *
 * `Layout` additionally suffixes the document title, because the skip link jumps
 * past the top banner to `#main-content`.
 */

import { JSX } from 'react';
import { Box, Typography } from '@mui/material';
import { DRAFT_NOTICE_BODY, DRAFT_NOTICE_FULL_BODY, DRAFT_NOTICE_LABEL } from '../../constants';

/** Accessible name for the top landmark, also used by tests. */
export const DRAFT_BANNER_LANDMARK_LABEL = 'Predecisional pilot materials notice';

/** Accessible name for the bottom landmark, also used by tests. */
export const DRAFT_BANNER_FULL_LANDMARK_LABEL = 'Paperwork Reduction Act notice';

interface DraftBannerProps {
  /**
   * `'top'` renders the short notice below the header; `'bottom'` renders the full
   * notice, including the PRA statement, at the foot of the viewport.
   */
  variant: 'top' | 'bottom';
}

export function DraftBanner({ variant }: DraftBannerProps): JSX.Element {
  const isBottom = variant === 'bottom';

  return (
    <Box
      component="section"
      aria-label={isBottom ? DRAFT_BANNER_FULL_LANDMARK_LABEL : DRAFT_BANNER_LANDMARK_LABEL}
      sx={{
        // error.dark rather than error.main: measured 7.03:1 against white versus
        // 4.67:1, so it clears WCAG AA with margin at this small text size while
        // still reading unmistakably as red.
        backgroundColor: 'error.dark',
        color: 'common.white',
        px: 2,
        py: 0.5,
        textAlign: 'center',
        // The app shell is height:100vh with overflow hidden and the assessment
        // page is a fixed-height working area, so this must never absorb space
        // from the content below it.
        flexShrink: 0,
      }}
    >
      <Typography
        variant="caption"
        component="p"
        sx={{
          // The bottom notice is roughly four times longer than the top one, so it is
          // set a step smaller and tighter. Both banners are fixed furniture in a
          // 100vh shell; at 0.8rem the full text cost about 90px of a 720px viewport,
          // which the assessment page's working area cannot spare. Measured in a
          // browser rather than estimated — see the Wave 5 notes in the plan.
          fontSize: isBottom ? '0.7rem' : '0.8rem',
          lineHeight: isBottom ? 1.35 : 1.5,
          // Keep the long statement to a readable measure instead of letting it run
          // the full width of a wide monitor.
          maxWidth: isBottom ? '1100px' : undefined,
          mx: isBottom ? 'auto' : undefined,
        }}
      >
        <strong>{DRAFT_NOTICE_LABEL}</strong>
        {': '}
        {isBottom ? DRAFT_NOTICE_FULL_BODY : DRAFT_NOTICE_BODY}
      </Typography>
    </Box>
  );
}
