/**
 * Assessment Sidebar Component
 *
 * Compact navigation showing dimensions with progress indicators.
 * Supports aggregate dimensions for enterprise domains.
 * Supports organizational assessments (Outcomes/Roles) with direct aspect navigation.
 */

import { Fragment, JSX } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListSubheader,
  Typography,
  LinearProgress,
  Divider,
  Paper,
  alpha,
  useTheme,
  Tooltip,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FlagIcon from '@mui/icons-material/Flag';
import BarChartIcon from '@mui/icons-material/BarChart';
import { getOrganizationalAssessment } from '../../services/orbit';
import type {
  OrbitDimensionId,
  TechnologySubDimensionId,
  OrganizationalAssessmentId,
} from '../../types';
import { formatScore } from '../../utils';

interface DimensionProgress {
  dimensionId?: OrbitDimensionId;
  subDimensionId?: TechnologySubDimensionId;
  aspectId?: string;
  name: string;
  assessedCount: number;
  totalCount: number;
  averageScore: number | null;
  isRequired: boolean;
  isAggregate?: boolean;
  aggregateScore?: number | null;
  aggregateCount?: number;
  isOrganizational?: boolean;
  organizationalType?: OrganizationalAssessmentId;
}

interface AssessmentSidebarProps {
  overallScore: number | null;
  overallProgress: number;
  dimensions: DimensionProgress[];
  currentDimensionId: OrbitDimensionId | 'review';
  currentSubDimensionId?: TechnologySubDimensionId;
  currentAspectId?: string;
  onDimensionSelect: (
    dimensionId: OrbitDimensionId,
    subDimensionId?: TechnologySubDimensionId
  ) => void;
  onReviewSelect: () => void;
  isReviewSelected?: boolean;
  showFinalize?: boolean;
  isOrganizationalAssessment?: boolean;
}

/**
 * Assessment sidebar with compact navigation
 */
