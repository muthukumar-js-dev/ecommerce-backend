import request from 'supertest';
import { createApp } from '@infrastructure/http/app';
import { UserService } from '@application/services/user.service';
import { Container } from '@infrastructure/di/container';

// Mock the Container and Services
jest.mock('@infrastructure/di/container');
jest.mock('@application/services/user.service');

describe('User Controller Integration', () => {
  let app: any;
  let mockUserService: jest.Mocked<UserService>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock service
    mockUserService = new UserService(
      {} as any, // CommandBus
      {} as any, // QueryBus
      {} as any  // EventBus
    ) as jest.Mocked<UserService>;

    // Mock Container.getInstance() to return our mock service
    (Container.getInstance as jest.Mock).mockReturnValue({
      getUserService: jest.fn().mockReturnValue(mockUserService),
      getProductService: jest.fn().mockReturnValue({}),
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

  describe('POST /api/users/register', () => {
    it('should register a new user', async () => {
      // Mock successful registration
      mockUserService.register.mockResolvedValue({
        success: true,
        data: {
          user: {
            id: '123',
            name: 'Test User',
            email: { value: 'test@example.com' },
            role: 'user',
            createdAt: new Date(),
          },
          token: 'test-token',
        },
      } as any);

      const response = await request(app)
        .post('/api/users/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'Password123',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBe('test-token');
    });

    it('should reject invalid input', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send({
          name: '', // Invalid name
          email: 'invalid-email',
          password: '123',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      // Service should not be called
      expect(mockUserService.register).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/users/login', () => {
    it('should login user', async () => {
      mockUserService.login.mockResolvedValue({
        success: true,
        data: {
          user: { id: '123' },
          token: 'test-token',
        },
      } as any);

      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: 'test@example.com',
          password: 'Password123',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBe('test-token');
    });
  });
});
