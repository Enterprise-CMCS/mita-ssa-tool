/**
 * Custom React Hooks - public API
 */

export { useCapabilityAssessments } from './useCapabilityAssessments';
export { useOrbitRatings } from './useOrbitRatings';
export { useScores } from './useScores';
export { useSaveStatus } from './useSaveStatus';
export type { SaveStatus } from './useSaveStatus';
export type { AggregateDimensionScore } from './useScores';
export { useTags } from './useTags';
export { useHistory } from './useHistory';
export { useAttachments } from './useAttachments';
/*
 * Only `useDebouncedSave` is re-exported here. `useDebounce` and `useDebouncedCallback` are used
 * too, but every consumer imports them straight from `./useDebounce`, so the barrel entries were
 * dead weight -- knip 6 reports them where knip 5 did not. Same for `UseSaveStatusReturn` above
 * and the whole `./errors` block that used to sit in `utils/index.ts`. Add a line back if a
 * consumer ever wants the barrel path; the direct import is what steering section 6 documents.
 */
export { useDebouncedSave } from './useDebounce';
