/**
 * Area Results Page
 *
 * Shows detailed assessment results for a specific capability area.
 * Displays dimension scores, history, and detailed breakdown.
 * Handles both standard assessments (B-I-T dimensions) and
 * organizational assessments (Outcomes/Roles aspects).
 */

import { JSX, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Chip,
  Alert,
  Button,
  Breadcrumbs,
  Link,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import HistoryIcon from '@mui/icons-material/History';
import {
  useScores,
  useHistory,
  useCapabilityAssessments,
  useOrbitRatings,
  useAttachments,
} from '../hooks';
import { getAreaWithDomain } from '../services/capabilities';
import { getOrganizationalAspects, getOrganizationalAssessment } from '../services/orbit';
import { getOrganizationalSections } from '../constants';
import { DimensionScoresTable } from '../components/results';
import { getScoreColor } from '../utils';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
} from 'chart.js';
import { Radar, Line, Bar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler
);

/**
 * Short labels for compact radar chart (B-I-T only)
 */
const SHORT_DIMENSION_LABELS: Record<string, string> = {
  'Business Architecture': 'Bus. Arch.',
  Information: 'Info',
  Technology: 'Tech',
};

/**
 * Area results page component
 */
export default function AreaResults(): JSX.Element {
  const { domainId, areaId } = useParams<{ domainId: string; areaId: string }>();
  const navigate = useNavigate();
  const { getCapabilityScoreData, getDimensionScoresForAssessment } = useScores();
  const { getScoreTrend, getHistoryForArea } = useHistory();
  const { getAssessmentForArea } = useCapabilityAssessments();

  const areaInfo = useMemo(() => (areaId ? getAreaWithDomain(areaId) : undefined), [areaId]);
  const scoreData = areaId ? getCapabilityScoreData(areaId) : undefined;
  const assessment = areaId ? getAssessmentForArea(areaId) : undefined;
  const dimensionScores = assessment ? getDimensionScoresForAssessment(assessment.id) : undefined;
  const scoreTrend = useMemo(() => (areaId ? getScoreTrend(areaId) : []), [areaId, getScoreTrend]);
  const historyEntries = useMemo(
    () => (areaId ? getHistoryForArea(areaId) : []),
    [areaId, getHistoryForArea]
  );

  // Get ratings and attachments for the assessment
  const { ratings } = useOrbitRatings(assessment?.id);
  const { attachments, downloadAttachment } = useAttachments(assessment?.id);

  // Check if this is the combined organizational assessment
  const organizationalSections = areaId ? getOrganizationalSections(areaId) : null;
  const isOrganizationalAssessment = organizationalSections !== null;

  // Build aspect data for the organizational assessment (all sections, in order)
  const aspectChartData = useMemo(() => {
    if (!organizationalSections || !ratings) return null;

    const labels: string[] = [];
    const scores: number[] = [];

    for (const section of organizationalSections) {
      for (const aspect of getOrganizationalAspects(section)) {
        const rating = ratings.find((r) => r.dimensionId === section && r.aspectId === aspect.id);
        labels.push(aspect.name);
        scores.push(rating?.currentLevel ?? 0);
      }
    }

    return { labels, scores };
  }, [organizationalSections, ratings]);

  // Build dimension data for radar chart - B-I-T dimensions only (standard assessments)
  const dimensionChartData = useMemo(() => {
    if (isOrganizationalAssessment || !dimensionScores) return null;

    const labels: string[] = [];
    const scores: number[] = [];

    // Add B-I-T dimensions
    for (const dim of dimensionScores) {
      labels.push(SHORT_DIMENSION_LABELS[dim.dimensionName] ?? dim.dimensionName);
      scores.push(dim.averageLevel ?? 0);
    }

    return { labels, scores };
  }, [isOrganizationalAssessment, dimensionScores]);

  // Radar chart data (for standard assessments)
  const radarChartData = useMemo(() => {
    if (!dimensionChartData) return null;
    return {
      labels: dimensionChartData.labels,
      datasets: [
        {
          label: 'Maturity Level',
          data: dimensionChartData.scores,
          backgroundColor: 'rgba(25, 118, 210, 0.2)',
          borderColor: 'rgba(25, 118, 210, 1)',
          borderWidth: 2,
          pointBackgroundColor: 'rgba(25, 118, 210, 1)',
          pointRadius: 5,
        },
      ],
    };
  }, [dimensionChartData]);

  // Bar chart data (for organizational assessments)
  const aspectBarChartData = useMemo(() => {
    if (!aspectChartData) return null;
    return {
      labels: aspectChartData.labels,
      datasets: [
        {
          label: 'Maturity Level',
          data: aspectChartData.scores,
          backgroundColor: aspectChartData.scores.map((s) => getScoreColor(s > 0 ? s : null)),
          borderRadius: 4,
          barThickness: 20,
        },
      ],
    };
  }, [aspectChartData]);

  const aspectBarChartOptions = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: {
        min: 0,
        max: 5,
        ticks: { stepSize: 1 },
        title: { display: true, text: 'Maturity Level' },
      },
      y: {
        ticks: { font: { size: 10 } },
      },
    },
  };

  // Custom plugin to draw score labels on radar chart points
  const radarDataLabelsPlugin = useMemo(
    () => ({
      id: 'radarDataLabels',
      afterDatasetsDraw: (chart: ChartJS) => {
        const ctx = chart.ctx;
        const meta = chart.getDatasetMeta(0);

        if (!meta.data || meta.data.length === 0) return;

        ctx.save();
        ctx.font = 'bold 10px sans-serif';
        ctx.fillStyle = '#1976d2';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        meta.data.forEach((point, index) => {
          const dataset = chart.data.datasets[0];
          if (!dataset?.data) return;
          const value = dataset.data[index] as number;
          if (value > 0) {
            // Offset the label slightly outward from the point
            const rScale = chart.scales['r'] as { xCenter?: number; yCenter?: number } | undefined;
            const centerX = rScale?.xCenter ?? 0;
            const centerY = rScale?.yCenter ?? 0;
            const dx = point.x - centerX;
            const dy = point.y - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const offsetDistance = 12;
            const offsetX = distance > 0 ? (dx / distance) * offsetDistance : 0;
            const offsetY = distance > 0 ? (dy / distance) * offsetDistance : 0;

            ctx.fillText(value.toFixed(1), point.x + offsetX, point.y + offsetY);
          }
        });

        ctx.restore();
      },
    }),
    []
  );

  const radarChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        min: 0,
        max: 5,
        ticks: {
          display: false, // Hide scale numbers for cleaner look
          stepSize: 1,
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.08)',
        },
        angleLines: {
          color: 'rgba(0, 0, 0, 0.08)',
        },
        pointLabels: {
          font: {
            size: 11,
            weight: 500,
          },
          color: '#374151',
        },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context: { parsed: { r: number } }) => `Level: ${context.parsed.r.toFixed(1)}`,
        },
      },
    },
  };

  // Trend chart data
  const trendChartData = useMemo(() => {
    if (scoreTrend.length < 2) return null;
    return {
      labels: scoreTrend.map((t) => t.date.toLocaleDateString()),
      datasets: [
        {
          label: 'Score',
          data: scoreTrend.map((t) => t.score),
          borderColor: 'rgba(25, 118, 210, 1)',
          backgroundColor: 'rgba(25, 118, 210, 0.1)',
          fill: true,
          tension: 0.3,
        },
      ],
    };
  }, [scoreTrend]);

  const trendChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        min: 0,
        max: 5,
        ticks: { stepSize: 1 },
      },
    },
    plugins: {
      legend: { display: false },
    },
  };

  if (!areaInfo || !scoreData) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">Capability area not found or no assessment data available</Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(domainId ? `/results/${domainId}` : '/results')}
          sx={{ mt: 2 }}
        >
          Back
        </Button>
      </Container>
    );
  }

  const { area, domain } = areaInfo;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2 }} aria-label="Breadcrumb navigation">
        <Link
          component="button"
          variant="body2"
          onClick={() => navigate('/results')}
          underline="hover"
          color="inherit"
        >
          Results
        </Link>
        <Link
          component="button"
          variant="body2"
          onClick={() => navigate(`/results/${domain.id}`)}
          underline="hover"
          color="inherit"
        >
          {domain.name}
        </Link>
        <Typography variant="body2" color="text.primary">
          {area.name}
        </Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box
        sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 4 }}
      >
        {/* Left: Title and Description */}
        <Box sx={{ flex: 1, mr: 3 }}>
          <Typography variant="overline" color="text.secondary">
            {domain.name}
          </Typography>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 1 }}>
            {area.name}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 1.5 }}>
            {area.description}
          </Typography>

          {/* Topic Chips */}
          {area.topics && area.topics.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center', mb: 2 }}>
              <Typography
                variant="caption"
                sx={{ fontWeight: 600, color: 'text.secondary', mr: 0.5 }}
              >
                Topics:
              </Typography>
              {area.topics.map((topic, index) => (
                <Chip
                  key={index}
                  label={topic}
                  size="small"
                  variant="outlined"
                  sx={{
                    height: 26,
                    fontSize: '0.8rem',
                    borderColor: 'rgba(0, 0, 0, 0.2)',
                    color: 'text.secondary',
                  }}
                />
              ))}
            </Box>
          )}

          {/* Tags */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            {scoreData.tags.map((tag) => (
              <Chip key={tag} label={tag} size="small" variant="outlined" />
            ))}
          </Box>
        </Box>

        {/* Right: Chart + Score side by side */}
        <Paper
          elevation={1}
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          {/* Radar Chart for standard assessments */}
          {radarChartData && !isOrganizationalAssessment && (
            <Box sx={{ width: 180, height: 180 }}>
              <Radar
                data={radarChartData}
                options={radarChartOptions}
                plugins={[radarDataLabelsPlugin]}
                aria-label="Radar chart showing maturity levels across B-I-T dimensions"
              />
            </Box>
          )}

          {/* Bar Chart for organizational assessments */}
          {aspectBarChartData && isOrganizationalAssessment && (
            <Box sx={{ width: 220, height: 180 }}>
              <Bar
                data={aspectBarChartData}
                options={aspectBarChartOptions}
                aria-label="Bar chart showing maturity levels for organizational assessment aspects"
              />
            </Box>
          )}

          {/* Score + Edit button (right) */}
          <Box sx={{ textAlign: 'center', minWidth: 100 }}>
            {/* A score value, not a section heading. */}
            <Typography
              variant="h2"
              component="p"
              sx={{ fontWeight: 700, color: getScoreColor(scoreData.score), lineHeight: 1 }}
            >
              {scoreData.score?.toFixed(1) ?? '—'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Overall Score
            </Typography>
            {assessment && (
              <Button
                startIcon={<EditIcon aria-hidden="true" />}
                onClick={() => navigate(`/assessment/${assessment.id}`)}
                variant="outlined"
                size="small"
              >
                Edit
              </Button>
            )}
          </Box>
        </Paper>
      </Box>

      {/* Score Trend Chart (if available) */}
      {trendChartData && (
        <Paper sx={{ p: 3, mb: 4 }} component="section" aria-label="Score trend chart">
          <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
            Score Trend
          </Typography>
          <Box sx={{ height: 200 }}>
            <Line
              data={trendChartData}
              options={trendChartOptions}
              aria-label="Line chart showing score trend over time"
            />
          </Box>
        </Paper>
      )}

      {/* Dimension Scores Table (for standard assessments) */}
      {dimensionScores && !isOrganizationalAssessment && (
        <DimensionScoresTable
          dimensionScores={dimensionScores}
          ratings={ratings}
          attachments={attachments}
          onDownloadAttachment={downloadAttachment}
        />
      )}

      {/* Aspect Scores Tables (one per organizational section) */}
      {organizationalSections?.map((section) => (
        <Paper key={section} sx={{ mb: 4 }}>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" component="h2">
              {getOrganizationalAssessment(section).name} Aspect Scores
            </Typography>
          </Box>
          <Divider />
          <TableContainer>
            <Table aria-label={`${getOrganizationalAssessment(section).name} aspect scores`}>
              <TableHead>
                <TableRow>
                  <TableCell component="th" scope="col">
                    Aspect
                  </TableCell>
                  <TableCell component="th" scope="col" align="center" sx={{ width: 100 }}>
                    Score
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {getOrganizationalAspects(section).map((aspect) => {
                  const rating = ratings.find(
                    (r) => r.dimensionId === section && r.aspectId === aspect.id
                  );
                  const score = rating?.currentLevel ?? 0;
                  return (
                    <TableRow key={aspect.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {aspect.name}
                        </Typography>
                        {rating?.notes && (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            {rating.notes}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={score > 0 ? score.toFixed(0) : '—'}
                          size="small"
                          sx={{
                            bgcolor: score > 0 ? getScoreColor(score) : 'transparent',
                            color: score > 0 ? 'white' : 'text.secondary',
                            fontWeight: 600,
                            border: score <= 0 ? '1px solid' : 'none',
                            borderColor: 'divider',
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      ))}

      {/* History */}
      {historyEntries.length > 0 && (
        <Paper sx={{ mb: 4 }} component="section" aria-label="Assessment history">
          <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <HistoryIcon color="action" aria-hidden="true" />
            <Typography variant="h6" component="h2">
              Assessment History
            </Typography>
          </Box>
          <Divider />
          <TableContainer>
            <Table aria-label="Assessment history entries">
              <TableHead>
                <TableRow>
                  <TableCell component="th" scope="col">
                    Date
                  </TableCell>
                  <TableCell component="th" scope="col" align="center">
                    Score
                  </TableCell>
                  <TableCell component="th" scope="col">
                    Tags
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {historyEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{entry.snapshotDate.toLocaleDateString()}</TableCell>
                    <TableCell align="center">
                      <Chip
                        label={entry.overallScore.toFixed(1)}
                        size="small"
                        sx={{
                          bgcolor: getScoreColor(entry.overallScore),
                          color: 'white',
                          fontWeight: 600,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {entry.tags.map((tag) => (
                        <Chip
                          key={tag}
                          label={tag}
                          size="small"
                          variant="outlined"
                          sx={{ mr: 0.5 }}
                        />
                      ))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Back Button */}
      <Box sx={{ mt: 4 }}>
        <Button
          startIcon={<ArrowBackIcon aria-hidden="true" />}
          onClick={() => navigate(`/results/${domain.id}`)}
        >
          Back to {domain.name}
        </Button>
      </Box>
    </Container>
  );
}
