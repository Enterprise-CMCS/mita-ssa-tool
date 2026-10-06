/**
 * Results Page
 *
 * Shows overall assessment results with charts and summary statistics.
 * Provides navigation to detailed domain and area results.
 */

import { JSX, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Container, Typography, Paper, Alert, Button } from '@mui/material';
import Grid from '@mui/material/Grid2';
import { useScores } from '../hooks';
import { getAllDomains } from '../services/capabilities';
import { ResultsMasterDetail } from '../components/results';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import type { CapabilityLayer } from '../types';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

/**
 * Layer display names and colors
 */
const LAYER_CONFIG: Record<CapabilityLayer, { name: string; color: string; bgColor: string }> = {
  strategic: { name: 'Strategic', color: '#1976d2', bgColor: 'rgba(25, 118, 210, 0.8)' },
  core: { name: 'Core Operations', color: '#388e3c', bgColor: 'rgba(56, 142, 60, 0.8)' },
  support: { name: 'Support', color: '#7b1fa2', bgColor: 'rgba(123, 31, 162, 0.8)' },
};

/**
 * Results page component
 */
export default function Results(): JSX.Element {
  const navigate = useNavigate();
  const { getOverallScore, getDomainScore, getStatusCounts } = useScores();

  const domains = useMemo(() => getAllDomains(), []);
  const overallScore = getOverallScore();
  const statusCounts = getStatusCounts();

  // Build domain scores for list and chart, grouped by layer
  const domainScores = useMemo(() => {
    return domains.map((domain) => ({
      id: domain.id,
      name: domain.name,
      layer: domain.layer,
      score: getDomainScore(domain.id),
    }));
  }, [domains, getDomainScore]);

  // Group domains by layer for the chart (Core, Strategic, Support)
  // Within each layer, sort alphabetically A-Z
  const chartData = useMemo(() => {
    const layers: CapabilityLayer[] = ['core', 'strategic', 'support'];
    const groupedDomains = layers.flatMap((layer) =>
      domainScores.filter((d) => d.layer === layer).sort((a, b) => a.name.localeCompare(b.name))
    );

    return {
      labels: groupedDomains.map((d) => d.name),
      datasets: [
        {
          label: 'Maturity Level',
          data: groupedDomains.map((d) => d.score ?? 0),
          backgroundColor: groupedDomains.map((d) => LAYER_CONFIG[d.layer].bgColor),
          borderRadius: 4,
          barThickness: 20,
        },
      ],
    };
  }, [domainScores]);

  const chartOptions = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: false },
    },
    scales: {
      x: {
        min: 0,
        max: 5,
        ticks: { stepSize: 1 },
        title: {
          display: true,
          text: 'Maturity Level',
        },
      },
      y: {
        ticks: {
          font: { size: 11 },
        },
      },
    },
  };

  // Check if there are any finalized assessments
  const hasResults = statusCounts.finalized > 0;

  if (!hasResults) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="info" sx={{ mb: 3 }}>
          No finalized assessments yet. Complete and finalize assessments to see results here.
        </Alert>
        <Button variant="contained" onClick={() => navigate('/dashboard')}>
          Go to Dashboard
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Assessment Results
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Overview of your MITA 4.0 maturity assessment results
      </Typography>

      {/* Summary Stats */}
      <Grid
        container
        spacing={3}
        sx={{ mb: 4 }}
        component="section"
        aria-label="Assessment statistics"
      >
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h3" component="p" sx={{ fontWeight: 700, color: 'primary.main' }}>
              {overallScore?.toFixed(1) ?? '—'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Overall Score
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h3" component="p" sx={{ fontWeight: 700 }}>
              {statusCounts.finalized}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Finalized Assessments
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h3" component="p" sx={{ fontWeight: 700 }}>
              {statusCounts.inProgress}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              In Progress
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h3" component="p" sx={{ fontWeight: 700 }}>
              {statusCounts.notStarted}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Not Started ({Math.round((statusCounts.notStarted / statusCounts.total) * 100)}%
              remaining)
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Domain Scores Chart */}
      <Paper sx={{ p: 3, mb: 4 }} component="section" aria-label="Domain scores chart">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" component="h2">
            Domain Scores by Layer
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {(['core', 'strategic', 'support'] as CapabilityLayer[]).map((layer) => (
              <Box key={layer} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: 0.5,
                    bgcolor: LAYER_CONFIG[layer].bgColor,
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  {LAYER_CONFIG[layer].name}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
        {/* react-chartjs-2 puts role="img" on the <canvas> and spreads unknown
            props onto it, so the accessible name belongs here. Labelling only a
            wrapper left the canvas itself an unnamed image (axe role-img-alt). */}
        <Box sx={{ height: 500 }}>
          <Bar
            data={chartData}
            options={chartOptions}
            aria-label="Horizontal bar chart showing maturity scores for each domain grouped by layer"
          />
        </Box>
      </Paper>

      {/* Results by Domain - Master Detail View */}
      <Typography variant="h5" component="h2" sx={{ mb: 2 }}>
        Results by Domain
      </Typography>
      <ResultsMasterDetail domains={domains} />
    </Container>
  );
}
