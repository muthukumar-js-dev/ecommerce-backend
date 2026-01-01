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
