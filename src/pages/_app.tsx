import React, { useEffect } from 'react';

import { useRouter } from 'next/router';

import { CMSProvider, ErrorBoundary } from '../components';
import PrototypeBanner from '../components/common/PrototypeBanner';
import { StorageProvider } from '../components/storage/StorageProvider';

import type { AppProps } from 'next/app';

import '../styles/globals.css';
import '../styles/assessment-sidebar.css';

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const isAssessmentPage = router.pathname.startsWith('/assessment/');

  // Handle GitHub Pages SPA routing redirects
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const redirectPath = urlParams.get('p');

      if (redirectPath) {
        // Remove the redirect parameter and navigate to the actual path
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('p');
        const cleanSearch = newUrl.searchParams.toString();
        const finalUrl = redirectPath + (cleanSearch ? '?' + cleanSearch : '') + newUrl.hash;

        // Replace the current URL without the redirect parameter
        window.history.replaceState(
          null,
          '',
          newUrl.pathname + (cleanSearch ? '?' + cleanSearch : '') + newUrl.hash
        );

        // Navigate to the intended route
        router.replace(finalUrl);
        return;
      }
    }
  }, [router]);

  // Update the base href dynamically based on the current path
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const baseElement = document.querySelector('base');
      if (baseElement) {
        const basePath = router.basePath || '';
        baseElement.setAttribute('href', `${basePath}/`);
      }
    }
  }, [router.basePath]);

  return (
    <ErrorBoundary>
      <CMSProvider>
        <StorageProvider>
          {!isAssessmentPage && <PrototypeBanner />}
          <Component {...pageProps} />
        </StorageProvider>
      </CMSProvider>
    </ErrorBoundary>
  );
}
