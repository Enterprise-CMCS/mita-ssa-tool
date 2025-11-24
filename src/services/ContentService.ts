import { parseCapabilityMarkdown } from '../utils/capabilityParser';

import type { CapabilityDefinition } from '../types';

/**
 * Service for loading and managing capability content
 */
export class ContentService {
  private capabilities: CapabilityDefinition[] = [];
  private contentDirectory: string;
  private isClient: boolean;

  constructor(contentDirectory: string) {
    this.contentDirectory = contentDirectory;
    this.isClient = typeof window !== 'undefined';
  }

  /**
   * Initialize the content service by loading all capability definitions
   */
  async initialize(): Promise<void> {
    try {
      if (this.isClient) {
        // In browser environment, fetch from API
        await this.fetchCapabilitiesFromAPI();
      } else {
        // This branch won't be executed in the browser
        console.warn('Server-side initialization not implemented');
        this.capabilities = [];
      }
    } catch (error) {
      console.error('Failed to load capability definitions:', error);
      throw error;
    }
  }

  /**
   * Fetch capabilities from content files
   * This method is used in the browser environment
   */
  private async fetchCapabilitiesFromAPI(): Promise<void> {
    try {
      this.capabilities = await this.getMockCapabilities();
    } catch (error) {
      console.error('Failed to fetch capabilities from content files:', error);
      throw error;
    }
  }

  /**
   * Get all capability definitions
   */
  getAllCapabilities(): CapabilityDefinition[] {
    return this.capabilities;
  }

  /**
   * Get a capability by ID
   */
  getCapability(id: string): CapabilityDefinition | null {
    return this.capabilities.find(cap => cap.id === id) || null;
  }

  /**
   * Get capabilities by domain name
   */
  getCapabilitiesByDomain(domainName: string): CapabilityDefinition[] {
    return this.capabilities.filter(cap => cap.capabilityDomainName === domainName);
  }

  /**
   * Load a single capability from content
   */
  parseCapabilityContent(content: string): CapabilityDefinition {
    try {
      return parseCapabilityMarkdown(content);
    } catch (error) {
      console.error(`Failed to parse capability content:`, error);
      throw error;
    }
  }

  /**
   * Get capabilities by loading from content files
   * This loads the actual capability definitions from markdown files
   */
  private async getMockCapabilities(): Promise<CapabilityDefinition[]> {
    try {
      // List of capability files to load
      const capabilityFiles = [
        'provider-enrollment.md',
        'provider-management.md',
        'provider-termination.md',
      ];

      const capabilities: CapabilityDefinition[] = [];

      // Get the base path from environment variable or use production default
      const getBasePath = () => {
        if (typeof window === 'undefined') {
          return '';
        }

        // Use the configured base path from Next.js
        const pathname = window.location.pathname;
        // Check if we're on GitHub Pages with a base path
        if (pathname.includes('/mita-state-self-assessment-tool')) {
          return '/mita-state-self-assessment-tool';
        }
        return '';
      };

      const basePath = getBasePath();

      for (const filename of capabilityFiles) {
        try {
          const url = `${basePath}/content/${filename}`;
          const response = await fetch(url);
          if (response.ok) {
            const content = await response.text();
            const capability = this.parseCapabilityContent(content);
            capabilities.push(capability);
          } else {
            console.warn(`Failed to load ${filename}: ${response.status} ${response.statusText}`);
          }
        } catch (error) {
          console.warn(`Error loading ${filename}:`, error);
        }
      }

      return capabilities;
    } catch (error) {
      console.error('Error loading capabilities:', error);
      // Return empty array if loading fails
      return [];
    }
  }
}

export default ContentService;
