import { setupIntegrationTests, teardownIntegrationTests, clearDatabase } from '../setup';
// import { UserModel } from '../../../src/infrastructure/database/mongodb/schemas/user.schema'; 
// Use require for Models to avoid potential import issues? 
// SchemaSanity used import { UserModel } and worked. So local imports are fine.
import { UserModel } from '../../../src/infrastructure/database/mongodb/schemas/user.schema';
import { UserRole } from '../../../src/shared/types/common';

const request = require('supertest');
const fs = require('fs');

describe('User Flow E2E Integration Tests', () => {
  let app: any; // Type 'any' to avoid importing Application from express
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    app = await setupIntegrationTests();
  });

  afterAll(async () => {
    await teardownIntegrationTests();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  describe('Complete User Journey', () => {
    it('should complete registration -> login -> profile flow', async () => {
      // 1. Register
      const registerFn = () => request(app)
        .post('/api/users/register')
        .send({
          name: 'E2E User',
          email: 'e2e@example.com',
          password: 'Password123!',
        });
      
      const registerResponse = await registerFn();
      if (registerResponse.status !== 201) {
        fs.writeFileSync('error_dump.json', JSON.stringify({ step: 'register', status: registerResponse.status, body: registerResponse.body }, null, 2));
        throw new Error(`Register failed with status ${registerResponse.status}`);
      }

      expect(registerResponse.body.success).toBe(true);
      expect(registerResponse.body.data.email).toBe('e2e@example.com');
      
      const registeredId = registerResponse.body.data.id;

      // 2. Login
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: 'e2e@example.com',
          password: 'Password123!',
        });
        
      if (loginResponse.status !== 200) {
        throw new Error(`Login failed with status ${loginResponse.status}`);
      }

      expect(loginResponse.body.success).toBe(true);
      authToken = loginResponse.body.data.token;
      userId = loginResponse.body.data.user.id;
      expect(userId).toBe(registeredId);

      // 3. Get Profile
      const profileResponse = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(profileResponse.body.success).toBe(true);
      expect(profileResponse.body.data.id).toBe(userId);
    });

    it('should prevent login with wrong password', async () => {
      await request(app).post('/api/users/register').send({
          name: 'Wrong Pass User',
          email: 'wrongpass@example.com',
          password: 'Password123!',
      });

      await request(app)
        .post('/api/users/login')
        .send({
          email: 'wrongpass@example.com',
          password: 'WrongPassword!',
        })
        .expect(401);
    });
  });

  describe('Order Flow', () => {
    it('should complete full order placement flow', async () => {
       expect(UserModel).toBeDefined();

       // 1. Register Admin
       const adminRes = await request(app)
        .post('/api/users/register')
        .send({
          name: 'Admin Candidate',
          email: 'admin@test.com',
          password: 'Password123!'
        });
       
       // 2. Promote to Admin directly in DB
       await UserModel.findOneAndUpdate({ email: 'admin@test.com' }, { userRole: UserRole.ADMIN });

       // 3. Login as Admin
       const loginAdmin = await request(app).post('/api/users/login').send({
         email: 'admin@test.com',
         password: 'Password123!'
       });
       
       expect(loginAdmin.status).toBe(200);
       const adminToken = loginAdmin.body.data.token;
       const sellerId = loginAdmin.body.data.user.id;

       // 4. Create Product
       const productRes = await request(app)
         .post('/api/products')
         .set('Authorization', `Bearer ${adminToken}`)
         .send({
           pid: 'prod-001',
           title: 'High End Laptop',
           description: 'A very fast laptop',
           actualPrice: 1200,
           sellingPrice: 1000,
           currency: 'USD',
           category: 'Electronics',
           brand: 'TechBrand',
           images: ['img1.jpg'],
           sellerId: sellerId,
           subCategory: 'Laptops',
           outOfStock: false
         });
       
       expect(productRes.status).toBe(201);
       const productId = productRes.body.data.id;

       // 5. Register Customer
       const custRes = await request(app).post('/api/users/register').send({
         name: 'Customer',
         email: 'customer@test.com',
         password: 'Password123!'
       });
       expect(custRes.status).toBe(201);
       
       // Login Customer
       const loginCust = await request(app).post('/api/users/login').send({
         email: 'customer@test.com',
         password: 'Password123!'
       });
       expect(loginCust.status).toBe(200);
       const customerToken = loginCust.body.data.token;

       // 6. Add to Cart
       const cartRes = await request(app)
         .post('/api/cart/items')
         .set('Authorization', `Bearer ${customerToken}`)
         .send({
           productId,
           quantity: 1
         });
        expect(cartRes.status).toBe(200);

       // 7. Place Order
       const orderRes = await request(app)
         .post('/api/orders')
         .set('Authorization', `Bearer ${customerToken}`)
         .send({
           paymentMethod: 'card',
           shippingAddressId: 'addr-dummy'
         });
          
       expect(orderRes.status).toBe(201);
       expect(orderRes.body.success).toBe(true);
    });
  });
});
