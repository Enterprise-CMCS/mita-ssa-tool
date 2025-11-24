import React from 'react';

interface CMSProviderProps {
  children: React.ReactNode;
}

/**
 * Wrapper component for CMS Design System
 * Provides the base styling and context for CMS Design System components
 */
export const CMSProvider: React.FC<CMSProviderProps> = ({ children }) => {
  return <div className="ds-base">{children}</div>;
};

export default CMSProvider;
