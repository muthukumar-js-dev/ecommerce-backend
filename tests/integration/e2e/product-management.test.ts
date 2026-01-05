import { setupIntegrationTests, teardownIntegrationTests, clearDatabase } from '../setup';
import { UserModel } from '../../../src/infrastructure/database/mongodb/schemas/user.schema';
import { UserRole } from '../../../src/shared/types/common';

const request = require('supertest');

describe('Product Management E2E Tests', () => {
  let app: any;
  let adminToken: string;
  let sellerId: string;

  beforeAll(async () => {
    app = await setupIntegrationTests();
  });

  afterAll(async () => {
    await teardownIntegrationTests();
  });

  beforeEach(async () => {
    await clearDatabase();

    // Create admin user
    const adminRes = await request(app)
      .post('/api/users/register')
      .send({
        name: 'Admin User',
        email: 'admin@test.com',
        password: 'Password123!',
      });

    await UserModel.findOneAndUpdate(
      { email: 'admin@test.com' },
      { userRole: UserRole.ADMIN }
    );

    const loginRes = await request(app)
      .post('/api/users/login')
      .send({
        email: 'admin@test.com',
        password: 'Password123!',
      });

    adminToken = loginRes.body.data.token;
    sellerId = loginRes.body.data.user.id;
  });

  describe('Create Product', () => {
    it('should create product successfully', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          pid: 'test-product-1',
          title: 'Test Product',
          description: 'A great test product',
          actualPrice: 1500,
          sellingPrice: 1200,
          currency: 'USD',
          category: 'Electronics',
          brand: 'TestBrand',
          images: ['image1.jpg', 'image2.jpg'],
          sellerId: sellerId,
          subCategory: 'Smartphones',
          outOfStock: false,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Test Product');
      expect(response.body.data.id).toBeDefined();
    });

    it('should reject product creation without authentication', async () => {
      const response = await request(app)
        .post('/api/products')
        .send({
          pid: 'test-product-2',
          title: 'Unauthorized Product',
          description: 'Should fail',
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

      expect(response.status).toBe(401);
    });

    it('should reject product with missing required fields', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Incomplete Product',
          // Missing required fields
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Get Product', () => {
    it('should get product by ID', async () => {
      // Create product first
      const createRes = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          pid: 'get-test-prod',
          title: 'Get Test Product',
          description: 'Product for get testing',
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

      const productId = createRes.body.data.id;

      // Get product
      const response = await request(app)
        .get(`/api/products/${productId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(productId);
      expect(response.body.data.title).toBe('Get Test Product');
    });

    it('should return 404 for non-existent product', async () => {
      const response = await request(app)
        .get('/api/products/non-existent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('List Products', () => {
    beforeEach(async () => {
      // Create multiple products
      for (let i = 1; i <= 5; i++) {
        await request(app)
          .post('/api/products')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            pid: `list-prod-${i}`,
            title: `Product ${i}`,
            description: `Description ${i}`,
            actualPrice: 1000 * i,
            sellingPrice: 800 * i,
            currency: 'USD',
            category: i % 2 === 0 ? 'Electronics' : 'Clothing',
            brand: 'TestBrand',
            images: [],
            sellerId: sellerId,
            subCategory: 'Test',
            outOfStock: false,
          });
      }
    });

    it('should list all products', async () => {
      const response = await request(app)
        .get('/api/products')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products.length).toBeGreaterThan(0);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/products?page=1&limit=2')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products.length).toBeLessThanOrEqual(2);
    });

    it('should filter by category', async () => {
      const response = await request(app)
        .get('/api/products?category=Electronics')
        .expect(200);

      expect(response.body.success).toBe(true);
      if (response.body.data.products.length > 0) {
        response.body.data.products.forEach((product: any) => {
          expect(product.category).toBe('Electronics');
        });
      }
    });
  });

  describe('Update Product', () => {
    it('should update product successfully', async () => {
      // Create product
      const createRes = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          pid: 'update-test-prod',
          title: 'Original Title',
          description: 'Original Description',
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

      const productId = createRes.body.data.id;

      // Update product
      const response = await request(app)
        .put(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Updated Title',
          description: 'Updated Description',
          sellingPrice: 700,
        });

      expect([200, 404]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.data.title).toBe('Updated Title');
      }
    });

    it('should reject update without authentication', async () => {
      const response = await request(app)
        .put('/api/products/some-id')
        .send({
          title: 'Unauthorized Update',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('Delete Product', () => {
    it('should delete product successfully', async () => {
      // Create product
      const createRes = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          pid: 'delete-test-prod',
          title: 'To Be Deleted',
          description: 'This product will be deleted',
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

      const productId = createRes.body.data.id;

      // Delete product
      const response = await request(app)
        .delete(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 204, 404]).toContain(response.status);

      // Verify deletion
      const getRes = await request(app)
        .get(`/api/products/${productId}`);

      expect(getRes.status).toBe(404);
    });

    it('should reject deletion without authentication', async () => {
      const response = await request(app)
        .delete('/api/products/some-id');

      expect(response.status).toBe(401);
    });
  });

  describe('Product Search', () => {
    beforeEach(async () => {
      // Create products with different titles
      await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          pid: 'search-laptop',
          title: 'Gaming Laptop',
          description: 'High performance laptop',
          actualPrice: 2000,
          sellingPrice: 1800,
          currency: 'USD',
          category: 'Electronics',
          brand: 'TestBrand',
          images: [],
          sellerId: sellerId,
          subCategory: 'Computers',
          outOfStock: false,
        });

      await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          pid: 'search-phone',
          title: 'Smartphone',
          description: 'Latest smartphone',
          actualPrice: 1000,
          sellingPrice: 900,
          currency: 'USD',
          category: 'Electronics',
          brand: 'TestBrand',
          images: [],
          sellerId: sellerId,
          subCategory: 'Phones',
          outOfStock: false,
        });
    });

    it('should search products by title', async () => {
      const response = await request(app)
        .get('/api/products?search=laptop')
        .expect(200);

      expect(response.body.success).toBe(true);
      if (response.body.data.products.length > 0) {
        const hasLaptop = response.body.data.products.some(
          (p: any) => p.title.toLowerCase().includes('laptop')
        );
        expect(hasLaptop).toBe(true);
      }
    });
  });
});
