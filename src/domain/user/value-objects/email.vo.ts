import { ValueObject } from '../../../shared/domain/value-object';
import { ValidationError } from '../../../shared/errors';

interface EmailProps {
  value: string;
}

/**
 * Email Value Object
 * Ensures email is always in valid format
 */
export class Email extends ValueObject<EmailProps> {
  private constructor(props: EmailProps) {
    super(props);
  }

  static create(email: string): Email {
    if (!this.isValid(email)) {
      throw new ValidationError('Invalid email format', [
        { field: 'email', message: 'Email must be a valid email address' },
      ]);
    }

    return new Email({ value: email.toLowerCase().trim() });
  }

  private static isValid(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  get value(): string {
    return this.getValue().value;
  }

  get domain(): string {
    return this.getValue().value.split('@')[1]!;
  }

  get localPart(): string {
    return this.getValue().value.split('@')[0]!;
  }

  toString(): string {
    return this.value;
  }
}
