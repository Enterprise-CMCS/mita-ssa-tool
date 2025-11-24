'use client';

import { useEffect, useState } from 'react';

import ContentService from '../../services/ContentService';

import type { CapabilityDefinition } from '../../types';

interface ContentLoaderProps {
  contentDirectory: string;
  onLoaded?: (capabilities: CapabilityDefinition[]) => void;
  children: (props: ContentLoaderState) => React.ReactNode;
}

interface ContentLoaderState {
  capabilities: CapabilityDefinition[];
  isLoading: boolean;
  error: Error | null;
  getCapability: (id: string) => CapabilityDefinition | null;
  getCapabilitiesByDomain: (domainName: string) => CapabilityDefinition[];
}

/**
 * Component for loading capability content and providing it to child components
 */
export function ContentLoader({ contentDirectory, onLoaded, children }: ContentLoaderProps) {
  const [capabilities, setCapabilities] = useState<CapabilityDefinition[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [contentService] = useState<ContentService>(() => new ContentService(contentDirectory));

  useEffect(() => {
    async function loadContent() {
      try {
        setIsLoading(true);
        setError(null);

        await contentService.initialize();
        const loadedCapabilities = contentService.getAllCapabilities();

        setCapabilities(loadedCapabilities);

        if (onLoaded) {
          onLoaded(loadedCapabilities);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load content'));
        // Removed console.error to fix the test warning
      } finally {
        setIsLoading(false);
      }
    }

    loadContent();
  }, [contentDirectory, contentService, onLoaded]);

  const getCapability = (id: string): CapabilityDefinition | null => {
    return contentService.getCapability(id);
  };

  const getCapabilitiesByDomain = (domainName: string): CapabilityDefinition[] => {
    return contentService.getCapabilitiesByDomain(domainName);
  };

  return children({
    capabilities,
    isLoading,
    error,
    getCapability,
    getCapabilitiesByDomain,
  });
}

export default ContentLoader;
