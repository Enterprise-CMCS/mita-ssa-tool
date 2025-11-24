import React from 'react';

import Head from 'next/head';
import Link from 'next/link';

/**
 * About MITA page - provides information about the MITA framework
 */
const AboutMITA: React.FC = () => {
  return (
    <>
      <Head>
        <title>About MITA - MITA State Self-Assessment Tool</title>
        <meta
          name="description"
          content="Learn about the MITA NextGen capability-based framework"
        />
      </Head>

      <div className="ds-base">
        <div className="ds-l-container ds-u-padding-y--4">
          <main role="main" className="ds-l-row ds-u-justify-content--center">
            <div className="ds-l-col--12 ds-l-md-col--10 ds-l-lg-col--8">
              <header className="ds-u-margin-bottom--6 ds-u-text-align--center">
                <h1 className="ds-display--1 ds-u-margin-bottom--3 ds-u-color--primary">
                  About MITA
                </h1>
                <p className="ds-text--lead ds-u-measure--wide">
                  Understanding the MITA NextGen capability-based framework
                </p>
              </header>

              <section className="ds-u-margin-bottom--6">
                <h2 className="ds-h2 ds-u-margin-bottom--3">What is MITA?</h2>
                <p className="ds-u-margin-bottom--3">
                  The Medicaid Information Technology Architecture (MITA) is a national framework to
                  support improved systems development and health information exchange for the
                  Medicaid enterprise. MITA provides a foundation for improved program
                  administration, beneficiary health outcomes, and provider satisfaction.
                </p>

                <h3 className="ds-h3 ds-u-margin-bottom--2">MITA NextGen Framework</h3>
                <p className="ds-u-margin-bottom--3">
                  The MITA NextGen framework uses a capability-based approach organized around five
                  key dimensions known as ORBIT:
                </p>

                <ul className="ds-c-list ds-u-margin-bottom--4">
                  <li>
                    <strong>Outcome:</strong> Business results and objectives
                  </li>
                  <li>
                    <strong>Role:</strong> Who performs functions and responsibilities
                  </li>
                  <li>
                    <strong>Business Process:</strong> Workflows and procedures
                  </li>
                  <li>
                    <strong>Information:</strong> Data structure and sharing
                  </li>
                  <li>
                    <strong>Technology:</strong> Technical implementation
                  </li>
                </ul>

                <h3 className="ds-h3 ds-u-margin-bottom--2">Maturity Levels</h3>
                <p className="ds-u-margin-bottom--3">
                  Each capability is assessed across maturity levels from 1 (Initial) to 5
                  (Optimized), helping states understand their current state and plan for
                  improvements.
                </p>
              </section>

              <section className="ds-u-margin-bottom--6">
                <div className="ds-c-alert ds-c-alert--lightweight">
                  <div className="ds-c-alert__body">
                    <h3 className="ds-c-alert__heading">Learn More</h3>
                    <p className="ds-c-alert__text ds-u-margin-bottom--3">
                      For comprehensive information about MITA, visit the official CMS website.
                    </p>
                    <a
                      href="https://www.medicaid.gov/medicaid/data-systems/mita/index.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ds-c-button ds-c-button--primary"
                    >
                      Visit Official MITA Site
                      <span className="ds-u-visibility--screen-reader"> (opens in new tab)</span>
                    </a>
                  </div>
                </div>
              </section>

              <section className="ds-u-text-align--center ds-u-padding-top--4 ds-u-border-top--1">
                <h2 className="ds-h2 ds-u-margin-bottom--3 ds-u-color--primary">
                  Ready to Get Started?
                </h2>
                <p className="ds-u-margin-bottom--4 ds-u-measure--wide">
                  Use this tool to assess your Medicaid systems against the MITA framework and
                  identify opportunities for improvement.
                </p>
                <div className="ds-l-row ds-u-justify-content--center">
                  <div className="ds-l-col--12 ds-l-sm-col--6 ds-l-md-col--4 ds-u-margin-bottom--2">
                    <Link
                      href="/dashboard"
                      className="ds-c-button ds-c-button--primary ds-c-button--big ds-u-display--block"
                    >
                      Getting Started
                    </Link>
                  </div>
                  <div className="ds-l-col--12 ds-l-sm-col--6 ds-l-md-col--4">
                    <Link
                      href="/"
                      className="ds-c-button ds-c-button--transparent ds-c-button--big ds-u-display--block"
                    >
                      Back to Home
                    </Link>
                  </div>
                </div>
              </section>
            </div>
          </main>
        </div>
      </div>
    </>
  );
};

export default AboutMITA;
