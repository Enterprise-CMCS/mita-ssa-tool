/**
 * Dimension Scores Table Component
 *
 * Displays ORBIT dimension scores with expandable rows showing
 * aspect-level details including maturity levels, notes, and attachments.
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
import type { DimensionScore, OrbitRating, Attachment, MaturityLevelWithNA } from '../../types';
import { MATURITY_LEVEL_NAMES } from '../../types';
import { getAspect, getMaturityLevelMeta, getOrganizationalAspect } from '../../services/orbit';
import { isOrganizationalDimensionId } from '../../constants';
import { getScoreColor } from '../../utils';
import type { LevelKey } from '../../types';

interface DimensionScoresTableProps {
  dimensionScores: DimensionScore[];
  ratings: OrbitRating[];
  attachments: Attachment[];
  onDownloadAttachment: (attachment: Attachment) => void;
}

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
function getShortLevelDisplay(level: MaturityLevelWithNA): string {
  if (level === 0) return '—';
  if (level === -1) return 'N/A';
  return String(level);
}

/**
 * Aspect detail row component - renders as table rows to align with parent columns
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
      {/* Main aspect row */}
      <TableRow sx={{ '& > td': { borderBottom: hasContent ? 'none' : undefined } }}>
        <TableCell sx={{ pl: 4 }}>
          <Typography variant="body2" fontWeight={500}>
            {aspectName}
          </Typography>
        </TableCell>
        <TableCell align="center">
          {rating.targetLevel !== undefined && rating.targetLevel > 0 && (
            <Chip
              label={`Target: ${rating.targetLevel}`}
              size="small"
              variant="outlined"
              color="info"
              sx={{ fontSize: '0.7rem' }}
            />
          )}
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
      </TableRow>

      {/* Detail row with level description and notes */}
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
                  <NotesIcon fontSize="small" color="action" sx={{ mt: 0.25 }} />
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
                  <WarningIcon fontSize="small" color="warning" sx={{ mt: 0.25 }} />
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
                  <TrendingUpIcon fontSize="small" color="success" sx={{ mt: 0.25 }} />
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
                  <AttachFileIcon fontSize="small" color="action" sx={{ mt: 0.25 }} />
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
  ratings,
  attachments,
  onDownloadAttachment,
  isSubDimension = false,
  subDimensionId,
}: {
  dimensionName: string;
  dimensionId: string;
  assessedCount: number;
  totalCount: number;
  averageLevel: number | null;
  ratings: OrbitRating[];
  attachments: Attachment[];
  onDownloadAttachment: (attachment: Attachment) => void;
  isSubDimension?: boolean;
  subDimensionId?: string;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const detailsId = `legacy-dimension-details-${subDimensionId ?? dimensionId}`;

  // Filter ratings for this dimension/sub-dimension
  const dimensionRatings = ratings.filter((r) => {
    if (isSubDimension && subDimensionId) {
      return r.dimensionId === 'technology' && r.subDimensionId === subDimensionId;
    }
    return r.dimensionId === dimensionId && !r.subDimensionId;
  });

  // Check if there's any content to show
  const hasRatings = dimensionRatings.length > 0;

  const handleRowClick = (): void => {
    if (hasRatings) {
      setOpen(!open);
    }
  };

  return (
    <Fragment>
      <TableRow
        onClick={handleRowClick}
        sx={{
          bgcolor: isSubDimension ? 'transparent' : 'grey.50',
          cursor: hasRatings ? 'pointer' : 'default',
          '&:hover': hasRatings ? { bgcolor: 'action.hover' } : {},
          '& > *': { borderBottom: open ? 'none' : undefined },
          '&:focus-within': hasRatings
            ? { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: -2 }
            : {},
        }}
      >
        <TableCell sx={{ fontWeight: isSubDimension ? 400 : 600, pl: isSubDimension ? 4 : 2 }}>
          {/* `aria-expanded` belongs on a focusable control, not on the row:
              it is invalid on role="row" outside a treegrid, and it promised an
              expansion a keyboard user could not trigger (OBS-24). */}
          {hasRatings ? (
            /* `all: unset` makes this <button> render exactly as the previous
               text node did - colour, font and weight all inherit - so the row
               is unchanged for a mouse user. No chevron is added, and the `↳`
               sub-dimension marker is kept in both branches so the two data
               states are not marked differently. */
            <Box
              component="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRowClick();
              }}
              aria-expanded={open}
              aria-controls={detailsId}
              aria-label={dimensionName}
              sx={{
                all: 'unset',
                cursor: 'pointer',
                display: 'block',
                width: '100%',
                textAlign: 'left',
                '&:focus': { outline: 'none' },
              }}
            >
              {isSubDimension && '↳ '}
              {dimensionName}
            </Box>
          ) : (
            <>
              {isSubDimension && '↳ '}
              {dimensionName}
            </>
          )}
        </TableCell>
        <TableCell align="center">
          {assessedCount}/{totalCount}
        </TableCell>
        <TableCell align="center">
          <Chip
            label={averageLevel?.toFixed(1) ?? '—'}
            size="small"
            sx={{
              bgcolor: getScoreColor(averageLevel),
              color: 'white',
              fontWeight: 600,
            }}
          />
        </TableCell>
      </TableRow>
      {hasRatings && (
        <TableRow id={detailsId}>
          <TableCell colSpan={3} sx={{ py: 0, px: 0 }}>
            <Collapse in={open} timeout="auto" unmountOnExit>
              <Table size="small" sx={{ tableLayout: 'fixed' }}>
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
  ratings,
  attachments,
  onDownloadAttachment,
}: {
  dim: DimensionScore;
  ratings: OrbitRating[];
  attachments: Attachment[];
  onDownloadAttachment: (attachment: Attachment) => void;
}): JSX.Element {
  const [parentOpen, setParentOpen] = useState(false);
  const techSubDimScores = dim.subDimensionScores ?? [];
  const totalAspects = dim.aspectScores.length;
  const assessedAspects = dim.aspectScores.filter((a) => a.isAssessed).length;

  return (
    <Fragment>
      {/* Technology parent row */}
      <TableRow
        onClick={() => setParentOpen(!parentOpen)}
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
              setParentOpen(!parentOpen);
            }}
            aria-expanded={parentOpen}
            aria-controls="legacy-technology-subdimensions"
            aria-label={dim.dimensionName}
            sx={{
              all: 'unset',
              cursor: 'pointer',
              display: 'block',
              width: '100%',
              textAlign: 'left',
              fontWeight: 600,
              '&:focus': { outline: 'none' },
            }}
          >
            {dim.dimensionName}
          </Box>
        </TableCell>
        <TableCell align="center">
          {assessedAspects}/{totalAspects}
        </TableCell>
        <TableCell align="center">
          <Chip
            label={dim.averageLevel?.toFixed(1) ?? '—'}
            size="small"
            sx={{
              bgcolor: getScoreColor(dim.averageLevel),
              color: 'white',
              fontWeight: 600,
            }}
          />
        </TableCell>
      </TableRow>

      {/* Technology sub-dimensions (collapsible) */}
      <TableRow id="legacy-technology-subdimensions">
        <TableCell colSpan={3} sx={{ py: 0, px: 0 }}>
          <Collapse in={parentOpen} timeout="auto" unmountOnExit>
            <Table size="small" sx={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '50%' }} />
                <col style={{ width: '25%' }} />
                <col style={{ width: '25%' }} />
              </colgroup>
              <TableBody>
                {techSubDimScores.map((subDim) => {
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
 * Main dimension scores table component
 */
export default function DimensionScoresTable({
  dimensionScores,
  ratings,
  attachments,
  onDownloadAttachment,
}: DimensionScoresTableProps): JSX.Element {
  return (
    <Paper sx={{ mb: 4 }}>
      <Box sx={{ p: 2 }}>
        {/* Section heading directly under the page <h1>; `variant="h6"` alone
            renders a real <h6> and skips h2-h5. */}
        <Typography variant="h6" component="h2">
          Dimension Scores
        </Typography>
      </Box>
      <Divider />
      <TableContainer>
        <Table
          sx={{ tableLayout: 'fixed' }}
          aria-label="ORBIT dimension scores with expandable aspect details"
        >
          <TableHead>
            <TableRow>
              <TableCell component="th" scope="col" sx={{ width: '50%' }}>
                Dimension
              </TableCell>
              <TableCell component="th" scope="col" align="center" sx={{ width: '25%' }}>
                Aspects Assessed
              </TableCell>
              <TableCell component="th" scope="col" align="center" sx={{ width: '25%' }}>
                Average Score
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {dimensionScores.map((dim) => {
              if (dim.dimensionId === 'technology') {
                return (
                  <TechnologyDimensionRows
                    key={dim.dimensionId}
                    dim={dim}
                    ratings={ratings}
                    attachments={attachments}
                    onDownloadAttachment={onDownloadAttachment}
                  />
                );
              }

              // Non-technology dimensions
              const assessedCount = dim.aspectScores.filter((a) => a.isAssessed).length;
              return (
                <DimensionRow
                  key={dim.dimensionId}
                  dimensionName={dim.dimensionName}
                  dimensionId={dim.dimensionId}
                  assessedCount={assessedCount}
                  totalCount={dim.aspectScores.length}
                  averageLevel={dim.averageLevel}
                  ratings={ratings}
                  attachments={attachments}
                  onDownloadAttachment={onDownloadAttachment}
                />
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
