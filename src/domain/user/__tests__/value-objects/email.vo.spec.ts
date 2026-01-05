import { Email } from '../../../value-objects/email.vo';
import { ValidationError } from '@shared/errors';

describe('Email Value Object', () => {
  it('should create a valid email', () => {
    const emailStr = 'test@example.com';
    const email = Email.create(emailStr);
    
    expect(email.value).toBe(emailStr);
    expect(email.domain).toBe('example.com');
    expect(email.localPart).toBe('test');
    expect(email.toString()).toBe(emailStr);
  });

  it('should normalize email to lowercase', () => {
    const email = Email.create('TEST@Example.com');
    expect(email.value).toBe('test@example.com');
  });

  it('should trim whitespace', () => {
    const email = Email.create('  test@example.com  ');
    expect(email.value).toBe('test@example.com');
  });

  it('should throw error for invalid email format', () => {
    const invalidEmails = [
      '',
      'invalid',
      'test@',
      '@example.com',
      'test@example',
      'test space@example.com'
    ];

    invalidEmails.forEach(invalidEmail => {
      expect(() => Email.create(invalidEmail)).toThrow(ValidationError);
    });
  });
});
