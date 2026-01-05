import { User } from '../aggregates/user.aggregate';
import { Email } from '../value-objects/email.vo';
import { Password } from '../value-objects/password.vo';
import { UserRole } from '@shared/types/common';

describe('User Aggregate', () => {
  let email: Email;
  let password: Password;

  beforeEach(async () => {
    email = Email.create('test@example.com');
    password = await Password.create('Password123');
  });

  describe('create', () => {
    it('should create a user and raise UserRegistered event', () => {
      const user = User.create(
        {
          name: 'John Doe',
          email,
          password,
          role: UserRole.USER,
        },
        '123'
      );

      expect(user.id).toBe('123');
      expect(user.name).toBe('John Doe');
      expect(user.domainEvents).toHaveLength(1);
      expect(user.domainEvents[0].eventName).toBe('UserRegistered');
    });

    it('should initialize with zero order counts', () => {
      const user = User.create(
        { name: 'John', email, password, role: UserRole.USER },
        '123'
      );

      expect(user.currentOrderCount).toBe(0);
      expect(user.returnedOrderCount).toBe(0);
    });
  });

  describe('recordLogin', () => {
    it('should update last login and raise UserLoggedIn event', () => {
      const user = User.create(
        { name: 'John', email, password, role: UserRole.USER },
        '123'
      );
      user.clearDomainEvents();

      user.recordLogin('192.168.1.1', 'Mozilla/5.0');

      expect(user.domainEvents).toHaveLength(1);
      expect(user.domainEvents[0].eventName).toBe('UserLoggedIn');
    });
  });

  describe('changeRole', () => {
    it('should change role and raise UserRoleChanged event', () => {
      const user = User.create(
        { name: 'John', email, password, role: UserRole.USER },
        '123'
      );
      user.updateSellerDetails('My Shop', '123 Main St');
      user.clearDomainEvents();

      user.changeRole(UserRole.SELLER, 'admin-123');

      expect(user.role).toBe(UserRole.SELLER);
      expect(user.isSeller).toBe(true);
      expect(user.domainEvents).toHaveLength(1);
      expect(user.domainEvents[0].eventName).toBe('UserRoleChanged');
    });

    it('should throw error when changing to seller without shop details', () => {
      const user = User.create(
        { name: 'John', email, password, role: UserRole.USER },
        '123'
      );

      expect(() => user.changeRole(UserRole.SELLER, 'admin-123')).toThrow(
        'Cannot change role to seller without shop details'
      );
    });
  });

  describe('incrementOrderCount', () => {
    it('should increment order count', () => {
      const user = User.create(
        { name: 'John', email, password, role: UserRole.USER },
        '123'
      );

      user.incrementOrderCount();

      expect(user.currentOrderCount).toBe(1);
    });

    it('should throw error when max orders reached', () => {
      const user = User.create(
        { name: 'John', email, password, role: UserRole.USER },
        '123'
      );

      // Set to max
      for (let i = 0; i < 50; i++) {
        user.incrementOrderCount();
      }

      expect(() => user.incrementOrderCount()).toThrow('maximum order limit');
    });
  });

  describe('canPlaceOrder', () => {
    it('should return true for active user under limit', () => {
      const user = User.create(
        { name: 'John', email, password, role: UserRole.USER },
        '123'
      );

      expect(user.canPlaceOrder).toBe(true);
    });

    it('should return false for inactive user', () => {
      const user = User.create(
        { name: 'John', email, password, role: UserRole.USER },
        '123'
      );
      user.deactivate();

      expect(user.canPlaceOrder).toBe(false);
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const user = User.create(
        { name: 'John', email, password, role: UserRole.USER },
        '123'
      );

      const isValid = await user.verifyPassword('Password123');
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const user = User.create(
        { name: 'John', email, password, role: UserRole.USER },
        '123'
      );

      const isValid = await user.verifyPassword('WrongPassword');
      expect(isValid).toBe(false);
    });
  });
});
