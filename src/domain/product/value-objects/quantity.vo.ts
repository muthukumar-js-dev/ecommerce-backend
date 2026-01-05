import { ValueObject } from '@shared/domain/value-object';
import { ValidationError } from '@shared/errors';

interface QuantityProps {
  value: number;
}

export class Quantity extends ValueObject<QuantityProps> {
  private constructor(props: QuantityProps) {
    super(props);
  }

  static create(value: number): Quantity {
    if (value < 0) {
      throw new ValidationError('Invalid quantity', [
        { field: 'quantity', message: 'Quantity cannot be negative' },
      ]);
    }

    if (!Number.isInteger(value)) {
      throw new ValidationError('Invalid quantity', [
        { field: 'quantity', message: 'Quantity must be a whole number' },
      ]);
    }

    return new Quantity({ value });
  }

  static zero(): Quantity {
    return new Quantity({ value: 0 });
  }

  get value(): number {
    return this._value.value;
  }

  get isZero(): boolean {
    return this.value === 0;
  }

  get isAvailable(): boolean {
    return this.value > 0;
  }

  add(other: Quantity): Quantity {
    return Quantity.create(this.value + other.value);
  }

  subtract(other: Quantity): Quantity {
    // Result can be 0, but not negative.
    // Logic: if other > this, throw error or return 0? 
    // Usually business logic checks isGreaterThan before subtracting.
    // But Quantity type itself should ensure it doesn't become negative.
    if (other.value > this.value) {
         throw new ValidationError('Insufficient quantity', [{field: 'quantity', message: 'Resulting quantity cannot be negative'}]);
    }
    return Quantity.create(this.value - other.value);
  }

  isGreaterThan(other: Quantity): boolean {
    return this.value > other.value;
  }
  
  isLessThan(other: Quantity): boolean {
    return this.value < other.value;
  }
  
  toString(): string {
      return this.value.toString();
  }
}
