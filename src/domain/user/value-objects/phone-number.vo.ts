import { ValueObject } from '@shared/domain/value-object';
import { ValidationError } from '@shared/errors';

interface PhoneNumberProps {
  countryCode: string;
  number: string;
}

/**
 * PhoneNumber Value Object
 * Ensures phone number is in valid format
 */
export class PhoneNumber extends ValueObject<PhoneNumberProps> {
  private constructor(props: PhoneNumberProps) {
    super(props);
  }

  static create(countryCode: string, number: string): PhoneNumber {
    const cleanNumber = number.replace(/\D/g, '');

    if (cleanNumber.length < 10 || cleanNumber.length > 15) {
      throw new ValidationError('Invalid phone number', [
        { field: 'phone', message: 'Phone number must be 10-15 digits' },
      ]);
    }

    return new PhoneNumber({
      countryCode: countryCode.startsWith('+') ? countryCode : `+${countryCode}`,
      number: cleanNumber,
    });
  }

  static fromString(fullNumber: string): PhoneNumber {
    // Basic parsing: assume first 3 chars are country code if starts with +, else default to +91 or similar?
    // Better: regex to separate.
    // For now, let's just use a simple heuristic or require + prefix.
    const match = fullNumber.match(/^(\+\d{1,3})(\d+)$/);
    if (!match) {
        // Fallback or throw?
        // Let's assume input is just the number and default country code if not present,
        // or treat whole thing as number if we can't parse.
        // Actually, let's just take first 3 digits as code if > 12 digits?
        // Let's stick to safe parsing only if + exists
        throw new ValidationError('Invalid phone number format for parsing', []);
    }
    return this.create(match[1]!, match[2]!);
  }

  get fullNumber(): string {
    const props = this.getValue();
    return `${props.countryCode}${props.number}`;
  }

  get formatted(): string {
    // Format as +XX XXX XXX XXXX
    const { countryCode, number } = this.getValue();
    const formatted = number.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
    return `${countryCode} ${formatted}`;
  }

  toString(): string {
    return this.fullNumber;
  }
}
