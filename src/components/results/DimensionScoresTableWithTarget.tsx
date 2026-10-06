/**
 * Dimension Scores Table with Target (To-Be) Component
 *
 * Enhanced version of DimensionScoresTable that shows both
 * As-Is (current) and To-Be (target) maturity levels with gap analysis.
 */

import { JSX, useState, Fragment } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  Collapse,
  Stack,
} from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import NotesIcon from '@mui/icons-material/Notes';
import WarningIcon from '@mui/icons-material/Warning';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import type {
  DimensionScore,
  OrbitRating,
  Attachment,
  MaturityLevelWithNA,
  LevelKey,
} from '../../types';
import { MATURITY_LEVEL_NAMES } from '../../types';
import { getAspect, getMaturityLevelMeta, getOrganizationalAspect } from '../../services/orbit';
import { isOrganizationalDimensionId } from '../../constants';
import { SCORE_COLORS } from '../../utils';

/**
 * Extended dimension score with optional aggregate metadata.
 * Used when displaying enterprise domain assessments where one dimension
 * is aggregated from other assessments.
 */
export interface ExtendedDimensionScore extends DimensionScore {
  /** Whether this dimension score is an aggregate from multiple assessments */
  isAggregate?: boolean;
  /** Number of assessments contributing to the aggregate score */
  aggregateContributingCount?: number;
}

interface TargetDimScore {
  dimensionId: string;
  targetLevel: number | null;
}

interface DimensionScoresTableWithTargetProps {
  dimensionScores: ExtendedDimensionScore[];
  targetDimScores: TargetDimScore[];
  ratings: OrbitRating[];
  attachments: Attachment[];
  onDownloadAttachment: (attachment: Attachment) => void;
}

/**
 * Colour for an As-Is chip in this view.
 *
 * Deliberately a single blue rather than the banded `SCORE_COLORS` scale: this
 * table's job is As-Is vs To-Be comparison, so banding both columns by score
 * would compete with the comparison. `SCORE_COLORS.developing` is reused rather
 * than a local hex so there is one blue to keep compliant — the previous
 * `#1976d2` cleared 4.5:1 only barely, at 4.60:1.
 */
function getScoreColor(score: number | null): string {
  if (score === null) return SCORE_COLORS.none;
  return SCORE_COLORS.developing;
}

/**
 * Colour for a To-Be chip. `SCORE_COLORS.excellent` (5.13:1 on white) replaces a
 * hardcoded `#4caf50`, which measured 2.78:1 as chip text and as a border.
 */
const TO_BE_COLOR = SCORE_COLORS.excellent;

/**
 * Get maturity level display with name
 */
function getLevelDisplay(level: MaturityLevelWithNA): string {
  if (level === 0) return 'Not Assessed';
  if (level === -1) return 'N/A';
  return `Level ${level}: ${MATURITY_LEVEL_NAMES[level]}`;
}

/**
 * Get maturity level description from ORBIT model
 */
function getLevelDescription(level: MaturityLevelWithNA): string | null {
  if (level <= 0) return null;
  const levelKey = `level${level}` as LevelKey;
  const meta = getMaturityLevelMeta(levelKey);
  return meta?.description ?? null;
}

/**
 * Get short level display for chip
 */
function getShortLevelDisplay(level: MaturityLevelWithNA | undefined): string {
  if (level === undefined || level === 0) return '—';
  if (level === -1) return 'N/A';
  return String(level);
}

/**
 * Aspect detail row component
 */
