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
