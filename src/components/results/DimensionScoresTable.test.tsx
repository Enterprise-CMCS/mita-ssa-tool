/**
 * DimensionScoresTable Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DimensionScoresTable from './DimensionScoresTable';
import { getOrganizationalAspect } from '../../services/orbit';
import type {
  DimensionScore,
  AspectScore,
  OrbitRating,
  Attachment,
  OrganizationalAssessmentId,
} from '../../types';

describe('DimensionScoresTable', () => {
  const mockOnDownloadAttachment = vi.fn();

  const createAspectScore = (
    aspectId: string,
    aspectName: string,
    currentLevel: number,
    isAssessed: boolean = true
  ): AspectScore => ({
    aspectId,
    aspectName,
    dimensionId: 'businessArchitecture',
    currentLevel: currentLevel as AspectScore['currentLevel'],
    isAssessed,
  });

  const createDimensionScore = (
    dimensionId: string,
    dimensionName: string,
    averageLevel: number | null,
    aspectScores: AspectScore[] = []
  ): DimensionScore => ({
    dimensionId: dimensionId as DimensionScore['dimensionId'],
    dimensionName,
    required: dimensionId !== 'outcomes' && dimensionId !== 'roles',
    averageLevel,
    aspectScores,
  });

  const defaultProps = {
    ratings: [] as OrbitRating[],
    attachments: [] as Attachment[],
    onDownloadAttachment: mockOnDownloadAttachment,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render table headers', () => {
    const scores: DimensionScore[] = [
      createDimensionScore('businessArchitecture', 'Business Architecture', 3.5),
    ];

    render(<DimensionScoresTable dimensionScores={scores} {...defaultProps} />);

    expect(screen.getByText('Dimension')).toBeInTheDocument();
    expect(screen.getByText('Aspects Assessed')).toBeInTheDocument();
    expect(screen.getByText('Average Score')).toBeInTheDocument();
  });

  it('should render dimension names', () => {
    const scores: DimensionScore[] = [
      createDimensionScore('businessArchitecture', 'Business Architecture', 3.5),
      createDimensionScore('information', 'Information', 4.0),
    ];

    render(<DimensionScoresTable dimensionScores={scores} {...defaultProps} />);

    expect(screen.getByText('Business Architecture')).toBeInTheDocument();
    expect(screen.getByText('Information')).toBeInTheDocument();
  });

  it('should render dimension scores', () => {
    const scores: DimensionScore[] = [
      createDimensionScore('businessArchitecture', 'Business Architecture', 3.5),
      createDimensionScore('information', 'Information', 4.2),
    ];

    render(<DimensionScoresTable dimensionScores={scores} {...defaultProps} />);

    expect(screen.getByText('3.5')).toBeInTheDocument();
    expect(screen.getByText('4.2')).toBeInTheDocument();
  });

  it('should handle null scores', () => {
    const scores: DimensionScore[] = [
      createDimensionScore('businessArchitecture', 'Business Architecture', null),
    ];

    render(<DimensionScoresTable dimensionScores={scores} {...defaultProps} />);

    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('should render both required and optional dimensions', () => {
    const scores: DimensionScore[] = [
      createDimensionScore('businessArchitecture', 'Business Architecture', 3.5),
      createDimensionScore('outcomes', 'Outcomes', 3.0),
    ];

    render(<DimensionScoresTable dimensionScores={scores} {...defaultProps} />);

    expect(screen.getByText('Business Architecture')).toBeInTheDocument();
    expect(screen.getByText('Outcomes')).toBeInTheDocument();
  });

  it('should handle empty scores array', () => {
    render(<DimensionScoresTable dimensionScores={[]} {...defaultProps} />);

    // Should render table structure without data rows
    expect(screen.getByText('Dimension')).toBeInTheDocument();
    expect(screen.getByText('Dimension Scores')).toBeInTheDocument();
  });

  it('should display aspect count', () => {
    const scores: DimensionScore[] = [
      createDimensionScore('businessArchitecture', 'Business Architecture', 3.5, [
        createAspectScore('aspect-1', 'Process Standardization', 4),
        createAspectScore('aspect-2', 'Enterprise Alignment', 3),
        createAspectScore('aspect-3', 'Not Assessed', 0, false),
      ]),
    ];

    render(<DimensionScoresTable dimensionScores={scores} {...defaultProps} />);

    // Should show 2/3 (2 assessed out of 3 total)
    expect(screen.getByText('2/3')).toBeInTheDocument();
  });

  it('should handle technology dimension with sub-dimensions', () => {
    const techScore: DimensionScore = {
      dimensionId: 'technology',
      dimensionName: 'Technology',
      required: true,
      averageLevel: 3.5,
      aspectScores: [
        createAspectScore('aspect-1', 'Aspect 1', 3),
        createAspectScore('aspect-2', 'Aspect 2', 4),
      ],
      subDimensionScores: [
        {
          subDimensionId: 'technologyInfrastructureManagement',
          subDimensionName: 'Technical Infrastructure Management',
          averageLevel: 3.0,
          aspectScores: [createAspectScore('infra-1', 'Infra Aspect', 3)],
        },
        {
          subDimensionId: 'applicationManagement',
          subDimensionName: 'Application Management',
          averageLevel: 4.0,
          aspectScores: [createAspectScore('int-1', 'Int Aspect', 4)],
        },
      ],
    };

    render(<DimensionScoresTable dimensionScores={[techScore]} {...defaultProps} />);

    expect(screen.getByText('Technology')).toBeInTheDocument();
    expect(screen.getByText('3.5')).toBeInTheDocument();
  });

  it('should expand technology dimension to show sub-dimensions', async () => {
    const user = userEvent.setup();
    const techScore: DimensionScore = {
      dimensionId: 'technology',
      dimensionName: 'Technology',
      required: true,
      averageLevel: 3.5,
      aspectScores: [],
      subDimensionScores: [
        {
          subDimensionId: 'technologyInfrastructureManagement',
          subDimensionName: 'Technical Infrastructure Management',
          averageLevel: 3.0,
          aspectScores: [],
        },
      ],
    };

    render(<DimensionScoresTable dimensionScores={[techScore]} {...defaultProps} />);

    // Click to expand
    await user.click(screen.getByText('Technology'));

    // Sub-dimension should be visible (prefixed with arrow indicator)
    expect(screen.getByText(/Technical Infrastructure Management/)).toBeInTheDocument();
  });

  it('should render with ratings data', () => {
    const scores: DimensionScore[] = [
      createDimensionScore('businessArchitecture', 'Business Architecture', 3.5, [
        createAspectScore('aspect-1', 'Process Standardization', 4),
      ]),
    ];

    const ratings: OrbitRating[] = [
      {
        id: 'rating-1',
        capabilityAssessmentId: 'assessment-1',
        dimensionId: 'businessArchitecture',
        aspectId: 'aspect-1',
        currentLevel: 4,
        questionResponses: [],
        evidenceResponses: [],
        notes: 'Test notes',
        barriers: '',
        plans: '',
        carriedForward: false,
        attachmentIds: [],
        updatedAt: new Date(),
      },
    ];

    render(
      <DimensionScoresTable
        dimensionScores={scores}
        ratings={ratings}
        attachments={[]}
        onDownloadAttachment={mockOnDownloadAttachment}
      />
    );

    expect(screen.getByText('Business Architecture')).toBeInTheDocument();
  });

  it('should handle attachments', () => {
    const scores: DimensionScore[] = [
      createDimensionScore('businessArchitecture', 'Business Architecture', 3.5),
    ];

    const attachments: Attachment[] = [
      {
        id: 'attachment-1',
        capabilityAssessmentId: 'assessment-1',
        orbitRatingId: 'rating-1',
        fileName: 'test-file.pdf',
        fileType: 'application/pdf',
        fileSize: 1024,
        blob: new Blob(),
        uploadedAt: new Date(),
      },
    ];

    render(
      <DimensionScoresTable
        dimensionScores={scores}
        ratings={[]}
        attachments={attachments}
        onDownloadAttachment={mockOnDownloadAttachment}
      />
    );

    expect(screen.getByText('Business Architecture')).toBeInTheDocument();
  });

  /**
   * Regression: OBS-1. The aspect-name lookup branched on a hand-written
   * 'outcomes' | 'roles' union, so 'enterprise-architecture' ratings fell through
   * to the standard-dimension lookup, resolved to undefined, and rendered raw
   * kebab-case aspect IDs. All three organizational sections must resolve names.
   */
  describe('organizational aspect names (OBS-1)', () => {
    const cases: Array<{
      section: OrganizationalAssessmentId;
      sectionName: string;
      aspectId: string;
      expectedName: string;
    }> = [
      {
        section: 'outcomes',
        sectionName: 'Organizational Outcomes',
        aspectId: 'use-of-metrics',
        expectedName: 'Use of Metrics',
      },
      {
        section: 'roles',
        sectionName: 'Organizational Roles',
        aspectId: 'governance-standardization',
        expectedName: 'Governance & Standardization',
      },
      {
        section: 'enterprise-architecture',
        sectionName: 'Organizational Enterprise Architecture',
        aspectId: 'strategic-planning',
        expectedName: 'Strategic Planning',
      },
    ];

    it.each(cases)(
      'resolves the aspect name for the $section section',
      async ({ section, sectionName, aspectId, expectedName }) => {
        // Sanity-check the fixture against the live ORBIT model so a model
        // rename fails loudly here instead of silently weakening the test.
        expect(getOrganizationalAspect(section, aspectId)?.name).toBe(expectedName);

        const scores: DimensionScore[] = [
          {
            dimensionId: section,
            dimensionName: sectionName,
            required: true,
            averageLevel: 3,
            aspectScores: [
              {
                aspectId,
                aspectName: expectedName,
                dimensionId: section,
                currentLevel: 3,
                isAssessed: true,
              },
            ],
          },
        ];

        const ratings: OrbitRating[] = [
          {
            id: `rating-${aspectId}`,
            capabilityAssessmentId: 'assessment-1',
            dimensionId: section,
            aspectId,
            currentLevel: 3,
            questionResponses: [],
            evidenceResponses: [],
            notes: '',
            barriers: '',
            plans: '',
            carriedForward: false,
            attachmentIds: [],
            updatedAt: new Date(),
          },
        ];

        render(
          <DimensionScoresTable dimensionScores={scores} {...defaultProps} ratings={ratings} />
        );

        // The expand affordance is the clickable row itself, not a button
        // (see OBS-24 — it is not keyboard reachable).
        await userEvent.click(screen.getByText(sectionName));

        expect(screen.getByText(expectedName)).toBeInTheDocument();
        expect(screen.queryByText(aspectId)).not.toBeInTheDocument();
      }
    );
  });
});
