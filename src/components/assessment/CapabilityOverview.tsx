import React from 'react';

import { useAnnouncements } from '../../hooks/useAnnouncements';
import { useKeyboardNavigation } from '../../hooks/useKeyboardNavigation';

import type { CapabilityAreaAssessment, CapabilityDefinition } from '../../types';

interface CapabilityOverviewProps {
  capability: CapabilityAreaAssessment;
  definition: CapabilityDefinition;
  onNext: () => Promise<void>;
  onPrevious?: () => Promise<void>;
}

const CapabilityOverview: React.FC<CapabilityOverviewProps> = ({
  capability: _capability,
  definition,
  onNext,
  onPrevious,
}) => {
  const { containerRef } = useKeyboardNavigation({
    onEnter: onNext,
  });
  const { announceSuccess } = useAnnouncements();

  const handleNext = async () => {
    announceSuccess(`Starting assessment for ${definition.capabilityAreaName}`);
    await onNext();
  };
  return (
    <div className="ds-l-row ds-u-justify-content--center" ref={containerRef}>
      <div className="ds-l-col--12 ds-l-lg-col--10">
        <header className="ds-u-margin-bottom--6">
          <h1 className="ds-h2 ds-u-margin-bottom--2 ds-u-color--primary">
            Domain: {definition.capabilityDomainName}
          </h1>
          <p className="ds-text--lead ds-u-margin-bottom--4" id="domain-description">
            {definition.domainDescription}
          </p>

          <h2 className="ds-h3 ds-u-margin-bottom--2 ds-u-color--primary">
            Capability Area: {definition.capabilityAreaName}
          </h2>
          <p className="ds-text--lead" id="area-description">
            {definition.areaDescription}
          </p>
        </header>

        <div className="ds-c-card ds-u-margin-bottom--6">
          <div className="ds-c-card__body">
            <h2 className="ds-h3 ds-u-margin-bottom--3" id="assessment-overview">
              Assessment Overview
            </h2>
            <p className="ds-u-margin-bottom--4">
              You will assess this capability area across five ORBIT dimensions. Each dimension
              represents a different aspect of your system's maturity:
            </p>
            <div className="ds-l-row">
              <div className="ds-l-col--12 ds-l-md-col--6">
                <ul className="ds-c-list ds-c-list--bare" aria-labelledby="orbit-dimensions-1">
                  <h3 className="sr-only" id="orbit-dimensions-1">
                    ORBIT Dimensions Part 1
                  </h3>
                  <li className="ds-u-margin-bottom--2">
                    <strong className="ds-u-color--primary">Outcomes:</strong> Business results and
                    objectives
                  </li>
                  <li className="ds-u-margin-bottom--2">
                    <strong className="ds-u-color--primary">Roles:</strong> Who performs functions
                    and responsibilities
                  </li>
                  <li className="ds-u-margin-bottom--2">
                    <strong className="ds-u-color--primary">Business Processes:</strong> Workflows
                    and procedures
                  </li>
                </ul>
              </div>
              <div className="ds-l-col--12 ds-l-md-col--6">
                <ul className="ds-c-list ds-c-list--bare" aria-labelledby="orbit-dimensions-2">
                  <h3 className="sr-only" id="orbit-dimensions-2">
                    ORBIT Dimensions Part 2
                  </h3>
                  <li className="ds-u-margin-bottom--2">
                    <strong className="ds-u-color--primary">Information:</strong> Data structure and
                    sharing
                  </li>
                  <li className="ds-u-margin-bottom--2">
                    <strong className="ds-u-color--primary">Technology:</strong> Technical
                    implementation
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="ds-c-alert ds-c-alert--lightweight ds-u-margin-bottom--6">
          <div className="ds-c-alert__body">
            <h3 className="ds-c-alert__heading">Getting Started Tips</h3>
            <ul className="ds-c-alert__text ds-c-list">
              <li>
                Attest with an honest assessment - select the maturity level that best aligns with
                your knowledge
              </li>
              <li>Provide written details that support your maturity level selections</li>
              <li>Document barriers and challenges you face</li>
              <li>Include advancement plans for areas needing improvement</li>
              <li>Your responses are automatically saved as you proceed through the tool</li>
            </ul>
            <br />
            <h4 className="ds-c-alert__heading">Materials You May Need</h4>
            <ul className="ds-c-alert__text ds-c-list">
              <li>Subject matter experts who know the business areas</li>
              <li>Standard operating procedures</li>
              <li>Policy and technical manuals</li>
              <li>SLA documentation</li>
              <li>Links (URLs) to internal and external resources</li>
              <li>Operating workbooks</li>
              <li>Vendor SMEs</li>
              <li>Workflow and system diagrams</li>
              <li>Prior MITA State Self-Assessments</li>
              <li>Other relevant documents</li>
            </ul>
          </div>
        </div>

        <nav className="assessment-navigation" aria-label="Capability overview navigation">
          {onPrevious ? (
            <button
              type="button"
              className="ds-c-button ds-c-button--transparent"
              onClick={onPrevious}
              aria-label="Go to previous capability"
            >
              ← Previous
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            className="ds-c-button ds-c-button--primary"
            onClick={handleNext}
            aria-describedby="assessment-overview"
            aria-label={`Begin assessment for ${definition.capabilityAreaName}`}
          >
            Begin Assessment →
          </button>
        </nav>
      </div>
    </div>
  );
};

export default CapabilityOverview;
