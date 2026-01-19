import request from 'supertest';
import { createApp } from '@infrastructure/http/app';
import { WishlistService } from '@application/services/wishlist.service';
import { Container } from '@infrastructure/di/container';
import { UserRole } from '@shared/types/common';
import jwt from 'jsonwebtoken';

jest.mock('@infrastructure/di/container');
jest.mock('@application/services/wishlist.service');

describe('Wishlist Controller Integration', () => {
  let app: any;
  let mockWishlistService: jest.Mocked<WishlistService>;
  const userToken = jwt.sign(
    { userId: 'user-id', email: 'user@example.com', role: UserRole.USER },
    process.env.JWT_SECRET || 'test-secret'
  );

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
    jest.clearAllMocks();

    mockWishlistService = new WishlistService({} as any, {} as any) as jest.Mocked<WishlistService>;

    (Container.getInstance as jest.Mock).mockReturnValue({
      getUserService: jest.fn().mockReturnValue({}),
      getProductService: jest.fn().mockReturnValue({}),
      getCartService: jest.fn().mockReturnValue({}),
      getOrderService: jest.fn().mockReturnValue({}),
      getAddressService: jest.fn().mockReturnValue({}),
      getWishlistService: jest.fn().mockReturnValue(mockWishlistService),
      getReviewService: jest.fn().mockReturnValue({}),
      getNotificationService: jest.fn().mockReturnValue({}),
      getCQRSModule: jest.fn().mockReturnValue({ eventBus: {} }),
    });

    app = createApp();
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  describe('POST /api/wishlist', () => {
    it('should add product to wishlist', async () => {
      mockWishlistService.addToWishlist.mockResolvedValue({
        success: true,
        data: { userId: 'user-123', products: [] },
      } as any);

      const response = await request(app)
        .post('/api/wishlist')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: 'prod-123',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