function AspectDetailRow({
  rating,
  attachments,
  onDownloadAttachment,
}: {
  rating: OrbitRating;
  attachments: Attachment[];
  onDownloadAttachment: (attachment: Attachment) => void;
}): JSX.Element {
  // Get aspect name from ORBIT model - handle both standard and organizational assessments
  const aspect = isOrganizationalDimensionId(rating.dimensionId)
    ? getOrganizationalAspect(rating.dimensionId, rating.aspectId)
    : getAspect(rating.dimensionId, rating.aspectId, rating.subDimensionId);
  const aspectName = aspect?.name ?? rating.aspectId;
  const ratingAttachments = attachments.filter((a) => a.orbitRatingId === rating.id);
  const hasNotes = rating.notes.trim().length > 0;
  const hasBarriers = rating.barriers.trim().length > 0;
  const hasPlans = rating.plans.trim().length > 0;
  const hasContent =
    hasNotes || hasBarriers || hasPlans || ratingAttachments.length > 0 || rating.currentLevel > 0;
  const levelDescription = getLevelDescription(rating.currentLevel);

  return (
    <Fragment>
      <TableRow sx={{ '& > td': { borderBottom: hasContent ? 'none' : undefined } }}>
        <TableCell sx={{ pl: 4 }}>
          <Typography variant="body2" fontWeight={500}>
            {aspectName}
          </Typography>
        </TableCell>
        <TableCell align="center">
          <Chip
            label={getShortLevelDisplay(rating.currentLevel)}
            size="small"
            sx={{
              bgcolor: rating.currentLevel > 0 ? getScoreColor(rating.currentLevel) : 'transparent',
              color: rating.currentLevel > 0 ? 'white' : 'text.secondary',
              fontWeight: 600,
              border: rating.currentLevel <= 0 ? '1px solid' : 'none',
              borderColor: 'divider',
            }}
          />
        </TableCell>
        <TableCell align="center">
          <Chip
            label={getShortLevelDisplay(rating.targetLevel)}
            size="small"
            variant="outlined"
            sx={{
              borderColor:
                rating.targetLevel && rating.targetLevel > 0 ? TO_BE_COLOR : 'text.disabled',
              color: rating.targetLevel && rating.targetLevel > 0 ? TO_BE_COLOR : 'text.secondary',
              fontWeight: 600,
            }}
          />
        </TableCell>
      </TableRow>

      {hasContent && (
        <TableRow>
          <TableCell colSpan={3} sx={{ pt: 0, pl: 4 }}>
            {rating.currentLevel > 0 && (
              <Box sx={{ mb: 1.5 }}>
                <Typography variant="body2" fontWeight={500} color="text.primary">
                  {getLevelDisplay(rating.currentLevel)}
                </Typography>
                {levelDescription && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {levelDescription}
                  </Typography>
                )}
              </Box>
            )}

            <Stack spacing={1.5}>
              {hasNotes && (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <NotesIcon fontSize="small" color="action" sx={{ mt: 0.25 }} aria-hidden="true" />
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      Notes
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {rating.notes}
                    </Typography>
                  </Box>
                </Box>
              )}

              {hasBarriers && (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <WarningIcon
                    fontSize="small"
                    color="warning"
                    sx={{ mt: 0.25 }}
                    aria-hidden="true"
                  />
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      Barriers & Challenges
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {rating.barriers}
                    </Typography>
                  </Box>
                </Box>
              )}

              {hasPlans && (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TrendingUpIcon
                    fontSize="small"
                    color="success"
                    sx={{ mt: 0.25 }}
                    aria-hidden="true"
                  />
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      Advancement Plans
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {rating.plans}
                    </Typography>
                  </Box>
                </Box>
              )}

              {ratingAttachments.length > 0 && (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <AttachFileIcon
                    fontSize="small"
                    color="action"
                    sx={{ mt: 0.25 }}
                    aria-hidden="true"
                  />
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      Attachments ({ratingAttachments.length})
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 0.5 }}>
                      {ratingAttachments.map((att) => (
                        <Chip
                          key={att.id}
                          label={att.fileName}
                          size="small"
                          variant="outlined"
                          onClick={() => onDownloadAttachment(att)}
                          aria-label={`Download attachment: ${att.fileName}`}
                          sx={{ cursor: 'pointer' }}
                        />
                      ))}
                    </Stack>
                  </Box>
                </Box>
              )}
            </Stack>
          </TableCell>
        </TableRow>
      )}
    </Fragment>
  );
}

/**
 * Expandable dimension row component
 */
