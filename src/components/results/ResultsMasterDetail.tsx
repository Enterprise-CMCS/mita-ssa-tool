/**
 * Results Master-Detail Component
 *
 * Split view with domain/area navigation on left and detailed results on right.
 * Shows both As-Is (current) and To-Be (target) maturity levels.
 */

import { JSX, useState, useMemo, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Collapse,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { useScores, useCapabilityAssessments, useOrbitRatings, useAttachments } from '../../hooks';
import type {
  CapabilityDomain,
  DimensionScore,
  CapabilityArea,
  CapabilityLayer,
  RatingDimensionId,
} from '../../types';

import { getAreaWithDomain } from '../../services/capabilities';
import { isEnterpriseDomain, getAggregatedDimensionForDomain } from '../../services/orbit';
import { calculateDimensionScore, type RatingForScoring } from '../../services/scoring';
import { isOrganizationalAssessmentArea as isOrgArea } from '../../constants';
import { DimensionScoresTableWithTarget } from './DimensionScoresTableWithTarget';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

interface ResultsMasterDetailProps {
  domains: CapabilityDomain[];
}

/** Selection can be either a domain or an area */
type Selection =
  | { type: 'domain'; domain: CapabilityDomain }
  | { type: 'area'; areaId: string; areaName: string };

/** Layer display names */
const LAYER_NAMES: Record<string, string> = {
  strategic: 'Strategic',
  core: 'Core',
  support: 'Support',
};

/**
 * Short labels for radar chart
 */
const SHORT_DIMENSION_LABELS: Record<string, string> = {
  'Organizational Outcomes': 'Outcomes',
  'Organizational Roles': 'Roles',
  'Organizational Business Capability': 'Bus. Cap.',
  'Organizational Enterprise Architecture': 'Ent. Arch.',
  'Organizational Policy Management': 'Policy',
  'Organizational Strategic Planning': 'Strategy',
  'Business Architecture': 'Bus. Arch.',
  Information: 'Info',
  Technology: 'Tech',
};

/**
 * Calculate target (To-Be) dimension scores from ratings.
 *
 * Delegates to `calculateDimensionScore`, the canonical scorer, so the To-Be column
 * follows the same rules as As-Is. It previously flat-averaged `targetLevel` across
 * every rating in the dimension, which gave Technology a mean over all 11 aspects
 * rather than the mean of its two sub-dimension means — the same weighting error
 * OBS-25 describes for export, in the live UI and for To-Be instead of As-Is.
 *
 * Only Technology changes. Every other dimension, and each organizational section,
 * takes the canonical scorer's plain-mean path, which is what this function already
 * computed for them.
 */
function calculateTargetDimensionScores(
  dimensionScores: DimensionScore[],
  ratings: (RatingForScoring & { dimensionId: RatingDimensionId })[]
): { dimensionId: RatingDimensionId; targetLevel: number | null }[] {
  return dimensionScores.map((dim) => {
    const dimRatings = ratings.filter((r) => r.dimensionId === dim.dimensionId);
    return {
      dimensionId: dim.dimensionId,
      targetLevel: calculateDimensionScore(dim.dimensionId, dimRatings, 'targetLevel'),
    };
  });
}

/**
 * Domain detail panel showing domain summary and capability areas list
 */
function DomainDetailPanel({
  domain,
  onSelectArea,
  headingRef,
}: {
  domain: CapabilityDomain;
  onSelectArea: (area: CapabilityArea) => void;
  headingRef: React.RefObject<HTMLHeadingElement>;
}): JSX.Element {
  const { getDomainScore, getCapabilityScore, getCapabilityStatus } = useScores();

  const domainScore = getDomainScore(domain.id);
  const allAreas = domain.areas;
  const finalizedAreas = allAreas.filter((area) => getCapabilityStatus(area.id) === 'finalized');

  return (
    <Box sx={{ p: 3 }}>
      {/* Header Card */}
      <Paper sx={{ p: 2.5, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 3 }}>
          {/* Left: Content */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {/* Title */}
            <Typography
              variant="h5"
              component="h2"
              fontWeight={600}
              sx={{ mb: 1 }}
              ref={headingRef}
              tabIndex={-1}
            >
              {domain.name}
            </Typography>

            {/* Layer badge */}
            <Chip
              label={LAYER_NAMES[domain.layer] ?? domain.layer}
              size="small"
              variant="outlined"
              sx={{ mb: 1.5, textTransform: 'capitalize' }}
            />

            {/* Description */}
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              {domain.description}
            </Typography>

            {/* Progress */}
            <Typography variant="body2" color="text.secondary">
              {finalizedAreas.length} of {allAreas.length} capability areas assessed
            </Typography>
          </Box>

          {/* Right: Score */}
          {domainScore !== null && (
            <Box
              sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}
            >
              <Box sx={{ textAlign: 'center' }}>
                {/* A score value, not a section heading. */}
                <Typography variant="h3" component="p" sx={{ fontWeight: 700, lineHeight: 1 }}>
                  {domainScore.toFixed(1)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Domain Score
                </Typography>
              </Box>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Capability Areas Table */}
      <Paper>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6" component="h3">
            Capability Areas
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Select an area to view detailed ORBIT assessment results
          </Typography>
        </Box>
        <TableContainer>
          <Table
            aria-label={`Capability areas in ${domain.name}. Select a row to view detailed results.`}
          >
            <TableHead>
              <TableRow>
                <TableCell component="th" scope="col">
                  Capability Area
                </TableCell>
                <TableCell component="th" scope="col" align="center" sx={{ width: 100 }}>
                  Status
                </TableCell>
                <TableCell component="th" scope="col" align="center" sx={{ width: 80 }}>
                  Score
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {allAreas.map((area) => {
                const areaScore = getCapabilityScore(area.id);
                const status = getCapabilityStatus(area.id);
                const isFinalized = status === 'finalized';

                return (
                  <TableRow
                    key={area.id}
                    hover
                    onClick={() => onSelectArea(area)}
                    sx={{
                      cursor: 'pointer',
                      '&:focus-within': {
                        outline: '2px solid',
                        outlineColor: 'primary.main',
                        outlineOffset: -2,
                      },
                    }}
                  >
                    <TableCell>
                      <Box
                        component="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectArea(area);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onSelectArea(area);
                          }
                        }}
                        aria-label={`${area.name}, ${isFinalized ? `assessed, score ${areaScore?.toFixed(1) ?? 'none'}` : 'not assessed'}. Press Enter to view details.`}
                        sx={{
                          all: 'unset',
                          cursor: 'pointer',
                          display: 'block',
                          width: '100%',
                          '&:focus': {
                            outline: 'none',
                          },
                        }}
                      >
                        <Typography
                          variant="body2"
                          fontWeight={500}
                          sx={{ fontStyle: isFinalized ? 'normal' : 'italic' }}
                        >
                          {area.name}
                        </Typography>
                        {area.description && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {area.description}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={isFinalized ? 'Assessed' : 'Not Assessed'}
                        size="small"
                        color={isFinalized ? 'success' : 'default'}
                        variant={isFinalized ? 'filled' : 'outlined'}
                        sx={{ fontSize: '0.7rem' }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      {areaScore !== null ? (
                        <Chip
                          label={areaScore.toFixed(1)}
                          size="small"
                          sx={{
                            bgcolor: 'primary.main',
                            color: 'white',
                            fontWeight: 600,
                          }}
                        />
                      ) : (
                        <Typography variant="body2" color="text.disabled">
                          —
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}

/**
 * Area detail panel showing full results for selected capability area
 */
function AreaDetailPanel({
  areaId,
  areaName,
  headingRef,
}: {
  areaId: string;
  areaName: string;
  headingRef: React.RefObject<HTMLHeadingElement>;
}): JSX.Element {
  const {
    getCapabilityScoreData,
    getDimensionScoresForAssessment,
    getOrganizationalScoresForAssessment,
    getAggregateDimensionScore,
  } = useScores();
  const { getAssessmentForArea } = useCapabilityAssessments();

  const areaInfo = useMemo(() => getAreaWithDomain(areaId), [areaId]);
  const scoreData = getCapabilityScoreData(areaId);
  const assessment = getAssessmentForArea(areaId);

  // Detect assessment type
  const isOrganizational = isOrgArea(areaId);
  const domainId = areaInfo?.domain.id ?? '';
  const isEnterprise = isEnterpriseDomain(domainId);
  const aggregatedDimension = isEnterprise ? getAggregatedDimensionForDomain(domainId) : null;

  // Get dimension scores based on assessment type
  const dimensionScores = useMemo(() => {
    if (!assessment) return undefined;

    // For organizational assessments, use organizational scores
    if (isOrganizational) {
      return getOrganizationalScoresForAssessment(assessment.id, areaId);
    }

    // For standard assessments, get B-I-T dimension scores
    const rawScores = getDimensionScoresForAssessment(assessment.id);
    if (!rawScores) return undefined;

    // For enterprise domains, inject aggregate score for the aggregated dimension
    if (isEnterprise && aggregatedDimension) {
      const aggregateData = getAggregateDimensionScore(aggregatedDimension);

      return rawScores.map((dim) => {
        if (dim.dimensionId === aggregatedDimension) {
          return {
            ...dim,
            averageLevel: aggregateData.score,
            isAggregate: true,
            aggregateContributingCount: aggregateData.contributingCount,
          };
        }
        return dim;
      });
    }

    return rawScores;
  }, [
    assessment,
    areaId,
    isOrganizational,
    isEnterprise,
    aggregatedDimension,
    getDimensionScoresForAssessment,
    getOrganizationalScoresForAssessment,
    getAggregateDimensionScore,
  ]);

  const { ratings } = useOrbitRatings(assessment?.id);
  const { attachments, downloadAttachment } = useAttachments(assessment?.id);

  // Calculate target dimension scores
  const targetDimScores = useMemo(() => {
    if (!dimensionScores) return [];
    return calculateTargetDimensionScores(dimensionScores, ratings);
  }, [dimensionScores, ratings]);

  // Build radar chart data with both As-Is and To-Be
  const radarChartData = useMemo(() => {
    if (!dimensionScores) return null;

    const labels = dimensionScores.map(
      (d) => SHORT_DIMENSION_LABELS[d.dimensionName] ?? d.dimensionName
    );
    const asIsScores = dimensionScores.map((d) => d.averageLevel ?? 0);
    const toBeScores = targetDimScores.map((d) => d.targetLevel ?? 0);

    // Check if there's any To-Be data
    const hasToBeData = toBeScores.some((s) => s > 0);

    const datasets = [
      {
        label: 'As-Is (Current)',
        data: asIsScores,
        backgroundColor: 'rgba(25, 118, 210, 0.2)',
        borderColor: 'rgba(25, 118, 210, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(25, 118, 210, 1)',
        pointRadius: 4,
      },
    ];

    if (hasToBeData) {
      datasets.push({
        label: 'To-Be (Target)',
        data: toBeScores,
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        borderColor: 'rgba(76, 175, 80, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(76, 175, 80, 1)',
        pointRadius: 4,
      });
    }

    return { labels, datasets };
  }, [dimensionScores, targetDimScores]);

  const radarChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        min: 0,
        max: 5,
        ticks: { display: false, stepSize: 1 },
        grid: { color: 'rgba(0, 0, 0, 0.08)' },
        angleLines: { color: 'rgba(0, 0, 0, 0.08)' },
        pointLabels: { font: { size: 10, weight: 500 as const }, color: '#374151' },
      },
    },
    plugins: {
      legend: { display: true, position: 'bottom' as const },
    },
  };

  // Check if we have a finalized assessment with results
  const hasResults = scoreData && scoreData.score !== null;

  // Calculate To-Be average
  const toBeAverage = (() => {
    const validTargets = targetDimScores.filter((d) => d.targetLevel !== null);
    if (validTargets.length === 0) return null;
    return validTargets.reduce((sum, d) => sum + (d.targetLevel ?? 0), 0) / validTargets.length;
  })();

  return (
    <Box sx={{ p: 3 }}>
      {/* Header Card - combines title, description, scores, and chart */}
      <Paper sx={{ p: 2.5, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 3 }}>
          {/* Left: Content */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {/* Title */}
            <Typography
              variant="h5"
              component="h2"
              fontWeight={600}
              sx={{ mb: 1 }}
              ref={headingRef}
              tabIndex={-1}
            >
              {areaName}
            </Typography>

            {/* Description */}
            {areaInfo?.area.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                {areaInfo.area.description}
              </Typography>
            )}

            {/* Topics */}
            {areaInfo?.area.topics && areaInfo.area.topics.length > 0 && (
              <Box
                sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center', mb: 1.5 }}
              >
                <Typography
                  variant="caption"
                  sx={{ fontWeight: 600, color: 'text.secondary', mr: 0.5 }}
                >
                  Topics:
                </Typography>
                {areaInfo.area.topics.map((topic, index) => (
                  <Chip
                    key={index}
                    label={topic}
                    size="small"
                    variant="outlined"
                    sx={{ height: 22, fontSize: '0.7rem' }}
                  />
                ))}
              </Box>
            )}

            {/* Tags (only if we have results) */}
            {hasResults && scoreData.tags.length > 0 && (
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                <Typography
                  variant="caption"
                  sx={{ fontWeight: 600, color: 'text.secondary', mr: 0.5 }}
                >
                  Tags:
                </Typography>
                {scoreData.tags.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ height: 22 }}
                  />
                ))}
              </Box>
            )}
          </Box>

          {/* Right: Scores + Radar Chart (only if we have results) */}
          {hasResults && (
            <Box
              sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}
            >
              {/* Scores row */}
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 1 }}>
                <Box sx={{ textAlign: 'center' }}>
                  {/* Score values and the arrow between them are data, not headings. */}
                  <Typography variant="h4" component="p" sx={{ fontWeight: 700, lineHeight: 1 }}>
                    {scoreData.score?.toFixed(1) ?? '—'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    As-Is
                  </Typography>
                </Box>
                {toBeAverage !== null && (
                  <>
                    <Typography
                      variant="h5"
                      component="p"
                      color="text.disabled"
                      sx={{ mx: 0.5 }}
                      aria-hidden="true"
                    >
                      →
                    </Typography>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography
                        variant="h4"
                        component="p"
                        sx={{ fontWeight: 700, lineHeight: 1, color: 'success.main' }}
                      >
                        {toBeAverage.toFixed(1)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        To-Be
                      </Typography>
                    </Box>
                  </>
                )}
              </Box>

              {/* Radar Chart */}
              {radarChartData && (
                <Box sx={{ width: 200, height: 200 }}>
                  <Radar
                    data={radarChartData}
                    options={radarChartOptions}
                    aria-label="Radar chart comparing As-Is and To-Be maturity levels across ORBIT dimensions"
                  />
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Paper>

      {/* No Assessment Message */}
      {!hasResults && (
        <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'grey.50' }}>
          <AssignmentIcon
            sx={{ fontSize: 48, color: 'action.disabled', mb: 1 }}
            aria-hidden="true"
          />
          {/* Empty-state text, not a heading. */}
          <Typography variant="h6" component="p" color="text.secondary" gutterBottom>
            No Assessment Results
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This capability area has not been assessed yet. Complete an assessment from the
            Dashboard to see results here.
          </Typography>
        </Paper>
      )}

      {/* Dimension Scores Table with To-Be (only if we have results) */}
      {hasResults && dimensionScores && (
        <DimensionScoresTableWithTarget
          dimensionScores={dimensionScores}
          targetDimScores={targetDimScores}
          ratings={ratings}
          attachments={attachments}
          onDownloadAttachment={downloadAttachment}
        />
      )}
    </Box>
  );
}

/** Layer configuration for grouping */
const LAYER_ORDER: CapabilityLayer[] = ['strategic', 'core', 'support'];
const LAYER_DISPLAY: Record<CapabilityLayer, { name: string; color: string }> = {
  strategic: { name: 'Strategic', color: '#1976d2' },
  core: { name: 'Core Operations', color: '#388e3c' },
  support: { name: 'Support', color: '#7b1fa2' },
};

/**
 * Navigation panel showing domains and areas grouped by layer
 */
function NavigationPanel({
  domains,
  selection,
  onSelectDomain,
  onSelectArea,
}: {
  domains: CapabilityDomain[];
  selection: Selection | null;
  onSelectDomain: (domain: CapabilityDomain) => void;
  onSelectArea: (areaId: string, areaName: string) => void;
}): JSX.Element {
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());
  const [expandedLayers, setExpandedLayers] = useState<Set<CapabilityLayer>>(new Set(LAYER_ORDER));
  const { getDomainScore, getCapabilityScore, getCapabilityStatus } = useScores();

  const selectedDomainId = selection?.type === 'domain' ? selection.domain.id : null;
  const selectedAreaId = selection?.type === 'area' ? selection.areaId : null;

  // Group domains by layer
  const domainsByLayer = useMemo(() => {
    const grouped = new Map<CapabilityLayer, CapabilityDomain[]>();
    for (const layer of LAYER_ORDER) {
      grouped.set(layer, []);
    }
    for (const domain of domains) {
      const layerDomains = grouped.get(domain.layer);
      if (layerDomains) {
        layerDomains.push(domain);
      }
    }
    return grouped;
  }, [domains]);

  const toggleLayer = (layer: CapabilityLayer): void => {
    setExpandedLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layer)) {
        next.delete(layer);
      } else {
        next.add(layer);
      }
      return next;
    });
  };

  return (
    <Box>
      <Box sx={{ px: 1.5, py: 1, borderBottom: 1, borderColor: 'divider' }}>
        {/* Nav panel heading, nested under the page's "Results by Domain" <h2>. */}
        <Typography variant="subtitle2" component="h3" fontWeight={600}>
          Domains & Areas
        </Typography>
      </Box>
      {/* A three-level expandable tree (layer > domain > area). `Collapse` renders
          a div, so it must be nested INSIDE each <li> rather than placed beside
          it: a <ul> may only contain <li>, and an <li> may contain flow content.
          Each level therefore gets its own <ul>. `display: block` on the <li> is
          required so the button and its Collapse stack instead of sitting side by
          side under ListItem's default flex. */}
      <List disablePadding dense>
        {LAYER_ORDER.map((layer) => {
          const layerDomains = domainsByLayer.get(layer) ?? [];
          const isLayerExpanded = expandedLayers.has(layer);
          const layerConfig = LAYER_DISPLAY[layer];

          return (
            <ListItem key={layer} disablePadding sx={{ display: 'block' }}>
              {/* Layer Header */}
              <ListItemButton
                onClick={() => toggleLayer(layer)}
                sx={{
                  py: 0.75,
                  bgcolor: 'grey.100',
                  borderBottom: 1,
                  borderColor: 'divider',
                  '&:hover': { bgcolor: 'grey.200' },
                }}
                aria-expanded={isLayerExpanded}
                aria-label={`${layerConfig.name} layer, ${layerDomains.length} domains`}
              >
                {isLayerExpanded ? (
                  <ExpandMoreIcon sx={{ fontSize: 16, mr: 0.5, color: layerConfig.color }} />
                ) : (
                  <ChevronRightIcon sx={{ fontSize: 16, mr: 0.5, color: layerConfig.color }} />
                )}
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: 0.5,
                    bgcolor: layerConfig.color,
                    mr: 1,
                  }}
                />
                <ListItemText
                  primary={
                    <Typography
                      variant="caption"
                      fontWeight={700}
                      sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}
                    >
                      {layerConfig.name}
                    </Typography>
                  }
                  sx={{ my: 0 }}
                />
                <Typography variant="caption" color="text.secondary">
                  {layerDomains.length}
                </Typography>
              </ListItemButton>

              {/* Domains in this layer */}
              <Collapse in={isLayerExpanded} timeout="auto" unmountOnExit>
                <List disablePadding dense>
                  {layerDomains.map((domain) => {
                    const isExpanded = expandedDomains.has(domain.id);
                    const isDomainSelected = selectedDomainId === domain.id;
                    const domainScore = getDomainScore(domain.id);
                    const allAreas = domain.areas;
                    const finalizedAreas = allAreas.filter(
                      (area) => getCapabilityStatus(area.id) === 'finalized'
                    );

                    return (
                      <ListItem key={domain.id} disablePadding sx={{ display: 'block' }}>
                        <ListItemButton
                          selected={isDomainSelected}
                          onClick={() => {
                            onSelectDomain(domain);
                            // Toggle expand/collapse
                            setExpandedDomains((prev) => {
                              const next = new Set(prev);
                              if (next.has(domain.id)) {
                                next.delete(domain.id);
                              } else {
                                next.add(domain.id);
                              }
                              return next;
                            });
                          }}
                          sx={{ py: 0.5, minHeight: 36 }}
                          aria-expanded={isExpanded}
                          aria-label={`${domain.name}, ${domainScore !== null ? `score ${domainScore.toFixed(1)}, ` : ''}${finalizedAreas.length} of ${allAreas.length} assessed`}
                        >
                          {isExpanded ? (
                            <ExpandMoreIcon
                              sx={{ fontSize: 18, mr: 0.5, color: 'action.active' }}
                              aria-hidden="true"
                            />
                          ) : (
                            <ChevronRightIcon
                              sx={{ fontSize: 18, mr: 0.5, color: 'action.active' }}
                              aria-hidden="true"
                            />
                          )}
                          <ListItemText
                            primary={
                              <Typography variant="body2" fontWeight={500} noWrap>
                                {domain.name}
                              </Typography>
                            }
                            sx={{ my: 0 }}
                          />
                          {domainScore !== null ? (
                            <Chip
                              label={`${domainScore.toFixed(1)} (${finalizedAreas.length}/${allAreas.length})`}
                              size="small"
                              sx={{
                                bgcolor: 'primary.main',
                                color: 'white',
                                fontWeight: 600,
                                height: 20,
                                fontSize: '0.7rem',
                                ml: 0.5,
                              }}
                            />
                          ) : (
                            <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                              {finalizedAreas.length}/{allAreas.length}
                            </Typography>
                          )}
                        </ListItemButton>

                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                          <List disablePadding dense>
                            {allAreas.map((area) => {
                              const areaScore = getCapabilityScore(area.id);
                              const isSelected = selectedAreaId === area.id;
                              const isFinalized = getCapabilityStatus(area.id) === 'finalized';
                              return (
                                <ListItem key={area.id} disablePadding>
                                  <ListItemButton
                                    selected={isSelected}
                                    onClick={() => onSelectArea(area.id, area.name)}
                                    sx={{
                                      pl: 3.5,
                                      py: 0.25,
                                      minHeight: 28,
                                      opacity: isFinalized ? 1 : 0.7,
                                    }}
                                  >
                                    <ListItemText
                                      primary={
                                        <Typography
                                          variant="body2"
                                          sx={{
                                            fontSize: '0.8rem',
                                            fontStyle: isFinalized ? 'normal' : 'italic',
                                          }}
                                        >
                                          {area.name}
                                        </Typography>
                                      }
                                      sx={{ my: 0 }}
                                    />
                                    {areaScore !== null ? (
                                      <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                        {areaScore.toFixed(1)}
                                      </Typography>
                                    ) : (
                                      <Typography variant="caption" color="text.disabled">
                                        —
                                      </Typography>
                                    )}
                                  </ListItemButton>
                                </ListItem>
                              );
                            })}
                          </List>
                        </Collapse>
                      </ListItem>
                    );
                  })}
                </List>
              </Collapse>
            </ListItem>
          );
        })}
      </List>
    </Box>
  );
}

