import React from 'react';

import Head from 'next/head';
import { useRouter } from 'next/router';

import AssessmentSetup from '../../components/assessment/AssessmentSetup';

/**
 * New Assessment page - Assessment setup and creation
 */
const NewAssessment: React.FC = () => {
  const router = useRouter();

  const handleAssessmentCreated = (assessmentId: string) => {
    // Navigate to the assessment page
    router.push(`/assessment/${assessmentId}`);
  };

  return (
    <>
      <Head>
        <title>New Assessment - MITA State Self-Assessment Tool</title>
        <meta
          name="description"
          content="Create a new MITA assessment by selecting capability domains and areas"
        />
      </Head>

      <AssessmentSetup onAssessmentCreated={handleAssessmentCreated} />
    </>
  );
};

export default NewAssessment;