function DimensionRow({
  dimensionName,
  dimensionId,
  assessedCount,
  totalCount,
  averageLevel,
  targetLevel,
  ratings,
  attachments,
  onDownloadAttachment,
  isSubDimension = false,
  subDimensionId,
  isAggregate = false,
  aggregateContributingCount,
}: {
  dimensionName: string;
  dimensionId: string;
  assessedCount: number;
  totalCount: number;
  averageLevel: number | null;
  targetLevel: number | null;
  ratings: OrbitRating[];
  attachments: Attachment[];
  onDownloadAttachment: (attachment: Attachment) => void;
  isSubDimension?: boolean;
  subDimensionId?: string;
  isAggregate?: boolean;
  aggregateContributingCount?: number;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const detailsId = `dimension-details-${subDimensionId ?? dimensionId}`;

  const dimensionRatings = ratings.filter((r) => {
    if (isSubDimension && subDimensionId) {
      return r.dimensionId === 'technology' && r.subDimensionId === subDimensionId;
    }
    return r.dimensionId === dimensionId && !r.subDimensionId;
  });

  // Aggregate dimensions don't have individual ratings to expand
  const hasRatings = !isAggregate && dimensionRatings.length > 0;

  const handleToggle = (): void => {
    if (hasRatings) {
      setOpen(!open);
    }
  };

  return (
    <Fragment>
      <TableRow
        onClick={handleToggle}
        sx={{
          bgcolor: isSubDimension ? 'transparent' : 'grey.50',
          cursor: hasRatings ? 'pointer' : 'default',
          '&:hover': hasRatings ? { bgcolor: 'action.hover' } : {},
          '& > *': { borderBottom: open ? 'none' : undefined },
          '&:focus-within': hasRatings
            ? {
                outline: '2px solid',
                outlineColor: 'primary.main',
                outlineOffset: -2,
              }
            : {},
        }}
      >
        <TableCell sx={{ fontWeight: isSubDimension ? 400 : 600, pl: isSubDimension ? 4 : 2 }}>
          {hasRatings ? (
            <Box
              component="button"
              onClick={(e) => {
                e.stopPropagation();
                handleToggle();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleToggle();
                }
              }}
              aria-expanded={open}
              aria-controls={detailsId}
              /* Name is just the dimension: `aria-expanded` already conveys
                 state, the `button` role implies activation, and the counts and
                 scores are in adjacent cells a screen reader reads anyway. */
              aria-label={dimensionName}
              sx={{
                all: 'unset',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                '&:focus': {
                  outline: 'none',
                },
              }}
            >
              {open ? (
                <KeyboardArrowDownIcon
                  fontSize="small"
                  sx={{ mr: 0.5, color: 'action.active' }}
                  aria-hidden="true"
                />
              ) : (
                <KeyboardArrowRightIcon
                  fontSize="small"
                  sx={{ mr: 0.5, color: 'action.active' }}
                  aria-hidden="true"
                />
              )}
              {dimensionName}
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ ml: 1 }}
                aria-hidden="true"
              >
                ({assessedCount}/{totalCount})
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
              <Box sx={{ width: 24, mr: 0.5 }} />
              {dimensionName}
              {isAggregate ? (
                <Chip
                  label={`Aggregate (${aggregateContributingCount ?? 0} areas)`}
                  size="small"
                  variant="outlined"
                  sx={{
                    ml: 1,
                    height: 20,
                    fontSize: '0.65rem',
                    borderColor: 'info.main',
                    color: 'info.main',
                  }}
                  aria-label={`Aggregate score from ${aggregateContributingCount ?? 0} capability areas`}
                />
              ) : (
                <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                  ({assessedCount}/{totalCount})
                </Typography>
              )}
            </Box>
          )}
        </TableCell>
        <TableCell align="center">
          <Chip
            label={averageLevel?.toFixed(1) ?? '—'}
            size="small"
            sx={{ bgcolor: getScoreColor(averageLevel), color: 'white', fontWeight: 600 }}
          />
        </TableCell>
        <TableCell align="center">
          {targetLevel !== null ? (
            <Chip
              label={targetLevel.toFixed(1)}
              size="small"
              variant="outlined"
              sx={{ borderColor: TO_BE_COLOR, color: TO_BE_COLOR, fontWeight: 600 }}
            />
          ) : (
            <Typography variant="body2" color="text.disabled">
              —
            </Typography>
          )}
        </TableCell>
      </TableRow>
      {hasRatings && (
        <TableRow id={detailsId}>
          <TableCell colSpan={3} sx={{ py: 0, px: 0 }}>
            <Collapse in={open} timeout="auto" unmountOnExit>
              <Table
                size="small"
                sx={{ tableLayout: 'fixed' }}
                aria-label={`Aspect details for ${dimensionName}`}
              >
                <colgroup>
                  <col style={{ width: '50%' }} />
                  <col style={{ width: '25%' }} />
                  <col style={{ width: '25%' }} />
                </colgroup>
                <TableBody>
                  {dimensionRatings.map((rating) => (
                    <AspectDetailRow
                      key={rating.id}
                      rating={rating}
                      attachments={attachments}
                      onDownloadAttachment={onDownloadAttachment}
                    />
                  ))}
                </TableBody>
              </Table>
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </Fragment>
  );
}

