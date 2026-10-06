/**
 * Domain Results Page
 *
 * Shows assessment results for all capability areas within a domain.
 */

import { JSX, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
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
  Chip,
  LinearProgress,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useScores } from '../hooks';
import { getDomainById, getAreasByDomainId } from '../services/capabilities';
import { getScoreColor } from '../utils';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

/**
 * Domain results page component
 */
export default function DomainResults(): JSX.Element {
  const { domainId } = useParams<{ domainId: string }>();
  const navigate = useNavigate();
  const { getDomainScore, getCapabilityScore, getCapabilityStatus } = useScores();

  const domain = useMemo(() => (domainId ? getDomainById(domainId) : undefined), [domainId]);
  const areas = useMemo(() => (domainId ? getAreasByDomainId(domainId) : []), [domainId]);
  const domainScore = domainId ? getDomainScore(domainId) : null;

  // Build area scores for table and chart
  const areaScores = useMemo(() => {
    return areas.map((area) => ({
      id: area.id,
      name: area.name,
      score: getCapabilityScore(area.id),
      status: getCapabilityStatus(area.id),
    }));
  }, [areas, getCapabilityScore, getCapabilityStatus]);

  // Chart data - only show assessed areas
  const chartData = useMemo(() => {
    const assessed = areaScores.filter((a) => a.score !== null);
    return {
      labels: assessed.map((a) => a.name),
      datasets: [
        {
          label: 'Maturity Level',
          data: assessed.map((a) => a.score ?? 0),
          backgroundColor: assessed.map((a) => getScoreColor(a.score)),
          borderRadius: 4,
          barThickness: 24,
        },
      ],
    };
  }, [areaScores]);

  const chartOptions = {
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
        ticks: { font: { size: 11 } },
      },
    },
  };

  // Stats
  const stats = useMemo(() => {
    const finalized = areaScores.filter((a) => a.status === 'finalized').length;
    const inProgress = areaScores.filter((a) => a.status === 'in_progress').length;
    const notStarted = areaScores.filter((a) => a.status === 'not_started').length;
    return { finalized, inProgress, notStarted, total: areas.length };
  }, [areaScores, areas.length]);

  if (!domain) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">Domain not found</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/results')} sx={{ mt: 2 }}>
          Back to Results
        </Button>
      </Container>
    );
  }

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
        <Typography variant="body2" color="text.primary">
          {domain.name}
        </Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box
        sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 4 }}
      >
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 1 }}>
            {domain.name}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            {domain.description}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Chip
              label={`${stats.finalized} Finalized`}
              size="small"
              color="success"
              variant="outlined"
            />
            <Chip
              label={`${stats.inProgress} In Progress`}
              size="small"
              color="warning"
              variant="outlined"
            />
            <Chip label={`${stats.notStarted} Not Started`} size="small" variant="outlined" />
          </Box>
        </Box>

        {/* Domain Score */}
        <Paper sx={{ p: 3, textAlign: 'center', minWidth: 140 }}>
          {/* A score value, not a section heading. */}
          <Typography
            variant="h2"
            component="p"
            sx={{ fontWeight: 700, color: getScoreColor(domainScore), lineHeight: 1 }}
          >
            {domainScore?.toFixed(1) ?? '—'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Domain Score
          </Typography>
        </Paper>
      </Box>

      {/* Chart */}
      {areaScores.some((a) => a.score !== null) && (
        <Paper sx={{ p: 3, mb: 4 }} component="section" aria-label="Capability area scores chart">
          <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
            Capability Area Scores
          </Typography>
          <Box
            sx={{ height: Math.max(200, areaScores.filter((a) => a.score !== null).length * 40) }}
          >
            <Bar
              data={chartData}
              options={chartOptions}
              aria-label="Horizontal bar chart showing maturity scores for each capability area"
            />
          </Box>
        </Paper>
      )}

      {/* Areas Table */}
      <Paper>
        <TableContainer>
          <Table aria-label="Capability areas assessment status">
            <TableHead>
              <TableRow>
                <TableCell component="th" scope="col">
                  Capability Area
                </TableCell>
                <TableCell component="th" scope="col" align="center" sx={{ width: 120 }}>
                  Status
                </TableCell>
                <TableCell component="th" scope="col" align="center" sx={{ width: 100 }}>
                  Score
                </TableCell>
                <TableCell component="th" scope="col" sx={{ width: 200 }}>
                  Progress
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {areaScores.map((area) => (
                <TableRow
                  key={area.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/results/${domainId}/${area.id}`)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/results/${domainId}/${area.id}`);
                    }
                  }}
                  role="link"
                  aria-label={`View results for ${area.name}`}
                >
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {area.name}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={
                        area.status === 'finalized'
                          ? 'Finalized'
                          : area.status === 'in_progress'
                            ? 'In Progress'
                            : 'Not Started'
                      }
                      size="small"
                      color={
                        area.status === 'finalized'
                          ? 'success'
                          : area.status === 'in_progress'
                            ? 'warning'
                            : 'default'
                      }
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="center">
                    {area.score !== null ? (
                      <Chip
                        label={area.score.toFixed(1)}
                        size="small"
                        sx={{
                          bgcolor: getScoreColor(area.score),
                          color: 'white',
                          fontWeight: 600,
                        }}
                      />
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>
                    <LinearProgress
                      variant="determinate"
                      value={
                        area.status === 'finalized' ? 100 : area.status === 'in_progress' ? 50 : 0
                      }
                      sx={{ height: 8, borderRadius: 4 }}
                      aria-label={`Progress: ${area.status === 'finalized' ? '100' : area.status === 'in_progress' ? '50' : '0'}%`}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Back Button */}
      <Box sx={{ mt: 4 }}>
        <Button
          startIcon={<ArrowBackIcon aria-hidden="true" />}
          onClick={() => navigate('/results')}
        >
          Back to Results
        </Button>
      </Box>
    </Container>
  );
}
