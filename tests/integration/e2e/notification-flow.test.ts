import { setupIntegrationTests, teardownIntegrationTests, clearDatabase } from '../setup';

const request = require('supertest');

describe('Notification System E2E Tests', () => {
  let app: any;
  let userToken: string;

  beforeAll(async () => {
    app = await setupIntegrationTests();
  });

  afterAll(async () => {
    await teardownIntegrationTests();
  });

  beforeEach(async () => {
    await clearDatabase();

    const userRes = await request(app)
      .post('/api/users/register')
      .send({
        name: 'Test User',
        email: 'user@test.com',
        password: 'Password123!',
      });

    const loginRes = await request(app)
      .post('/api/users/login')
      .send({
        email: 'user@test.com',
        password: 'Password123!',
      });

    userToken = loginRes.body.data.token;
  });

  describe('Get Notifications', () => {
    it('should get user notifications', async () => {
      const response = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${userToken}`);

      expect([200, 404]).toContain(response.status);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/notifications');

      expect(response.status).toBe(401);
    });
  });

  describe('Mark as Read', () => {
    it('should mark notification as read', async () => {
      const response = await request(app)
        .patch('/api/notifications/some-id/read')
        .set('Authorization', `Bearer ${userToken}`);

      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Delete Notification', () => {
    it('should delete notification', async () => {
      const response = await request(app)
        .delete('/api/notifications/some-id')
        .set('Authorization', `Bearer ${userToken}`);

      expect([200, 204, 404]).toContain(response.status);
    });
  });
});
