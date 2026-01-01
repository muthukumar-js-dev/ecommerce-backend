# Phase 1 - Task 2: Create Shared Types, Interfaces & Error Hierarchy

**Duration:** 4-5 days  
**Priority:** Critical (Blocking)  
**Dependencies:** Task 1 (TypeScript Setup)

---

## Objective

Create a comprehensive foundation of shared types, interfaces, utility types, and a robust error hierarchy that will be used throughout the entire application. This establishes type safety contracts and error handling patterns.

---

## Context

The current JavaScript codebase has:
- No type definitions
- Inconsistent error handling (generic try-catch with 400 status for all errors)
- No standardized response format beyond a simple Response service
- String-based status messages ("success", "error")

We need to create a type-safe foundation that:
- Defines common types used across the application
- Establishes a proper error hierarchy
- Creates result types for better error handling
- Defines DTOs for API requests/responses

---

## Requirements

### 1. Common Base Types

**Create `src/shared/types/common.ts`:**

```typescript
/**
 * Unique identifier type (MongoDB ObjectId as string)
 */
export type ID = string;

/**
 * Timestamp type
 */
export type Timestamp = Date;

/**
 * ISO 8601 date string
 */
export type ISODateString = string;

/**
 * Email address (will be validated at runtime)
 */
export type Email = string;

/**
 * Currency codes
 */
export type Currency = 'INR' | 'USD' | 'EUR' | 'GBP';

/**
 * User roles
 */
export enum UserRole {
  USER = 'user',
  SELLER = 'seller',
  ADMIN = 'admin',
}

/**
 * Order status
 */
export enum OrderStatus {
  ORDERED = 'ordered',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

/**
 * Payment method
 */
export enum PaymentMethod {
  CARD = 'card',
  CASH_ON_DELIVERY = 'cashondelivery',
  UPI = 'upi',
  NET_BANKING = 'netbanking',
}

/**
 * Notification type
 */
export enum NotificationType {
  ORDER_STATUS = 'order_status',
  PROMOTION = 'promotion',
  OFFER = 'offer',
  INFO = 'info',
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  size: number;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    size: number;
    totalPages: number;
    totalItems: number;
  };
}

/**
 * Sort order
 */
export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}
```

### 2. Result Type Pattern

**Create `src/shared/types/result.ts`:**

```typescript
/**
 * Success result
 */
export interface Success<T> {
  success: true;
  data: T;
}

/**
 * Failure result
 */
export interface Failure<E = Error> {
  success: false;
  error: E;
}

/**
 * Result type - represents either success or failure
 * Inspired by Rust's Result<T, E> and functional programming patterns
 */
export type Result<T, E = Error> = Success<T> | Failure<E>;

/**
 * Helper to create a success result
 */
export function success<T>(data: T): Success<T> {
  return { success: true, data };
}

/**
 * Helper to create a failure result
 */
export function failure<E = Error>(error: E): Failure<E> {
  return { success: false, error };
}

/**
 * Type guard to check if result is success
 */
export function isSuccess<T, E>(result: Result<T, E>): result is Success<T> {
  return result.success === true;
}

/**
 * Type guard to check if result is failure
 */
export function isFailure<T, E>(result: Result<T, E>): result is Failure<E> {
  return result.success === false;
}

/**
 * Async Result type
 */
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;
```

### 3. Error Hierarchy

**Create `src/shared/errors/base.error.ts`:**

```typescript
/**
 * Base error class for all domain errors
 */
export abstract class DomainError extends Error {
  public readonly timestamp: Date;

  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date();
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to JSON for logging
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    };
  }
}
```

**Create `src/shared/errors/validation.error.ts`:**

```typescript
import { DomainError } from './base.error';

export interface ValidationErrorDetail {
  field: string;
  message: string;
  value?: unknown;
}

/**
 * Validation error - thrown when input validation fails
 */
export class ValidationError extends DomainError {
  constructor(
    message: string,
    public readonly details: ValidationErrorDetail[]
  ) {
    super(message, 'VALIDATION_ERROR', 400);
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      details: this.details,
    };
  }
}
```

**Create `src/shared/errors/not-found.error.ts`:**

```typescript
import { DomainError } from './base.error';

/**
 * Not found error - thrown when a resource is not found
 */
export class NotFoundError extends DomainError {
  constructor(
    resource: string,
    identifier: string | number
  ) {
    super(
      `${resource} with identifier '${identifier}' not found`,
      'NOT_FOUND',
      404
    );
  }
}
```

**Create `src/shared/errors/authentication.error.ts`:**

```typescript
import { DomainError } from './base.error';

/**
 * Authentication error - thrown when authentication fails
 */
export class AuthenticationError extends DomainError {
  constructor(message: string = 'Authentication failed') {
    super(message, 'AUTHENTICATION_ERROR', 401);
  }
}

/**
 * Authorization error - thrown when user lacks permissions
 */
export class AuthorizationError extends DomainError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 'AUTHORIZATION_ERROR', 403);
  }
}

/**
 * Token expired error
 */
export class TokenExpiredError extends DomainError {
  constructor(message: string = 'Token has expired') {
    super(message, 'TOKEN_EXPIRED', 401);
  }
}

/**
 * Invalid token error
 */
export class InvalidTokenError extends DomainError {
  constructor(message: string = 'Invalid token') {
    super(message, 'INVALID_TOKEN', 401);
  }
}
```

