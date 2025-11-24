import React from 'react';

import Head from 'next/head';
import { useRouter } from 'next/router';

import PrototypeBanner from '../common/PrototypeBanner';

import styles from './Layout.module.css';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

/**
 * Main layout component for the application
 * Provides consistent header and footer across pages
 */
const Layout: React.FC<LayoutProps> = ({ children, title = 'MITA State Self-Assessment Tool' }) => {
  const router = useRouter();
  const basePath = router.basePath || '';

  return (
    <div className={`${styles.container} ds-base`}>
      <Head>
        <title>{title}</title>
        <meta name="description" content="MITA State Self-Assessment Tool" />
        <link rel="icon" href={`${basePath}/favicon.ico`} />
        {/* Font styles should be imported in _document.js or _app.js instead of here */}
      </Head>

      <header className={`${styles.header} ds-u-padding--2`}>
        <div className={styles.headerContent}>
          <h1 className={`${styles.title} ds-h1`}>MITA State Self-Assessment Tool</h1>
        </div>
      </header>

      <PrototypeBanner />

      <main className={`${styles.main} ds-u-padding--2`}>{children}</main>

      <footer className={`${styles.footer} ds-u-padding--2 ds-u-margin-top--5`}>
        <p className="ds-u-margin--0">MITA State Self-Assessment Tool</p>
      </footer>
    </div>
  );
};

export default Layout;
