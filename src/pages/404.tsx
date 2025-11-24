import React, { useEffect } from 'react';

import { useRouter } from 'next/router';

/**
 * Custom 404 page that handles client-side routing for GitHub Pages
 * This is essential for dynamic routes like /assessment/[id]/results
 */
export default function Custom404() {
  const router = useRouter();

  useEffect(() => {
    // Handle GitHub Pages SPA routing
    const path = window.location.pathname;
    const search = window.location.search;
    const hash = window.location.hash;

    // Check if this looks like a dynamic route that should exist
    const assessmentResultsMatch = path.match(/\/assessment\/([^/]+)\/results\/?$/);

    if (assessmentResultsMatch) {
      // This is an assessment results page, redirect to the proper route
      const assessmentId = assessmentResultsMatch[1];
      router.replace(`/assessment/${assessmentId}/results${search}${hash}`);
      return;
    }

    // Check for other assessment routes
    const assessmentMatch = path.match(/\/assessment\/([^/]+)\/?$/);
    if (assessmentMatch) {
      const assessmentId = assessmentMatch[1];
      router.replace(`/assessment/${assessmentId}${search}${hash}`);
      return;
    }

    // If it's not a recognized dynamic route, show 404
  }, [router]);

  return (
    <div className="ds-base">
      <div className="ds-l-container ds-u-padding-y--4">
        <div className="ds-c-alert ds-c-alert--error">
          <div className="ds-c-alert__body">
            <h1 className="ds-c-alert__heading">Page Not Found</h1>
            <p className="ds-c-alert__text">
              The page you're looking for doesn't exist or may have been moved.
            </p>
            <div className="ds-u-margin-top--3">
              <a href="/" className="ds-c-button ds-c-button--primary">
                Return to Home
              </a>
              <a href="/dashboard" className="ds-c-button ds-u-margin-left--2">
                Go to Dashboard
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