**Create `src/shared/errors/business.error.ts`:**

```typescript
import { DomainError } from './base.error';

/**
 * Business rule violation error
 */
export class BusinessRuleError extends DomainError {
  constructor(message: string, code: string = 'BUSINESS_RULE_VIOLATION') {
    super(message, code, 400);
  }
}

/**
 * Conflict error - thrown when operation conflicts with current state
 */
export class ConflictError extends DomainError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
  }
}

/**
 * Out of stock error
 */
export class OutOfStockError extends BusinessRuleError {
  constructor(productName: string) {
    super(`Product '${productName}' is out of stock`, 'OUT_OF_STOCK');
  }
}

/**
 * Insufficient funds error
 */
export class InsufficientFundsError extends BusinessRuleError {
  constructor() {
    super('Insufficient funds for this transaction', 'INSUFFICIENT_FUNDS');
  }
}
```

**Create `src/shared/errors/external-service.error.ts`:**

```typescript
import { DomainError } from './base.error';

/**
 * External service error - thrown when external API fails
 */
export class ExternalServiceError extends DomainError {
  constructor(
    serviceName: string,
    message: string,
    public readonly originalError?: Error
  ) {
    super(
      `External service '${serviceName}' error: ${message}`,
      'EXTERNAL_SERVICE_ERROR',
      502
    );
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      originalError: this.originalError?.message,
    };
  }
}

/**
 * Payment service error
 */
export class PaymentServiceError extends ExternalServiceError {
  constructor(message: string, originalError?: Error) {
    super('PaymentService', message, originalError);
    this.code = 'PAYMENT_SERVICE_ERROR';
  }
}

/**
 * Storage service error (AWS S3)
 */
export class StorageServiceError extends ExternalServiceError {
  constructor(message: string, originalError?: Error) {
    super('StorageService', message, originalError);
    this.code = 'STORAGE_SERVICE_ERROR';
  }
}
```

**Create `src/shared/errors/database.error.ts`:**

```typescript
import { DomainError } from './base.error';

/**
 * Database error - thrown when database operation fails
 */
export class DatabaseError extends DomainError {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly originalError?: Error
  ) {
    super(
      `Database error during ${operation}: ${message}`,
      'DATABASE_ERROR',
      500,
      false // Not operational - indicates system issue
    );
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      operation: this.operation,
      originalError: this.originalError?.message,
    };
  }
}

/**
 * Duplicate key error
 */
export class DuplicateKeyError extends DomainError {
  constructor(
    field: string,
    value: string
  ) {
    super(
      `${field} '${value}' already exists`,
      'DUPLICATE_KEY',
      409
    );
  }
}
```

**Create `src/shared/errors/index.ts`:**

```typescript
// Base
export * from './base.error';

// Specific errors
export * from './validation.error';
export * from './not-found.error';
export * from './authentication.error';
export * from './business.error';
export * from './external-service.error';
export * from './database.error';
```

### 4. API Response Types

**Create `src/shared/types/api-response.ts`:**

```typescript
/**
 * Standard API response format
 */
export interface ApiResponse<T = unknown> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
  error?: ApiError;
  timestamp: string;
}

/**
 * API error format
 */
export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Helper to create success response
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string
): ApiResponse<T> {
  return {
    status: 'success',
    data,
    message,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Helper to create error response
 */
export function createErrorResponse(
  code: string,
  message: string,
  details?: unknown
): ApiResponse<never> {
  return {
    status: 'error',
    error: {
      code,
      message,
      details,
    },
    timestamp: new Date().toISOString(),
  };
}
```

### 5. Utility Types

**Create `src/shared/types/utility.ts`:**

```typescript
/**
 * Make all properties optional recursively
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Make all properties required recursively
 */
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

/**
 * Extract properties of a certain type
 */
export type PropertiesOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

/**
 * Omit properties by type
 */
export type OmitByType<T, U> = Omit<T, PropertiesOfType<T, U>>;

/**
 * Pick properties by type
 */
export type PickByType<T, U> = Pick<T, PropertiesOfType<T, U>>;

/**
 * Make specific properties optional
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Make specific properties required
 */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/**
 * Nullable type
 */
export type Nullable<T> = T | null;

/**
 * Maybe type (nullable or undefined)
 */
export type Maybe<T> = T | null | undefined;
```

### 6. Value Object Base Class

**Create `src/shared/domain/value-object.ts`:**

```typescript
/**
 * Base class for value objects
 * Value objects are immutable and compared by value, not identity
 */
export abstract class ValueObject<T> {
  protected readonly value: T;

  constructor(value: T) {
    this.value = Object.freeze(value);
  }

  /**
   * Get the raw value
   */
  getValue(): T {
    return this.value;
  }

  /**
   * Check equality with another value object
   */
  equals(other: ValueObject<T>): boolean {
    if (other === null || other === undefined) {
      return false;
    }
    if (other.constructor !== this.constructor) {
      return false;
    }
    return JSON.stringify(this.value) === JSON.stringify(other.value);
  }

  /**
   * Convert to string
   */
  toString(): string {
    return JSON.stringify(this.value);
  }
}
```

