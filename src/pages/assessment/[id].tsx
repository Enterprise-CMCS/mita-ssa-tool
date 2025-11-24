import React from 'react';

import Head from 'next/head';
import { useRouter } from 'next/router';

import { GuidedAssessment } from '../../components/assessment';

/**
 * Assessment detail page - guided assessment walkthrough
 */
const AssessmentDetail: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;

  if (!id || typeof id !== 'string') {
    return (
      <>
        <Head>
          <title>Assessment - MITA State Self-Assessment Tool</title>
          <meta name="description" content="MITA assessment not found" />
        </Head>
        <div className="ds-base">
          <div className="ds-l-container ds-u-padding-y--4">
            <div className="ds-c-alert ds-c-alert--error">
              <div className="ds-c-alert__body">
                <h2 className="ds-c-alert__heading">Assessment Not Found</h2>
                <p className="ds-c-alert__text">The requested assessment could not be found.</p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Assessment - MITA State Self-Assessment Tool</title>
        <meta name="description" content="Complete your MITA assessment" />
      </Head>

      <GuidedAssessment assessmentId={id} />
    </>
  );
};

export default AssessmentDetail;
