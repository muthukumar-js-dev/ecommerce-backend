import { CartRepository } from '../../src/infrastructure/database/mongodb/repositories/cart.repository';
import { Cart } from '../../src/domain/cart/entities/cart.entity';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
} from '../utils/test-helpers';
import { isSuccess } from '../../src/shared/types/result';

describe('CartRepository Integration Tests', () => {
  let repository: CartRepository;

  beforeAll(async () => {
    await connectTestDatabase();
    repository = new CartRepository();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  it('should save and retrieve a cart', async () => {
    const cart = Cart.create(
      {
        userId: '507f1f77bcf86cd799439011',
        items: [{ productId: '507f1f77bcf86cd799439021', quantity: 2, later: false }],
        totalAmount: 1000,
        totalActualAmount: 1200,
        totalDiscount: 200,
        currency: 'INR',
      },
      '507f1f77bcf86cd799439012'
    );

    const saveResult = await repository.save(cart);
    expect(isSuccess(saveResult)).toBe(true);

    if (isSuccess(saveResult)) {
      const found = await repository.findByUserId('507f1f77bcf86cd799439011');
      expect(found).not.toBeNull();
      expect(found?.items).toHaveLength(1);
    }
  });

  it('should update cart', async () => {
    const cart = Cart.create(
      {
        userId: '507f1f77bcf86cd799439011',
        items: [],
        totalAmount: 0,
        totalActualAmount: 0,
        totalDiscount: 0,
        currency: 'INR',
      },
      '507f1f77bcf86cd799439012'
    );

    const saveResult = await repository.save(cart);
    expect(isSuccess(saveResult)).toBe(true);

    if (isSuccess(saveResult)) {
      const savedCart = saveResult.data;
      savedCart.addItem('507f1f77bcf86cd799439021', 2);

      const updateResult = await repository.update(savedCart);
      expect(isSuccess(updateResult)).toBe(true);

      if (isSuccess(updateResult)) {
        expect(updateResult.data.items).toHaveLength(1);
      }
    }
  });

  it('should delete cart', async () => {
    const cart = Cart.create(
      {
        userId: '507f1f77bcf86cd799439011',
        items: [],
        totalAmount: 0,
        totalActualAmount: 0,
        totalDiscount: 0,
        currency: 'INR',
      },
      '507f1f77bcf86cd799439012'
    );

    const saveResult = await repository.save(cart);
    expect(isSuccess(saveResult)).toBe(true);

    if (isSuccess(saveResult)) {
      const deleteResult = await repository.delete(saveResult.data.id);
      expect(isSuccess(deleteResult)).toBe(true);

      const found = await repository.findByUserId('507f1f77bcf86cd799439011');
      expect(found).toBeNull();
    }
  });
});
