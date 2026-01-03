import request from 'supertest';
import { createApp } from '@infrastructure/http/app';
import { ReviewService } from '@application/services/review.service';
import { Container } from '@infrastructure/di/container';
import { UserRole } from '@shared/types/common';
import jwt from 'jsonwebtoken';

jest.mock('@infrastructure/di/container');
jest.mock('@application/services/review.service');

describe('Review Controller Integration', () => {
  let app: any;
  let mockReviewService: jest.Mocked<ReviewService>;
  const userToken = jwt.sign(
    { userId: 'user-id', email: 'user@example.com', role: UserRole.USER },
    process.env.JWT_SECRET || 'test-secret'
  );

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
    jest.clearAllMocks();

    mockReviewService = new ReviewService({} as any, {} as any) as jest.Mocked<ReviewService>;

    (Container.getInstance as jest.Mock).mockReturnValue({
      getUserService: jest.fn().mockReturnValue({}),
      getProductService: jest.fn().mockReturnValue({}),
      getCartService: jest.fn().mockReturnValue({}),
      getOrderService: jest.fn().mockReturnValue({}),
      getAddressService: jest.fn().mockReturnValue({}),
      getWishlistService: jest.fn().mockReturnValue({}),
      getReviewService: jest.fn().mockReturnValue(mockReviewService),
      getNotificationService: jest.fn().mockReturnValue({}),
    });

    app = createApp();
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  describe('POST /api/reviews', () => {
    it('should create a review', async () => {
      mockReviewService.createReview.mockResolvedValue({
        success: true,
        data: { id: 'review-123', rating: 5 },
      } as any);

      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: 'prod-123',
          rating: 5,
          reviewText: 'Great product!',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });
  });
});
