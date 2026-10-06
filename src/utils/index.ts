/**
 * Utilities barrel export
 *
 * Re-exports all utility functions for convenient importing.
 */

export { getScoreColor, formatScore, SCORE_COLORS } from './colors';

/*
 * `./errors` is deliberately not re-exported. `AssessmentError`, `withErrorHandling`,
 * `isAssessmentError`, `getErrorMessage` and `AssessmentErrorCode` are all in heavy use, but every
 * consumer imports them from `../utils/errors` directly -- which is the form steering section 6
 * documents -- so the re-exports here were never reached. knip 6 reports them; knip 5 did not.
 */
