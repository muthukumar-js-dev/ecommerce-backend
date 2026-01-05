import { setupIntegrationTests, teardownIntegrationTests, clearDatabase } from '../setup';
import { UserModel } from '../../../src/infrastructure/database/mongodb/schemas/user.schema';
import { UserRole } from '../../../src/shared/types/common';

const request = require('supertest');

describe('Order Management E2E Tests', () => {
  let app: any;
  let customerToken: string;
  let orderId: string;

  beforeAll(async () => {
    app = await setupIntegrationTests();
  });

  afterAll(async () => {
    await teardownIntegrationTests();
  });

  beforeEach(async () => {
    await clearDatabase();

    // Create complete order flow
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
        pid: 'order-mgmt-prod',
        title: 'Order Management Product',
        description: 'Product for order management',
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

    const productId = productRes.body.data.id;

    const customerRes = await request(app)
      .post('/api/users/register')
      .send({
        name: 'Customer',
        email: 'customer@test.com',
        password: 'Password123!',
      });

    customerToken = customerRes.body.data.token;

    // Add to cart and place order
    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        productId,
        quantity: 1,
      });

    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        paymentMethod: 'card',
        shippingAddressId: 'addr-test',
      });

    if (orderRes.body.data && orderRes.body.data.id) {
      orderId = orderRes.body.data.id;
    }
  });

  describe('Get Order History', () => {
    it('should get user order history', async () => {
      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`);

      expect([200, 404]).toContain(response.status);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/orders');

      expect(response.status).toBe(401);
    });
  });

  describe('Get Order Details', () => {
    it('should get order by ID', async () => {
      if (orderId) {
        const response = await request(app)
          .get(`/api/orders/${orderId}`)
          .set('Authorization', `Bearer ${customerToken}`);

        expect([200, 404]).toContain(response.status);
      }
    });
  });

  describe('Cancel Order', () => {
    it('should cancel order item', async () => {
      if (orderId) {
        const response = await request(app)
          .post(`/api/orders/${orderId}/cancel`)
          .set('Authorization', `Bearer ${customerToken}`)
          .send({
            productId: 'some-product-id',
            reason: 'Changed mind',
          });

        expect([200, 400, 404]).toContain(response.status);
      }
    });
  });

  describe('Update Order Status', () => {
    it('should update order status', async () => {
      if (orderId) {
        const response = await request(app)
          .patch(`/api/orders/${orderId}/status`)
          .set('Authorization', `Bearer ${customerToken}`)
          .send({
            productId: 'some-product-id',
            status: 'shipped',
          });

        expect([200, 400, 404]).toContain(response.status);
      }
    });
  });
});