/**
 * Master-Detail split view component
 */
export function ResultsMasterDetail({ domains }: ResultsMasterDetailProps): JSX.Element {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [announcement, setAnnouncement] = useState<string>('');
  const detailHeadingRef = useRef<HTMLHeadingElement>(null);
  const navRef = useRef<HTMLElement>(null);

  // Focus the detail heading when selection changes (for screen readers)
  // Use preventScroll to avoid jarring scroll jumps when clicking with mouse
  useEffect(() => {
    if (selection && detailHeadingRef.current) {
      // Small delay to ensure content is rendered
      setTimeout(() => {
        detailHeadingRef.current?.focus({ preventScroll: true });
      }, 100);
    }
  }, [selection]);

  // Scroll the detail panel content to top when selection changes
  const detailPanelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (selection && detailPanelRef.current) {
      detailPanelRef.current.scrollTop = 0;
    }
  }, [selection]);

  const handleSelectDomain = (domain: CapabilityDomain): void => {
    setSelection({ type: 'domain', domain });
    setAnnouncement(`Viewing ${domain.name} domain details`);
  };

  const handleSelectArea = (areaId: string, areaName: string): void => {
    setSelection({ type: 'area', areaId, areaName });
    setAnnouncement(`Viewing ${areaName} assessment results`);
  };

  const handleSelectAreaFromDomain = (area: CapabilityArea): void => {
    setSelection({ type: 'area', areaId: area.id, areaName: area.name });
    setAnnouncement(`Viewing ${area.name} assessment results`);
  };

  const handleBackToNav = (): void => {
    navRef.current?.focus();
    setAnnouncement('Returned to domain navigation');
  };

  return (
    <Paper
      sx={{ display: 'flex', height: 600, position: 'relative' }}
      role="region"
      aria-label="Results by domain"
    >
      {/* Live region for announcements */}
      <Box
        role="status"
        aria-live="polite"
        aria-atomic="true"
        sx={{
          position: 'absolute',
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        {announcement}
      </Box>

      {/* Left: Navigation */}
      <Box
        sx={{
          width: 320,
          flexShrink: 0,
          borderRight: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          overflowY: 'auto',
        }}
        component="nav"
        aria-label="Domain and capability area navigation"
        ref={navRef}
        tabIndex={-1}
      >
        <NavigationPanel
          domains={domains}
          selection={selection}
          onSelectDomain={handleSelectDomain}
          onSelectArea={handleSelectArea}
        />
      </Box>

      {/* Right: Detail Panel */}
      <Box
        ref={detailPanelRef}
        sx={{ flex: 1, bgcolor: 'grey.50', position: 'relative', overflowY: 'auto' }}
        role="region"
        aria-label="Selected item details"
      >
        {selection && (
          <Button
            size="small"
            onClick={handleBackToNav}
            aria-label="Return to domain navigation sidebar"
            sx={{
              position: 'absolute',
              left: '-9999px',
              top: 8,
              zIndex: 1,
              fontSize: '0.75rem',
              '&:focus': {
                left: 8,
                bgcolor: 'primary.main',
                color: 'white',
              },
            }}
          >
            ← Back to navigation
          </Button>
        )}
        {selection?.type === 'domain' ? (
          <DomainDetailPanel
            domain={selection.domain}
            onSelectArea={handleSelectAreaFromDomain}
            headingRef={detailHeadingRef}
          />
        ) : selection?.type === 'area' ? (
          <AreaDetailPanel
            areaId={selection.areaId}
            areaName={selection.areaName}
            headingRef={detailHeadingRef}
          />
        ) : (
          <Box
            sx={{
              minHeight: 300,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography color="text.secondary">
              Select a domain or capability area from the left to view results
            </Typography>
          </Box>
        )}
      </Box>
    </Paper>
  );
}