/**
 * Technology dimension with expandable sub-dimensions
 */
function TechnologyDimensionRows({
  dim,
  targetLevel,
  ratings,
  attachments,
  onDownloadAttachment,
}: {
  dim: DimensionScore;
  targetLevel: number | null;
  ratings: OrbitRating[];
  attachments: Attachment[];
  onDownloadAttachment: (attachment: Attachment) => void;
}): JSX.Element {
  const [parentOpen, setParentOpen] = useState(false);
  const techSubDimScores = dim.subDimensionScores ?? [];
  const totalAspects = dim.aspectScores.length;
  const assessedAspects = dim.aspectScores.filter((a) => a.isAssessed).length;

  // Calculate target levels for each sub-dimension
  const subDimTargets = techSubDimScores.map((subDim) => {
    const subDimRatings = ratings.filter(
      (r) =>
        r.dimensionId === 'technology' &&
        r.subDimensionId === subDim.subDimensionId &&
        r.targetLevel &&
        r.targetLevel > 0
    );
    if (subDimRatings.length === 0) return null;
    const avg =
      subDimRatings.reduce((sum, r) => sum + (r.targetLevel ?? 0), 0) / subDimRatings.length;
    return Math.round(avg * 10) / 10;
  });

  const handleToggle = (): void => {
    setParentOpen(!parentOpen);
  };

  return (
    <Fragment>
      <TableRow
        onClick={handleToggle}
        sx={{
          bgcolor: 'grey.50',
          cursor: 'pointer',
          '&:hover': { bgcolor: 'action.hover' },
          '&:focus-within': {
            outline: '2px solid',
            outlineColor: 'primary.main',
            outlineOffset: -2,
          },
        }}
      >
        <TableCell sx={{ fontWeight: 600 }}>
          <Box
            component="button"
            onClick={(e) => {
              e.stopPropagation();
              handleToggle();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleToggle();
              }
            }}
            aria-expanded={parentOpen}
            aria-controls="technology-subdimensions"
            aria-label="Technology"
            sx={{
              all: 'unset',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              '&:focus': {
                outline: 'none',
              },
            }}
          >
            {parentOpen ? (
              <KeyboardArrowDownIcon
                fontSize="small"
                sx={{ mr: 0.5, color: 'action.active' }}
                aria-hidden="true"
              />
            ) : (
              <KeyboardArrowRightIcon
                fontSize="small"
                sx={{ mr: 0.5, color: 'action.active' }}
                aria-hidden="true"
              />
            )}
            {dim.dimensionName}
            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }} aria-hidden="true">
              ({assessedAspects}/{totalAspects})
            </Typography>
          </Box>
        </TableCell>
        <TableCell align="center">
          <Chip
            label={dim.averageLevel?.toFixed(1) ?? '—'}
            size="small"
            sx={{ bgcolor: getScoreColor(dim.averageLevel), color: 'white', fontWeight: 600 }}
          />
        </TableCell>
        <TableCell align="center">
          {targetLevel !== null ? (
            <Chip
              label={targetLevel.toFixed(1)}
              size="small"
              variant="outlined"
              sx={{ borderColor: TO_BE_COLOR, color: TO_BE_COLOR, fontWeight: 600 }}
            />
          ) : (
            <Typography variant="body2" color="text.disabled">
              —
            </Typography>
          )}
        </TableCell>
      </TableRow>

      <TableRow id="technology-subdimensions">
        <TableCell colSpan={3} sx={{ py: 0, px: 0 }}>
          <Collapse in={parentOpen} timeout="auto" unmountOnExit>
            <Table
              size="small"
              sx={{ tableLayout: 'fixed' }}
              aria-label="Technology sub-dimensions"
            >
              <colgroup>
                <col style={{ width: '50%' }} />
                <col style={{ width: '25%' }} />
                <col style={{ width: '25%' }} />
              </colgroup>
              <TableBody>
                {techSubDimScores.map((subDim, idx) => {
                  const subAssessed = subDim.aspectScores.filter((a) => a.isAssessed).length;
                  return (
                    <DimensionRow
                      key={subDim.subDimensionId}
                      dimensionName={subDim.subDimensionName}
                      dimensionId="technology"
                      subDimensionId={subDim.subDimensionId}
                      assessedCount={subAssessed}
                      totalCount={subDim.aspectScores.length}
                      averageLevel={subDim.averageLevel}
                      targetLevel={subDimTargets[idx] ?? null}
                      ratings={ratings}
                      attachments={attachments}
                      onDownloadAttachment={onDownloadAttachment}
                      isSubDimension
                    />
                  );
                })}
              </TableBody>
            </Table>
          </Collapse>
        </TableCell>
      </TableRow>
    </Fragment>
  );
}

