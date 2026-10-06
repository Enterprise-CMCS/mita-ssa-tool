/**
 * Information Management Notice
 *
 * Persistent guidance banner shown while assessing an "<X> Information
 * Management" capability area. Per the BA working group decision (July 2026),
 * states assessing a whole domain should complete their information maturity
 * once in the domain's Information Management area and skip the Information
 * dimension in the domain's other areas; states assessing a single capability
 * area should assess the Information dimension within that area instead.
 */

import { JSX } from 'react';
import { Alert, AlertTitle } from '@mui/material';

/**
 * Warning banner rendered on Information Management capability area
 * assessment pages. Copy is pending working-group affirmation in staging.
 */
export function InformationManagementNotice(): JSX.Element {
  return (
    <Alert severity="warning" sx={{ borderRadius: 0 }}>
      <AlertTitle>Information Management guidance</AlertTitle>
      Complete this capability area when you are assessing multiple capability areas within this
      domain — assess your information maturity once here, and skip the Information dimension in
      this domain&apos;s other capability areas. If you are assessing only a single capability area,
      assess the Information dimension within that area instead.
    </Alert>
  );
}
