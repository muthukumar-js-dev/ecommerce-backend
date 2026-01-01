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
