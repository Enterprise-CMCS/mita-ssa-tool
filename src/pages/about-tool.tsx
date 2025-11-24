import React from 'react';

import Head from 'next/head';
import Link from 'next/link';

/**
 * About Tool page - provides information about the tool development and contribution
 */
const AboutTool: React.FC = () => {
  return (
    <>
      <Head>
        <title>Tool Guide & Development - MITA State Self-Assessment Tool</title>
        <meta
          name="description"
          content="Learn how this tool works, our open source development approach, and how to contribute"
        />
      </Head>

      <div className="ds-base">
        <div className="ds-l-container ds-u-padding-y--4">
          <main role="main" className="ds-l-row ds-u-justify-content--center">
            <div className="ds-l-col--12 ds-l-md-col--10 ds-l-lg-col--8">
              <header className="ds-u-margin-bottom--6 ds-u-text-align--center">
                <h1 className="ds-display--1 ds-u-margin-bottom--3 ds-u-color--primary">
                  Tool Guide & Development
                </h1>
                <p className="ds-text--lead ds-u-measure--wide">
                  How this tool works, our open source approach, and ways to contribute
                </p>
              </header>

              <section className="ds-u-margin-bottom--6">
                <h2 className="ds-h2 ds-u-margin-bottom--3">What is This Tool?</h2>
                <p className="ds-u-margin-bottom--3">
                  The MITA State Self-Assessment Tool is a modern, browser-based application that
                  helps state Medicaid agencies assess the maturity of their systems using the MITA
                  NextGen capability-based framework. Unlike traditional assessment tools, this
                  application works entirely in your browser with no server required.
                </p>

                <h3 className="ds-h3 ds-u-margin-bottom--2">Key Capabilities</h3>
                <ul className="ds-c-list ds-u-margin-bottom--4">
                  <li>
                    <strong>Browser-Based:</strong> Works entirely in your browser with local data
                    storage
                  </li>
                  <li>
                    <strong>MITA NextGen Integration:</strong> Full integration with the
                    capability-based ORBIT framework
                  </li>
                  <li>
                    <strong>Guided Assessment:</strong> Step-by-step workflow with decision tree
                    navigation
                  </li>
                  <li>
                    <strong>Comprehensive Reporting:</strong> PDF and CSV exports with interactive
                    visualizations
                  </li>
                  <li>
                    <strong>Privacy-First:</strong> Your data never leaves your browser
                  </li>
                </ul>
              </section>

              <section className="ds-u-margin-bottom--6">
                <h2 className="ds-h2 ds-u-margin-bottom--3">Our Development Approach</h2>
                <p className="ds-u-margin-bottom--3">
                  This tool is being developed using a modern, open-source approach that prioritizes
                  accessibility, usability, and community collaboration.
                </p>

                <div className="ds-l-row ds-u-margin-bottom--4">
                  <div className="ds-l-col--12 ds-l-md-col--6 ds-u-margin-bottom--3">
                    <div className="ds-c-card ds-u-padding--3">
                      <h3 className="ds-h4 ds-u-margin-bottom--2">Modern Technology Stack</h3>
                      <ul className="ds-c-list ds-u-margin-bottom--0">
                        <li>Next.js with TypeScript</li>
                        <li>CMS Design System</li>
                        <li>Browser storage (localStorage/IndexedDB)</li>
                        <li>GitHub Pages deployment</li>
                      </ul>
                    </div>
                  </div>
                  <div className="ds-l-col--12 ds-l-md-col--6 ds-u-margin-bottom--3">
                    <div className="ds-c-card ds-u-padding--3">
                      <h3 className="ds-h4 ds-u-margin-bottom--2">Development Principles</h3>
                      <ul className="ds-c-list ds-u-margin-bottom--0">
                        <li>Accessibility-first design</li>
                        <li>No server dependencies</li>
                        <li>Incremental implementation</li>
                        <li>Community-driven development</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <h3 className="ds-h3 ds-u-margin-bottom--2">Multi-Environment Deployment</h3>
                <p className="ds-u-margin-bottom--3">
                  We maintain three parallel environments to support continuous development:
                </p>
                <ul className="ds-c-list ds-u-margin-bottom--4">
                  <li>
                    <strong>Production:</strong> Stable releases for end users
                  </li>
                  <li>
                    <strong>Development:</strong> Latest features and improvements
                  </li>
                  <li>
                    <strong>Testing:</strong> Experimental features and testing
                  </li>
                </ul>
              </section>

              <section className="ds-u-margin-bottom--6">
                <h2 className="ds-h2 ds-u-margin-bottom--3">Open Source & Community</h2>
                <p className="ds-u-margin-bottom--3">
                  This project follows an open-source approach to enable community contributions and
                  transparency. We believe that better tools come from collaborative development.
                </p>

                <div className="ds-c-alert ds-c-alert--lightweight ds-u-margin-bottom--4">
                  <div className="ds-c-alert__body">
                    <h3 className="ds-c-alert__heading">Get Involved</h3>
                    <p className="ds-c-alert__text ds-u-margin-bottom--3">
                      Whether you're a developer, state agency user, or interested in MITA
                      assessments, there are ways to contribute to this project.
                    </p>
                    <div className="ds-l-row">
                      <div className="ds-l-col--12 ds-l-sm-col--6 ds-u-margin-bottom--2">
                        <a
                          href="https://github.com/naretakis/mita-state-self-assessment-tool"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ds-c-button ds-c-button--primary ds-u-display--block"
                        >
                          View on GitHub
                          <span className="ds-u-visibility--screen-reader">
                            {' '}
                            (opens in new tab)
                          </span>
                        </a>
                      </div>
                      <div className="ds-l-col--12 ds-l-sm-col--6">
                        <a
                          href="https://github.com/naretakis/mita-state-self-assessment-tool/blob/main/CONTRIBUTING.md"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ds-c-button ds-c-button--transparent ds-u-display--block"
                        >
                          Contributing Guide
                          <span className="ds-u-visibility--screen-reader">
                            {' '}
                            (opens in new tab)
                          </span>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                <h3 className="ds-h3 ds-u-margin-bottom--2">Ways to Contribute</h3>
                <div className="ds-l-row">
                  <div className="ds-l-col--12 ds-l-md-col--6 ds-u-margin-bottom--3">
                    <h4 className="ds-h5 ds-u-margin-bottom--1">For Developers</h4>
                    <ul className="ds-c-list">
                      <li>Submit bug fixes and feature improvements</li>
                      <li>Enhance accessibility and usability</li>
                      <li>Improve documentation</li>
                      <li>Add test coverage</li>
                    </ul>
                  </div>
                  <div className="ds-l-col--12 ds-l-md-col--6 ds-u-margin-bottom--3">
                    <h4 className="ds-h5 ds-u-margin-bottom--1">For Users</h4>
                    <ul className="ds-c-list">
                      <li>Report bugs and usability issues</li>
                      <li>Suggest feature improvements</li>
                      <li>Share feedback from pilot testing</li>
                      <li>Contribute to user documentation</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section className="ds-u-margin-bottom--6">
                <h2 className="ds-h2 ds-u-margin-bottom--3">Project Status</h2>
                <p className="ds-u-margin-bottom--3">
                  We're currently working toward a Minimum Lovable Product (MLP) with core
                  functionality targeted for September 2025. The tool already includes guided
                  assessment workflows, comprehensive reporting, and multi-environment deployment.
                </p>

                <div className="ds-c-alert ds-c-alert--warn ds-c-alert--lightweight">
                  <div className="ds-c-alert__body">
                    <h3 className="ds-c-alert__heading">Development Status</h3>
                    <p className="ds-c-alert__text">
                      This tool is actively under development. While core functionality is working,
                      we're continuously adding features and improvements based on user feedback.
                    </p>
                  </div>
                </div>
              </section>

              <section className="ds-u-text-align--center ds-u-padding-top--4 ds-u-border-top--1">
                <h2 className="ds-h2 ds-u-margin-bottom--3 ds-u-color--primary">
                  Ready to Try It?
                </h2>
                <p className="ds-u-margin-bottom--4 ds-u-measure--wide">
                  Start your MITA assessment or explore the tool's capabilities.
                </p>
                <div className="ds-l-row ds-u-justify-content--center">
                  <div className="ds-l-col--12 ds-l-sm-col--6 ds-l-md-col--4 ds-u-margin-bottom--2">
                    <Link
                      href="/dashboard"
                      className="ds-c-button ds-c-button--primary ds-c-button--big ds-u-display--block"
                    >
                      Get Started
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

export default AboutTool;
