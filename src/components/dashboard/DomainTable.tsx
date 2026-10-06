/**
 * Expandable domain table component
 * Clean design matching mita-3.0 reference
 * Domains are grouped by layer (Strategic, Core, Support)
 */

import { JSX, useState, Fragment, useMemo } from 'react';
import {
  Box,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  alpha,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { StackedProgressBar } from './ProgressBar';
import { CapabilityRow } from './CapabilityRow';
import { TagsDisplay } from './TagsDisplay';
import { useScores } from '../../hooks';
import type { CapabilityDomain, CapabilityArea, CapabilityLayer } from '../../types';

/**
 * Layer display configuration
 */
const LAYER_CONFIG: Record<CapabilityLayer, { name: string; color: string }> = {
  strategic: { name: 'Strategic Layer', color: '#1565c0' },
  core: { name: 'Core Layer', color: '#2e7d32' },
  support: { name: 'Support Layer', color: '#7b1fa2' },
};

/**
 * Layer order for display
 */
const LAYER_ORDER: CapabilityLayer[] = ['strategic', 'core', 'support'];

interface DomainTableProps {
  domains: CapabilityDomain[];
  searchQuery: string;
  selectedTags: string[];
  onStartAssessment: (areaId: string) => void;
  onResumeAssessment: (areaId: string) => void;
  onEditAssessment: (areaId: string) => void;
  onViewAssessment: (areaId: string) => void;
  onDeleteAssessment: (areaId: string) => void;
  onViewHistory: (historyId: string) => void;
  onDeleteHistory: (historyId: string) => void;
}

/**
 * Expandable table showing domains and their capability areas
 */
export function DomainTable({
  domains,
  searchQuery,
  selectedTags,
  onStartAssessment,
  onResumeAssessment,
  onEditAssessment,
  onViewAssessment,
  onDeleteAssessment,
  onViewHistory,
  onDeleteHistory,
}: DomainTableProps): JSX.Element {
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());
  const {
    getDomainScore,
    getDomainStatusCounts,
    getDomainTags,
    getCapabilityStatus,
    getCapabilityScore,
    getCapabilityCompletion,
    getCapabilityTags,
  } = useScores();

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

  const toggleDomain = (domainId: string): void => {
    setExpandedDomains((prev) => {
      const next = new Set(prev);
      if (next.has(domainId)) {
        next.delete(domainId);
      } else {
        next.add(domainId);
      }
      return next;
    });
  };

  const filterAreas = (areas: CapabilityArea[]): CapabilityArea[] => {
    return areas.filter((area) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          area.name.toLowerCase().includes(query) ||
          area.description.toLowerCase().includes(query) ||
          area.topics.some((t) => t.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }
      if (selectedTags.length > 0) {
        const areaTags = getCapabilityTags(area.id);
        const hasMatchingTag = selectedTags.some((tag) => areaTags.includes(tag));
        if (!hasMatchingTag) return false;
      }
      return true;
    });
  };

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small" aria-label="Capability domains and assessment status">
        <TableHead>
          <TableRow sx={{ backgroundColor: 'grey.50' }}>
            <TableCell component="th" scope="col" sx={{ fontWeight: 600, color: 'text.secondary' }}>
              Domain / Capability Area
            </TableCell>
            <TableCell
              component="th"
              scope="col"
              align="center"
              sx={{ fontWeight: 600, color: 'text.secondary', width: 70 }}
            >
              Score
            </TableCell>
            <TableCell
              component="th"
              scope="col"
              align="center"
              sx={{ fontWeight: 600, color: 'text.secondary', width: 220 }}
            >
              Tags
            </TableCell>
            <TableCell
              component="th"
              scope="col"
              align="center"
              sx={{ fontWeight: 600, color: 'text.secondary', width: 140 }}
            >
              Status
            </TableCell>
            <TableCell
              component="th"
              scope="col"
              align="center"
              sx={{ fontWeight: 600, color: 'text.secondary', width: 90 }}
            >
              Completion
            </TableCell>
            <TableCell
              component="th"
              scope="col"
              align="center"
              sx={{ fontWeight: 600, color: 'text.secondary', width: 80 }}
            >
              Action
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {LAYER_ORDER.map((layer) => {
            const layerDomains = domainsByLayer.get(layer) ?? [];
            const layerConfig = LAYER_CONFIG[layer];

            // Check if any domains in this layer have visible areas after filtering
            const hasVisibleDomains = layerDomains.some((domain) => {
              const allAreas = domain.areas;
              const filteredAreas = filterAreas(allAreas);
              return filteredAreas.length > 0 || (!searchQuery && selectedTags.length === 0);
            });

            if (!hasVisibleDomains) {
              return null;
            }

            return (
              <Fragment key={layer}>
                {/* Layer Header Row */}
                <TableRow>
                  <TableCell
                    colSpan={6}
                    sx={{
                      bgcolor: alpha(layerConfig.color, 0.08),
                      borderLeft: `4px solid ${layerConfig.color}`,
                      py: 1,
                    }}
                  >
                    {/* Layer group heading. The Dashboard's only <h1> is the page
                        title, so these are its second level - without an explicit
                        component MUI renders <h6> and skips h2-h5. */}
                    <Typography
                      variant="subtitle2"
                      component="h2"
                      sx={{
                        fontWeight: 700,
                        color: layerConfig.color,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        fontSize: '0.75rem',
                      }}
                    >
                      {layerConfig.name} ({layerDomains.length} domain
                      {layerDomains.length !== 1 ? 's' : ''})
                    </Typography>
                  </TableCell>
                </TableRow>

                {/* Domain Rows for this Layer */}
                {layerDomains.map((domain) => {
                  const allAreas = domain.areas;
                  const filteredAreas = filterAreas(allAreas);
                  const isExpanded = expandedDomains.has(domain.id);
                  const domainScore = getDomainScore(domain.id);
                  const statusCounts = getDomainStatusCounts(domain.id);
                  const domainTags = getDomainTags(domain.id);
                  const totalCompletion =
                    allAreas.length > 0
                      ? Math.round((statusCounts.finalized / allAreas.length) * 100)
                      : 0;

                  if (filteredAreas.length === 0 && (searchQuery || selectedTags.length > 0)) {
                    return null;
                  }

                  return (
                    <Fragment key={domain.id}>
                      {/* Domain Row */}
                      <TableRow
                        hover
                        onClick={() => toggleDomain(domain.id)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography variant="body2" fontWeight={600}>
                              {domain.name}
                            </Typography>
                            <Tooltip
                              title={domain.description}
                              placement="right"
                              arrow
                              enterDelay={200}
                              slotProps={{
                                tooltip: {
                                  sx: { maxWidth: 400, fontSize: '0.8rem' },
                                },
                              }}
                            >
                              <InfoOutlinedIcon
                                aria-hidden="true"
                                sx={{
                                  fontSize: 16,
                                  color: 'text.disabled',
                                  cursor: 'help',
                                  '&:hover': { color: 'primary.main' },
                                }}
                              />
                            </Tooltip>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Typography
                            variant="body2"
                            fontWeight={domainScore !== null ? 600 : 400}
                            color={domainScore !== null ? 'text.primary' : 'text.disabled'}
                          >
                            {domainScore !== null ? domainScore.toFixed(1) : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <TagsDisplay tags={domainTags} maxVisible={3} />
                        </TableCell>
                        <TableCell>
                          <StackedProgressBar
                            finalized={statusCounts.finalized}
                            inProgress={statusCounts.inProgress}
                            notStarted={statusCounts.notStarted}
                          />
                        </TableCell>
                        <TableCell align="center">
                          {/* `success.main` is only 4.62:1 on white and drops to
                              4.24:1 once the row is hovered, so use `.dark`. */}
                          <Typography
                            variant="body2"
                            fontWeight={500}
                            color={totalCompletion === 100 ? 'success.dark' : 'text.secondary'}
                          >
                            {totalCompletion}%
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            sx={{ p: 0.25 }}
                            aria-expanded={isExpanded}
                            aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${domain.name}`}
                          >
                            {isExpanded ? (
                              <KeyboardArrowDownIcon fontSize="small" aria-hidden="true" />
                            ) : (
                              <KeyboardArrowRightIcon fontSize="small" aria-hidden="true" />
                            )}
                          </IconButton>
                        </TableCell>
                      </TableRow>

                      {/* Capability Area Rows */}
                      {isExpanded &&
                        filteredAreas.map((area) => (
                          <CapabilityRow
                            key={area.id}
                            area={area}
                            status={getCapabilityStatus(area.id)}
                            score={getCapabilityScore(area.id)}
                            tags={getCapabilityTags(area.id)}
                            completion={getCapabilityCompletion(area.id)}
                            onStart={() => onStartAssessment(area.id)}
                            onResume={() => onResumeAssessment(area.id)}
                            onEdit={() => onEditAssessment(area.id)}
                            onView={() => onViewAssessment(area.id)}
                            onDelete={() => onDeleteAssessment(area.id)}
                            onViewHistory={onViewHistory}
                            onDeleteHistory={onDeleteHistory}
                          />
                        ))}
                    </Fragment>
                  );
                })}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
