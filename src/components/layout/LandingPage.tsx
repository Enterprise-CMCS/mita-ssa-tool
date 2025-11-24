import React from 'react';

import Link from 'next/link';

interface LandingPageProps {
  className?: string;
}

/**
 * Landing page component for the MITA State Self-Assessment Tool
 * Provides welcome message, tool overview, and navigation options
 */
const LandingPage: React.FC<LandingPageProps> = ({ className = '' }) => {
  return (
    <div className={`ds-base ${className}`}>
      <div className="ds-l-container ds-u-padding-y--4">
        <main role="main" className="ds-l-row ds-u-justify-content--center">
          <div className="ds-l-col--12 ds-l-md-col--10 ds-l-lg-col--8">
            {/* Header Section */}
            <header className="ds-u-text-align--center ds-u-margin-bottom--6 ds-u-padding-top--4">
              <h1 className="ds-display--1 ds-u-margin-bottom--3 ds-u-color--primary">
                MITA State Self-Assessment Tool
              </h1>
              <p className="ds-text--lead ds-u-margin-bottom--4 ds-u-measure--wide">
                Assess the maturity of your Medicaid systems using the MITA NextGen capability-based
                framework. This browser-based tool helps state agencies evaluate their systems
                across key capability areas and generate actionable reports.
              </p>
            </header>

            {/* Navigation Actions */}
            <section
              className="ds-u-text-align--center ds-u-margin-bottom--6 landing-page-actions"
              aria-labelledby="actions-heading"
            >
              <h2 id="actions-heading" className="ds-u-visibility--screen-reader">
                Get Started Options
              </h2>
              <div className="ds-l-row ds-u-justify-content--center">
                <div className="ds-l-col--12 ds-l-sm-col--6 ds-l-md-col--4 ds-u-margin-bottom--3">
                  <Link
                    href="/dashboard"
                    className="ds-c-button ds-c-button--primary ds-c-button--big ds-u-display--block"
                  >
                    Get Started
                  </Link>
                  <p className="ds-text--small ds-u-margin-top--2 ds-u-margin-bottom--0">
                    Begin a new assessment or manage existing ones
                  </p>
                </div>
                <div className="ds-l-col--12 ds-l-sm-col--6 ds-l-md-col--4 ds-u-margin-bottom--3">
                  <Link
                    href="/about-tool"
                    className="ds-c-button ds-c-button--transparent ds-c-button--big ds-u-display--block"
                  >
                    About This Tool
                  </Link>
                  <p className="ds-text--small ds-u-margin-top--2 ds-u-margin-bottom--0">
                    How the SS-A tool works, and how we're building it open source
                  </p>
                </div>
                <div className="ds-l-col--12 ds-l-sm-col--6 ds-l-md-col--4 ds-u-margin-bottom--3">
                  <a
                    href="https://cmsgov.github.io/Medicaid-Information-Technology-Architecture-MITA-4/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ds-c-button ds-c-button--transparent ds-c-button--big ds-u-display--block"
                  >
                    <span>About MITA</span>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 12 12"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M10.5 1.5h-3v1h1.793L4.146 7.646l.708.708L10 3.207V5h1V1.5z" />
                      <path d="M9 9H3V3h3V2H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1-1V6H9v3z" />
                    </svg>
                  </a>
                  <p className="ds-text--small ds-u-margin-top--2 ds-u-margin-bottom--0">
                    Learn about the MITA NextGen framework
                  </p>
                </div>
              </div>
            </section>

            {/* Additional Information */}
            <section className="ds-u-margin-bottom--6" aria-labelledby="info-heading">
              <h2 id="info-heading" className="ds-u-visibility--screen-reader">
                Additional Information
              </h2>
              <div className="ds-c-alert ds-c-alert--lightweight">
                <div className="ds-c-alert__body">
                  <h3 className="ds-c-alert__heading">Browser-Based Tool</h3>
                  <p className="ds-c-alert__text">
                    This tool works entirely in your browser with no server required. Your
                    assessment data is stored locally and never transmitted to external servers.
                    <strong>
                      {' '}
                      Note: Clearing your browser history or data will remove your saved
                      assessments.
                    </strong>
                  </p>
                </div>
              </div>
            </section>

            {/* Key Features */}
            <section className="ds-u-margin-bottom--6" aria-labelledby="features-heading">
              <h2
                id="features-heading"
                className="ds-h2 ds-u-text-align--center ds-u-margin-bottom--4"
              >
                Key Features
              </h2>
              <div className="ds-l-row">
                <div className="ds-l-col--12 ds-l-md-col--6 ds-u-margin-bottom--3">
                  <div className="ds-c-card ds-u-padding--3">
                    <h3 className="ds-h4 ds-u-margin-bottom--2">Capability-Based Assessment</h3>
                    <p className="ds-u-margin-bottom--0">
                      Evaluate your systems using the MITA NextGen framework across Outcome, Role,
                      Business Process, Information, and Technology dimensions.
                    </p>
                  </div>
                </div>
                <div className="ds-l-col--12 ds-l-md-col--6 ds-u-margin-bottom--3">
                  <div className="ds-c-card ds-u-padding--3">
                    <h3 className="ds-h4 ds-u-margin-bottom--2">Local Data Storage</h3>
                    <p className="ds-u-margin-bottom--0">
                      Your assessment data is stored locally in your browser, ensuring privacy while
                      allowing you to save and resume your work.
                    </p>
                  </div>
                </div>
                <div className="ds-l-col--12 ds-l-md-col--6 ds-u-margin-bottom--3">
                  <div className="ds-c-card ds-u-padding--3">
                    <h3 className="ds-h4 ds-u-margin-bottom--2">Guided Workflow</h3>
                    <p className="ds-u-margin-bottom--0">
                      Step-by-step assessment process with decision tree navigation and contextual
                      guidance throughout your evaluation.
                    </p>
                  </div>
                </div>
                <div className="ds-l-col--12 ds-l-md-col--6 ds-u-margin-bottom--3">
                  <div className="ds-c-card ds-u-padding--3">
                    <h3 className="ds-h4 ds-u-margin-bottom--2">Actionable Reports</h3>
                    <p className="ds-u-margin-bottom--0">
                      Generate comprehensive PDF and CSV reports with maturity visualizations and
                      improvement recommendations.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
};

export default LandingPage;
