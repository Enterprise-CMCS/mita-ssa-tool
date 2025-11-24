module.exports = {
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    customExportConditions: [''],
    url: 'http://localhost:3000',
    // Ensure proper DOM setup
    pretendToBeVisual: true,
    resources: 'usable'
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '@cmsgov/design-system/dist/css/index.css': 'identity-obj-proxy'
  },
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }]
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!**/node_modules/**',
    '!**/.next/**'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  // React 18 specific settings
  fakeTimers: {
    enableGlobally: false,
  },
  // Increase timeout for async operations
  testTimeout: 10000,
};