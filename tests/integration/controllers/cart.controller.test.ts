import request from 'supertest';
import { createApp } from '@infrastructure/http/app';
import { CartService } from '@application/services/cart.service';
import { Container } from '@infrastructure/di/container';
import { UserRole } from '@shared/types/common';
import jwt from 'jsonwebtoken';

jest.mock('@infrastructure/di/container');
jest.mock('@application/services/cart.service');

describe('Cart Controller Integration', () => {
  let app: any;
  let mockCartService: jest.Mocked<CartService>;
  const userToken = jwt.sign(
    { userId: 'user-id', email: 'user@example.com', role: UserRole.USER },
    process.env.JWT_SECRET || 'test-secret'
  );

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
    jest.clearAllMocks();

    mockCartService = new CartService({} as any, {} as any) as jest.Mocked<CartService>;

    (Container.getInstance as jest.Mock).mockReturnValue({
      getUserService: jest.fn().mockReturnValue({}),
      getProductService: jest.fn().mockReturnValue({}),
      getCartService: jest.fn().mockReturnValue(mockCartService),
      getOrderService: jest.fn().mockReturnValue({}),
      getAddressService: jest.fn().mockReturnValue({}),
      getWishlistService: jest.fn().mockReturnValue({}),
      getReviewService: jest.fn().mockReturnValue({}),
      getNotificationService: jest.fn().mockReturnValue({}),
      getCQRSModule: jest.fn().mockReturnValue({ eventBus: {} }),
    });

    app = createApp();
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  describe('POST /api/cart/items', () => {
    it('should add item to cart', async () => {
      mockCartService.addToCart.mockResolvedValue({
        success: true,
        data: {
          id: 'cart-123',
          items: [],
        },
      } as any);

      const response = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: 'prod-123',
          quantity: 2,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('DELETE /api/cart', () => {
    it('should clear cart', async () => {
      mockCartService.clearCart.mockResolvedValue({
        success: true,
      } as any);

      const response = await request(app)
        .delete('/api/cart')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('cleared');
    });
  });
});
