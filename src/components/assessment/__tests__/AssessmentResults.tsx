'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  RadialLinearScale,
  Title,
  Tooltip,
} from 'chart.js';
import Link from 'next/link';
import { Bar, Radar } from 'react-chartjs-2';

import ContentService from '@/services/ContentService';
import { ScoringService, type EnhancedMaturityScore } from '@/services/ScoringService';

// Create a singleton instance
const scoringService = new ScoringService();

import { useStorageContext } from '../storage/StorageProvider';

import { CleanDetailedResults } from './CleanDetailedResults';
import { EnhancedExportSection } from './EnhancedExportSection';

import type { Assessment } from '../../types';

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

interface AssessmentResultsProps {
  assessmentId: string;
}

// Use the enhanced scoring interface from the service
type MaturityScore = EnhancedMaturityScore;

/**
 * Calculate maturity scores for assessment using enhanced scoring
 */
function calculateMaturityScores(assessment: Assessment, definitions: unknown[]): MaturityScore[] {
  try {
    // Use the enhanced scoring service
    return scoringService.calculateOverallScore(assessment, definitions);
  } catch (error) {
    console.error('Error calculating enhanced scores, falling back to basic scoring:', error);

    // Fallback to basic scoring for backward compatibility
    return assessment.capabilities.map(capability => {
      const dimensions = capability.dimensions;
      const scores = {
        outcome: dimensions.outcome?.maturityLevel || 0,
        role: dimensions.role?.maturityLevel || 0,
        businessProcess: dimensions.businessProcess?.maturityLevel || 0,
        information: dimensions.information?.maturityLevel || 0,
        technology: dimensions.technology?.maturityLevel || 0,
      };

      // Calculate overall score using all dimensions (including zeros for incomplete assessments)
      const overallScore = Object.values(scores).reduce((sum, score) => sum + score, 0) / 5;

      return {
        capabilityArea: capability.capabilityAreaName,
        domain: capability.capabilityDomainName,
        overallScore: Math.round(overallScore * 10) / 10,
        baseScore: Math.round(overallScore * 10) / 10,
        partialCredit: 0,
        dimensionScores: {
          outcome: {
            maturityLevel: scores.outcome,
            partialCredit: 0,
            finalScore: scores.outcome,
            checkboxCompletion: { completed: 0, total: 0, percentage: 0 },
          },
          role: {
            maturityLevel: scores.role,
            partialCredit: 0,
            finalScore: scores.role,
            checkboxCompletion: { completed: 0, total: 0, percentage: 0 },
          },
          businessProcess: {
            maturityLevel: scores.businessProcess,
            partialCredit: 0,
            finalScore: scores.businessProcess,
            checkboxCompletion: { completed: 0, total: 0, percentage: 0 },
          },
          information: {
            maturityLevel: scores.information,
            partialCredit: 0,
            finalScore: scores.information,
            checkboxCompletion: { completed: 0, total: 0, percentage: 0 },
          },
          technology: {
            maturityLevel: scores.technology,
            partialCredit: 0,
            finalScore: scores.technology,
            checkboxCompletion: { completed: 0, total: 0, percentage: 0 },
          },
        },
      };
    });
  }
}

/**
 * Assessment Results Component
 */
