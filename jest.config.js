module.exports = {
  // Use ts-jest preset for TypeScript
  preset: 'ts-jest',
  
  // Test environment
  testEnvironment: 'node',
  
  // Roots
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  
  // Test match patterns
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts',
  ],
  
  // Transform files with ts-jest
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  
  // Module name mapper for path aliases
  moduleNameMapper: {
    '^@domain/(.*)$': '<rootDir>/src/domain/$1',
    '^@application/(.*)$': '<rootDir>/src/application/$1',
    '^@infrastructure/(.*)$': '<rootDir>/src/infrastructure/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
  },
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.interface.ts',
    '!src/**/__tests__/**',
    '!src/**/index.ts',
  ],
  
  coverageDirectory: 'coverage',
  
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json',
  ],
  
  // Coverage thresholds
  coverageThresholds: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
  ],
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks between tests
  restoreMocks: true,
  
  // Reset mocks between tests
  resetMocks: true,
  
  // Timeout
  testTimeout: 10000,
};
