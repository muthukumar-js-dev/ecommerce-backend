import { AddressRepository } from '../../src/infrastructure/database/mongodb/repositories/address.repository';
import { Address } from '../../src/domain/address/entities/address.entity';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
} from '../utils/test-helpers';
import { isSuccess } from '../../src/shared/types/result';

describe('AddressRepository Integration Tests', () => {
  let repository: AddressRepository;

  beforeAll(async () => {
    await connectTestDatabase();
    repository = new AddressRepository();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  it('should save and retrieve addresses', async () => {
    const address = Address.create(
      {
        userId: '507f1f77bcf86cd799439011',
        name: 'John Doe',
        firstLine: '123 Main St',
        city: 'New York',
        state: 'NY',
        country: 'USA',
        postalCode: '10001',
        phone: '1234567890',
        phoneCode: '+1',
        isDefault: true,
        status: 1,
      },
      '507f1f77bcf86cd799439012'
    );

    const saveResult = await repository.save(address);
    expect(isSuccess(saveResult)).toBe(true);

    if (isSuccess(saveResult)) {
      const addresses = await repository.findByUserId('507f1f77bcf86cd799439011');
      expect(addresses).toHaveLength(1);
      expect(addresses[0]?.name).toBe('John Doe');
    }
  });

  it('should find default address', async () => {
    const address = Address.create(
      {
        userId: '507f1f77bcf86cd799439011',
        name: 'John Doe',
        firstLine: '123 Main St',
        city: 'New York',
        state: 'NY',
        country: 'USA',
        postalCode: '10001',
        phone: '1234567890',
        phoneCode: '+1',
        isDefault: true,
        status: 1,
      },
      '507f1f77bcf86cd799439012'
    );

    await repository.save(address);

    const defaultAddr = await repository.findDefaultByUserId('507f1f77bcf86cd799439011');
    expect(defaultAddr).not.toBeNull();
    expect(defaultAddr?.isDefault).toBe(true);
  });
});
