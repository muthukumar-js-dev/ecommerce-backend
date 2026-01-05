import { Password } from '../../../value-objects/password.vo';
import { ValidationError } from '@shared/errors';

describe('Password Value Object', () => {
  it('should create a password and hash it', async () => {
    const plain = 'Password123';
    const password = await Password.create(plain);
    
    expect(password.hash).toBeDefined();
    expect(password.hash).not.toBe(plain);
  });

  it('should compare password correctly', async () => {
    const plain = 'Password123';
    const password = await Password.create(plain);
    
    const isValid = await password.compare(plain);
    const isInvalid = await password.compare('WrongPass123');
    
    expect(isValid).toBe(true);
    expect(isInvalid).toBe(false);
  });

  it('should recreate from existing hash', () => {
    const hash = '$2b$10$abcdef...';
    const password = Password.fromHash(hash);
    expect(password.hash).toBe(hash);
  });

  describe('Validation', () => {
    it('should throw if too short', async () => {
      await expect(Password.create('Pass1')).rejects.toThrow(ValidationError);
    });

    it('should throw if no uppercase', async () => {
      await expect(Password.create('password123')).rejects.toThrow(ValidationError);
    });

    it('should throw if no lowercase', async () => {
      await expect(Password.create('PASSWORD123')).rejects.toThrow(ValidationError);
    });

    it('should throw if no number', async () => {
      await expect(Password.create('PasswordValid')).rejects.toThrow(ValidationError);
    });
  });
});
