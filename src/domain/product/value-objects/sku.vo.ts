import { ValueObject } from '@shared/domain/value-object';
import { ValidationError } from '@shared/errors';

interface SKUProps {
  value: string;
}

export class SKU extends ValueObject<SKUProps> {
  // Allow A-Z, 0-9, and hyphens. Length 6-20.
  private static readonly PATTERN = /^[A-Z0-9-]{6,20}$/;

  private constructor(props: SKUProps) {
    super(props);
  }

  static create(value: string): SKU {
    const normalized = value.toUpperCase().trim();

    if (!this.PATTERN.test(normalized)) {
      throw new ValidationError('Invalid SKU format', [
        {
          field: 'sku',
          message: 'SKU must be 6-20 alphanumeric characters (hyphens allowed)',
        },
      ]);
    }

    return new SKU({ value: normalized });
  }

  static generate(category: string, sequence: number): SKU {
    const categoryCode = category.substring(0, 3).toUpperCase();
    const sequenceStr = sequence.toString().padStart(6, '0');
    return new SKU({ value: `${categoryCode}-${sequenceStr}` });
  }

  get value(): string {
    return this._value.value;
  }

  toString(): string {
    return this.value;
  }
}
