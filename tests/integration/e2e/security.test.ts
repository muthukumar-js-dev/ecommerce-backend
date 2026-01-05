import { setupIntegrationTests, teardownIntegrationTests, clearDatabase } from '../setup';

const request = require('supertest');

describe('Security E2E Tests', () => {
  let app: any;

  beforeAll(async () => {
    app = await setupIntegrationTests();
  });

  afterAll(async () => {
    await teardownIntegrationTests();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  describe('SQL Injection Prevention', () => {
    it('should prevent SQL injection in login', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: "admin' OR '1'='1",
          password: 'anything',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should prevent SQL injection in registration', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send({
          name: "Test'; DROP TABLE users; --",
          email: 'test@example.com',
          password: 'Password123!',
        });

      // Should either succeed with sanitized name or fail validation
      if (response.status === 201) {
        expect(response.body.data.name).not.toContain('DROP TABLE');
      }
    });
  });

  describe('XSS Attack Prevention', () => {
    it('should sanitize XSS in user name', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send({
          name: '<script>alert("xss")</script>',
          email: 'xss@example.com',
          password: 'Password123!',
        });

      if (response.status === 201) {
        expect(response.body.data.name).not.toContain('<script>');
        expect(response.body.data.name).not.toContain('</script>');
      }
    });

    it('should sanitize XSS in product description', async () => {
      // First register and login
      const userRes = await request(app)
        .post('/api/users/register')
        .send({
          name: 'Seller',
          email: 'seller@example.com',
          password: 'Password123!',
        });

      const token = userRes.body.data.token;

      const productRes = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          pid: 'prod-xss',
          title: 'Test Product',
          description: '<img src=x onerror=alert("xss")>',
          actualPrice: 1000,
          sellingPrice: 900,
          currency: 'USD',
          category: 'Electronics',
          brand: 'TestBrand',
          images: [],
          sellerId: userRes.body.data.id,
          subCategory: 'Test',
          outOfStock: false,
        });

      if (productRes.status === 201) {
        expect(productRes.body.data.description).not.toContain('<img');
        expect(productRes.body.data.description).not.toContain('onerror');
      }
    });
  });

  describe('Authentication & Authorization', () => {
    it('should reject requests without token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject requests with invalid token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer invalid_token_here')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject requests with expired token', async () => {
      // This would require a token with very short expiry
      // For now, test with malformed token
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjB9.invalid')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should prevent access to other users data', async () => {
      // Create two users
      const user1Res = await request(app)
        .post('/api/users/register')
        .send({
          name: 'User 1',
          email: 'user1@example.com',
          password: 'Password123!',
        });

      const user2Res = await request(app)
        .post('/api/users/register')
        .send({
          name: 'User 2',
          email: 'user2@example.com',
          password: 'Password123!',
        });

      const user1Token = user1Res.body.data.token;
      const user2Id = user2Res.body.data.id;

      // User 1 tries to access User 2's profile (if such endpoint exists)
      // This is a conceptual test - adjust based on actual API
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(response.body.data.id).toBe(user1Res.body.data.id);
      expect(response.body.data.id).not.toBe(user2Id);
    });
  });

  describe('Input Validation', () => {
    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send({
          name: 'Test User',
          email: 'not-an-email',
          password: 'Password123!',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject weak passwords', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: '123',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject negative product prices', async () => {
      const userRes = await request(app)
        .post('/api/users/register')
        .send({
          name: 'Seller',
          email: 'seller@example.com',
          password: 'Password123!',
        });

      const token = userRes.body.data.token;

      const productRes = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          pid: 'prod-negative',
          title: 'Test Product',
          description: 'Test',
          actualPrice: -1000,
          sellingPrice: -900,
          currency: 'USD',
          category: 'Electronics',
          brand: 'TestBrand',
          images: [],
          sellerId: userRes.body.data.id,
          subCategory: 'Test',
          outOfStock: false,
        });

      expect(productRes.status).toBe(400);
      expect(productRes.body.success).toBe(false);
    });

    it('should reject invalid quantity in cart', async () => {
      const userRes = await request(app)
        .post('/api/users/register')
        .send({
          name: 'Customer',
          email: 'customer@example.com',
          password: 'Password123!',
        });

      const token = userRes.body.data.token;

      const cartRes = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({
          productId: 'some-product-id',
          quantity: -5,
        });

      expect(cartRes.status).toBe(400);
      expect(cartRes.body.success).toBe(false);
    });
  });

  describe('CORS & Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app).get('/health');

      // Check for security headers (helmet middleware)
      expect(response.headers['x-content-type-options']).toBeDefined();
      expect(response.headers['x-frame-options']).toBeDefined();
    });
  });
});
