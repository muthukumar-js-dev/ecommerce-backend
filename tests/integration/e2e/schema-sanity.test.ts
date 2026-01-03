import { setupIntegrationTests, teardownIntegrationTests } from '../setup';
import { UserModel } from '../../../src/infrastructure/database/mongodb/schemas/user.schema';
import { UserRole } from '../../../src/shared/types/common';
import { randomUUID } from 'crypto';

describe('Schema Sanity', () => {
  beforeAll(async () => {
    await setupIntegrationTests();
  });

  afterAll(async () => {
    await teardownIntegrationTests();
  });

  it('should save user with string ID', async () => {
    const id = randomUUID();
    const user = new UserModel({
      _id: id,
      name: 'Sanity User',
      email: 'sanity@example.com',
      password: 'hashedpassword',
      userRole: UserRole.USER,
      currentOrder: 0,
      returnedCount: 0,
    });

    try {
        const saved = await user.save();
        expect(saved._id).toBe(id); // Using String ID directly (Mongoose might cast it?)
        // If schema has _id: String, it remains String.
        // If ObjectId, it becomes ObjectId (and throws if invalid).
        console.log('Saved ID Type:', typeof saved._id);
    } catch (e: any) {
        console.error('Schema Save Error:', e);
        throw e;
    }
  });
});
