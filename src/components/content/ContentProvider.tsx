'use client';

import { createContext, useContext, type ReactNode } from 'react';

import ContentLoader from './ContentLoader';

import type { CapabilityDefinition } from '../../types';

interface ContentContextType {
  capabilities: CapabilityDefinition[];
  isLoading: boolean;
  error: Error | null;
  getCapability: (id: string) => CapabilityDefinition | null;
  getCapabilitiesByDomain: (domainName: string) => CapabilityDefinition[];
}

const ContentContext = createContext<ContentContextType | null>(null);

interface ContentProviderProps {
  contentDirectory: string;
  children: ReactNode;
  onLoaded?: (capabilities: CapabilityDefinition[]) => void;
}

/**
 * Provider component for making capability content available throughout the application
 */
export function ContentProvider({ contentDirectory, children, onLoaded }: ContentProviderProps) {
  return (
    <ContentLoader contentDirectory={contentDirectory} onLoaded={onLoaded}>
      {contentState => (
        <ContentContext.Provider value={contentState}>{children}</ContentContext.Provider>
      )}
    </ContentLoader>
  );
}

/**
 * Hook for accessing capability content from any component
 */
export function useContent(): ContentContextType {
  const context = useContext(ContentContext);

  if (!context) {
    throw new Error('useContent must be used within a ContentProvider');
  }

  return context;
}

export default ContentProvider;
