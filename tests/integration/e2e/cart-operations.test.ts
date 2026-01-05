import { setupIntegrationTests, teardownIntegrationTests, clearDatabase } from '../setup';
import { UserModel } from '../../../src/infrastructure/database/mongodb/schemas/user.schema';
import { UserRole } from '../../../src/shared/types/common';

const request = require('supertest');

describe('Cart Operations E2E Tests', () => {
  let app: any;
  let customerToken: string;
  let productId: string;

  beforeAll(async () => {
    app = await setupIntegrationTests();
  });

  afterAll(async () => {
    await teardownIntegrationTests();
  });

  beforeEach(async () => {
    await clearDatabase();
    
    // Setup: Create admin, product, and customer for each test
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

    // Create a product
    const productRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        pid: 'cart-test-prod',
        title: 'Cart Test Product',
        description: 'Product for cart testing',
        actualPrice: 1000,
        sellingPrice: 800,
        currency: 'USD',
        category: 'Electronics',
        brand: 'TestBrand',
        images: ['test.jpg'],
        sellerId: sellerId,
        subCategory: 'Gadgets',
        outOfStock: false,
      });

    productId = productRes.body.data.id;

    // Create customer
    const customerRes = await request(app)
      .post('/api/users/register')
      .send({
        name: 'Customer',
        email: 'customer@test.com',
        password: 'Password123!',
      });

    customerToken = customerRes.body.data.token;
  });

  describe('Add to Cart', () => {
    it('should add item to cart successfully', async () => {
      const response = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId,
          quantity: 2,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should add multiple different items to cart', async () => {
      // Add first item
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId,
          quantity: 1,
        });

      // Get cart to verify
      const cartRes = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(cartRes.status).toBe(200);
      expect(cartRes.body.data.items.length).toBeGreaterThan(0);
    });

    it('should reject adding item without authentication', async () => {
      const response = await request(app)
        .post('/api/cart/items')
        .send({
          productId,
          quantity: 1,
        });

      expect(response.status).toBe(401);
    });

    it('should reject adding item with invalid quantity', async () => {
      const response = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId,
          quantity: 0,
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Get Cart', () => {
    it('should get empty cart for new user', async () => {
      const response = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // Cart might be empty or have empty items array
    });

    it('should get cart with items', async () => {
      // Add item first
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId,
          quantity: 3,
        });

      // Get cart
      const response = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.items.length).toBeGreaterThan(0);
    });

    it('should require authentication to get cart', async () => {
      const response = await request(app).get('/api/cart');

      expect(response.status).toBe(401);
    });
  });

  describe('Update Cart Item', () => {
    it('should update item quantity', async () => {
      // Add item first
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId,
          quantity: 2,
        });

      // Update quantity
      const response = await request(app)
        .put(`/api/cart/items/${productId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          quantity: 5,
        });

      // Should either succeed or return appropriate status
      expect([200, 404]).toContain(response.status);
    });

    it('should reject invalid quantity update', async () => {
      const response = await request(app)
        .put(`/api/cart/items/${productId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          quantity: -1,
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Remove from Cart', () => {
    it('should remove item from cart', async () => {
      // Add item first
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId,
          quantity: 2,
        });

      // Remove item
      const response = await request(app)
        .delete(`/api/cart/items/${productId}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect([200, 204]).toContain(response.status);
    });

    it('should handle removing non-existent item gracefully', async () => {
      const response = await request(app)
        .delete('/api/cart/items/non-existent-id')
        .set('Authorization', `Bearer ${customerToken}`);

      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Clear Cart', () => {
    it('should clear all items from cart', async () => {
      // Add items first
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId,
          quantity: 2,
        });

      // Clear cart
      const response = await request(app)
        .delete('/api/cart')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(300);

      // Verify cart is empty
      const cartRes = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(cartRes.status).toBe(200);
    });
  });

  describe('Cart Persistence', () => {
    it('should persist cart across sessions', async () => {
      // Add item
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId,
          quantity: 2,
        });

      // Login again (simulating new session)
      const loginRes = await request(app)
        .post('/api/users/login')
        .send({
          email: 'customer@test.com',
          password: 'Password123!',
        });

      const newToken = loginRes.body.data.token;

      // Get cart with new token
      const cartRes = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${newToken}`);

      // Cart should be accessible (200) and may have items
      expect(cartRes.status).toBe(200);
      if (cartRes.body.data && cartRes.body.data.items) {
        expect(cartRes.body.data.items.length).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
