# Phase 1 - Task 3: Setup Testing Infrastructure (Jest + TypeScript)

**Duration:** 3-4 days  
**Priority:** Critical (Blocking)  
**Dependencies:** Task 1 (TypeScript Setup), Task 2 (Shared Types)

---

## Objective

Setup a comprehensive testing infrastructure using Jest with TypeScript support, including unit tests, integration tests, and test utilities. Establish testing patterns and achieve initial test coverage for shared utilities.

---

## Context

The current project has:
- **Zero test coverage** (`"test": "echo \"Error: no test specified\" && exit 1"`)
- No testing framework
- No test patterns or conventions

We need to establish:
- Jest as the testing framework
- TypeScript support for tests
- Test utilities and helpers
- Coverage reporting
- CI/CD integration ready

---

## Requirements

### 1. Install Jest and Dependencies

```bash
npm install --save-dev jest ts-jest @types/jest
npm install --save-dev @jest/globals
npm install --save-dev supertest @types/supertest
npm install --save-dev mongodb-memory-server
```

### 2. Jest Configuration

**Create `jest.config.js` in project root:**

```javascript
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
```

### 3. TypeScript Configuration for Tests

**Create `tsconfig.test.json`:**

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "types": ["jest", "node"],
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true
  },
  "include": [
    "src/**/*",
    "tests/**/*"
  ]
}
```

### 4. Test Setup File

**Create `tests/setup.ts`:**

```typescript
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
```

### 5. Test Utilities

**Create `tests/utils/test-helpers.ts`:**

```typescript
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

/**
 * In-memory MongoDB for testing
 */
let mongoServer: MongoMemoryServer;

/**
 * Connect to in-memory database
 */
export async function connectTestDatabase(): Promise<void> {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  await mongoose.connect(mongoUri);
}

/**
 * Disconnect and stop in-memory database
 */
export async function disconnectTestDatabase(): Promise<void> {
  await mongoose.disconnect();
  await mongoServer.stop();
}

/**
 * Clear all collections in test database
 */
export async function clearTestDatabase(): Promise<void> {
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
}

/**
 * Generate random test data
 */
export const testDataGenerator = {
  randomString: (length: number = 10): string => {
    return Math.random().toString(36).substring(2, length + 2);
  },
  
  randomEmail: (): string => {
    return `test-${testDataGenerator.randomString()}@example.com`;
  },
  
  randomNumber: (min: number = 0, max: number = 1000): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },
  
  randomBoolean: (): boolean => {
    return Math.random() < 0.5;
  },
  
  randomDate: (start: Date = new Date(2020, 0, 1), end: Date = new Date()): Date => {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  },
};

/**
 * Wait for a specified time
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a spy for console methods
 */
export function spyOnConsole(): {
  log: jest.SpyInstance;
  error: jest.SpyInstance;
  warn: jest.SpyInstance;
} {
  return {
    log: jest.spyOn(console, 'log').mockImplementation(),
    error: jest.spyOn(console, 'error').mockImplementation(),
    warn: jest.spyOn(console, 'warn').mockImplementation(),
  };
}
```

**Create `tests/utils/mock-factories.ts`:**

```typescript
import { UserRole } from '@shared/types/common';

/**
 * Mock user data factory
 */
export const mockUserFactory = {
  create: (overrides?: Partial<any>) => ({
    _id: '507f1f77bcf86cd799439011',
    name: 'Test User',
    email: 'test@example.com',
    password: '$2b$10$hashedpassword',
    userRole: UserRole.USER,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  }),
  
  createMany: (count: number, overrides?: Partial<any>) => {
    return Array.from({ length: count }, (_, i) =>
      mockUserFactory.create({
        _id: `507f1f77bcf86cd79943901${i}`,
        email: `test${i}@example.com`,
        ...overrides,
      })
    );
  },
};

/**
 * Mock product data factory
 */
export const mockProductFactory = {
  create: (overrides?: Partial<any>) => ({
    _id: '507f1f77bcf86cd799439012',
    pid: 'PROD-001',
    title: 'Test Product',
    category: 'Electronics',
    actual_price: '1,000',
    selling_price: '800',
    brand: 'TestBrand',
    description: 'Test product description',
    out_of_stock: false,
    images: ['https://example.com/image1.jpg'],
    product_details: [{ key: 'Color', value: 'Black' }],
    seller: '507f1f77bcf86cd799439011',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  }),
  
  createMany: (count: number, overrides?: Partial<any>) => {
    return Array.from({ length: count }, (_, i) =>
      mockProductFactory.create({
        _id: `507f1f77bcf86cd79943901${i}`,
        pid: `PROD-00${i}`,
        title: `Test Product ${i}`,
        ...overrides,
      })
    );
  },
};

/**
 * Mock order data factory
 */
