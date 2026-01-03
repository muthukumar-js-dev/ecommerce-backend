import { Request, Response, NextFunction } from 'express';
import {
  DomainError,
  ValidationError,
  AuthenticationError,
  NotFoundError,
  ConflictError,
  OutOfStockError,
} from '@shared/errors';

/**
 * Centralized error handling middleware
 * Maps domain errors to HTTP responses
 */
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log error
  console.error('Error:', {
    name: error.name,
    message: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  // Handle ValidationError
  if (error instanceof ValidationError) {
    res.status(400).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    });
    return;
  }

  // Handle AuthenticationError
  if (error instanceof AuthenticationError) {
    res.status(401).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    });
    return;
  }

  // Handle NotFoundError
  if (error instanceof NotFoundError) {
    res.status(404).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    });
    return;
  }

  // Handle ConflictError
  if (error instanceof ConflictError) {
    res.status(409).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    });
    return;
  }

  // Handle OutOfStockError
  if (error instanceof OutOfStockError) {
    res.status(400).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    });
    return;
  }

  // Handle other DomainErrors
  if (error instanceof DomainError) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    });
    return;
  }

  // Handle unknown errors
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message:
        process.env.NODE_ENV === 'production'
          ? 'An unexpected error occurred'
          : error.message,
    },
  });
}
