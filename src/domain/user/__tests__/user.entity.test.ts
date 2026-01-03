import { User } from '../entities/user.entity';
import { UserRole } from '@shared/types/common';

describe('User Entity', () => {
  const validProps = {
    name: 'John Doe',
    email: 'john@example.com',
    passwordHash: '$2b$10$hashedpassword',
    role: UserRole.USER,
    currentOrder: 0,
    returnedCount: 0,
  };

  describe('create', () => {
    it('should create a user entity with valid props', () => {
      const user = User.create(validProps, '123');

      expect(user.id).toBe('123');
      expect(user.name).toBe('John Doe');
      expect(user.email).toBe('john@example.com');
      expect(user.role).toBe(UserRole.USER);
      expect(user.currentOrder).toBe(0);
      expect(user.returnedCount).toBe(0);
    });

    it('should set default values for currentOrder and returnedCount', () => {
      const propsWithoutDefaults = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        passwordHash: 'hashed',
        role: UserRole.USER,
      };

      const user = User.create(propsWithoutDefaults as typeof validProps, '456');

      expect(user.currentOrder).toBe(0);
      expect(user.returnedCount).toBe(0);
    });

    it('should set createdAt and updatedAt timestamps', () => {
      const user = User.create(validProps, '123');

      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('role checks', () => {
    it('should identify admin users', () => {
      const admin = User.create({ ...validProps, role: UserRole.ADMIN }, '123');

      expect(admin.isAdmin).toBe(true);
      expect(admin.isSeller).toBe(false);
      expect(admin.isUser).toBe(false);
    });

    it('should identify seller users', () => {
      const seller = User.create({ ...validProps, role: UserRole.SELLER }, '123');

      expect(seller.isAdmin).toBe(false);
      expect(seller.isSeller).toBe(true);
      expect(seller.isUser).toBe(false);
    });

    it('should identify regular users', () => {
      const user = User.create({ ...validProps, role: UserRole.USER }, '123');

      expect(user.isAdmin).toBe(false);
      expect(user.isSeller).toBe(false);
      expect(user.isUser).toBe(true);
    });
  });

  describe('business methods', () => {
    describe('updateLastLogin', () => {
      it('should update lastLogin timestamp', () => {
        const user = User.create(validProps, '123');
        const beforeUpdate = new Date();

        user.updateLastLogin();

        expect(user.lastLogin).toBeInstanceOf(Date);
        expect(user.lastLogin!.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
      });
    });

    describe('incrementOrderCount', () => {
      it('should increment order count', () => {
        const user = User.create(validProps, '123');

        user.incrementOrderCount();

        expect(user.currentOrder).toBe(1);
      });

      it('should increment multiple times', () => {
        const user = User.create(validProps, '123');

        user.incrementOrderCount();
        user.incrementOrderCount();
        user.incrementOrderCount();

        expect(user.currentOrder).toBe(3);
      });
    });

    describe('decrementOrderCount', () => {
      it('should decrement order count', () => {
        const user = User.create({ ...validProps, currentOrder: 5 }, '123');

        user.decrementOrderCount();

        expect(user.currentOrder).toBe(4);
      });

      it('should not allow negative order count', () => {
        const user = User.create(validProps, '123');

        user.decrementOrderCount();

        expect(user.currentOrder).toBe(0);
      });
    });

    describe('incrementReturnedCount', () => {
      it('should increment returned count', () => {
        const user = User.create(validProps, '123');

        user.incrementReturnedCount();

        expect(user.returnedCount).toBe(1);
      });
    });

    describe('token management', () => {
      it('should update token', () => {
        const user = User.create(validProps, '123');

        user.updateToken('new-token-123');

        expect(user.token).toBe('new-token-123');
      });

      it('should clear token', () => {
        const user = User.create({ ...validProps, token: 'existing-token' }, '123');

        user.clearToken();

        expect(user.token).toBeUndefined();
      });
    });

    describe('setStripeCustomerId', () => {
      it('should set Stripe customer ID', () => {
        const user = User.create(validProps, '123');

        user.setStripeCustomerId('cus_123456');

        expect(user.stripeCustomerId).toBe('cus_123456');
      });
    });

    describe('updateShopDetails', () => {
      it('should update shop name', () => {
        const user = User.create({ ...validProps, role: UserRole.SELLER }, '123');

        user.updateShopDetails({ shopName: 'My Shop' });

        expect(user.shopName).toBe('My Shop');
      });

      it('should update shop mobile number', () => {
        const user = User.create({ ...validProps, role: UserRole.SELLER }, '123');

        user.updateShopDetails({ shopMobileNumber: '+1234567890' });

        expect(user.shopMobileNumber).toBe('+1234567890');
      });

      it('should update shop address', () => {
        const user = User.create({ ...validProps, role: UserRole.SELLER }, '123');

        user.updateShopDetails({ shopAddress: '123 Main St' });

        expect(user.shopAddress).toBe('123 Main St');
      });

      it('should update multiple shop details at once', () => {
        const user = User.create({ ...validProps, role: UserRole.SELLER }, '123');

        user.updateShopDetails({
          shopName: 'My Shop',
          shopMobileNumber: '+1234567890',
          shopAddress: '123 Main St',
        });

        expect(user.shopName).toBe('My Shop');
        expect(user.shopMobileNumber).toBe('+1234567890');
        expect(user.shopAddress).toBe('123 Main St');
      });
    });
  });

  describe('getters', () => {
    it('should expose all properties via getters', () => {
      const user = User.create(
        {
          ...validProps,
          token: 'test-token',
          lastLogin: new Date('2024-01-01'),
          stripeCustomerId: 'cus_123',
          shopName: 'Test Shop',
          shopMobileNumber: '+1234567890',
          shopAddress: '123 Test St',
        },
        '123'
      );

      expect(user.name).toBe('John Doe');
      expect(user.email).toBe('john@example.com');
      expect(user.passwordHash).toBe('$2b$10$hashedpassword');
      expect(user.role).toBe(UserRole.USER);
      expect(user.token).toBe('test-token');
      expect(user.lastLogin).toBeInstanceOf(Date);
      expect(user.currentOrder).toBe(0);
      expect(user.returnedCount).toBe(0);
      expect(user.stripeCustomerId).toBe('cus_123');
      expect(user.shopName).toBe('Test Shop');
      expect(user.shopMobileNumber).toBe('+1234567890');
      expect(user.shopAddress).toBe('123 Test St');
    });
  });
});