export const mockOrderFactory = {
  create: (overrides?: Partial<any>) => ({
    _id: '507f1f77bcf86cd799439013',
    userId: '507f1f77bcf86cd799439011',
    items: [
      {
        product: '507f1f77bcf86cd799439012',
        quantity: 1,
        status: 'ordered',
        orderedDate: new Date('2024-01-01'),
      },
    ],
    paymentMethod: 'card',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  }),
};
```

### 6. Example Unit Tests

**Create `src/shared/__tests__/result.test.ts`:**

```typescript
import { describe, it, expect } from '@jest/globals';
import { success, failure, isSuccess, isFailure, Result } from '../types/result';

describe('Result Type', () => {
  describe('success', () => {
    it('should create a success result', () => {
      const data = { id: '123', name: 'Test' };
      const result = success(data);
      
      expect(result.success).toBe(true);
      expect(isSuccess(result)).toBe(true);
      
      if (isSuccess(result)) {
        expect(result.data).toEqual(data);
      }
    });
  });
  
  describe('failure', () => {
    it('should create a failure result', () => {
      const error = new Error('Test error');
      const result = failure(error);
      
      expect(result.success).toBe(false);
      expect(isFailure(result)).toBe(true);
      
      if (isFailure(result)) {
        expect(result.error).toBe(error);
        expect(result.error.message).toBe('Test error');
      }
    });
  });
  
  describe('type guards', () => {
    it('should correctly identify success results', () => {
      const result: Result<string> = success('test');
      
      if (isSuccess(result)) {
        // TypeScript should know result.data exists
        expect(result.data).toBe('test');
      } else {
        fail('Should be success');
      }
    });
    
    it('should correctly identify failure results', () => {
      const result: Result<string> = failure(new Error('fail'));
      
      if (isFailure(result)) {
        // TypeScript should know result.error exists
        expect(result.error.message).toBe('fail');
      } else {
        fail('Should be failure');
      }
    });
  });
});
```

**Create `src/shared/__tests__/errors.test.ts`:**

```typescript
import { describe, it, expect } from '@jest/globals';
import {
  ValidationError,
  NotFoundError,
  AuthenticationError,
  AuthorizationError,
  BusinessRuleError,
  ConflictError,
  ExternalServiceError,
  DatabaseError,
} from '../errors';

describe('Error Hierarchy', () => {
  describe('ValidationError', () => {
    it('should create validation error with details', () => {
      const details = [
        { field: 'email', message: 'Invalid email format' },
        { field: 'password', message: 'Password too short' },
      ];
      
      const error = new ValidationError('Validation failed', details);
      
      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe('Validation failed');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual(details);
      expect(error.isOperational).toBe(true);
    });
    
    it('should serialize to JSON correctly', () => {
      const error = new ValidationError('Test', [
        { field: 'test', message: 'Test message' },
      ]);
      
      const json = error.toJSON();
      
      expect(json).toHaveProperty('name', 'ValidationError');
      expect(json).toHaveProperty('message', 'Test');
      expect(json).toHaveProperty('code', 'VALIDATION_ERROR');
      expect(json).toHaveProperty('details');
    });
  });
  
  describe('NotFoundError', () => {
    it('should create not found error with resource info', () => {
      const error = new NotFoundError('User', '123');
      
      expect(error.message).toContain('User');
      expect(error.message).toContain('123');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
    });
  });
  
  describe('AuthenticationError', () => {
    it('should create authentication error', () => {
      const error = new AuthenticationError('Invalid credentials');
      
      expect(error.message).toBe('Invalid credentials');
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('AUTHENTICATION_ERROR');
    });
    
    it('should use default message', () => {
      const error = new AuthenticationError();
      
      expect(error.message).toBe('Authentication failed');
    });
  });
  
  describe('AuthorizationError', () => {
    it('should create authorization error', () => {
      const error = new AuthorizationError('Access denied');
      
      expect(error.message).toBe('Access denied');
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('AUTHORIZATION_ERROR');
    });
  });
  
  describe('BusinessRuleError', () => {
    it('should create business rule error', () => {
      const error = new BusinessRuleError('Cannot cancel delivered order');
      
      expect(error.message).toBe('Cannot cancel delivered order');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('BUSINESS_RULE_VIOLATION');
    });
    
    it('should allow custom error code', () => {
      const error = new BusinessRuleError('Custom error', 'CUSTOM_CODE');
      
      expect(error.code).toBe('CUSTOM_CODE');
    });
  });
  
  describe('ConflictError', () => {
    it('should create conflict error', () => {
      const error = new ConflictError('Email already exists');
      
      expect(error.message).toBe('Email already exists');
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT');
    });
  });
  
  describe('ExternalServiceError', () => {
    it('should create external service error', () => {
      const originalError = new Error('Connection timeout');
      const error = new ExternalServiceError(
        'StripeAPI',
        'Payment failed',
        originalError
      );
      
      expect(error.message).toContain('StripeAPI');
      expect(error.message).toContain('Payment failed');
      expect(error.statusCode).toBe(502);
      expect(error.originalError).toBe(originalError);
    });
  });
  
  describe('DatabaseError', () => {
    it('should create database error', () => {
      const error = new DatabaseError('Connection lost', 'findUser');
      
      expect(error.message).toContain('findUser');
      expect(error.message).toContain('Connection lost');
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(false);
    });
  });
});
```

### 7. Example Integration Test Template

**Create `tests/integration/example.integration.test.ts`:**

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
} from '../utils/test-helpers';

describe('Integration Test Example', () => {
  beforeAll(async () => {
    await connectTestDatabase();
  });
  
  afterAll(async () => {
    await disconnectTestDatabase();
  });
  
  beforeEach(async () => {
    await clearTestDatabase();
  });
  
  it('should run integration test', async () => {
    // Test implementation
    expect(true).toBe(true);
  });
});
```

