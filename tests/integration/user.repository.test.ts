import { UserRepository } from '../../src/infrastructure/database/mongodb/repositories/user.repository';
import { User } from '../../src/domain/user/entities/user.entity';
import { UserRole } from '../../src/shared/types/common';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
  testDataGenerator,
} from '../utils/test-helpers';
import { isSuccess, isFailure } from '../../src/shared/types/result';

describe('UserRepository Integration Tests', () => {
  let repository: UserRepository;

  beforeAll(async () => {
    await connectTestDatabase();
    repository = new UserRepository();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  describe('save', () => {
    it('should save and retrieve a user', async () => {
      const user = User.create(
        {
          name: 'Test User',
          email: 'test@example.com',
          passwordHash: 'hashed_password',
          role: UserRole.USER,
          currentOrder: 0,
          returnedCount: 0,
        },
        '507f1f77bcf86cd799439011'
      );

      const saveResult = await repository.save(user);
      expect(isSuccess(saveResult)).toBe(true);

      if (isSuccess(saveResult)) {
        const found = await repository.findByEmail('test@example.com');
        expect(found).not.toBeNull();
        expect(found?.name).toBe('Test User');
        expect(found?.email).toBe('test@example.com');
        expect(found?.role).toBe(UserRole.USER);
      }
    });

    it('should return error for duplicate email', async () => {
      const user1 = User.create(
        {
          name: 'User 1',
          email: 'duplicate@example.com',
          passwordHash: 'hashed_password',
          role: UserRole.USER,
          currentOrder: 0,
          returnedCount: 0,
        },
        '507f1f77bcf86cd799439011'
      );

      const user2 = User.create(
        {
          name: 'User 2',
          email: 'duplicate@example.com',
          passwordHash: 'hashed_password',
          role: UserRole.USER,
          currentOrder: 0,
          returnedCount: 0,
        },
        '507f1f77bcf86cd799439012'
      );

      await repository.save(user1);
      const result = await repository.save(user2);

      expect(isFailure(result)).toBe(true);
    });
  });

  describe('findById', () => {
    it('should find user by ID', async () => {
      const user = User.create(
        {
          name: 'Find By ID Test',
          email: testDataGenerator.randomEmail(),
          passwordHash: 'hashed_password',
          role: UserRole.USER,
          currentOrder: 0,
          returnedCount: 0,
        },
        '507f1f77bcf86cd799439011'
      );

      const saveResult = await repository.save(user);
      expect(isSuccess(saveResult)).toBe(true);

      if (isSuccess(saveResult)) {
        const found = await repository.findById(saveResult.data.id);
        expect(found).not.toBeNull();
        expect(found?.name).toBe('Find By ID Test');
      }
    });

    it('should return null for non-existent user', async () => {
      const found = await repository.findById('507f1f77bcf86cd799439011');
      expect(found).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const email = testDataGenerator.randomEmail();
      const user = User.create(
        {
          name: 'Email Test',
          email,
          passwordHash: 'hashed_password',
          role: UserRole.USER,
          currentOrder: 0,
          returnedCount: 0,
        },
        '507f1f77bcf86cd799439011'
      );

      await repository.save(user);

      const found = await repository.findByEmail(email);
      expect(found).not.toBeNull();
      expect(found?.email).toBe(email);
    });

    it('should return null for non-existent email', async () => {
      const found = await repository.findByEmail('notfound@example.com');
      expect(found).toBeNull();
    });
  });

  describe('findByStripeCustomerId', () => {
    it('should find user by Stripe customer ID', async () => {
      const user = User.create(
        {
          name: 'Stripe Test',
          email: testDataGenerator.randomEmail(),
          passwordHash: 'hashed_password',
          role: UserRole.USER,
          currentOrder: 0,
          returnedCount: 0,
          stripeCustomerId: 'cus_test123',
        },
        '507f1f77bcf86cd799439011'
      );

      await repository.save(user);

      const found = await repository.findByStripeCustomerId('cus_test123');
      expect(found).not.toBeNull();
      expect(found?.stripeCustomerId).toBe('cus_test123');
    });

    it('should return null for non-existent Stripe customer ID', async () => {
      const found = await repository.findByStripeCustomerId('cus_notfound');
      expect(found).toBeNull();
    });
  });

  describe('update', () => {
    it('should update an existing user', async () => {
      const user = User.create(
        {
          name: 'Original Name',
          email: testDataGenerator.randomEmail(),
          passwordHash: 'hashed_password',
          role: UserRole.USER,
          currentOrder: 0,
          returnedCount: 0,
        },
        '507f1f77bcf86cd799439011'
      );

      const saveResult = await repository.save(user);
      expect(isSuccess(saveResult)).toBe(true);

      if (isSuccess(saveResult)) {
        const savedUser = saveResult.data;
        savedUser.incrementOrderCount();

        const updateResult = await repository.update(savedUser);
        expect(isSuccess(updateResult)).toBe(true);

        if (isSuccess(updateResult)) {
          expect(updateResult.data.currentOrder).toBe(1);
        }
      }
    });

    it('should return error for non-existent user', async () => {
      const user = User.create(
        {
          name: 'Non Existent',
          email: 'nonexistent@example.com',
          passwordHash: 'hashed_password',
          role: UserRole.USER,
          currentOrder: 0,
          returnedCount: 0,
        },
        '507f1f77bcf86cd799439011'
      );

      const result = await repository.update(user);
      expect(isFailure(result)).toBe(true);
    });
  });

  describe('delete', () => {
    it('should delete an existing user', async () => {
      const user = User.create(
        {
          name: 'To Delete',
          email: testDataGenerator.randomEmail(),
          passwordHash: 'hashed_password',
          role: UserRole.USER,
          currentOrder: 0,
          returnedCount: 0,
        },
        '507f1f77bcf86cd799439011'
      );

      const saveResult = await repository.save(user);
      expect(isSuccess(saveResult)).toBe(true);

      if (isSuccess(saveResult)) {
        const deleteResult = await repository.delete(saveResult.data.id);
        expect(isSuccess(deleteResult)).toBe(true);

        const found = await repository.findById(saveResult.data.id);
        expect(found).toBeNull();
      }
    });

    it('should return error for non-existent user', async () => {
      const result = await repository.delete('507f1f77bcf86cd799439011');
      expect(isFailure(result)).toBe(true);
    });
  });

  describe('exists', () => {
    it('should return true if user exists', async () => {
      const email = testDataGenerator.randomEmail();
      const user = User.create(
        {
          name: 'Exists Test',
          email,
          passwordHash: 'hashed_password',
          role: UserRole.USER,
          currentOrder: 0,
          returnedCount: 0,
        },
        '507f1f77bcf86cd799439011'
      );

      await repository.save(user);

      const exists = await repository.exists(email);
      expect(exists).toBe(true);
    });

    it('should return false if user does not exist', async () => {
      const exists = await repository.exists('notfound@example.com');
      expect(exists).toBe(false);
    });
  });

  describe('count', () => {
    it('should return correct count of users', async () => {
      expect(await repository.count()).toBe(0);

      const user1 = User.create(
        {
          name: 'User 1',
          email: testDataGenerator.randomEmail(),
          passwordHash: 'hashed_password',
          role: UserRole.USER,
          currentOrder: 0,
          returnedCount: 0,
        },
        '507f1f77bcf86cd799439011'
      );

      const user2 = User.create(
        {
          name: 'User 2',
          email: testDataGenerator.randomEmail(),
          passwordHash: 'hashed_password',
          role: UserRole.USER,
          currentOrder: 0,
          returnedCount: 0,
        },
        '507f1f77bcf86cd799439012'
      );

      await repository.save(user1);
      await repository.save(user2);

      expect(await repository.count()).toBe(2);
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      const user1 = User.create(
        {
          name: 'User 1',
          email: testDataGenerator.randomEmail(),
          passwordHash: 'hashed_password',
          role: UserRole.USER,
          currentOrder: 0,
          returnedCount: 0,
        },
        '507f1f77bcf86cd799439011'
      );

      const user2 = User.create(
        {
          name: 'User 2',
          email: testDataGenerator.randomEmail(),
          passwordHash: 'hashed_password',
          role: UserRole.SELLER,
          currentOrder: 0,
          returnedCount: 0,
        },
        '507f1f77bcf86cd799439012'
      );

      await repository.save(user1);
      await repository.save(user2);

      const users = await repository.findAll();
      expect(users).toHaveLength(2);
    });

    it('should support pagination', async () => {
      // Create 5 users
      for (let i = 0; i < 5; i++) {
        const user = User.create(
          {
            name: `User ${i}`,
            email: testDataGenerator.randomEmail(),
            passwordHash: 'hashed_password',
            role: UserRole.USER,
            currentOrder: 0,
            returnedCount: 0,
          },
          `507f1f77bcf86cd79943901${i}`
        );
        await repository.save(user);
      }

      const page1 = await repository.findAll(0, 2);
      expect(page1).toHaveLength(2);

      const page2 = await repository.findAll(2, 2);
      expect(page2).toHaveLength(2);

      const page3 = await repository.findAll(4, 2);
      expect(page3).toHaveLength(1);
    });
  });
});
