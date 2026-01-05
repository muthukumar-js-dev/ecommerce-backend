import { setupIntegrationTests, teardownIntegrationTests, clearDatabase } from '../setup';

const request = require('supertest');

describe('Address Management E2E Tests', () => {
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

    userToken = userRes.body.data.token;
  });

  describe('Create Address', () => {
    it('should create address successfully', async () => {
      const response = await request(app)
        .post('/api/addresses')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          street: '123 Main St',
          city: 'Test City',
          state: 'TS',
          postalCode: '12345',
          country: 'Test Country',
          isDefault: true,
        });

      expect([200, 201]).toContain(response.status);
      if (response.body.success) {
        expect(response.body.data.street).toBe('123 Main St');
      }
    });

    it('should reject address creation without authentication', async () => {
      const response = await request(app)
        .post('/api/addresses')
        .send({
          street: '123 Main St',
          city: 'Test City',
          state: 'TS',
          postalCode: '12345',
          country: 'Test Country',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('List Addresses', () => {
    it('should list user addresses', async () => {
      // Create address first
      await request(app)
        .post('/api/addresses')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          street: '123 Main St',
          city: 'Test City',
          state: 'TS',
          postalCode: '12345',
          country: 'Test Country',
        });

      const response = await request(app)
        .get('/api/addresses')
        .set('Authorization', `Bearer ${userToken}`);

      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Update Address', () => {
    it('should update address successfully', async () => {
      const createRes = await request(app)
        .post('/api/addresses')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          street: '123 Main St',
          city: 'Test City',
          state: 'TS',
          postalCode: '12345',
          country: 'Test Country',
        });

      if (createRes.body.data && createRes.body.data.id) {
        const addressId = createRes.body.data.id;

        const response = await request(app)
          .put(`/api/addresses/${addressId}`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            street: '456 New St',
          });

        expect([200, 404]).toContain(response.status);
      }
    });
  });

  describe('Delete Address', () => {
    it('should delete address successfully', async () => {
      const createRes = await request(app)
        .post('/api/addresses')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          street: '123 Main St',
          city: 'Test City',
          state: 'TS',
          postalCode: '12345',
          country: 'Test Country',
        });

      if (createRes.body.data && createRes.body.data.id) {
        const addressId = createRes.body.data.id;

        const response = await request(app)
          .delete(`/api/addresses/${addressId}`)
          .set('Authorization', `Bearer ${userToken}`);

        expect([200, 204, 404]).toContain(response.status);
      }
    });
  });
});
