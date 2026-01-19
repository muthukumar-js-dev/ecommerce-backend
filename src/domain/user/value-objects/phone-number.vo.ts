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
    if (!fullNumber.startsWith('+')) {
      throw new ValidationError('Invalid phone number format for parsing', []);
    }

    const digits = fullNumber.substring(1).replace(/\D/g, '');

    // Try to split country code (1-3 digits) and number
    for (let i = 1; i <= 3; i++) {
      const cc = '+' + digits.substring(0, i);
      const num = digits.substring(i);
      // let create validate exact length, but we filter here to match
      if (num.length >= 10 && num.length <= 15) {
        return this.create(cc, num);
      }
    }

    throw new ValidationError('Invalid phone number format for parsing', []);
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
