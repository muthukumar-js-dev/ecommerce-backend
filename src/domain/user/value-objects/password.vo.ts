import { ValueObject } from '../../../shared/domain/value-object';
import { ValidationError } from '../../../shared/errors';
import bcrypt from 'bcrypt';

interface PasswordProps {
  hashedValue: string;
}

/**
 * Password Value Object
 * Handles password hashing and validation
 */
export class Password extends ValueObject<PasswordProps> {
  private static readonly MIN_LENGTH = 8;
  private static readonly SALT_ROUNDS = 10;

  private constructor(props: PasswordProps) {
    super(props);
  }

  static async create(plainPassword: string): Promise<Password> {
    this.validate(plainPassword);
    const hashedValue = await bcrypt.hash(plainPassword, this.SALT_ROUNDS);
    return new Password({ hashedValue });
  }

  static fromHash(hashedValue: string): Password {
    return new Password({ hashedValue });
  }

  private static validate(password: string): void {
    const errors: Array<{ field: string; message: string }> = [];

    if (!password || password.length < this.MIN_LENGTH) {
      errors.push({
        field: 'password',
        message: `Password must be at least ${this.MIN_LENGTH} characters`,
      });
    }

    if (!/[A-Z]/.test(password)) {
      errors.push({
        field: 'password',
        message: 'Password must contain at least one uppercase letter',
      });
    }

    if (!/[a-z]/.test(password)) {
      errors.push({
        field: 'password',
        message: 'Password must contain at least one lowercase letter',
      });
    }

    if (!/[0-9]/.test(password)) {
      errors.push({
        field: 'password',
        message: 'Password must contain at least one number',
      });
    }

    if (errors.length > 0) {
      throw new ValidationError('Password validation failed', errors);
    }
  }

  async compare(plainPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, this.getValue().hashedValue);
  }

  get hash(): string {
    return this.getValue().hashedValue;
  }
}
