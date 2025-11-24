import { render, screen, waitFor } from '@testing-library/react';
import { ContentProvider, useContent } from '../../../../src/components/content';

// Mock the ContentLoader component
jest.mock('../../../../src/components/content/ContentLoader', () => {
  return {
    __esModule: true,
    default: ({ children }) => {
      return children({
        capabilities: [
          {
            id: 'test-capability',
            capabilityAreaName: 'Test Capability',
            capabilityDomainName: 'Test Domain',
            capabilityVersion: '1.0',
            capabilityAreaCreated: '2025-06-01',
            capabilityAreaLastUpdated: '2025-06-01',
            description: 'Test description',
            domainDescription: 'Test Domain Description',
            areaDescription: 'Test description',
            dimensions: {
              outcome: {
                description: 'Outcome description',
                assessmentQuestions: ['Question 1', 'Question 2'],
                maturityLevels: {
                  level1: 'Level 1 description',
                  level2: 'Level 2 description',
                  level3: 'Level 3 description',
                  level4: 'Level 4 description',
                  level5: 'Level 5 description',
                },
              },
              role: {
                description: 'Role description',
                assessmentQuestions: ['Question 1', 'Question 2'],
                maturityLevels: {
                  level1: 'Level 1 description',
                  level2: 'Level 2 description',
                  level3: 'Level 3 description',
                  level4: 'Level 4 description',
                  level5: 'Level 5 description',
                },
              },
              businessProcess: {
                description: 'Business Process description',
                assessmentQuestions: ['Question 1', 'Question 2'],
                maturityLevels: {
                  level1: 'Level 1 description',
                  level2: 'Level 2 description',
                  level3: 'Level 3 description',
                  level4: 'Level 4 description',
                  level5: 'Level 5 description',
                },
              },
              information: {
                description: 'Information description',
                assessmentQuestions: ['Question 1', 'Question 2'],
                maturityLevels: {
                  level1: 'Level 1 description',
                  level2: 'Level 2 description',
                  level3: 'Level 3 description',
                  level4: 'Level 4 description',
                  level5: 'Level 5 description',
                },
              },
              technology: {
                description: 'Technology description',
                assessmentQuestions: ['Question 1', 'Question 2'],
                maturityLevels: {
                  level1: 'Level 1 description',
                  level2: 'Level 2 description',
                  level3: 'Level 3 description',
                  level4: 'Level 4 description',
                  level5: 'Level 5 description',
                },
              },
            },
          },
        ],
        isLoading: false,
        error: null,
        getCapability: jest.fn().mockImplementation(id => {
          if (id === 'test-capability') {
            return {
              id: 'test-capability',
              capabilityAreaName: 'Test Capability',
              capabilityDomainName: 'Test Domain',
            };
          }
          return null;
        }),
        getCapabilitiesByDomain: jest.fn().mockImplementation(domain => {
          if (domain === 'Test Domain') {
            return [
              {
                id: 'test-capability',
                capabilityAreaName: 'Test Capability',
                capabilityDomainName: 'Test Domain',
              },
            ];
          }
          return [];
        }),
      });
    },
  };
});

// Test component that uses the useContent hook
const TestComponent = () => {
  const { capabilities, isLoading, error, getCapability, getCapabilitiesByDomain } = useContent();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  const capability = getCapability('test-capability');
  const domainCapabilities = getCapabilitiesByDomain('Test Domain');

  return (
    <div>
      <h1>Content Loaded</h1>
      <p>Total Capabilities: {capabilities.length}</p>
      {capability && <p>Capability Name: {capability.capabilityAreaName}</p>}
      <p>Domain Capabilities: {domainCapabilities.length}</p>
    </div>
  );
};

describe('ContentProvider', () => {
  test('provides content context to children', async () => {
    render(
      <ContentProvider contentDirectory="/test/content">
        <TestComponent />
      </ContentProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Content Loaded')).toBeInTheDocument();
      expect(screen.getByText('Total Capabilities: 1')).toBeInTheDocument();
      expect(screen.getByText('Capability Name: Test Capability')).toBeInTheDocument();
      expect(screen.getByText('Domain Capabilities: 1')).toBeInTheDocument();
    });
  });

  test('throws error when useContent is used outside ContentProvider', () => {
    // Suppress console.error for this test to avoid noisy output
    const originalConsoleError = console.error;
    console.error = jest.fn();

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useContent must be used within a ContentProvider');

    // Restore console.error
    console.error = originalConsoleError;
  });
});
