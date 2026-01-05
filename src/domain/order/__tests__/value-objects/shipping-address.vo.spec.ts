import { ShippingAddress } from '../../value-objects/shipping-address.vo';
import { ValidationError } from '@shared/errors';

describe('ShippingAddress Value Object', () => {
  const validProps = {
    street: '123 Main St',
    city: 'City',
    state: 'State',
    postalCode: '123456',
    country: 'Country',
    recipientName: 'Name',
    phoneNumber: '1234567890',
  };

  it('should create valid address', () => {
    const address = ShippingAddress.create(validProps);
    expect(address.recipientName).toBe('Name');
  });

  it('should validate street length', () => {
    expect(() =>
      ShippingAddress.create({ ...validProps, street: '123' })
    ).toThrow(ValidationError);
  });

  it('should validate postal code format', () => {
    expect(() =>
      ShippingAddress.create({ ...validProps, postalCode: '123' })
    ).toThrow(ValidationError);
  });

  it('should format full address correctly', () => {
    const address = ShippingAddress.create(validProps);
    expect(address.fullAddress).toBe(
      '123 Main St, City, State 123456, Country'
    );
  });
});
