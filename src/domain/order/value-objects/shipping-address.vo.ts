import { ValueObject } from '@shared/domain/value-object';
import { ValidationError } from '@shared/errors';

interface ShippingAddressProps {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  recipientName: string;
  phoneNumber: string;
}

export class ShippingAddress extends ValueObject<ShippingAddressProps> {
  private constructor(props: ShippingAddressProps) {
    super(props);
  }

  static create(props: ShippingAddressProps): ShippingAddress {
    this.validate(props);
    return new ShippingAddress(props);
  }

  private static validate(props: ShippingAddressProps): void {
    const errors: Array<{ field: string; message: string }> = [];

    if (!props.street || props.street.trim().length < 5) {
      errors.push({ field: 'street', message: 'Street address is required' });
    }

    if (!props.city || props.city.trim().length < 2) {
      errors.push({ field: 'city', message: 'City is required' });
    }

    if (!props.postalCode || !/^\d{6}$/.test(props.postalCode)) {
      errors.push({ field: 'postalCode', message: 'Invalid postal code' });
    }

    if (errors.length > 0) {
      throw new ValidationError('Invalid shipping address', errors);
    }
  }

  get fullAddress(): string {
    return `${this._value.street}, ${this._value.city}, ${this._value.state} ${this._value.postalCode}, ${this._value.country}`;
  }

  get recipientName(): string {
    return this._value.recipientName;
  }

  get phoneNumber(): string {
    return this._value.phoneNumber;
  }
}
