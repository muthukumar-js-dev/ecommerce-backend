/**
 * Global test setup
 * Runs before all tests
 */

// Extend Jest matchers if needed
import '@jest/globals';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.DB_URL = 'mongodb://localhost:27017/test';

// Global test timeout
jest.setTimeout(10000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to suppress console.log in tests
  // log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  // Keep error for debugging
  error: console.error,
};

// Global beforeAll
beforeAll(() => {
  // Setup code that runs once before all tests
});

// Global afterAll
afterAll(() => {
  // Cleanup code that runs once after all tests
});

// Global beforeEach
beforeEach(() => {
  // Setup code that runs before each test
});

// Global afterEach
afterEach(() => {
  // Cleanup code that runs after each test
  jest.clearAllMocks();
});