export function AssessmentSidebar({
  overallScore,
  overallProgress,
  dimensions,
  currentDimensionId,
  currentSubDimensionId,
  currentAspectId,
  onDimensionSelect,
  onReviewSelect,
  isReviewSelected = false,
  showFinalize = true,
  isOrganizationalAssessment = false,
}: AssessmentSidebarProps): JSX.Element {
  const theme = useTheme();

  const getProgressChip = (
    assessed: number,
    total: number,
    isAggregate?: boolean,
    aggregateCount?: number
  ): JSX.Element => {
    // For aggregate dimensions, show aggregate indicator instead of progress
    if (isAggregate) {
      return (
        <Tooltip title={`Aggregate from ${aggregateCount ?? 0} assessments`} arrow>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              px: 0.75,
              py: 0.25,
              borderRadius: 1,
              bgcolor: alpha(theme.palette.primary.main, 0.15),
              /**
               * `.dark`, not `.main`. Tinting a colour toward white and then
               * writing in that same colour cannot reach 4.5:1 — both sides move
               * together. `primary.main` on `alpha(primary.main, 0.15)` measured
               * 4.17:1; `primary.dark` on the same background is 7.06:1.
               */
              color: 'primary.dark',
              minWidth: 40,
              justifyContent: 'center',
            }}
          >
            <BarChartIcon sx={{ fontSize: 12 }} />
            <Typography
              variant="caption"
              sx={{
                fontWeight: 600,
                fontSize: '0.7rem',
              }}
            >
              AGG
            </Typography>
          </Box>
        </Tooltip>
      );
    }

    const isComplete = assessed === total;
    const isStarted = assessed > 0;

    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          px: isStarted ? 0.75 : 0,
          py: 0.25,
          borderRadius: 1,
          bgcolor: isComplete
            ? alpha(theme.palette.success.main, 0.15)
            : isStarted
              ? alpha(theme.palette.warning.main, 0.15)
              : 'transparent',
          // Same alpha-tint trap as the aggregate chip above: `success.main` on
          // `alpha(success.main, 0.15)` measured 3.37-3.82:1 depending on the row
          // beneath it. `success.dark` on the same tints is 6.81:1.
          color: isComplete ? 'success.dark' : isStarted ? 'warning.dark' : 'text.secondary',
          minWidth: 40,
          justifyContent: 'center',
        }}
      >
        {isComplete && <CheckCircleIcon sx={{ fontSize: 14 }} />}
        <Typography
          variant="caption"
          sx={{
            fontWeight: isStarted ? 600 : 400,
            fontSize: '0.75rem',
          }}
        >
          {assessed}/{total}
        </Typography>
      </Box>
    );
  };

  const isSelected = (dim: DimensionProgress): boolean => {
    if (isReviewSelected) return false;

    // For organizational assessments, match by aspectId
    if (dim.isOrganizational && dim.aspectId) {
      return dim.aspectId === currentAspectId;
    }

    // Standard dimension matching
    if (dim.subDimensionId) {
      return dim.dimensionId === currentDimensionId && dim.subDimensionId === currentSubDimensionId;
    }
    return dim.dimensionId === currentDimensionId && !currentSubDimensionId;
  };

  // For organizational assessments, render aspects directly
  if (isOrganizationalAssessment) {
    return (
      <Paper
        elevation={0}
        sx={{
          width: 240,
          height: '100%',
          borderRight: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.paper',
        }}
        component="aside"
        aria-label="Assessment navigation"
      >
        {/* Overall Progress - Compact */}
        <Box
          sx={{ px: 1.5, py: 1, bgcolor: alpha(theme.palette.primary.main, 0.03) }}
          role="region"
          aria-label="Overall assessment progress"
        >
          <Box
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}
          >
            <Typography variant="caption" color="text.secondary">
              Progress
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {overallProgress}%
              </Typography>
              {overallScore !== null && (
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                  Avg: {formatScore(overallScore)}
                </Typography>
              )}
            </Box>
          </Box>
          <LinearProgress
            variant="determinate"
            value={overallProgress}
            aria-label={`Overall progress: ${overallProgress}% complete`}
            sx={{
              height: 4,
              borderRadius: 2,
              bgcolor: 'grey.200',
              '& .MuiLinearProgress-bar': {
                borderRadius: 2,
                bgcolor: overallProgress === 100 ? 'success.main' : 'primary.main',
              },
            }}
          />
        </Box>

        <Divider />

        {/* Column Headers */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            px: 1.5,
            py: 0.75,
            gap: 1,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography
            variant="caption"
            sx={{ flex: 1, fontWeight: 600, color: 'text.secondary', fontSize: '0.65rem' }}
          >
            ASPECT
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              color: 'text.secondary',
              fontSize: '0.65rem',
              minWidth: 28,
              textAlign: 'right',
            }}
          >
            PROG
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              color: 'text.secondary',
              fontSize: '0.65rem',
              minWidth: 24,
              textAlign: 'right',
            }}
          >
            SCORE
          </Typography>
        </Box>

        {/* Aspect Navigation - grouped by organizational section */}
        <Box sx={{ flex: 1, overflow: 'auto' }} component="nav" aria-label="Assessment aspects">
          <List disablePadding>
            {dimensions.map((dim, index) => {
              const selected = isSelected(dim);
              const displayScore = dim.averageScore;

              // Render a section header when the organizational section changes
              const startsNewSection =
                dim.organizationalType !== undefined &&
                dim.organizationalType !== dimensions[index - 1]?.organizationalType;

              return (
                <Fragment key={dim.aspectId ?? dim.dimensionId}>
                  {startsNewSection && dim.organizationalType && (
                    <ListSubheader
                      disableSticky
                      sx={{
                        px: 1.5,
                        py: 0.5,
                        lineHeight: 1.5,
                        bgcolor: 'grey.100',
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        fontWeight: 600,
                        color: 'text.secondary',
                        fontSize: '0.65rem',
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                      }}
                    >
                      {getOrganizationalAssessment(dim.organizationalType).name}
                    </ListSubheader>
                  )}
                  <ListItem disablePadding>
                    <ListItemButton
                      selected={selected}
                      onClick={() => onDimensionSelect(dim.aspectId as OrbitDimensionId)}
                      aria-current={selected ? 'true' : undefined}
                      aria-label={`${dim.name}, ${dim.assessedCount} of ${dim.totalCount} assessed${displayScore !== null ? `, score ${formatScore(displayScore)}` : ''}`}
                      sx={{
                        py: 0.75,
                        px: 1.5,
                        minHeight: 36,
                        '&.Mui-selected': {
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          borderLeft: '3px solid',
                          borderColor: 'primary.main',
                          '&:hover': {
                            bgcolor: alpha(theme.palette.primary.main, 0.15),
                          },
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: selected ? 600 : 400,
                            flex: 1,
                            fontSize: '0.8125rem',
                          }}
                        >
                          {dim.name}
                        </Typography>
                        {getProgressChip(dim.assessedCount, dim.totalCount)}
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 600,
                            minWidth: 24,
                            textAlign: 'right',
                            color: 'text.secondary',
                          }}
                        >
                          {displayScore !== null ? formatScore(displayScore) : '—'}
                        </Typography>
                      </Box>
                    </ListItemButton>
                  </ListItem>
                </Fragment>
              );
            })}
          </List>
        </Box>

        <Divider />

        {/* Review & Finalize - Compact */}
        {showFinalize && (
          <Box sx={{ p: 0.75 }}>
            <ListItemButton
              selected={isReviewSelected}
              onClick={onReviewSelect}
              sx={{
                py: 0.75,
                px: 1,
                minHeight: 36,
                borderRadius: 1,
                bgcolor: isReviewSelected ? alpha(theme.palette.success.main, 0.1) : 'transparent',
                border: '1px solid',
                borderColor: isReviewSelected ? 'success.main' : 'divider',
                '&:hover': {
                  bgcolor: alpha(theme.palette.success.main, 0.08),
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1 }}>
                <FlagIcon sx={{ fontSize: 16, color: 'success.main' }} />
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, color: 'success.dark', fontSize: '0.8125rem' }}
                >
                  Review & Finalize
                </Typography>
              </Box>
            </ListItemButton>
          </Box>
        )}
      </Paper>
    );
  }

  // Standard dimension navigation (B-I-T)

  // Group dimensions for display
  const standardDimensions = dimensions.filter((d) => d.dimensionId !== 'technology');
  const techDimensions = dimensions.filter((d) => d.dimensionId === 'technology');

  // Calculate Technology rollup
  const techTotals =
    techDimensions.length > 0
      ? {
          assessedCount: techDimensions.reduce((sum, d) => sum + d.assessedCount, 0),
          totalCount: techDimensions.reduce((sum, d) => sum + d.totalCount, 0),
          averageScore: (() => {
            const scores = techDimensions
              .map((d) => d.averageScore)
              .filter((s): s is number => s !== null);
            if (scores.length === 0) return null;
            const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
            return Math.round(avg * 10) / 10;
          })(),
        }
      : null;

  // Check if any tech sub-dimension is selected
  const isTechSelected = currentDimensionId === 'technology' && !isReviewSelected;

  return (
    <Paper
      elevation={0}
      sx={{
        width: 240,
        height: '100%',
        borderRight: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
      }}
      component="aside"
      aria-label="Assessment navigation"
    >
      {/* Overall Progress - Compact */}
      <Box
        sx={{ px: 1.5, py: 1, bgcolor: alpha(theme.palette.primary.main, 0.03) }}
        role="region"
        aria-label="Overall assessment progress"
      >
        <Box
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}
        >
          <Typography variant="caption" color="text.secondary">
            Progress
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {overallProgress}%
            </Typography>
            {overallScore !== null && (
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                Avg: {formatScore(overallScore)}
              </Typography>
            )}
          </Box>
        </Box>
        <LinearProgress
          variant="determinate"
          value={overallProgress}
          aria-label={`Overall progress: ${overallProgress}% complete`}
          sx={{
            height: 4,
            borderRadius: 2,
            bgcolor: 'grey.200',
            '& .MuiLinearProgress-bar': {
              borderRadius: 2,
              bgcolor: overallProgress === 100 ? 'success.main' : 'primary.main',
            },
          }}
        />
      </Box>

      <Divider />

      {/* Column Headers */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          px: 1.5,
          py: 0.75,
          gap: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography
          variant="caption"
          sx={{ flex: 1, fontWeight: 600, color: 'text.secondary', fontSize: '0.65rem' }}
        >
          DIMENSION
        </Typography>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 600,
            color: 'text.secondary',
            fontSize: '0.65rem',
            minWidth: 28,
            textAlign: 'right',
          }}
        >
          PROG
        </Typography>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 600,
            color: 'text.secondary',
            fontSize: '0.65rem',
            minWidth: 24,
            textAlign: 'right',
          }}
        >
          SCORE
        </Typography>
      </Box>

      {/* Dimension Navigation - Compact single rows */}
      <Box sx={{ flex: 1, overflow: 'auto' }} component="nav" aria-label="ORBIT dimensions">
        <List disablePadding role="list">
          {/* Standard Dimensions */}
          {standardDimensions.map((dim) => {
            const selected = isSelected(dim);
            const displayScore = dim.isAggregate ? dim.aggregateScore : dim.averageScore;

            // Skip if no dimensionId (shouldn't happen for standard dimensions)
            if (!dim.dimensionId) return null;

            return (
              <ListItem key={dim.dimensionId} disablePadding>
                <ListItemButton
                  selected={selected}
                  onClick={() => onDimensionSelect(dim.dimensionId!)}
                  aria-current={selected ? 'true' : undefined}
                  aria-label={`${dim.name}${dim.isAggregate ? ' (aggregate)' : !dim.isRequired ? ' (optional)' : ''}, ${dim.isAggregate ? `aggregate from ${dim.aggregateCount ?? 0} assessments` : `${dim.assessedCount} of ${dim.totalCount} assessed`}${displayScore !== null ? `, average score ${formatScore(displayScore)}` : ''}`}
                  sx={{
                    py: 0.75,
                    px: 1.5,
                    minHeight: 36,
                    '&.Mui-selected': {
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      borderLeft: '3px solid',
                      borderColor: 'primary.main',
                      '&:hover': {
                        bgcolor: alpha(theme.palette.primary.main, 0.15),
                      },
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: selected ? 600 : 400,
                        flex: 1,
                        fontSize: '0.8125rem',
                      }}
                    >
                      {dim.name}
                    </Typography>
                    {getProgressChip(
                      dim.assessedCount,
                      dim.totalCount,
                      dim.isAggregate,
                      dim.aggregateCount
                    )}
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 600,
                        minWidth: 24,
                        textAlign: 'right',
                        color:
                          dim.isAggregate && displayScore !== null
                            ? 'primary.main'
                            : 'text.secondary',
                      }}
                    >
                      {displayScore !== null ? formatScore(displayScore) : '—'}
                    </Typography>
                  </Box>
                </ListItemButton>
              </ListItem>
            );
          })}

          {/* Technology Dimension */}
          {techTotals && (
            <>
              {/* Check if Technology is an aggregate dimension */}
              {(() => {
                const techDim = dimensions.find(
                  (d) => d.dimensionId === 'technology' && !d.subDimensionId
                );
                const isTechAggregate = techDim?.isAggregate ?? false;

                if (isTechAggregate) {
                  // Render Technology as a single aggregate row (no sub-dimensions)
                  const selected = isTechSelected;
                  const displayScore = techDim?.aggregateScore ?? null;

                  return (
                    <ListItem disablePadding>
                      <ListItemButton
                        selected={selected}
                        onClick={() => onDimensionSelect('technology')}
                        aria-current={selected ? 'true' : undefined}
                        aria-label={`Technology (aggregate), aggregate from ${techDim?.aggregateCount ?? 0} assessments${displayScore !== null ? `, average score ${formatScore(displayScore)}` : ''}`}
                        sx={{
                          py: 0.75,
                          px: 1.5,
                          minHeight: 36,
                          '&.Mui-selected': {
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            borderLeft: '3px solid',
                            borderColor: 'primary.main',
                            '&:hover': {
                              bgcolor: alpha(theme.palette.primary.main, 0.15),
                            },
                          },
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1 }}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: selected ? 600 : 400,
                              flex: 1,
                              fontSize: '0.8125rem',
                            }}
                          >
                            Technology
                          </Typography>
                          {getProgressChip(0, 0, true, techDim?.aggregateCount)}
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 600,
                              minWidth: 24,
                              textAlign: 'right',
                              color: displayScore !== null ? 'primary.main' : 'text.secondary',
                            }}
                          >
                            {displayScore !== null ? formatScore(displayScore) : '—'}
                          </Typography>
                        </Box>
                      </ListItemButton>
                    </ListItem>
                  );
                }

                // Standard Technology with sub-dimensions
                return (
                  <>
                    {/* Technology Parent Row. Not interactive - it is a group
                        heading for the two sub-dimension rows below it - but it
                        still has to be an <li> to be a legal child of the <ul>. */}
                    <ListItem
                      disablePadding
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        width: '100%',
                        gap: 1,
                        py: 0.75,
                        px: 1.5,
                        minHeight: 36,
                        bgcolor: isTechSelected
                          ? alpha(theme.palette.primary.main, 0.1)
                          : 'transparent',
                        borderLeft: isTechSelected ? '3px solid' : '3px solid transparent',
                        borderColor: isTechSelected ? 'primary.main' : 'transparent',
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: isTechSelected ? 600 : 500,
                          flex: 1,
                          fontSize: '0.8125rem',
                        }}
                      >
                        Technology
                      </Typography>
                      {getProgressChip(techTotals.assessedCount, techTotals.totalCount)}
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 600,
                          minWidth: 24,
                          textAlign: 'right',
                          color: 'text.secondary',
                        }}
                      >
                        {techTotals.averageScore !== null
                          ? formatScore(techTotals.averageScore)
                          : '—'}
                      </Typography>
                    </ListItem>

                    {/* Technology Sub-dimensions */}
                    {techDimensions.map((dim) => {
                      const selected = isSelected(dim);

                      // Skip if no dimensionId (shouldn't happen for tech dimensions)
                      if (!dim.dimensionId) return null;

                      return (
                        <ListItem key={`${dim.dimensionId}-${dim.subDimensionId}`} disablePadding>
                          <ListItemButton
                            selected={selected}
                            onClick={() => onDimensionSelect(dim.dimensionId!, dim.subDimensionId)}
                            aria-current={selected ? 'true' : undefined}
                            aria-label={`${dim.name}, ${dim.assessedCount} of ${dim.totalCount} assessed${dim.averageScore !== null ? `, average score ${formatScore(dim.averageScore)}` : ''}`}
                            sx={{
                              py: 0.75,
                              px: 1.5,
                              pl: 3,
                              minHeight: 36,
                              bgcolor: alpha(theme.palette.grey[100], 0.5),
                              '&.Mui-selected': {
                                bgcolor: alpha(theme.palette.grey[200], 0.7),
                                '&:hover': {
                                  bgcolor: alpha(theme.palette.grey[200], 0.9),
                                },
                              },
                              '&:hover': {
                                bgcolor: alpha(theme.palette.grey[100], 0.8),
                              },
                            }}
                          >
                            <Box
                              sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1 }}
                            >
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: selected ? 600 : 400,
                                  flex: 1,
                                  fontSize: '0.8125rem',
                                  color: 'text.secondary',
                                }}
                              >
                                {dim.name}
                              </Typography>
                              {getProgressChip(dim.assessedCount, dim.totalCount)}
                              <Typography
                                variant="caption"
                                sx={{
                                  fontWeight: 600,
                                  minWidth: 24,
                                  textAlign: 'right',
                                  color: 'text.secondary',
                                }}
                              >
                                {dim.averageScore !== null ? formatScore(dim.averageScore) : '—'}
                              </Typography>
                            </Box>
                          </ListItemButton>
                        </ListItem>
                      );
                    })}
                  </>
                );
              })()}
            </>
          )}
        </List>
      </Box>

      <Divider />

      {/* Review & Finalize - Compact */}
      {showFinalize && (
        <Box sx={{ p: 0.75 }}>
          <ListItemButton
            selected={isReviewSelected}
            onClick={onReviewSelect}
            sx={{
              py: 0.75,
              px: 1,
              minHeight: 36,
              borderRadius: 1,
              bgcolor: isReviewSelected ? alpha(theme.palette.success.main, 0.1) : 'transparent',
              border: '1px solid',
              borderColor: isReviewSelected ? 'success.main' : 'divider',
              '&:hover': {
                bgcolor: alpha(theme.palette.success.main, 0.08),
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1 }}>
              <FlagIcon sx={{ fontSize: 16, color: 'success.main' }} />
              <Typography
                variant="body2"
                sx={{ fontWeight: 600, color: 'success.dark', fontSize: '0.8125rem' }}
              >
                Review & Finalize
              </Typography>
            </Box>
          </ListItemButton>
        </Box>
      )}
    </Paper>
  );
}
