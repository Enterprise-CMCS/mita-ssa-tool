/**
 * Clean Detailed Results Component
 * Improved layout without inline styles, following UX best practices
 */

import { useState } from 'react';

import type { EnhancedMaturityScore } from '../../services/ScoringService';
import type { Assessment } from '../../types';

interface CleanDetailedResultsProps {
  assessment: Assessment;
  scores: EnhancedMaturityScore[];
}

export function CleanDetailedResults({ assessment, scores }: CleanDetailedResultsProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (capabilityId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(capabilityId)) {
        newSet.delete(capabilityId);
      } else {
        newSet.add(capabilityId);
      }
      return newSet;
    });
  };

  if (scores.length === 0) {
    return (
      <div className="ds-c-alert ds-c-alert--warn">
        <div className="ds-c-alert__body">
          <h3 className="ds-c-alert__heading">Assessment Not Started</h3>
          <p className="ds-c-alert__text">
            This assessment has {assessment?.capabilities?.length || 0} capability areas selected,
            but no maturity levels have been set yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="ds-u-margin-bottom--2">
      <h2 className="ds-h2 ds-u-margin-bottom--2 ds-u-color--base">Detailed Results</h2>

      {scores.map((score, index) => {
        const capability = assessment?.capabilities.find(
          cap => cap.capabilityAreaName === score.capabilityArea
        );
        const capabilityId = capability?.id || `capability-${index}`;
        const isExpanded = expandedSections.has(capabilityId);

        return (
          <div
            key={capabilityId}
            className="ds-u-margin-bottom--2"
            style={{
              border: isExpanded ? '2px solid #0071bc' : '1px solid #d6d7d9',
              borderRadius: '4px',
              transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
              boxShadow: isExpanded
                ? '0 2px 8px rgba(0, 113, 188, 0.1)'
                : '0 1px 3px rgba(0, 0, 0, 0.05)',
              backgroundColor: '#ffffff',
            }}
          >
            <button
              type="button"
              className="ds-u-width--full ds-u-border--0 ds-u-text-align--left ds-u-cursor--pointer ds-u-padding--2"
              onClick={() => toggleSection(capabilityId)}
              aria-expanded={isExpanded}
              aria-controls={`details-${capabilityId}`}
              style={{
                backgroundColor: 'transparent',
                borderRadius: '4px',
                transition: 'background-color 0.2s ease',
                minHeight: '48px',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = '#f8f9fa';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <div className="ds-u-display--flex ds-u-align-items--center">
                {/* Expand/Collapse Icon */}
                <div
                  className="ds-u-display--flex ds-u-align-items--center ds-u-justify-content--center"
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: isExpanded ? '#0071bc' : '#e6f1f8',
                    color: isExpanded ? '#ffffff' : '#0071bc',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    transition: 'all 0.2s ease',
                    flexShrink: 0,
                    marginRight: '12px',
                  }}
                >
                  {isExpanded ? '−' : '+'}
                </div>

                {/* Content - All in one line */}
                <span
                  className="ds-u-font-weight--bold"
                  style={{ color: '#212121', fontSize: '16px', marginRight: '12px' }}
                >
                  {score.capabilityArea}
                </span>
                <span
                  className="ds-u-font-weight--bold"
                  style={{
                    color: '#0071bc',
                    fontSize: '16px',
                    marginLeft: 'auto',
                  }}
                >
                  {score.overallScore.toFixed(1)} out of 5.0
                </span>
              </div>
            </button>

            {isExpanded && (
              <div
                id={`details-${capabilityId}`}
                className="ds-u-padding--2"
                style={{
                  borderTop: '1px solid #e6f1f8',
                  backgroundColor: '#fafbfc',
                }}
              >
                {/* Score Breakdown */}
                <div className="ds-u-margin-bottom--2">
                  <h4 className="ds-h5 ds-u-margin-bottom--1" style={{ color: '#212121' }}>
                    Score Breakdown
                  </h4>
                  <div
                    className="ds-u-padding--2 ds-u-border-radius--sm"
                    style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #d6d7d9',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                    }}
                  >
                    <div className="ds-u-display--flex ds-u-justify-content--between ds-u-margin-bottom--0">
                      <span className="ds-text--small ds-u-color--base">
                        Average Maturity Level:
                      </span>
                      <strong className="ds-text--small ds-u-color--base">
                        {score.baseScore.toFixed(1)}
                      </strong>
                    </div>
                    <div className="ds-u-display--flex ds-u-justify-content--between ds-u-margin-bottom--0">
                      <span className="ds-text--small ds-u-color--base">Checkbox Bonus:</span>
                      <strong
                        className={`ds-text--small ${score.partialCredit > 0 ? 'ds-u-color--success' : 'ds-u-color--base'}`}
                      >
                        +{score.partialCredit.toFixed(2)}
                      </strong>
                    </div>
                    <div className="ds-u-display--flex ds-u-justify-content--between ds-u-border-top--1 ds-u-padding-top--1 ds-u-margin-top--1">
                      <span className="ds-text--small ds-u-color--base">
                        <strong>Overall Score:</strong>
                      </span>
                      <strong className="ds-u-color--primary ds-text--small">
                        {score.overallScore.toFixed(2)}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* ORBIT Dimension Scores */}
                <div className="ds-u-margin-bottom--2">
                  <h4 className="ds-h5 ds-u-margin-bottom--1" style={{ color: '#212121' }}>
                    ORBIT Dimension Scores
                  </h4>
                  <div className="ds-l-row">
                    {Object.entries(score.dimensionScores).map(([dimension, dimScore]) => {
                      const dimensionLabels = {
                        outcome: 'Outcomes',
                        role: 'Roles',
                        businessProcess: 'Business Process',
                        information: 'Information',
                        technology: 'Technology',
                      };

                      return (
                        <div
                          key={dimension}
                          className="ds-l-col--12 ds-l-md-col--6 ds-l-lg-col--4 ds-u-margin-bottom--1"
                        >
                          <div
                            className="ds-u-padding--1 ds-u-border-radius--sm"
                            style={{
                              minHeight: '60px',
                              backgroundColor: '#ffffff',
                              border: '1px solid #d6d7d9',
                              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                            }}
                          >
                            <h5 className="ds-text--small ds-u-margin-bottom--0 ds-u-font-weight--bold ds-u-color--base">
                              {dimensionLabels[dimension as keyof typeof dimensionLabels]}
                            </h5>
                            <div className="ds-u-display--flex ds-u-justify-content--between ds-u-align-items--center">
                              <div className="ds-text ds-u-font-weight--bold ds-u-color--success">
                                {dimScore.finalScore.toFixed(2)}
                              </div>
                              <div className="ds-u-text-align--right">
                                {dimScore.partialCredit > 0 && (
                                  <div className="ds-text--small ds-u-color--muted">
                                    L{dimScore.maturityLevel} +{dimScore.partialCredit.toFixed(2)}
                                  </div>
                                )}
                                {dimScore.checkboxCompletion.total > 0 && (
                                  <div className="ds-text--small ds-u-color--muted">
                                    {dimScore.checkboxCompletion.completed}/
                                    {dimScore.checkboxCompletion.total}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Assessment Details */}
                {capability && (
                  <div>
                    <h4 className="ds-h5 ds-u-margin-bottom--1" style={{ color: '#212121' }}>
                      Assessment Details
                    </h4>
                    {Object.entries(capability.dimensions).map(([dimension, dimData]) => {
                      const dimensionLabels = {
                        outcome: 'Outcomes',
                        role: 'Roles',
                        businessProcess: 'Business Process',
                        information: 'Information',
                        technology: 'Technology',
                      };

                      const hasContent =
                        dimData.evidence || dimData.barriers || dimData.plans || dimData.notes;

                      if (!hasContent) {
                        return null;
                      }

                      return (
                        <div key={dimension} className="ds-u-margin-bottom--1">
                          <h5 className="ds-text--small ds-u-margin-bottom--0 ds-u-color--primary ds-u-font-weight--bold">
                            {dimensionLabels[dimension as keyof typeof dimensionLabels]}
                          </h5>

                          <div
                            className="ds-u-padding--2 ds-u-border-left--3 ds-u-border-radius--sm"
                            style={{
                              backgroundColor: '#ffffff',
                              borderLeftColor: '#0071bc',
                              border: '1px solid #d6d7d9',
                              borderLeftWidth: '3px',
                              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                            }}
                          >
                            {dimData.evidence && (
                              <div className="ds-u-margin-bottom--1">
                                <strong className="ds-text--small ds-u-display--block ds-u-margin-bottom--0 ds-u-color--base">
                                  Supporting Attestation:
                                </strong>
                                <p className="ds-text--small ds-u-margin--0 ds-u-color--muted">
                                  {dimData.evidence}
                                </p>
                              </div>
                            )}

                            {dimData.barriers && (
                              <div className="ds-u-margin-bottom--1">
                                <strong className="ds-text--small ds-u-display--block ds-u-margin-bottom--0 ds-u-color--base">
                                  Barriers and Challenges:
                                </strong>
                                <p className="ds-text--small ds-u-margin--0 ds-u-color--muted">
                                  {dimData.barriers}
                                </p>
                              </div>
                            )}

                            {dimData.plans && (
                              <div className="ds-u-margin-bottom--1">
                                <strong className="ds-text--small ds-u-display--block ds-u-margin-bottom--0 ds-u-color--base">
                                  Outcomes-Based Advancement Plans:
                                </strong>
                                <p className="ds-text--small ds-u-margin--0 ds-u-color--muted">
                                  {dimData.plans}
                                </p>
                              </div>
                            )}

                            {dimData.notes && (
                              <div>
                                <strong className="ds-text--small ds-u-display--block ds-u-margin-bottom--0 ds-u-color--base">
                                  Additional Notes:
                                </strong>
                                <p className="ds-text--small ds-u-margin--0 ds-u-color--muted">
                                  {dimData.notes}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