### 8. Update package.json Scripts

**Add/update these scripts in `package.json`:**

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:unit": "jest --testPathPattern=__tests__",
    "test:integration": "jest --testPathPattern=integration",
    "test:ci": "jest --ci --coverage --maxWorkers=2",
    "test:verbose": "jest --verbose",
    "test:debug": "node --inspect-brk node_modules/.bin/jest --runInBand"
  }
}
```

### 9. Coverage Configuration

**Create `.coveragerc` or add to `jest.config.js`:**

Already included in jest.config.js above with:
- 70% threshold for all metrics
- HTML and LCOV reports
- Exclusion of test files and type definitions

### 10. CI/CD Integration

**Create `.github/workflows/test.yml` (if using GitHub Actions):**

```yaml
name: Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Use Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run linter
      run: npm run lint
    
    - name: Run type check
      run: npm run type-check
    
    - name: Run tests
      run: npm run test:ci
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        files: ./coverage/lcov.info
        flags: unittests
        name: codecov-umbrella
```

---

## Validation Steps

### 1. Run Unit Tests
```bash
npm run test:unit
```
**Expected:** All tests pass

### 2. Run with Coverage
```bash
npm run test:coverage
```
**Expected:** 
- Coverage report generated in `coverage/` folder
- HTML report viewable at `coverage/index.html`
- All thresholds met (70%)

### 3. Watch Mode
```bash
npm run test:watch
```
**Expected:** Jest runs in watch mode, re-runs tests on file changes

### 4. Integration Tests
```bash
npm run test:integration
```
**Expected:** Integration tests pass with in-memory MongoDB

### 5. CI Mode
```bash
npm run test:ci
```
**Expected:** Tests run in CI mode (no watch, with coverage)

---

## Deliverables

- [ ] Jest installed and configured
- [ ] TypeScript support for tests working
- [ ] Test utilities created
- [ ] Mock factories created
- [ ] Example unit tests written and passing
- [ ] Example integration test template created
- [ ] Coverage reporting configured
- [ ] Coverage thresholds set (70%)
- [ ] npm scripts for testing added
- [ ] CI/CD workflow created
- [ ] Documentation for testing patterns

---

## Testing Patterns to Follow

### 1. AAA Pattern (Arrange, Act, Assert)

```typescript
it('should do something', () => {
  // Arrange
  const input = 'test';
  const expected = 'TEST';
  
  // Act
  const result = toUpperCase(input);
  
  // Assert
  expect(result).toBe(expected);
});
```

### 2. Test Naming Convention

```typescript
describe('ClassName or FunctionName', () => {
  describe('methodName', () => {
    it('should do X when Y', () => {
      // test
    });
    
    it('should throw error when invalid input', () => {
      // test
    });
  });
});
```

### 3. Mocking External Dependencies

```typescript
jest.mock('../external-service');

it('should handle external service failure', async () => {
  const mockService = require('../external-service');
  mockService.call.mockRejectedValue(new Error('Service down'));
  
  // test error handling
});
```

---

## Common Issues & Solutions

### Issue 1: Path aliases not working in tests
**Solution:** Ensure `moduleNameMapper` in jest.config.js matches tsconfig.json paths

### Issue 2: MongoDB memory server fails to start
**Solution:** 
```bash
npm install --save-dev mongodb-memory-server-core
```

### Issue 3: Tests timeout
**Solution:** Increase timeout in jest.config.js or per-test:
```typescript
it('long test', async () => {
  // test
}, 30000); // 30 second timeout
```

---

## Next Steps

After completing this task:
1. Write tests for all shared utilities and errors
2. Proceed to **Task 4: Migrate Domain Models**
3. Establish TDD workflow for new features

---

**Task Owner:** Development Team  
**Reviewer:** Tech Lead  
**Estimated Effort:** 3-4 days  
**Status:** Not Started
