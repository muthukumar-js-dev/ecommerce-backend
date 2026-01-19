import request from 'supertest';
import { createApp } from '@infrastructure/http/app';
import { NotificationService } from '@application/services/notification.service';
import { Container } from '@infrastructure/di/container';
import { UserRole } from '@shared/types/common';
import jwt from 'jsonwebtoken';

jest.mock('@infrastructure/di/container');
jest.mock('@application/services/notification.service');

describe('Notification Controller Integration', () => {
  let app: any;
  let mockNotificationService: jest.Mocked<NotificationService>;
  const adminToken = jwt.sign(
    { userId: 'admin-id', email: 'admin@example.com', role: UserRole.ADMIN },
    process.env.JWT_SECRET || 'test-secret'
  );

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
    jest.clearAllMocks();

    mockNotificationService = new NotificationService({} as any) as jest.Mocked<NotificationService>;

    (Container.getInstance as jest.Mock).mockReturnValue({
      getUserService: jest.fn().mockReturnValue({}),
      getProductService: jest.fn().mockReturnValue({}),
      getCartService: jest.fn().mockReturnValue({}),
      getOrderService: jest.fn().mockReturnValue({}),
      getAddressService: jest.fn().mockReturnValue({}),
      getWishlistService: jest.fn().mockReturnValue({}),
      getReviewService: jest.fn().mockReturnValue({}),
      getNotificationService: jest.fn().mockReturnValue(mockNotificationService),
      getCQRSModule: jest.fn().mockReturnValue({ eventBus: {} }),
    });

    app = createApp();
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  describe('POST /api/notifications', () => {
    it('should create a notification when admin', async () => {
      mockNotificationService.createNotification.mockResolvedValue({
        success: true,
        data: { id: 'notif-123', message: 'Test' },
      } as any);

      const response = await request(app)
        .post('/api/notifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: 'user-123',
          message: 'System Alert',
          type: 'INFO',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });
  });
});
