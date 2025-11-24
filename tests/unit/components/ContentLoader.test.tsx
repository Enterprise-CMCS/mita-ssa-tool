import { render, screen, waitFor } from '@testing-library/react';
import { ContentLoader } from '../../../src/components/content/ContentLoader';
import ContentService from '../../../src/services/ContentService';

// Mock the ContentService
jest.mock('../../../src/services/ContentService', () => {
  return jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    getAllCapabilities: jest.fn().mockReturnValue([
      {
        id: 'test-capability',
        name: 'Test Capability',
        domainName: 'Test Domain',
        domainDescription: 'Test Domain Description',
        moduleName: 'Test Module',
        version: '1.0',
        lastUpdated: '2025-06-01',
        description: 'Test description',
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
    ]),
    getCapability: jest.fn().mockImplementation(id => {
      if (id === 'test-capability') {
        return {
          id: 'test-capability',
          name: 'Test Capability',
          domainName: 'Test Domain',
          domainDescription: 'Test Domain Description',
          moduleName: 'Test Module',
          version: '1.0',
          lastUpdated: '2025-06-01',
          description: 'Test description',
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
        };
      }
      return null;
    }),
    getCapabilitiesByDomain: jest.fn().mockImplementation(domain => {
      if (domain === 'Test Domain') {
        return [
          {
            id: 'test-capability',
            name: 'Test Capability',
            domainName: 'Test Domain',
            domainDescription: 'Test Domain Description',
            moduleName: 'Test Module',
            version: '1.0',
            lastUpdated: '2025-06-01',
            description: 'Test description',
          },
        ];
      }
      return [];
    }),
  }));
});

describe('ContentLoader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders children with content state', async () => {
    const mockChildrenFn = jest.fn().mockReturnValue(<div>Test Content</div>);
    const mockOnLoaded = jest.fn();

    render(
      <ContentLoader contentDirectory="/test/content" onLoaded={mockOnLoaded}>
        {mockChildrenFn}
      </ContentLoader>
    );

    // Initially should be loading
    expect(mockChildrenFn).toHaveBeenCalledWith(
      expect.objectContaining({
        isLoading: true,
        error: null,
      })
    );

    // After loading completes
    await waitFor(() => {
      expect(mockChildrenFn).toHaveBeenCalledWith(
        expect.objectContaining({
          isLoading: false,
          error: null,
          capabilities: expect.arrayContaining([
            expect.objectContaining({
              id: 'test-capability',
              name: 'Test Capability',
            }),
          ]),
        })
      );
    });

    // Should call onLoaded callback
    expect(mockOnLoaded).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'test-capability',
        }),
      ])
    );

    // Should render children
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  test('handles loading errors', async () => {
    // Mock implementation that throws an error
    (ContentService as jest.Mock).mockImplementationOnce(() => ({
      initialize: jest.fn().mockRejectedValue(new Error('Failed to load content')),
      getAllCapabilities: jest.fn(),
    }));

    const mockChildrenFn = jest.fn().mockReturnValue(<div>Error State</div>);

    render(<ContentLoader contentDirectory="/test/content">{mockChildrenFn}</ContentLoader>);

    // After error occurs
    await waitFor(() => {
      expect(mockChildrenFn).toHaveBeenCalledWith(
        expect.objectContaining({
          isLoading: false,
          error: expect.objectContaining({
            message: 'Failed to load content',
          }),
          capabilities: [],
        })
      );
    });
  });

  test('provides capability access methods', async () => {
    const mockChildrenFn = jest.fn().mockReturnValue(<div>Test Content</div>);

    render(<ContentLoader contentDirectory="/test/content">{mockChildrenFn}</ContentLoader>);

    await waitFor(() => {
      // Verify getCapability method is provided
      const { getCapability } = mockChildrenFn.mock.calls[mockChildrenFn.mock.calls.length - 1][0];
      const capability = getCapability('test-capability');

      expect(capability).toBeDefined();
      expect(capability?.id).toBe('test-capability');
      expect(capability?.name).toBe('Test Capability');
      expect(capability?.domainName).toBe('Test Domain');
      expect(capability?.domainDescription).toBe('Test Domain Description');

      // Verify dimensions are properly loaded
      expect(capability?.dimensions.outcome).toBeDefined();
      expect(capability?.dimensions.role).toBeDefined();
      expect(capability?.dimensions.businessProcess).toBeDefined();
      expect(capability?.dimensions.information).toBeDefined();
      expect(capability?.dimensions.technology).toBeDefined();

      // Verify maturity levels for each dimension
      expect(capability?.dimensions.outcome.maturityLevels.level1).toBe('Level 1 description');
      expect(capability?.dimensions.role.maturityLevels.level2).toBe('Level 2 description');
      expect(capability?.dimensions.businessProcess.maturityLevels.level3).toBe(
        'Level 3 description'
      );
      expect(capability?.dimensions.information.maturityLevels.level4).toBe('Level 4 description');
      expect(capability?.dimensions.technology.maturityLevels.level5).toBe('Level 5 description');
    });
  });

  test('provides domain filtering', async () => {
    const mockChildrenFn = jest.fn().mockReturnValue(<div>Test Content</div>);

    render(<ContentLoader contentDirectory="/test/content">{mockChildrenFn}</ContentLoader>);

    await waitFor(() => {
      // Verify getCapabilitiesByDomain method is provided
      const { getCapabilitiesByDomain } =
        mockChildrenFn.mock.calls[mockChildrenFn.mock.calls.length - 1][0];

      // Test with existing domain
      const capabilities = getCapabilitiesByDomain('Test Domain');
      expect(capabilities).toHaveLength(1);
      expect(capabilities[0].id).toBe('test-capability');
      expect(capabilities[0].domainName).toBe('Test Domain');

      // Test with non-existing domain
      const emptyCapabilities = getCapabilitiesByDomain('Non-Existent Domain');
      expect(emptyCapabilities).toHaveLength(0);
    });
  });
});
