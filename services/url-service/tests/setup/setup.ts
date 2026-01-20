// Set test environment
process.env.NODE_ENV = 'test';

// Suppress console logs in tests
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  // Keep log for debugging if needed
  // log: jest.fn(),
};