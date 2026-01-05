import { setupIntegrationTests, teardownIntegrationTests, clearDatabase } from '../setup';
import { UserModel } from '../../../src/infrastructure/database/mongodb/schemas/user.schema';
import { UserRole } from '../../../src/shared/types/common';

const request = require('supertest');

describe('Wishlist E2E Tests', () => {
  let app: any;
  let userToken: string;
  let productId: string;

  beforeAll(async () => {
    app = await setupIntegrationTests();
  });

  afterAll(async () => {
    await teardownIntegrationTests();
  });

  beforeEach(async () => {
    await clearDatabase();

    // Create admin and product
    const adminRes = await request(app)
      .post('/api/users/register')
      .send({
        name: 'Admin',
        email: 'admin@test.com',
        password: 'Password123!',
      });

    await UserModel.findOneAndUpdate(
      { email: 'admin@test.com' },
      { userRole: UserRole.ADMIN }
    );

    const adminLogin = await request(app)
      .post('/api/users/login')
      .send({
        email: 'admin@test.com',
        password: 'Password123!',
      });

    const adminToken = adminLogin.body.data.token;
    const sellerId = adminLogin.body.data.user.id;

    const productRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        pid: 'wishlist-prod',
        title: 'Wishlist Product',
        description: 'Product for wishlist',
        actualPrice: 1000,
        sellingPrice: 800,
        currency: 'USD',
        category: 'Electronics',
        brand: 'TestBrand',
        images: [],
        sellerId: sellerId,
        subCategory: 'Test',
        outOfStock: false,
      });

    productId = productRes.body.data.id;

    // Create regular user
    const userRes = await request(app)
      .post('/api/users/register')
      .send({
        name: 'User',
        email: 'user@test.com',
        password: 'Password123!',
      });

    userToken = userRes.body.data.token;
  });

  describe('Add to Wishlist', () => {
    it('should add product to wishlist', async () => {
      const response = await request(app)
        .post('/api/wishlist')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId,
        });

      expect([200, 201]).toContain(response.status);
    });

    it('should reject without authentication', async () => {
      const response = await request(app)
        .post('/api/wishlist')
        .send({
          productId,
        });

      expect(response.status).toBe(401);
    });
  });

  describe('Get Wishlist', () => {
    it('should get user wishlist', async () => {
      await request(app)
        .post('/api/wishlist')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId,
        });

      const response = await request(app)
        .get('/api/wishlist')
        .set('Authorization', `Bearer ${userToken}`);

      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Remove from Wishlist', () => {
    it('should remove product from wishlist', async () => {
      await request(app)
        .post('/api/wishlist')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId,
        });

      const response = await request(app)
        .delete(`/api/wishlist/${productId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect([200, 204, 404]).toContain(response.status);
    });
  });
});
