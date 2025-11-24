import React from 'react';

import Head from 'next/head';

import { UserDashboard } from '../components/dashboard/UserDashboard';
import { StorageProvider } from '../components/storage/StorageProvider';

/**
 * Dashboard page with storage provider wrapper
 */
const Dashboard: React.FC = () => {
  return (
    <>
      <Head>
        <title>Dashboard - MITA State Self-Assessment Tool</title>
        <meta name="description" content="Manage your MITA assessments" />
      </Head>

      <div className="ds-base">
        <div className="ds-u-padding-y--4">
          <main role="main">
            <StorageProvider>
              <UserDashboard />
            </StorageProvider>
          </main>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
