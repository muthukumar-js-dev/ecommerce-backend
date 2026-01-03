import request from 'supertest';
import { createApp } from '@infrastructure/http/app';
import { OrderService } from '@application/services/order.service';
import { Container } from '@infrastructure/di/container';
import { UserRole } from '@shared/types/common';
import jwt from 'jsonwebtoken';

jest.mock('@infrastructure/di/container');
jest.mock('@application/services/order.service');

describe('Order Controller Integration', () => {
  let app: any;
  let mockOrderService: jest.Mocked<OrderService>;
  const userToken = jwt.sign(
    { userId: 'user-id', email: 'user@example.com', role: UserRole.USER },
    process.env.JWT_SECRET || 'test-secret'
  );

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
    jest.clearAllMocks();

    mockOrderService = new OrderService({} as any, {} as any) as jest.Mocked<OrderService>;

    (Container.getInstance as jest.Mock).mockReturnValue({
      getUserService: jest.fn().mockReturnValue({}),
      getProductService: jest.fn().mockReturnValue({}),
      getCartService: jest.fn().mockReturnValue({}),
      getOrderService: jest.fn().mockReturnValue(mockOrderService),
      getAddressService: jest.fn().mockReturnValue({}),
      getWishlistService: jest.fn().mockReturnValue({}),
      getReviewService: jest.fn().mockReturnValue({}),
      getNotificationService: jest.fn().mockReturnValue({}),
    });

    app = createApp();
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  describe('POST /api/orders', () => {
    it('should place an order', async () => {
      mockOrderService.placeOrder.mockResolvedValue({
        success: true,
        data: {
          id: 'order-123',
          status: 'PENDING',
        },
      } as any);

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          paymentMethod: 'credit_card',
          shippingAddressId: 'addr-123',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/orders', () => {
    it('should list user orders', async () => {
      mockOrderService.listOrders.mockResolvedValue({
        success: true,
        data: {
          orders: [],
          total: 0,
        },
      } as any);

      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
