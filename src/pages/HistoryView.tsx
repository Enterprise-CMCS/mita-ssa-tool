/**
 * History View Page
 *
 * Read-only view of a historical assessment snapshot.
 * Reuses assessment components but displays historical data.
 */

import { JSX, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, CircularProgress, Alert, Chip } from '@mui/material';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import { getAreaWithDomain } from '../services/capabilities';
import {
  getOrbitModel,
  getTechnologySubDimensions,
  getAspectsForDimension,
  getAspectsForSubDimension,
  getAggregatedDimensionForDomain,
  getOrganizationalAspects,
} from '../services/orbit';
import { getOrganizationalSections } from '../constants';
import { AssessmentSidebar, DimensionPage, AggregateDimensionView } from '../components/assessment';
import type {
  OrbitDimensionId,
  TechnologySubDimensionId,
  OrbitRating,
  HistoricalRating,
  OrganizationalAssessmentId,
} from '../types';

/**
 * Navigation item for sidebar
 * Supports both standard dimension navigation and organizational aspect navigation
 */
interface NavItem {
  /** For standard assessments: the ORBIT dimension ID */
  dimensionId?: OrbitDimensionId;
  /** For Technology sub-dimensions */
  subDimensionId?: TechnologySubDimensionId;
  /** For organizational assessments: the section type */
  organizationalType?: OrganizationalAssessmentId;
  /** For organizational assessments: the aspect ID being navigated to */
  aspectId?: string;
  name: string;
  description: string;
  isRequired: boolean;
  aspectCount: number;
  isAggregate?: boolean;
  isOrganizational?: boolean;
}

/**
 * Build navigation items for the combined organizational assessment.
 * Mirrors the Assessment page: aspects listed directly, grouped by section.
 * @param sections - The organizational assessment sections
 */
function buildOrganizationalNavItems(sections: OrganizationalAssessmentId[]): NavItem[] {
  return sections.flatMap((section) =>
    getOrganizationalAspects(section).map((aspect) => ({
      organizationalType: section,
      aspectId: aspect.id,
      name: aspect.name,
      description: aspect.description,
      isRequired: true,
      aspectCount: 1,
      isOrganizational: true,
    }))
  );
}

/**
 * Build navigation items from ORBIT model
 * @param domainId - The domain ID to check for aggregate dimensions
 */
function buildNavItems(domainId?: string): NavItem[] {
  const items: NavItem[] = [];
  const orbitModel = getOrbitModel();

  // Get the aggregated dimension for this domain (if any)
  const aggregatedDimension = domainId ? getAggregatedDimensionForDomain(domainId) : null;

  // Standard dimensions (B, I - non-Technology)
  for (const dimId of ['businessArchitecture', 'information'] as const) {
    const dim = orbitModel.dimensions[dimId];
    const isAggregate = aggregatedDimension === dimId;

    items.push({
      dimensionId: dimId,
      name: dim.name,
      description: isAggregate
        ? `Aggregate ${dim.name} score from all finalized capability assessments`
        : dim.description,
      isRequired: dim.required,
      // Aggregate dimensions have no manually assessable aspects
      aspectCount: isAggregate ? 0 : dim.aspects.length,
      isAggregate,
    });
  }

  // Technology dimension - check if it's aggregated
  const isTechAggregate = aggregatedDimension === 'technology';

  if (isTechAggregate) {
    // Show Technology as a single aggregate item
    const techDim = orbitModel.dimensions.technology;
    items.push({
      dimensionId: 'technology',
      name: techDim.name,
      description: `Aggregate ${techDim.name} score from all finalized capability assessments`,
      isRequired: true,
      aspectCount: 0, // No aspects to assess - it's aggregate
      isAggregate: true,
    });
  } else {
    // Show Technology sub-dimensions
    const techSubDims = getTechnologySubDimensions();
    for (const subDim of techSubDims) {
      items.push({
        dimensionId: 'technology',
        subDimensionId: subDim.id,
        name: subDim.name,
        description: subDim.description,
        isRequired: true,
        aspectCount: subDim.aspects.length,
      });
    }
  }

  return items;
}

/**
 * Convert HistoricalRating to OrbitRating format for display
 */
function historicalToOrbitRating(
  historyId: string,
  historical: HistoricalRating,
  index: number
): OrbitRating {
  return {
    id: `${historyId}-${index}`,
    capabilityAssessmentId: historyId,
    dimensionId: historical.dimensionId,
    subDimensionId: historical.subDimensionId,
    aspectId: historical.aspectId,
    currentLevel: historical.currentLevel,
    targetLevel: historical.targetLevel,
    questionResponses: historical.questionResponses,
    evidenceResponses: historical.evidenceResponses,
    notes: historical.notes,
    barriers: historical.barriers,
    plans: historical.plans,
    carriedForward: false,
    attachmentIds: [],
    updatedAt: new Date(),
  };
}

/**
 * History view page component
 */