### 7. Entity Base Class

**Create `src/shared/domain/entity.ts`:**

```typescript
import { ID } from '../types/common';

/**
 * Base class for entities
 * Entities are compared by identity (ID), not by value
 */
export abstract class Entity<T> {
  protected readonly _id: ID;
  protected readonly props: T;

  constructor(props: T, id: ID) {
    this._id = id;
    this.props = props;
  }

  /**
   * Get entity ID
   */
  get id(): ID {
    return this._id;
  }

  /**
   * Check equality with another entity
   */
  equals(other: Entity<T>): boolean {
    if (other === null || other === undefined) {
      return false;
    }
    if (!(other instanceof Entity)) {
      return false;
    }
    return this._id === other._id;
  }
}
```

### 8. Constants

**Create `src/shared/constants/index.ts`:**

```typescript
/**
 * Application constants
 */
export const APP_CONSTANTS = {
  // JWT
  JWT_EXPIRY: '30d',
  JWT_REFRESH_EXPIRY: '90d',
  
  // Pagination
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
  
  // Validation
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
  
  // Business rules
  MAX_CART_ITEMS: 50,
  MAX_WISHLIST_ITEMS: 100,
  ORDER_DELIVERY_DAYS: 4,
  
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: 60 * 1000, // 1 minute
  RATE_LIMIT_MAX_REQUESTS: 100,
  
  // Timeouts
  DEFAULT_TIMEOUT_MS: 30000, // 30 seconds
  PAYMENT_TIMEOUT_MS: 60000, // 60 seconds
} as const;

/**
 * HTTP status codes
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

/**
 * Error codes
 */
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;
```

---

## Validation Steps

### 1. Type Checking
```bash
npm run type-check
```
**Expected:** No errors

### 2. Create Test File

**Create `src/shared/__tests__/result.test.ts`:**

```typescript
import { success, failure, isSuccess, isFailure } from '../types/result';

describe('Result Type', () => {
  it('should create success result', () => {
    const result = success({ id: '123', name: 'Test' });
    expect(result.success).toBe(true);
    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.data.id).toBe('123');
    }
  });

  it('should create failure result', () => {
    const error = new Error('Test error');
    const result = failure(error);
    expect(result.success).toBe(false);
    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error.message).toBe('Test error');
    }
  });
});
```

### 3. Test Error Hierarchy

**Create `src/shared/__tests__/errors.test.ts`:**

```typescript
import {
  ValidationError,
  NotFoundError,
  AuthenticationError,
  BusinessRuleError,
} from '../errors';

describe('Error Hierarchy', () => {
  it('should create validation error', () => {
    const error = new ValidationError('Invalid input', [
      { field: 'email', message: 'Invalid email format' },
    ]);
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.details).toHaveLength(1);
  });

  it('should create not found error', () => {
    const error = new NotFoundError('User', '123');
    expect(error.statusCode).toBe(404);
    expect(error.message).toContain('User');
    expect(error.message).toContain('123');
  });

  it('should create authentication error', () => {
    const error = new AuthenticationError();
    expect(error.statusCode).toBe(401);
    expect(error.code).toBe('AUTHENTICATION_ERROR');
  });
});
```

---

## Deliverables

- [ ] Common types created (`common.ts`)
- [ ] Result type pattern implemented (`result.ts`)
- [ ] Complete error hierarchy created
- [ ] API response types defined
- [ ] Utility types created
- [ ] Value object base class created
- [ ] Entity base class created
- [ ] Constants defined
- [ ] All files pass type checking
- [ ] Unit tests written and passing
- [ ] Documentation comments added (JSDoc)

---

## Usage Examples

### Example 1: Using Result Type

```typescript
import { Result, success, failure } from '@shared/types/result';
import { NotFoundError } from '@shared/errors';

async function findUser(id: string): Promise<Result<User, NotFoundError>> {
  const user = await userRepository.findById(id);
  
  if (!user) {
    return failure(new NotFoundError('User', id));
  }
  
  return success(user);
}

// Usage
const result = await findUser('123');
if (isSuccess(result)) {
  console.log(result.data.name);
} else {
  console.error(result.error.message);
}
```

### Example 2: Using Custom Errors

```typescript
import { ValidationError } from '@shared/errors';

function validateEmail(email: string): void {
  if (!email.includes('@')) {
    throw new ValidationError('Invalid email', [
      { field: 'email', message: 'Email must contain @' },
    ]);
  }
}
```

---

## Next Steps

After completing this task:
1. Proceed to **Task 3: Setup Testing Infrastructure**
2. Begin using these types in domain models
3. Update existing error handling to use new error classes

---

**Task Owner:** Development Team  
**Reviewer:** Tech Lead  
**Estimated Effort:** 4-5 days  
**Status:** Not Started
