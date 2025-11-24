import React, { useEffect, useState } from 'react';

import { useRouter } from 'next/router';

import { useErrorHandler } from '../../hooks/useErrorHandler';
import { ContentService } from '../../services/ContentService';
import enhancedStorageService from '../../services/EnhancedStorageService';
import styles from '../../styles/AssessmentSetup.module.css';

import AssessmentErrorBoundary from './AssessmentErrorBoundary';
import StorageErrorHandler from './StorageErrorHandler';

import type { Assessment, CapabilityAreaAssessment, CapabilityDefinition } from '../../types';

interface AssessmentSetupProps {
  onAssessmentCreated?: (assessmentId: string) => void;
}

interface DomainSelection {
  name: string;
  selected: boolean;
  areas: CapabilityDefinition[];
}

interface CapabilitySelection {
  id: string;
  domainName: string;
  areaName: string;
  selected: boolean;
}

const AssessmentSetup: React.FC<AssessmentSetupProps> = ({ onAssessmentCreated }) => {
  const router = useRouter();
  const [stateName, setStateName] = useState('');
  const [systemName, setSystemName] = useState('');
  const [capabilities, setCapabilities] = useState<CapabilityDefinition[]>([]);
  const [domains, setDomains] = useState<DomainSelection[]>([]);
  const [selections, setSelections] = useState<CapabilitySelection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());
  const errorHandler = useErrorHandler();

  useEffect(() => {
    loadCapabilities();
  }, []);

  const loadCapabilities = async () => {
    try {
      setLoading(true);
      setError(null);

      const contentService = new ContentService('/content');
      await contentService.initialize();
      const loadedCapabilities = contentService.getAllCapabilities();

      setCapabilities(loadedCapabilities);

      const groupedCapabilities = loadedCapabilities.reduce(
        (groups, capability) => {
          const domain = capability.capabilityDomainName;
          if (!groups[domain]) {
            groups[domain] = [];
          }
          groups[domain].push(capability);
          return groups;
        },
        {} as Record<string, CapabilityDefinition[]>
      );

      const initialDomains: DomainSelection[] = [
        ...Object.entries(groupedCapabilities).map(([name, areas]) => ({
          name,
          selected: false,
          areas,
        })),
        { name: 'Claims Processing', selected: false, areas: [] },
        { name: 'Financial Management', selected: false, areas: [] },
        { name: 'Eligibility and Enrollment', selected: false, areas: [] },
      ];

      setDomains(initialDomains);

      const initialSelections: CapabilitySelection[] = loadedCapabilities.map(cap => ({
        id: cap.id,
        domainName: cap.capabilityDomainName,
        areaName: cap.capabilityAreaName,
        selected: false,
      }));

      setSelections(initialSelections);
    } catch (err) {
      console.error('Failed to load capabilities:', err);
      setError('Failed to load capability definitions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectionChange = (capabilityId: string, selected: boolean) => {
    setSelections(prev =>
      prev.map(selection =>
        selection.id === capabilityId ? { ...selection, selected } : selection
      )
    );

    if (selected && validationError) {
      setValidationError(null);
    }
  };

  const handleSelectAll = (domainName: string, selected: boolean) => {
    setSelections(prev =>
      prev.map(selection =>
        selection.domainName === domainName ? { ...selection, selected } : selection
      )
    );

    if (selected && validationError) {
      setValidationError(null);
    }
  };

  const validateSelections = (): boolean => {
    const hasSelections = selections.some(selection => selection.selected);

    if (!hasSelections) {
      setValidationError('Please select at least one capability area to proceed.');
      return false;
    }

    if (!stateName.trim()) {
      setValidationError('Please enter a state name.');
      return false;
    }

    setValidationError(null);
    return true;
  };

  const createAssessment = async () => {
    if (!validateSelections()) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      errorHandler.clearError();

      const selectedCapabilities = selections.filter(s => s.selected);
      const assessmentId = `assessment_${Date.now()}`;
      const now = new Date().toISOString();

      const capabilityAssessments: CapabilityAreaAssessment[] = selectedCapabilities.map(
        selection => {
          const capability = capabilities.find(cap => cap.id === selection.id);
          if (!capability) {
            throw new Error(`Capability not found: ${selection.id}`);
          }

          return {
            id: capability.id,
            capabilityDomainName: capability.capabilityDomainName,
            capabilityAreaName: capability.capabilityAreaName,
            status: 'not-started' as const,
            dimensions: {
              outcome: {
                maturityLevel: 0,
                evidence: '',
                barriers: '',
                plans: '',
                notes: '',
                lastUpdated: now,
                checkboxes: {},
              },
              role: {
                maturityLevel: 0,
                evidence: '',
                barriers: '',
                plans: '',
                notes: '',
                lastUpdated: now,
                checkboxes: {},
              },
              businessProcess: {
                maturityLevel: 0,
                evidence: '',
                barriers: '',
                plans: '',
                notes: '',
                lastUpdated: now,
                checkboxes: {},
              },
              information: {
                maturityLevel: 0,
                evidence: '',
                barriers: '',
                plans: '',
                notes: '',
                lastUpdated: now,
                checkboxes: {},
              },
              technology: {
                maturityLevel: 0,
                evidence: '',
                barriers: '',
                plans: '',
                notes: '',
                lastUpdated: now,
                checkboxes: {},
              },
            },
          };
        }
      );

      const assessment: Assessment = {
        id: assessmentId,
        stateName: stateName.trim(),
        createdAt: now,
        updatedAt: now,
        status: 'not-started',
        capabilities: capabilityAssessments,
        metadata: {
          assessmentVersion: '1.0',
          systemName: systemName.trim() || undefined,
          notes: '',
        },
      };

      const success = await enhancedStorageService.saveAssessment(assessment);

      if (!success) {
        throw new Error('Failed to save assessment: Storage operation returned false');
      }

      if (onAssessmentCreated) {
        onAssessmentCreated(assessmentId);
      } else {
        router.push(`/assessment/${assessmentId}`);
      }
    } catch (err) {
      console.error('Failed to create assessment:', err);
      errorHandler.setError(err as Error, {
        operation: 'createAssessment',
        stateName,
        systemName,
        selectedCapabilities: selections.filter(s => s.selected).length,
        timestamp: new Date().toISOString(),
      });
      setError('Failed to create assessment. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getSelectionCount = (domainName?: string) => {
    if (domainName) {
      return selections.filter(s => s.domainName === domainName && s.selected).length;
    }
    return selections.filter(s => s.selected).length;
  };

  const isDomainFullySelected = (domainName: string) => {
    const domainSelections = selections.filter(s => s.domainName === domainName);
    return domainSelections.length > 0 && domainSelections.every(s => s.selected);
  };

  const toggleDomainExpansion = (domainName: string) => {
    setExpandedDomains(prev => {
      const newSet = new Set(prev);
      if (newSet.has(domainName)) {
        newSet.delete(domainName);
      } else {
        newSet.add(domainName);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="ds-base">
        <div className="ds-l-container ds-u-padding-y--4">
          <div className="ds-u-text-align--center">
            <div className="ds-c-spinner" aria-valuetext="Loading capabilities..." />
            <p className="ds-u-margin-top--2">Loading capability definitions...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AssessmentErrorBoundary onRetry={() => window.location.reload()}>
      <div className="ds-base">
        <div className="ds-l-container ds-u-padding-y--4">
          <main role="main" className="ds-l-row ds-u-justify-content--center">
            <div className="ds-l-col--12">
              <header className="ds-u-margin-bottom--6">
                <h1 className="ds-display--1 ds-u-margin-bottom--3 ds-u-color--primary">
                  Assessment Setup
                </h1>
                <p className="ds-text--lead">
                  Choose the capability domains and specific areas you want to assess. Each domain
                  contains related capability areas that address different aspects of your Medicaid
                  system.
                </p>
              </header>

              {/* Show storage error handler if there's a storage error */}
              {errorHandler.isStorageError && errorHandler.error && (
                <StorageErrorHandler
                  error={errorHandler.error.originalError}
                  onRetry={() => errorHandler.retry(createAssessment)}
                  onContinueOffline={() => {
                    errorHandler.clearError();
                    setError(null);
                  }}
                  className="ds-u-margin-bottom--4"
                />
              )}

              {/* Show general error message if not a storage error */}
              {error && !errorHandler.isStorageError && (
                <div className="ds-c-alert ds-c-alert--error ds-u-margin-bottom--4">
                  <div className="ds-c-alert__body">
                    <h2 className="ds-c-alert__heading">Error</h2>
                    <p className="ds-c-alert__text">{error}</p>
                  </div>
                </div>
              )}

              {validationError && (
                <div className="ds-c-alert ds-c-alert--warn ds-u-margin-bottom--4">
                  <div className="ds-c-alert__body">
                    <h2 className="ds-c-alert__heading">Validation Error</h2>
                    <p className="ds-c-alert__text">{validationError}</p>
                  </div>
                </div>
              )}

              <form
                onSubmit={e => {
                  e.preventDefault();
                  createAssessment();
                }}
              >
                <div className="ds-l-row ds-u-margin-bottom--6">
                  <div className="ds-l-col--12 ds-l-md-col--6">
                    <div className="ds-c-field">
                      <label htmlFor="state-name" className="ds-c-label">
                        State Name <span className="ds-u-color--error">*</span>
                      </label>
                      <input
                        type="text"
                        id="state-name"
                        name="state-name"
                        className="ds-c-field"
                        value={stateName}
                        onChange={e => setStateName(e.target.value)}
                        required
                        aria-describedby="state-name-hint"
                      />
                      <div id="state-name-hint" className="ds-c-field__hint">
                        Enter the name of your state for this assessment.
                      </div>
                    </div>
                  </div>
                  <div className="ds-l-col--12 ds-l-md-col--6">
                    <div className="ds-c-field">
                      <label htmlFor="system-name" className="ds-c-label">
                        System Name
                      </label>
                      <input
                        type="text"
                        id="system-name"
                        name="system-name"
                        className="ds-c-field"
                        value={systemName}
                        onChange={e => setSystemName(e.target.value)}
                        aria-describedby="system-name-hint"
                      />
                      <div id="system-name-hint" className="ds-c-field__hint">
                        Enter your unique system name if applicable.
                      </div>
                    </div>
                  </div>
                </div>

                <fieldset className="ds-c-fieldset ds-u-margin-bottom--6">
                  <legend className="ds-c-label">
                    Domain and Capability Selection <span className="ds-u-color--error">*</span>
                  </legend>
                  <div className="ds-c-field__hint ds-u-margin-bottom--4">
                    Select the capability domains and areas you want to assess. You must select at
                    least one area to proceed.
                  </div>

                  <div className="ds-c-alert ds-c-alert--lightweight ds-u-margin-bottom--4">
                    <div className="ds-c-alert__body">
                      <p className="ds-c-alert__text">
                        <strong>
                          {getSelectionCount()} capability area
                          {getSelectionCount() !== 1 ? 's' : ''} selected
                        </strong>{' '}
                        for assessment
                      </p>
                    </div>
                  </div>

                  <div className={styles.capabilityDomains}>
                    {domains.map(domain => (
                      <div key={domain.name} className="ds-u-margin-bottom--4">
                        <div
                          className={`ds-c-card ${styles.domainCard} ${
                            domain.areas.length === 0 ? styles.domainCardDisabled : ''
                          } ${getSelectionCount(domain.name) > 0 ? styles.domainCardSelected : ''}`}
                        >
                          <div className={styles.domainHeader}>
                            <button
                              type="button"
                              className={styles.domainToggle}
                              onClick={() => toggleDomainExpansion(domain.name)}
                              aria-expanded={expandedDomains.has(domain.name)}
                            >
                              <div className={styles.domainTitle}>
                                <h3 className="ds-h4 ds-u-margin--0 ds-u-color--primary">
                                  <span className={styles.expandIcon}>
                                    {expandedDomains.has(domain.name) ? '▼' : '▶'}
                                  </span>
                                  {domain.name} Domain
                                </h3>
                                <div className="ds-u-margin-top--1">
                                  {domain.areas.length > 0 ? (
                                    <>
                                      <span className="ds-text--small ds-u-color--muted">
                                        {domain.areas.length} capability area
                                        {domain.areas.length !== 1 ? 's' : ''}
                                      </span>
                                      {getSelectionCount(domain.name) > 0 && (
                                        <span
                                          className={`ds-text--small ds-u-margin-left--2 ${styles.selectionCount}`}
                                        >
                                          • {getSelectionCount(domain.name)} selected
                                        </span>
                                      )}
                                    </>
                                  ) : (
                                    <span className="ds-text--small ds-u-color--muted">
                                      Coming in future release
                                    </span>
                                  )}
                                </div>
                              </div>
                            </button>
                            <div className={styles.domainActions}>
                              {domain.areas.length > 0 && expandedDomains.has(domain.name) && (
                                <button
                                  type="button"
                                  className="ds-c-button ds-c-button--transparent ds-c-button--small"
                                  onClick={() =>
                                    handleSelectAll(
                                      domain.name,
                                      !isDomainFullySelected(domain.name)
                                    )
                                  }
                                >
                                  {isDomainFullySelected(domain.name)
                                    ? 'Deselect All'
                                    : 'Select All'}
                                </button>
                              )}
                              {domain.areas.length === 0 && (
                                <span className={`${styles.availabilityBadge} ds-text--small`}>
                                  Coming Soon
                                </span>
                              )}
                            </div>
                          </div>

                          {domain.areas.length > 0 && expandedDomains.has(domain.name) && (
                            <div className="ds-u-margin-top--3 ds-u-padding-top--3 ds-u-border-top--1">
                              <div className={styles.areasGrid}>
                                {domain.areas.map(capability => {
                                  const selection = selections.find(s => s.id === capability.id);
                                  return (
                                    <div key={capability.id} className={styles.areaOption}>
                                      <label
                                        htmlFor={`capability-${capability.id}`}
                                        className={`${styles.areaCard} ${
                                          selection?.selected ? styles.areaCardSelected : ''
                                        }`}
                                      >
                                        <div className={styles.areaCardHeader}>
                                          <input
                                            type="checkbox"
                                            id={`capability-${capability.id}`}
                                            name="capabilities"
                                            value={capability.id}
                                            className={styles.areaCheckbox}
                                            checked={selection?.selected || false}
                                            onChange={e =>
                                              handleSelectionChange(capability.id, e.target.checked)
                                            }
                                          />
                                          <div className={styles.areaContent}>
                                            <h4 className={styles.areaTitle}>
                                              {capability.capabilityAreaName}
                                            </h4>
                                            {capability.description && (
                                              <p className={styles.areaDescription}>
                                                {capability.description.substring(0, 100)}
                                                {capability.description.length > 100 ? '...' : ''}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      </label>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {domain.areas.length === 0 && expandedDomains.has(domain.name) && (
                            <div className="ds-u-margin-top--3 ds-u-padding-top--3 ds-u-border-top--1">
                              <p className="ds-u-color--muted ds-u-font-size--sm ds-u-margin--0 ds-u-text-align--center">
                                Capability areas for this domain will be available in future
                                releases.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </fieldset>

                <div className="ds-u-display--flex ds-u-justify-content--between ds-u-align-items--center">
                  <button
                    type="button"
                    className="ds-c-button ds-c-button--transparent"
                    onClick={() => router.push('/dashboard')}
                    disabled={saving}
                  >
                    ← Back to Dashboard
                  </button>

                  <button
                    type="submit"
                    className="ds-c-button ds-c-button--primary"
                    disabled={saving || getSelectionCount() === 0 || !stateName.trim()}
                  >
                    {saving ? (
                      <>
                        <span className="ds-c-spinner ds-c-spinner--small ds-u-margin-right--1" />
                        Creating Assessment...
                      </>
                    ) : (
                      'Create Assessment'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </main>
        </div>
      </div>
    </AssessmentErrorBoundary>
  );
};

export default AssessmentSetup;
