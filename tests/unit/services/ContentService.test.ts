import { ContentService } from '../../../src/services/ContentService';

// Mock fetch globally
global.fetch = jest.fn();

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    pathname: '/mita-state-self-assessment-tool/dev/assessment/new',
  },
  writable: true,
});

describe('ContentService', () => {
  let contentService: ContentService;
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    contentService = new ContentService('/content');
    mockFetch.mockReset(); // Reset mock implementation, not just call history
    console.warn = jest.fn(); // Suppress console.warn in tests
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Base Path Detection', () => {
    it('should detect production base path correctly', async () => {
      // Mock successful responses for all capability files
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          text: () =>
            Promise.resolve(`---
capabilityDomain: Provider
capabilityArea: Provider Enrollment
capabilityVersion: 1.1
---

## Capability Domain: Provider
## Capability Area: Provider Enrollment
Test content`),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          text: () =>
            Promise.resolve(`---
capabilityDomain: Provider
capabilityArea: Provider Management
capabilityVersion: 1.1
---

## Capability Domain: Provider
## Capability Area: Provider Management
Test content`),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          text: () =>
            Promise.resolve(`---
capabilityDomain: Provider
capabilityArea: Provider Termination
capabilityVersion: 1.1
---

## Capability Domain: Provider
## Capability Area: Provider Termination
Test content`),
        } as Response);

      await contentService.initialize();

      // Verify that fetch was called with the correct production base path
      expect(mockFetch).toHaveBeenCalledWith(
        '/mita-state-self-assessment-tool/content/provider-enrollment.md'
      );
      expect(mockFetch).toHaveBeenCalledWith(
        '/mita-state-self-assessment-tool/content/provider-management.md'
      );
      expect(mockFetch).toHaveBeenCalledWith(
        '/mita-state-self-assessment-tool/content/provider-termination.md'
      );
    });

    it('should detect main branch base path correctly', async () => {
      // Change window location to main branch
      Object.defineProperty(window, 'location', {
        value: {
          pathname: '/mita-state-self-assessment-tool/assessment/new',
        },
        writable: true,
      });

      // Mock successful responses
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          text: () =>
            Promise.resolve(`---
capabilityDomain: Provider
capabilityArea: Provider Enrollment
---
Test content`),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          text: () =>
            Promise.resolve(`---
capabilityDomain: Provider
capabilityArea: Provider Management
---
Test content`),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          text: () =>
            Promise.resolve(`---
capabilityDomain: Provider
capabilityArea: Provider Termination
---
Test content`),
        } as Response);

      await contentService.initialize();

      // Verify that fetch was called with the correct main branch base path
      expect(mockFetch).toHaveBeenCalledWith(
        '/mita-state-self-assessment-tool/content/provider-enrollment.md'
      );
      expect(mockFetch).toHaveBeenCalledWith(
        '/mita-state-self-assessment-tool/content/provider-management.md'
      );
      expect(mockFetch).toHaveBeenCalledWith(
        '/mita-state-self-assessment-tool/content/provider-termination.md'
      );
    });

    it('should handle local development (no base path)', async () => {
      // Change window location to local development
      Object.defineProperty(window, 'location', {
        value: {
          pathname: '/assessment/new',
        },
        writable: true,
      });

      // Mock successful responses
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          text: () =>
            Promise.resolve(`---
capabilityDomain: Provider
capabilityArea: Provider Enrollment
---
Test content`),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          text: () =>
            Promise.resolve(`---
capabilityDomain: Provider
capabilityArea: Provider Management
---
Test content`),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          text: () =>
            Promise.resolve(`---
capabilityDomain: Provider
capabilityArea: Provider Termination
---
Test content`),
        } as Response);

      await contentService.initialize();

      // Verify that fetch was called without base path for local development
      expect(mockFetch).toHaveBeenCalledWith('/content/provider-enrollment.md');
      expect(mockFetch).toHaveBeenCalledWith('/content/provider-management.md');
      expect(mockFetch).toHaveBeenCalledWith('/content/provider-termination.md');
    });
  });

  describe('Capability Loading', () => {
    it('should load and parse capabilities correctly', async () => {
      // Mock successful responses with proper Provider domain content
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          text: () =>
            Promise.resolve(`---
capabilityDomain: Provider
capabilityArea: Provider Enrollment
capabilityVersion: 1.1
capabilityAreaCreated: 2025-06-01
capabilityAreaLastUpdated: 2025-06-05
---

## Capability Domain: Provider

The Provider capability domain encompasses provider-related processes.

## Capability Area: Provider Enrollment

Provider Enrollment encompasses the processes for registering healthcare providers.`),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          text: () =>
            Promise.resolve(`---
capabilityDomain: Provider
capabilityArea: Provider Management
capabilityVersion: 1.1
---

## Capability Domain: Provider
## Capability Area: Provider Management

Provider Management encompasses ongoing provider processes.`),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          text: () =>
            Promise.resolve(`---
capabilityDomain: Provider
capabilityArea: Provider Termination
capabilityVersion: 1.1
---

## Capability Domain: Provider
## Capability Area: Provider Termination

Provider Termination encompasses end-of-participation processes.`),
        } as Response);

      await contentService.initialize();
      const capabilities = contentService.getAllCapabilities();

      expect(capabilities).toHaveLength(3);
      expect(capabilities[0].capabilityDomainName).toBe('Provider');
      expect(capabilities[0].capabilityAreaName).toBe('Provider Enrollment');
      expect(capabilities[1].capabilityDomainName).toBe('Provider');
      expect(capabilities[1].capabilityAreaName).toBe('Provider Management');
      expect(capabilities[2].capabilityDomainName).toBe('Provider');
      expect(capabilities[2].capabilityAreaName).toBe('Provider Termination');
    });

    it('should handle fetch failures gracefully', async () => {
      // Mock failed responses
      mockFetch.mockRejectedValue(new Error('Network error'));

      await contentService.initialize();
      const capabilities = contentService.getAllCapabilities();

      expect(capabilities).toHaveLength(0);
    });
  });
});
