import React from 'react';

import styles from './PrototypeBanner.module.css';

/**
 * Banner component that explains the prototype status and iterative development approach
 */
const PrototypeBanner: React.FC = () => {
  return (
    <div className={`${styles.banner} ds-u-padding--2`}>
      <div className={styles.bannerContent}>
        <div className={`${styles.bannerIcon} ds-u-margin-right--2`}>⚠️</div>
        <div className={styles.bannerText}>
          <strong>Minimum Lovable Prototype:</strong> This tool is under active development using{' '}
          <a
            href="https://guides.18f.org/agile/18f-agile-approach/"
            target="_blank"
            rel="noopener noreferrer"
          >
            18F's agile approach
          </a>
          . Content and workflows are placeholders while MITA workstreams finalize the maturity
          model and framework details.
          <strong>
            Your feedback drives our improvements—
            <a
              href="https://github.com/naretakis/mita-state-self-assessment-tool"
              target="_blank"
              rel="noopener noreferrer"
            >
              explore our repo
            </a>{' '}
            or{' '}
            <a
              href="https://github.com/naretakis/mita-state-self-assessment-tool/issues"
              target="_blank"
              rel="noopener noreferrer"
            >
              share feedback
            </a>
            .
          </strong>
        </div>
      </div>
    </div>
  );
};

export default PrototypeBanner;
