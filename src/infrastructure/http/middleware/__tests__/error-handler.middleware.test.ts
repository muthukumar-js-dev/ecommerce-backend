import { Request, Response, NextFunction } from 'express';
import { errorHandler } from '../error-handler.middleware';
import {
  ValidationError,
  AuthenticationError,
  NotFoundError,
  ConflictError,
  OutOfStockError,
  DomainError,
} from '@shared/errors';

describe('Error Handler Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    req = {
      path: '/test',
      method: 'GET',
    };

    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    res = {
      status: statusMock,
    };

    next = jest.fn();

    // Suppress console.error during tests
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should handle ValidationError with 400 status', () => {
    const error = new ValidationError('Validation failed', [
      { field: 'email', message: 'Invalid email' },
    ]);

    errorHandler(error, req as Request, res as Response, next);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      error: {
        code: error.code,
        message: 'Validation failed',
        details: [{ field: 'email', message: 'Invalid email' }],
      },
    });
  });

  it('should handle AuthenticationError with 401 status', () => {
    const error = new AuthenticationError('Invalid token');

    errorHandler(error, req as Request, res as Response, next);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      error: {
        code: error.code,
        message: 'Invalid token',
      },
    });
  });

  it('should handle NotFoundError with 404 status', () => {
    const error = new NotFoundError('User', '123');

    errorHandler(error, req as Request, res as Response, next);

    expect(statusMock).toHaveBeenCalledWith(404);
  });

  it('should handle ConflictError with 409 status', () => {
    const error = new ConflictError('Email already exists');

    errorHandler(error, req as Request, res as Response, next);

    expect(statusMock).toHaveBeenCalledWith(409);
  });

  it('should handle OutOfStockError with 400 status', () => {
    const error = new OutOfStockError('Product out of stock');

    errorHandler(error, req as Request, res as Response, next);

    expect(statusMock).toHaveBeenCalledWith(400);
  });

  it('should handle generic DomainError with custom status code', () => {
    // Create a concrete error class for testing
    class CustomDomainError extends DomainError {
      constructor() {
        super('Custom error', 'CUSTOM_ERROR', 418);
      }
    }
    const error = new CustomDomainError();

    errorHandler(error, req as Request, res as Response, next);

    expect(statusMock).toHaveBeenCalledWith(418);
  });

  it('should handle unknown errors with 500 status', () => {
    const error = new Error('Unknown error');

    errorHandler(error, req as Request, res as Response, next);

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: expect.any(String),
      },
    });
  });

  it('should hide error details in production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const error = new Error('Sensitive error');

    errorHandler(error, req as Request, res as Response, next);

    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });

    process.env.NODE_ENV = originalEnv;
  });
});