export default function HistoryView(): JSX.Element {
  const { historyId } = useParams<{ historyId: string }>();
  const navigate = useNavigate();

  // Load history entry from DB
  const historyEntry = useLiveQuery(
    () => (historyId ? db.assessmentHistory.get(historyId) : undefined),
    [historyId]
  );

  // Get capability info (needed for domain ID)
  const capabilityInfo = useMemo(() => {
    if (!historyEntry) return null;
    return getAreaWithDomain(historyEntry.capabilityAreaId);
  }, [historyEntry]);

  // Detect the combined organizational assessment
  const organizationalSections = useMemo(() => {
    if (!historyEntry) return null;
    return getOrganizationalSections(historyEntry.capabilityAreaId);
  }, [historyEntry]);

  // Navigation state - build with domain ID for aggregate detection
  const navItems = useMemo(() => {
    if (organizationalSections) {
      return buildOrganizationalNavItems(organizationalSections);
    }
    return buildNavItems(capabilityInfo?.domain.id);
  }, [capabilityInfo?.domain.id, organizationalSections]);
  const [currentNavIndex, setCurrentNavIndex] = useState(0);
  const currentNav = navItems[currentNavIndex] ?? navItems[0];

  // Convert historical ratings to OrbitRating format
  const ratings = useMemo(() => {
    if (!historyEntry || !historyId) return [];
    return historyEntry.ratings.map((r, i) => historicalToOrbitRating(historyId, r, i));
  }, [historyEntry, historyId]);

  // Build ratings map for current dimension
  const ratingsMap = useMemo(() => {
    const map = new Map<string, OrbitRating>();
    if (!currentNav) return map;
    for (const rating of ratings) {
      if (currentNav.isOrganizational && currentNav.organizationalType && currentNav.aspectId) {
        // Organizational aspect: match by section and aspect
        if (
          rating.dimensionId === currentNav.organizationalType &&
          rating.aspectId === currentNav.aspectId
        ) {
          map.set(rating.aspectId, rating);
        }
      } else if (currentNav.subDimensionId) {
        if (
          rating.dimensionId === currentNav.dimensionId &&
          rating.subDimensionId === currentNav.subDimensionId
        ) {
          map.set(rating.aspectId, rating);
        }
      } else if (currentNav.dimensionId) {
        if (rating.dimensionId === currentNav.dimensionId && !rating.subDimensionId) {
          map.set(rating.aspectId, rating);
        }
      }
    }
    return map;
  }, [ratings, currentNav]);

  // Get aspects for current dimension/organizational aspect
  const currentAspects = useMemo(() => {
    if (!currentNav) return [];
    if (currentNav.isOrganizational && currentNav.organizationalType && currentNav.aspectId) {
      const aspects = getOrganizationalAspects(currentNav.organizationalType);
      const aspect = aspects.find((a) => a.id === currentNav.aspectId);
      return aspect ? [aspect] : [];
    }
    if (currentNav.subDimensionId) {
      return getAspectsForSubDimension(currentNav.subDimensionId);
    }
    if (currentNav.dimensionId) {
      return getAspectsForDimension(currentNav.dimensionId);
    }
    return [];
  }, [currentNav]);

  // Calculate sidebar progress data
  const sidebarDimensions = useMemo(() => {
    return navItems.map((nav) => {
      let assessedCount = 0;
      const totalCount = nav.aspectCount;
      let avgScore: number | null = null;

      // For organizational aspects, calculate per-aspect progress
      if (nav.isOrganizational && nav.organizationalType && nav.aspectId) {
        const aspectRating = ratings.find(
          (r) => r.dimensionId === nav.organizationalType && r.aspectId === nav.aspectId
        );
        const isAssessed = aspectRating ? aspectRating.currentLevel !== 0 : false;
        const score =
          aspectRating && aspectRating.currentLevel > 0 ? aspectRating.currentLevel : null;

        return {
          dimensionId: nav.organizationalType as OrbitDimensionId, // Cast for sidebar compatibility
          aspectId: nav.aspectId,
          name: nav.name,
          assessedCount: isAssessed ? 1 : 0,
          totalCount: 1,
          averageScore: score,
          isRequired: nav.isRequired,
          isAggregate: false,
          isOrganizational: true,
          organizationalType: nav.organizationalType,
        };
      }

      // For aggregate dimensions, use stored aggregate data from snapshot
      if (
        nav.isAggregate &&
        nav.dimensionId &&
        historyEntry?.aggregateData?.dimensionId === nav.dimensionId
      ) {
        return {
          dimensionId: nav.dimensionId,
          subDimensionId: nav.subDimensionId,
          name: nav.name,
          assessedCount: historyEntry.aggregateData.contributingCount,
          totalCount: historyEntry.aggregateData.contributingCount,
          averageScore: historyEntry.aggregateData.score,
          isRequired: nav.isRequired,
          isAggregate: true,
        };
      }

      const dimRatings = ratings.filter((r) => {
        if (nav.subDimensionId) {
          return r.dimensionId === nav.dimensionId && r.subDimensionId === nav.subDimensionId;
        }
        return r.dimensionId === nav.dimensionId && !r.subDimensionId;
      });

      assessedCount = dimRatings.filter((r) => r.currentLevel !== 0).length;
      const scored = dimRatings.filter((r) => r.currentLevel > 0);
      if (scored.length > 0) {
        avgScore = scored.reduce((sum, r) => sum + r.currentLevel, 0) / scored.length;
      }

      return {
        dimensionId: nav.dimensionId,
        subDimensionId: nav.subDimensionId,
        name: nav.name,
        assessedCount,
        totalCount,
        averageScore: avgScore,
        isRequired: nav.isRequired,
        isAggregate: nav.isAggregate,
      };
    });
  }, [navItems, ratings, historyEntry?.aggregateData]);

  // Calculate overall progress
  const totalAspects = navItems.reduce((sum, nav) => sum + nav.aspectCount, 0);
  const assessedCount = ratings.filter((r) => r.currentLevel !== 0).length;
  const overallProgress = totalAspects > 0 ? Math.round((assessedCount / totalAspects) * 100) : 0;

  // Navigation handler
  const handleDimensionSelect = useCallback(
    (dimensionId: OrbitDimensionId, subDimensionId?: TechnologySubDimensionId) => {
      // For organizational assessments, dimensionId is actually the aspectId
      if (organizationalSections) {
        const index = navItems.findIndex(
          (nav) => nav.isOrganizational && nav.aspectId === (dimensionId as string)
        );
        if (index >= 0) {
          setCurrentNavIndex(index);
        }
        return;
      }

      const index = navItems.findIndex(
        (nav) => nav.dimensionId === dimensionId && nav.subDimensionId === subDimensionId
      );
      if (index >= 0) {
        setCurrentNavIndex(index);
      }
    },
    [navItems, organizationalSections]
  );

  // Format date
  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Loading state
  if (!historyEntry || !capabilityInfo || !currentNav) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
        }}
      >
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading history...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'grey.50',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Typography
            variant="body2"
            color="primary"
            sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
            onClick={() => navigate('/dashboard')}
          >
            ← Back to Dashboard
          </Typography>
        </Box>
        <Typography variant="h5" component="h1">
          {capabilityInfo.domain.name} → {capabilityInfo.area.name}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
          <Chip label="Historical Snapshot" size="small" color="secondary" />
          <Typography variant="body2" color="text.secondary">
            {formatDate(historyEntry.snapshotDate)}
          </Typography>
          <Typography variant="body2" fontWeight={600}>
            Score: {historyEntry.overallScore.toFixed(1)}
          </Typography>
          {historyEntry.tags.map((tag) => (
            <Chip key={tag} label={tag} size="small" variant="outlined" />
          ))}
        </Box>
      </Box>

      {/* View Mode Alert */}
      <Alert severity="info" sx={{ borderRadius: 0 }}>
        Historical View — This is a read-only snapshot from {formatDate(historyEntry.snapshotDate)}
      </Alert>

      {/* Main Content */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <AssessmentSidebar
          overallScore={historyEntry.overallScore}
          overallProgress={overallProgress}
          dimensions={sidebarDimensions}
          currentDimensionId={currentNav.dimensionId ?? (currentNav.aspectId as OrbitDimensionId)}
          currentSubDimensionId={currentNav.subDimensionId}
          currentAspectId={currentNav.aspectId}
          onDimensionSelect={handleDimensionSelect}
          onReviewSelect={() => {}}
          isReviewSelected={false}
          showFinalize={false}
          isOrganizationalAssessment={organizationalSections !== null}
        />

        {/* Main Content Area */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {currentNav.isAggregate && currentNav.dimensionId && historyEntry.aggregateData ? (
            <AggregateDimensionView
              dimensionId={currentNav.dimensionId}
              dimensionName={currentNav.name}
              aggregateData={{
                score: historyEntry.aggregateData.score,
                contributingCount: historyEntry.aggregateData.contributingCount,
                assessmentIds: historyEntry.aggregateData.contributingAssessmentIds,
                breakdown: [], // Historical view doesn't show breakdown details
              }}
            />
          ) : (
            <DimensionPage
              dimensionId={
                currentNav.dimensionId ?? (currentNav.organizationalType as OrbitDimensionId)
              }
              subDimensionId={currentNav.subDimensionId}
              dimensionName={currentNav.name}
              dimensionDescription={currentNav.description}
              isRequired={currentNav.isRequired}
              aspects={currentAspects}
              ratings={ratingsMap}
              attachments={new Map()}
              onLevelChange={() => Promise.resolve()}
              onTargetLevelChange={() => Promise.resolve()}
              onQuestionChange={() => Promise.resolve()}
              onEvidenceChange={() => Promise.resolve()}
              onNotesChange={() => Promise.resolve()}
              onBarriersChange={() => Promise.resolve()}
              onPlansChange={() => Promise.resolve()}
              onAttachmentUpload={() => Promise.resolve()}
              onAttachmentDelete={() => Promise.resolve()}
              onAttachmentDownload={() => Promise.resolve()}
              disabled={true}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
}
