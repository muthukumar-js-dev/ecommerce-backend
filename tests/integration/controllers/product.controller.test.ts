import request from 'supertest';
import { createApp } from '@infrastructure/http/app';
import { ProductService } from '@application/services/product.service';
import { Container } from '@infrastructure/di/container';
import { UserRole } from '@shared/types/common';
import jwt from 'jsonwebtoken';

jest.mock('@infrastructure/di/container');
jest.mock('@application/services/product.service');

describe('Product Controller Integration', () => {
  let app: any;
  let mockProductService: jest.Mocked<ProductService>;
  const adminToken = jwt.sign(
    { userId: 'admin-id', email: 'admin@example.com', role: UserRole.ADMIN },
    process.env.JWT_SECRET || 'test-secret'
  );

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
    jest.clearAllMocks();

    mockProductService = new ProductService({} as any, {} as any, {} as any) as jest.Mocked<ProductService>;

    (Container.getInstance as jest.Mock).mockReturnValue({
      getUserService: jest.fn().mockReturnValue({}),
      getProductService: jest.fn().mockReturnValue(mockProductService),
      getCartService: jest.fn().mockReturnValue({}),
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

  describe('POST /api/products', () => {
    it('should create a product when authorized', async () => {
      mockProductService.createProduct.mockResolvedValue({
        success: true,
        data: {
          id: 'prod-123',
          title: 'New Product',
          price: { amount: 100, currency: 'USD' },
          images: [],
          createdAt: new Date(),
        },
      } as any);

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          pid: 'test-pid-123',
          title: 'New Product Test',
          category: 'Electronics',
          actualPrice: 150,
          sellingPrice: 100,
          brand: 'TestBrand',
          description: 'Valid description longer than 10 characters',
          images: ['http://example.com/image.jpg'],
          sellerId: 'admin-id',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('prod-123');
    });

    it('should reject unauthorized access', async () => {
      const response = await request(app)
        .post('/api/products')
        .send({
          title: 'New Product',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/products', () => {
    it('should list products with pagination', async () => {
      mockProductService.listProducts.mockResolvedValue({
        success: true,
        data: {
          products: [],
          total: 0,
          page: 1,
          limit: 20,
        },
      } as any);

      const response = await request(app)
        .get('/api/products?page=1&limit=10');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockProductService.listProducts).toHaveBeenCalled();
    });
  });
});
