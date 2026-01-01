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
        expect(true).toBe(false); // Should be success
      }
    });
    
    it('should correctly identify failure results', () => {
      const result: Result<string> = failure(new Error('fail'));
      
      if (isFailure(result)) {
        // TypeScript should know result.error exists
        expect(result.error.message).toBe('fail');
      } else {
        expect(true).toBe(false); // Should be failure
      }
    });
  });
});
