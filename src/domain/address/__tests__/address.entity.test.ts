import { Address } from '../entities/address.entity';

describe('Address Entity', () => {
  const validProps = {
    userId: 'user123',
    name: 'John Doe',
    firstLine: '123 Main St',
    secondLine: 'Apt 4B',
    city: 'New York',
    state: 'NY',
    country: 'USA',
    countryCode: 'US',
    postalCode: '10001',
    phone: '1234567890',
    phoneCode: '+1',
    isDefault: false,
    status: 1,
  };

  describe('create', () => {
    it('should create an address with valid props', () => {
      const address = Address.create(validProps, 'addr123');

      expect(address.id).toBe('addr123');
      expect(address.name).toBe('John Doe');
      expect(address.city).toBe('New York');
    });

    it('should set default values', () => {
      const props = { ...validProps, isDefault: undefined, status: undefined };
      const address = Address.create(props as unknown as typeof validProps, 'addr123');

      expect(address.isDefault).toBe(false);
      expect(address.status).toBe(1);
    });
  });

  describe('computed properties', () => {
    it('should determine isActive correctly', () => {
      const active = Address.create(validProps, 'addr123');
      const inactive = Address.create({ ...validProps, status: 0 }, 'addr456');

      expect(active.isActive).toBe(true);
      expect(inactive.isActive).toBe(false);
    });

    it('should format full address correctly', () => {
      const address = Address.create(validProps, 'addr123');

      expect(address.fullAddress).toBe('123 Main St, Apt 4B, New York, NY, 10001, USA');
    });
  });

  describe('setAsDefault', () => {
    it('should set address as default', () => {
      const address = Address.create(validProps, 'addr123');

      address.setAsDefault();

      expect(address.isDefault).toBe(true);
    });
  });

  describe('unsetDefault', () => {
    it('should unset default status', () => {
      const address = Address.create({ ...validProps, isDefault: true }, 'addr123');

      address.unsetDefault();

      expect(address.isDefault).toBe(false);
    });
  });

  describe('activate/deactivate', () => {
    it('should deactivate address', () => {
      const address = Address.create(validProps, 'addr123');

      address.deactivate();

      expect(address.status).toBe(0);
      expect(address.isActive).toBe(false);
    });

    it('should activate address', () => {
      const address = Address.create({ ...validProps, status: 0 }, 'addr123');

      address.activate();

      expect(address.status).toBe(1);
      expect(address.isActive).toBe(true);
    });
  });
});
