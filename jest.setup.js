// Import Jest DOM extensions
import '@testing-library/jest-dom';

// Setup DOM environment for React 18
import { TextDecoder, TextEncoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Configure testing-library to use legacy render mode
import { configure } from '@testing-library/react';

// Force legacy render mode to avoid React 18 createRoot issues
configure({
  asyncUtilTimeout: 5000,
  defaultHidden: false,
});

// Allow React Testing Library to handle React 18 createRoot naturally
// No need to mock createRoot - RTL handles this internally

// Ensure proper DOM cleanup between tests
import { cleanup } from '@testing-library/react';

beforeEach(() => {
  // Ensure document.body exists
  if (!document.body) {
    document.body = document.createElement('body');
  }
});

afterEach(() => {
  // Clean up React components
  cleanup();
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
    events: {
      on: jest.fn(),
      off: jest.fn(),
    },
  }),
}));

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  },
  writable: true,
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock URL.createObjectURL and URL.revokeObjectURL for file operations
global.URL.createObjectURL = jest.fn(() => 'mocked-url');
global.URL.revokeObjectURL = jest.fn();

// Mock Canvas for jsPDF
global.HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  fillRect: jest.fn(),
  clearRect: jest.fn(),
  getImageData: jest.fn(() => ({ data: new Array(4) })),
  putImageData: jest.fn(),
  createImageData: jest.fn(() => ({ data: new Array(4) })),
  setTransform: jest.fn(),
  drawImage: jest.fn(),
  save: jest.fn(),
  fillText: jest.fn(),
  restore: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  closePath: jest.fn(),
  stroke: jest.fn(),
  translate: jest.fn(),
  scale: jest.fn(),
  rotate: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  measureText: jest.fn(() => ({ width: 0 })),
  transform: jest.fn(),
  rect: jest.fn(),
  clip: jest.fn(),
}));

// Mock Blob with text() method
global.Blob = class MockBlob {
  constructor(content, options) {
    this.content = content;
    this.options = options;
  }

  text() {
    return Promise.resolve(this.content.join(''));
  }

  arrayBuffer() {
    return Promise.resolve(new ArrayBuffer(0));
  }

  stream() {
    return new ReadableStream();
  }

  slice() {
    return new MockBlob(this.content, this.options);
  }

  get size() {
    return this.content.join('').length;
  }

  get type() {
    return this.options?.type || '';
  }
};
