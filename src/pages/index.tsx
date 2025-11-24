import Head from 'next/head';

import LandingPage from '../components/layout/LandingPage';

/**
 * Home page - displays the landing page component
 */
export default function Home() {
  return (
    <>
      <Head>
        <title>MITA State Self-Assessment Tool</title>
        <meta
          name="description"
          content="Assess the maturity of your Medicaid systems using the MITA NextGen capability-based framework"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <LandingPage />
    </>
  );
}
