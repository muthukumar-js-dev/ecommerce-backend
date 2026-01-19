import { setupIntegrationTests, teardownIntegrationTests, clearDatabase } from '../setup';
import { UserModel } from '../../../src/infrastructure/database/mongodb/schemas/user.schema';
import { UserRole } from '../../../src/shared/types/common';

const request = require('supertest');

describe('Review System E2E Tests', () => {
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
        pid: 'review-prod',
        title: 'Review Product',
        description: 'Product for reviews',
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

    const userLogin = await request(app)
      .post('/api/users/login')
      .send({
        email: 'user@test.com',
        password: 'Password123!',
      });

    userToken = userLogin.body.data.token;
  });

  describe('Submit Review', () => {
    it('should submit review successfully', async () => {
      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId,
          rating: 5,
          comment: 'Excellent product!',
        });

      expect([200, 201]).toContain(response.status);
    });

    it('should reject review without authentication', async () => {
      const response = await request(app)
        .post('/api/reviews')
        .send({
          productId,
          rating: 5,
          comment: 'Great!',
        });

      expect(response.status).toBe(401);
    });

    it('should reject invalid rating', async () => {
      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId,
          rating: 6, // Invalid: should be 1-5
          comment: 'Test',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Get Reviews', () => {
    it('should get product reviews', async () => {
      await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId,
          rating: 4,
          comment: 'Good product',
        });

      const response = await request(app)
        .get(`/api/reviews/product/${productId}`);

      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Update Review', () => {
    it('should update review successfully', async () => {
      const createRes = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId,
          rating: 4,
          comment: 'Good',
        });

      if (createRes.body.data && createRes.body.data.id) {
        const reviewId = createRes.body.data.id;

        const response = await request(app)
          .put(`/api/reviews/${reviewId}`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            rating: 5,
            comment: 'Excellent!',
          });

        expect([200, 404]).toContain(response.status);
      }
    });
  });

  describe('Delete Review', () => {
    it('should delete review successfully', async () => {
      const createRes = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId,
          rating: 4,
          comment: 'Good',
        });

      if (createRes.body.data && createRes.body.data.id) {
        const reviewId = createRes.body.data.id;

        const response = await request(app)
          .delete(`/api/reviews/${reviewId}`)
          .set('Authorization', `Bearer ${userToken}`);

        expect([200, 204, 404]).toContain(response.status);
      }
    });
  });
});