/**
 * Main dimension scores table with target component
 */
export function DimensionScoresTableWithTarget({
  dimensionScores,
  targetDimScores,
  ratings,
  attachments,
  onDownloadAttachment,
}: DimensionScoresTableWithTargetProps): JSX.Element {
  return (
    <Paper>
      <Box sx={{ p: 2 }}>
        {/* Nested under the detail panel's <h2> title in ResultsMasterDetail,
            this component's only consumer. */}
        <Typography variant="h6" component="h3">
          Dimension Scores
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Click a dimension to see aspect-level details
        </Typography>
      </Box>
      <Divider />
      <TableContainer>
        <Table
          sx={{ tableLayout: 'fixed' }}
          aria-label="ORBIT dimension scores with As-Is and To-Be maturity levels"
        >
          <TableHead>
            <TableRow>
              <TableCell component="th" scope="col" sx={{ width: '50%' }}>
                Dimension
              </TableCell>
              <TableCell component="th" scope="col" align="center" sx={{ width: '25%' }}>
                As-Is
              </TableCell>
              <TableCell component="th" scope="col" align="center" sx={{ width: '25%' }}>
                To-Be
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {dimensionScores.map((dim, idx) => {
              const targetLevel = targetDimScores[idx]?.targetLevel ?? null;
              const extendedDim = dim as ExtendedDimensionScore;

              if (dim.dimensionId === 'technology' && !extendedDim.isAggregate) {
                return (
                  <TechnologyDimensionRows
                    key={dim.dimensionId}
                    dim={dim}
                    targetLevel={targetLevel}
                    ratings={ratings}
                    attachments={attachments}
                    onDownloadAttachment={onDownloadAttachment}
                  />
                );
              }

              const assessedCount = dim.aspectScores.filter((a) => a.isAssessed).length;
              return (
                <DimensionRow
                  key={dim.dimensionId}
                  dimensionName={dim.dimensionName}
                  dimensionId={dim.dimensionId}
                  assessedCount={assessedCount}
                  totalCount={dim.aspectScores.length}
                  averageLevel={dim.averageLevel}
                  targetLevel={targetLevel}
                  ratings={ratings}
                  attachments={attachments}
                  onDownloadAttachment={onDownloadAttachment}
                  isAggregate={extendedDim.isAggregate}
                  aggregateContributingCount={extendedDim.aggregateContributingCount}
                />
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
