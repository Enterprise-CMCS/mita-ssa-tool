import React, { useEffect, useRef, useState } from 'react';

import { useAnnouncements } from '../../hooks/useAnnouncements';
import { useKeyboardNavigation } from '../../hooks/useKeyboardNavigation';
import { ScoringService } from '../../services/ScoringService';

// Create a singleton instance
const scoringService = new ScoringService();

import type {
  CapabilityAreaAssessment,
  CapabilityDefinition,
  DimensionAssessment as DimensionData,
  OrbitDimension,
} from '../../types';

interface DimensionAssessmentProps {
  capability: CapabilityAreaAssessment;
  definition: CapabilityDefinition;
  dimension: OrbitDimension;
  onUpdate: (data: Partial<DimensionData>) => void;
  onNext: () => Promise<void>;
  onPrevious: () => Promise<void>;
  onSave: () => Promise<void>;
}

const DIMENSION_LABELS: Record<OrbitDimension, string> = {
  outcome: 'Outcomes',
  role: 'Roles',
  businessProcess: 'Business Processes',
  information: 'Information',
  technology: 'Technology',
};

const DimensionAssessment: React.FC<DimensionAssessmentProps> = ({
  capability,
  definition,
  dimension,
  onUpdate,
  onNext,
  onPrevious,
  onSave: _onSave,
}) => {
  const [formData, setFormData] = useState(capability.dimensions[dimension]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  // Accessibility hooks
  const { containerRef } = useKeyboardNavigation({
    onArrowKeys: direction => {
      if (direction === 'up' || direction === 'down') {
        // Navigate between maturity level options
        const currentLevel = formData.maturityLevel;
        if (direction === 'up' && currentLevel > 1) {
          handleInputChange('maturityLevel', currentLevel - 1);
        } else if (direction === 'down' && currentLevel < 5) {
          handleInputChange('maturityLevel', currentLevel + 1);
        }
      }
    },
  });

  // Type assertion to fix the ref type mismatch
  const divRef = containerRef as React.RefObject<HTMLDivElement>;
  const { announceError, announceSuccess } = useAnnouncements();

  useEffect(() => {
    setFormData(capability.dimensions[dimension]);
  }, [capability, dimension]);

  const handleInputChange = (field: keyof DimensionData, value: string | number) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onUpdate(updatedData);

    if (validationError && field === 'maturityLevel' && Number(value) > 0) {
      setValidationError(null);
      announceSuccess(`Maturity level ${value} selected`);
    }
  };

  const handleCheckboxChange = (levelKey: string, itemIndex: number, checked: boolean) => {
    const checkboxKey = `${levelKey}-${itemIndex}`;
    const updatedCheckboxes = { ...formData.checkboxes, [checkboxKey]: checked };
    const updatedData = { ...formData, checkboxes: updatedCheckboxes };
    setFormData(updatedData);
    onUpdate(updatedData);
  };

  // Check if user should be prompted to advance to next maturity level
  const shouldShowLevelAdvancement = () => {
    if (!dimensionDefinition?.checkboxItems) {
      return false;
    }

    const checkboxItems = dimensionDefinition.checkboxItems;
    return scoringService.shouldPromptLevelAdvancement(formData, checkboxItems);
  };

  // Get the next maturity level name for the advancement prompt
  const getNextLevelName = () => {
    const levelLabels = ['Ad Hoc', 'Compliant', 'Efficient', 'Optimized', 'Pioneering'];
    const nextLevel = formData.maturityLevel + 1;
    if (nextLevel <= 5) {
      return `Level ${nextLevel}: ${levelLabels[nextLevel - 1]}`;
    }
    return null;
  };

  const validateForm = (): boolean => {
    if (formData.maturityLevel === 0) {
      const errorMessage = 'Please select a maturity level to continue.';
      setValidationError(errorMessage);
      announceError(errorMessage);

      // Focus the first maturity level option
      setTimeout(() => {
        const firstOption = document.getElementById('maturity-1');
        if (firstOption) {
          firstOption.focus();
        }
      }, 100);

      return false;
    }
    setValidationError(null);
    return true;
  };

  const handleNext = async () => {
    if (validateForm()) {
      await onNext();
    }
  };

  const handlePrevious = async () => {
    await onPrevious();
  };

  const dimensionDefinition = definition.dimensions[dimension];
  const maturityLevels = dimensionDefinition?.maturityLevels;

  return (
    <div className="ds-l-row ds-u-justify-content--center" ref={divRef}>
      <div className="ds-l-col--12 ds-l-lg-col--10">
        <header className="ds-u-margin-bottom--6">
          <h1 className="ds-display--1 ds-u-margin-bottom--2 ds-u-color--primary">
            {definition.capabilityDomainName}
          </h1>
          <h2 className="ds-h2 ds-u-margin-bottom--2 ds-u-color--primary">
            {definition.capabilityAreaName}
          </h2>
          <div className="ds-c-alert ds-c-alert--lightweight ds-u-margin-bottom--4">
            <div className="ds-c-alert__body">
              <h3 className="ds-h3 ds-u-margin-bottom--2 ds-u-color--primary">
                {DIMENSION_LABELS[dimension]} Assessment
              </h3>
              <p className="ds-text ds-u-margin-bottom--0">{dimensionDefinition?.description}</p>
            </div>
          </div>
        </header>

        {validationError && (
          <div
            ref={errorRef}
            className="ds-c-alert ds-c-alert--warn ds-u-margin-bottom--4"
            role="alert"
            aria-live="assertive"
          >
            <div className="ds-c-alert__body">
              <h2 className="ds-c-alert__heading">Validation Error</h2>
              <p className="ds-c-alert__text">{validationError}</p>
            </div>
          </div>
        )}

        <form className="ds-u-margin-bottom--6">
          <fieldset className="ds-c-fieldset ds-u-margin-bottom--6">
            <legend className="ds-c-label ds-u-margin-bottom--3">
              Maturity Level Selection{' '}
              <span className="ds-u-color--error" aria-label="required">
                *
              </span>
            </legend>
            <div className="ds-c-field__hint ds-u-margin-bottom--4">
              Select the maturity level that best describes your current state for this dimension.
            </div>

            <div className="ds-u-margin-bottom--4">
              {maturityLevels && Object.keys(maturityLevels).length > 0 ? (
                <div className="maturity-level-grid">
                  {Object.entries(maturityLevels).map(([level, description]) => {
                    const levelNumber = parseInt(level.replace('level', ''));
                    // The description contains the full content, we need to extract just the description part
                    // and create the level name based on the content structure
                    const levelLabels = [
                      'Ad Hoc',
                      'Compliant',
                      'Efficient',
                      'Optimized',
                      'Pioneering',
                    ];
                    const levelName = `Level ${levelNumber}: ${levelLabels[levelNumber - 1]}`;
                    const isSelected = formData.maturityLevel === levelNumber;
                    return (
                      <label
                        key={level}
                        htmlFor={`maturity-${levelNumber}`}
                        className={`maturity-level-card ${isSelected ? 'selected' : ''}`}
                        style={{
                          display: 'block',
                          padding: '1rem',
                          border: `2px solid ${isSelected ? '#00a91c' : '#d6d7d9'}`,
                          borderRadius: '4px',
                          backgroundColor: isSelected ? '#f8fff9' : '#fff',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: isSelected ? '0 2px 8px rgba(0, 169, 28, 0.15)' : 'none',
                          minHeight: '44px',
                          position: 'relative',
                        }}
                        onMouseEnter={e => {
                          if (!isSelected) {
                            e.currentTarget.style.borderColor = '#0071bc';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 113, 188, 0.1)';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                          }
                        }}
                        onMouseLeave={e => {
                          if (!isSelected) {
                            e.currentTarget.style.borderColor = '#d6d7d9';
                            e.currentTarget.style.boxShadow = 'none';
                            e.currentTarget.style.transform = 'translateY(0)';
                          }
                        }}
                        onKeyDown={e => {
                          // Only handle keyboard events if the target is the label itself, not child elements
                          if (
                            e.target === e.currentTarget &&
                            (e.key === 'Enter' || e.key === ' ')
                          ) {
                            e.preventDefault();
                            handleInputChange('maturityLevel', levelNumber);
                          }
                        }}
                        onFocus={e => {
                          e.currentTarget.style.outline = '2px solid #0071bc';
                          e.currentTarget.style.outlineOffset = '2px';
                        }}
                        onBlur={e => {
                          e.currentTarget.style.outline = 'none';
                        }}
                        tabIndex={0}
                      >
                        <input
                          type="radio"
                          id={`maturity-${levelNumber}`}
                          name="maturityLevel"
                          value={levelNumber}
                          checked={isSelected}
                          onChange={e =>
                            handleInputChange('maturityLevel', parseInt(e.target.value))
                          }
                          aria-describedby={`maturity-${levelNumber}-desc`}
                          style={{
                            position: 'absolute',
                            opacity: 0,
                            width: '1px',
                            height: '1px',
                            overflow: 'hidden',
                            clip: 'rect(0, 0, 0, 0)',
                          }}
                        />
                        <div
                          style={{
                            marginBottom: '0.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                          }}
                        >
                          <strong style={{ fontSize: '1.125rem', color: '#212121' }}>
                            {levelName}
                          </strong>
                          {isSelected && (
                            <span style={{ color: '#00a91c', fontSize: '1.25rem' }}>✓</span>
                          )}
                        </div>
                        <div
                          id={`maturity-${levelNumber}-desc`}
                          style={{ fontSize: '0.875rem', color: '#5c5c5c', lineHeight: '1.4' }}
                        >
                          {description && description.trim()
                            ? description.split('\n').map((line, idx) => {
                                if (line.trim().startsWith('- [ ]')) {
                                  return null; // Skip checkbox lines in description
                                }
                                return (
                                  <div key={idx}>
                                    {line}
                                    {idx < description.split('\n').length - 1 && <br />}
                                  </div>
                                );
                              })
                            : 'No description available'}
                        </div>
                        {isSelected &&
                          dimensionDefinition?.checkboxItems?.[
                            `level${levelNumber}` as keyof typeof dimensionDefinition.checkboxItems
                          ] && (
                            <div style={{ marginTop: '1rem', paddingLeft: '0.5rem' }}>
                              {dimensionDefinition.checkboxItems[
                                `level${levelNumber}` as keyof typeof dimensionDefinition.checkboxItems
                              ]?.map((item, itemIndex) => {
                                const checkboxKey = `level${levelNumber}-${itemIndex}`;
                                const isChecked = formData.checkboxes?.[checkboxKey] || false;
                                return (
                                  <label
                                    key={itemIndex}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'flex-start',
                                      gap: '0.5rem',
                                      marginBottom: '0.5rem',
                                      fontSize: '0.875rem',
                                      cursor: 'pointer',
                                      maxWidth: '100%',
                                      wordWrap: 'break-word',
                                    }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={e =>
                                        handleCheckboxChange(
                                          `level${levelNumber}`,
                                          itemIndex,
                                          e.target.checked
                                        )
                                      }
                                      style={{
                                        marginTop: '0.125rem',
                                        flexShrink: 0,
                                        minWidth: '16px',
                                        width: '16px',
                                        height: '16px',
                                      }}
                                    />
                                    <span
                                      style={{
                                        lineHeight: '1.4',
                                        flex: '1',
                                        wordBreak: 'break-word',
                                        overflowWrap: 'break-word',
                                        color: '#212121',
                                      }}
                                    >
                                      {item}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        {isSelected && (
                          <div
                            style={{
                              marginTop: '1.5rem',
                              paddingTop: '1rem',
                              borderTop: '1px solid #e6e6e6',
                            }}
                          >
                            <h4
                              style={{
                                fontSize: '1rem',
                                fontWeight: '600',
                                marginBottom: '1rem',
                                color: '#212121',
                              }}
                            >
                              Maturity Details for {levelName}
                            </h4>
                            <div
                              style={{
                                fontSize: '0.75rem',
                                color: '#5c5c5c',
                                marginBottom: '1rem',
                                padding: '0.5rem',
                                backgroundColor: '#f8f9fa',
                                borderRadius: '4px',
                                border: '1px solid #dee2e6',
                              }}
                            >
                              <strong>Note:</strong> These details apply to your selected maturity
                              level ({levelName}). Only checkboxes from your selected level
                              contribute to your final score.
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                              <label
                                htmlFor={`evidence-${levelNumber}`}
                                style={{
                                  display: 'block',
                                  fontSize: '0.875rem',
                                  fontWeight: '600',
                                  marginBottom: '0.25rem',
                                  color: '#212121',
                                }}
                              >
                                Supporting Description
                              </label>
                              <div
                                style={{
                                  fontSize: '0.75rem',
                                  color: '#5c5c5c',
                                  marginBottom: '0.5rem',
                                }}
                              >
                                Provide specific examples, documentation, or evidence that supports
                                your maturity level selection.
                              </div>
                              <textarea
                                id={`evidence-${levelNumber}`}
                                className="ds-c-field"
                                rows={3}
                                value={formData.evidence}
                                onChange={e => handleInputChange('evidence', e.target.value)}
                                placeholder="Describe the evidence that supports your selected maturity level..."
                                style={{ fontSize: '0.875rem', width: '100%' }}
                              />
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                              <label
                                htmlFor={`barriers-${levelNumber}`}
                                style={{
                                  display: 'block',
                                  fontSize: '0.875rem',
                                  fontWeight: '600',
                                  marginBottom: '0.25rem',
                                  color: '#212121',
                                }}
                              >
                                Barriers and Challenges
                              </label>
                              <div
                                style={{
                                  fontSize: '0.75rem',
                                  color: '#5c5c5c',
                                  marginBottom: '0.5rem',
                                }}
                              >
                                Describe any barriers, challenges, or limitations that prevent
                                higher maturity levels.
                              </div>
                              <textarea
                                id={`barriers-${levelNumber}`}
                                className="ds-c-field"
                                rows={3}
                                value={formData.barriers}
                                onChange={e => handleInputChange('barriers', e.target.value)}
                                placeholder="Describe barriers or challenges you face..."
                                style={{ fontSize: '0.875rem', width: '100%' }}
                              />
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                              <label
                                htmlFor={`plans-${levelNumber}`}
                                style={{
                                  display: 'block',
                                  fontSize: '0.875rem',
                                  fontWeight: '600',
                                  marginBottom: '0.25rem',
                                  color: '#212121',
                                }}
                              >
                                Outcomes-Based Advancement Plans
                              </label>
                              <div
                                style={{
                                  fontSize: '0.75rem',
                                  color: '#5c5c5c',
                                  marginBottom: '0.5rem',
                                }}
                              >
                                Describe your plans or strategies for advancing to higher maturity
                                levels.
                              </div>
                              <textarea
                                id={`plans-${levelNumber}`}
                                className="ds-c-field"
                                rows={3}
                                value={formData.plans}
                                onChange={e => handleInputChange('plans', e.target.value)}
                                placeholder="Describe your plans for improvement..."
                                style={{ fontSize: '0.875rem', width: '100%' }}
                              />
                            </div>

                            <div style={{ marginBottom: '0' }}>
                              <label
                                htmlFor={`notes-${levelNumber}`}
                                style={{
                                  display: 'block',
                                  fontSize: '0.875rem',
                                  fontWeight: '600',
                                  marginBottom: '0.25rem',
                                  color: '#212121',
                                }}
                              >
                                Additional Notes
                              </label>
                              <div
                                style={{
                                  fontSize: '0.75rem',
                                  color: '#5c5c5c',
                                  marginBottom: '0.5rem',
                                }}
                              >
                                Any additional context, considerations, or notes for this dimension.
                              </div>
                              <textarea
                                id={`notes-${levelNumber}`}
                                className="ds-c-field"
                                rows={3}
                                value={formData.notes}
                                onChange={e => handleInputChange('notes', e.target.value)}
                                placeholder="Additional notes or context..."
                                style={{ fontSize: '0.875rem', width: '100%' }}
                              />
                            </div>
                          </div>
                        )}
                      </label>
                    );
                  })}
                </div>
              ) : (
                <div className="ds-c-alert ds-c-alert--warn">
                  <div className="ds-c-alert__body">
                    <p className="ds-c-alert__text">
                      Maturity level definitions are not available. Please check the content
                      loading.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </fieldset>

          {/* Level Advancement Prompt */}
          {shouldShowLevelAdvancement() && getNextLevelName() && (
            <div
              className="ds-c-alert ds-c-alert--success ds-u-margin-bottom--4"
              role="alert"
              aria-live="polite"
              aria-label="Level advancement suggestion"
            >
              <div className="ds-c-alert__body">
                <h3 className="ds-c-alert__heading">🎉 Great Progress!</h3>
                <p className="ds-c-alert__text ds-u-margin-bottom--2">
                  You've completed all checkboxes for your current maturity level. Consider whether
                  your organization might be ready for <strong>{getNextLevelName()}</strong>.
                </p>
                <p
                  className="ds-c-alert__text ds-u-margin-bottom--0"
                  style={{ fontSize: '0.875rem', color: '#5c5c5c' }}
                >
                  Review the {getNextLevelName()} description above to see if it better reflects
                  your current capabilities.
                </p>
              </div>
            </div>
          )}
        </form>

        <nav
          className="assessment-navigation ds-u-margin-bottom--6"
          aria-label="Assessment navigation"
        >
          <button
            type="button"
            className="ds-c-button ds-c-button--transparent"
            onClick={handlePrevious}
            aria-label="Go to previous step"
          >
            ← Previous
          </button>

          <button
            type="button"
            className="ds-c-button ds-c-button--primary"
            onClick={handleNext}
            aria-label="Continue to next step"
          >
            Next →
          </button>
        </nav>
      </div>
    </div>
  );
};

export default DimensionAssessment;
