import request from 'supertest';
import { createApp } from '@infrastructure/http/app';
import { AddressService } from '@application/services/address.service';
import { Container } from '@infrastructure/di/container';
import { UserRole } from '@shared/types/common';
import jwt from 'jsonwebtoken';

jest.mock('@infrastructure/di/container');
jest.mock('@application/services/address.service');

describe('Address Controller Integration', () => {
  let app: any;
  let mockAddressService: jest.Mocked<AddressService>;
  const userToken = jwt.sign(
    { userId: 'user-id', email: 'user@example.com', role: UserRole.USER },
    process.env.JWT_SECRET || 'test-secret'
  );

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
    jest.clearAllMocks();

    mockAddressService = new AddressService({} as any) as jest.Mocked<AddressService>;

    (Container.getInstance as jest.Mock).mockReturnValue({
      getUserService: jest.fn().mockReturnValue({}),
      getProductService: jest.fn().mockReturnValue({}),
      getCartService: jest.fn().mockReturnValue({}),
      getOrderService: jest.fn().mockReturnValue({}),
      getAddressService: jest.fn().mockReturnValue(mockAddressService),
      getWishlistService: jest.fn().mockReturnValue({}),
      getReviewService: jest.fn().mockReturnValue({}),
      getNotificationService: jest.fn().mockReturnValue({}),
    });

    app = createApp();
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  describe('POST /api/addresses', () => {
    it('should create an address', async () => {
      mockAddressService.createAddress.mockResolvedValue({
        success: true,
        data: { id: 'addr-123', city: 'City' },
      } as any);

      const response = await request(app)
        .post('/api/addresses')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          country: 'USA',
          zipCode: '10001',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/addresses', () => {
    it('should list user addresses', async () => {
      mockAddressService.listAddresses.mockResolvedValue({
        success: true,
        data: [],
      } as any);

      const response = await request(app)
        .get('/api/addresses')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