export function AssessmentResults({ assessmentId }: AssessmentResultsProps) {
  const { loadAssessment, updateAssessmentStatus } = useStorageContext();

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [scores, setScores] = useState<MaturityScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load assessment data - consolidated into single effect to prevent multiple re-renders
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load assessment and capability definitions in parallel
        const [assessmentData, definitions] = await Promise.allSettled([
          loadAssessment(assessmentId),
          (async () => {
            try {
              const contentService = new ContentService('/content');
              await contentService.initialize();
              return contentService.getAllCapabilities();
            } catch (err) {
              console.warn('Failed to load capability definitions, using fallback scoring:', err);
              return [];
            }
          })(),
        ]);

        // Check if component is still mounted before updating state
        if (!isMounted) {
          return;
        }

        // Handle assessment data result
        if (assessmentData.status === 'rejected') {
          setError('Failed to load assessment');
          return;
        }

        const loadedAssessment = assessmentData.value;
        if (!loadedAssessment) {
          setError('Assessment not found');
          return;
        }

        // Handle capability definitions result
        const loadedDefinitions = definitions.status === 'fulfilled' ? definitions.value : [];

        // Calculate scores and update all state at once to minimize re-renders
        const calculatedScores = calculateMaturityScores(loadedAssessment, loadedDefinitions);

        // Batch state updates
        setAssessment(loadedAssessment);
        setScores(calculatedScores);

        // Update status to completed if not already (don't await to avoid additional re-render)
        if (loadedAssessment.status !== 'completed') {
          updateAssessmentStatus(assessmentId, 'completed').catch(err =>
            console.warn('Failed to update assessment status:', err)
          );
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load assessment');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    // Cleanup function to prevent state updates on unmounted component
    return () => {
      isMounted = false;
    };
  }, [assessmentId, loadAssessment, updateAssessmentStatus]);

  // Memoize chart data to prevent unnecessary re-renders
  const barChartData = useMemo(
    () => ({
      labels: scores.map(s => s.capabilityArea),
      datasets: [
        {
          label: 'Overall Maturity Score',
          data: scores.map(s => s.overallScore),
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
        },
      ],
    }),
    [scores]
  );

  const radarChartData = useMemo(
    () => ({
      labels: ['Outcome', 'Role', 'Business Process', 'Information', 'Technology'],
      datasets: scores.map((score, index) => ({
        label: score.capabilityArea,
        data: [
          score.dimensionScores.outcome.finalScore,
          score.dimensionScores.role.finalScore,
          score.dimensionScores.businessProcess.finalScore,
          score.dimensionScores.information.finalScore,
          score.dimensionScores.technology.finalScore,
        ],
        backgroundColor: `rgba(${54 + index * 50}, ${162 - index * 30}, ${235 - index * 40}, 0.2)`,
        borderColor: `rgba(${54 + index * 50}, ${162 - index * 30}, ${235 - index * 40}, 1)`,
        borderWidth: 2,
      })),
    }),
    [scores]
  );

  // Memoize chart options to prevent unnecessary re-renders
  const chartOptions = useMemo(
    () => ({
      responsive: true,
      plugins: {
        legend: { position: 'top' as const },
        title: { display: true, text: 'MITA Maturity Assessment Results' },
      },
      scales: {
        y: { beginAtZero: true, max: 5 },
      },
    }),
    []
  );

  const radarOptions = useMemo(
    () => ({
      responsive: true,
      plugins: {
        legend: { position: 'top' as const },
        title: { display: true, text: 'ORBIT Dimension Comparison' },
      },
      scales: {
        r: { beginAtZero: true, max: 5 },
      },
    }),
    []
  );

  // Memoize summary calculations
  const overallAverage = useMemo(
    () =>
      scores.length > 0
        ? (scores.reduce((sum, s) => sum + s.overallScore, 0) / scores.length).toFixed(1)
        : '0.0',
    [scores]
  );

  const uniqueDomainsCount = useMemo(() => new Set(scores.map(s => s.domain)).size, [scores]);

  if (loading) {
    return (
      <div className="ds-u-text-align--center ds-u-padding--4">
        <div className="ds-c-spinner" role="status" aria-label="Loading results">
          <span className="ds-u-visibility--screen-reader">Loading...</span>
        </div>
        <p className="ds-u-margin-top--2">Calculating assessment results...</p>
      </div>
    );
  }

  if (error || !assessment) {
    return (
      <div className="ds-c-alert ds-c-alert--error">
        <div className="ds-c-alert__body">
          <h3 className="ds-c-alert__heading">Error Loading Results</h3>
          <p className="ds-c-alert__text">{error || 'Assessment not found'}</p>
          <Link href="/dashboard" className="ds-c-button ds-c-button--primary ds-u-margin-top--2">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="ds-l-container">
      <div className="ds-l-row ds-u-justify-content--center">
        <div className="ds-l-col--12 ds-l-lg-col--10">
          {/* Header */}
          <header className="ds-u-margin-bottom--4">
            <h1 className="ds-display--1 ds-u-margin-bottom--2">Assessment Results</h1>
            <p className="ds-text--lead">
              MITA maturity assessment results for {assessment.stateName}
            </p>
            <div className="ds-u-margin-top--2">
              <span className="ds-c-badge ds-c-badge--success">Completed</span>
              <span className="ds-u-margin-left--2 ds-text--small ds-u-color--muted">
                Last updated: {new Date(assessment.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </header>

          {/* Summary Cards */}
          <div className="ds-l-row ds-u-margin-bottom--4">
            <div className="ds-l-col--12 ds-l-md-col--4">
              <div className="ds-c-card">
                <div className="ds-c-card__body ds-u-text-align--center">
                  <h3 className="ds-h3 ds-u-margin-bottom--1">Overall Average</h3>
                  <div className="ds-display--2 ds-u-color--primary">{overallAverage}</div>
                  <p className="ds-text--small ds-u-color--muted">out of 5.0</p>
                </div>
              </div>
            </div>
            <div className="ds-l-col--12 ds-l-md-col--4">
              <div className="ds-c-card">
                <div className="ds-c-card__body ds-u-text-align--center">
                  <h3 className="ds-h3 ds-u-margin-bottom--1">Capability Areas</h3>
                  <div className="ds-display--2 ds-u-color--primary">{scores.length}</div>
                  <p className="ds-text--small ds-u-color--muted">assessed</p>
                </div>
              </div>
            </div>
            <div className="ds-l-col--12 ds-l-md-col--4">
              <div className="ds-c-card">
                <div className="ds-c-card__body ds-u-text-align--center">
                  <h3 className="ds-h3 ds-u-margin-bottom--1">Domains</h3>
                  <div className="ds-display--2 ds-u-color--primary">{uniqueDomainsCount}</div>
                  <p className="ds-text--small ds-u-color--muted">covered</p>
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          {scores.length > 0 && (
            <div className="ds-u-margin-bottom--4">
              <h2 className="ds-h2 ds-u-margin-bottom--3">Visualization</h2>
              <div className="ds-l-row">
                <div className="ds-l-col--12 ds-l-lg-col--6 ds-u-margin-bottom--3">
                  <div className="ds-c-card">
                    <div className="ds-c-card__body">
                      <Bar data={barChartData} options={chartOptions} />
                    </div>
                  </div>
                </div>
                <div className="ds-l-col--12 ds-l-lg-col--6 ds-u-margin-bottom--3">
                  <div className="ds-c-card">
                    <div className="ds-c-card__body">
                      <Radar data={radarChartData} options={radarOptions} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Clean Detailed Results */}
          <CleanDetailedResults assessment={assessment} scores={scores} />

          {/* Enhanced Export Section */}
          <EnhancedExportSection assessment={assessment} />

          {/* Navigation */}
          <div className="ds-u-margin-bottom--4 ds-u-padding-top--4 ds-u-border-top--1">
            <div className="ds-l-row">
              <div className="ds-l-col--auto ds-u-margin-right--2">
                <Link href="/dashboard" className="ds-c-button ds-c-button--primary">
                  Return to Dashboard
                </Link>
              </div>
              <div className="ds-l-col--auto">
                <Link
                  href={`/assessment/${assessmentId}`}
                  className="ds-c-button ds-c-button--transparent"
                >
                  View Assessment Details
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AssessmentResults;
