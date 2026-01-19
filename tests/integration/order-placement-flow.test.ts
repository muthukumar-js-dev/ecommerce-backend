import request from 'supertest';
import { setupIntegrationTests, teardownIntegrationTests, clearDatabase, sleep, createTestUser, createTestProduct } from './setup';
import { Application } from 'express';

describe('Order Placement Flow - Integration Test', () => {
    let app: Application;
    let token: string;
    let userId: string;
    let productId: string;

    beforeAll(async () => {
        app = await setupIntegrationTests();
    });

    afterAll(async () => {
        await teardownIntegrationTests();
    });

    beforeEach(async () => {
        await clearDatabase();
    });

    describe('Complete Order Flow', () => {
        it('should complete full order placement flow', async () => {
            // 1. Register user
            const userData = { ...createTestUser(), userRole: 'admin' };
            const registerResponse = await request(app)
                .post('/api/users/register')
                .send(userData)
                .expect(201);

            userId = registerResponse.body.data.userId;
            expect(userId).toBeDefined();

            // 1b. Login to get token
            const loginResponse = await request(app)
                .post('/api/users/login')
                .send({
                    email: userData.email,
                    password: userData.password,
                })
                .expect(200);

            token = loginResponse.body.data.token;
            expect(token).toBeDefined();
            expect(userId).toBeDefined();

            // 2. Create product
            const productData = { ...createTestProduct(), sellerId: userId };
            const productResponse = await request(app)
                .post('/api/products')
                .set('Authorization', `Bearer ${token}`)
                .send(productData)
                .expect(201);

            productId = productResponse.body.data;
            expect(productId).toBeDefined();

            // 3. Add to cart
            const addToCartRes = await request(app)
                .post('/api/cart/items')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    productId,
                    quantity: 2,
                });

            expect(addToCartRes.status).toBe(200);

            // 4. Get cart
            const cartResponse = await request(app)
                .get('/api/cart')
                .set('Authorization', `Bearer ${token}`)
                .expect(200);

            expect(cartResponse.body.data.items).toHaveLength(1);
            expect(cartResponse.body.data.items[0].productId).toBe(productId);
            expect(cartResponse.body.data.items[0].quantity).toBe(2);

            // 5. Create shipping address
            const addressData = {
                name: 'Test User',
                mobileNumber: '1234567890',
                address: '123 Test St',
                locality: 'Test Locality',
                city: 'Test City',
                state: 'Test State',
                pincode: '123456',
                addressType: 'HOME'
            };
            const addressResponse = await request(app)
                .post('/api/addresses')
                .set('Authorization', `Bearer ${token}`)
                .send(addressData)
                .send(addressData);

            expect(addressResponse.status).toBe(201);

            const addressId = addressResponse.body.data.id;
            expect(addressId).toBeDefined();

            // 6. Place order
            const orderData = {
                shippingAddressId: addressId,
                paymentMethod: 'card'
            };
            const orderResponse = await request(app)
                .post('/api/orders')
                .set('Authorization', `Bearer ${token}`)
                .send(orderData);

            expect(orderResponse.status).toBe(201);

            const { id: orderId, orderNumber } = orderResponse.body.data;
            expect(orderId).toBeDefined();
            expect(orderNumber).toBeDefined();

            // 7. Wait for async processing
            await sleep(2000);

            // 8. Verify order created
            const orderCheck = await request(app)
                .get(`/api/orders/${orderId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(orderCheck.status).toBe(200);

            expect(orderCheck.body.data.id).toBe(orderId);
            expect(orderCheck.body.data.status).toBeDefined();

            // 9. Verify inventory updated
            const productCheck = await request(app)
                .get(`/api/products/${productId}`)
                .expect(200);

            expect(productCheck.body.data.inventory).toBeLessThan(100);
        });

        it('should handle out of stock scenario', async () => {
            // 1. Register user
            const userData = { ...createTestUser(), userRole: 'admin' };
            const regRes = await request(app)
                .post('/api/users/register')
                .send(userData)
                .expect(201);
            userId = regRes.body.data.userId;

            const loginResponse = await request(app)
                .post('/api/users/login')
                .send({
                    email: userData.email,
                    password: userData.password,
                })
                .expect(200);

            token = loginResponse.body.data.token;

            // 2. Create product with low inventory
            const productData = { ...createTestProduct(), inventory: 1, sellerId: userId };
            const productResponse = await request(app)
                .post('/api/products')
                .set('Authorization', `Bearer ${token}`)
                .send(productData)
                .expect(201);

            productId = productResponse.body.data;

            // 3. Try to add more than available
            const response = await request(app)
                .post('/api/cart/items')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    productId,
                    quantity: 10,
                });

            // Should either fail or limit quantity
            expect([400, 200]).toContain(response.status);
        });
    });

    describe('Cart Operations', () => {
        beforeEach(async () => {
            // Setup user and product
            const userData = { ...createTestUser(), userRole: 'admin' };
            const regRes = await request(app)
                .post('/api/users/register')
                .send(userData)
                .expect(201);
            userId = regRes.body.data.userId;

            const loginResponse = await request(app)
                .post('/api/users/login')
                .send({
                    email: userData.email,
                    password: userData.password,
                })
                .expect(200);

            token = loginResponse.body.data.token;

            const productData = { ...createTestProduct(), sellerId: userId };
            const productResponse = await request(app)
                .post('/api/products')
                .set('Authorization', `Bearer ${token}`)
                .send(productData)
                .expect(201);

            productId = productResponse.body.data;
        });

        it('should add item to cart', async () => {
            const response = await request(app)
                .post('/api/cart/items')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    productId,
                    quantity: 3,
                })
                .expect(200);

            expect(response.body.success).toBe(true);
        });

        it('should update cart item quantity', async () => {
            // Add item
            await request(app)
                .post('/api/cart/items')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    productId,
                    quantity: 2,
                })
                .expect(200);

            // Update quantity
            const response = await request(app)
                .patch('/api/cart/items')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    productId,
                    quantity: 5,
                })
                .expect(200);

            expect(response.body.success).toBe(true);
        });

        it('should remove item from cart', async () => {
            // Add item
            await request(app)
                .post('/api/cart/items')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    productId,
                    quantity: 2,
                })
                .expect(200);

            // Remove item
            await request(app)
                .delete(`/api/cart/items/${productId}`)
                .set('Authorization', `Bearer ${token}`)
                .expect(200);

            // Verify cart is empty
            const cartResponse = await request(app)
                .get('/api/cart')
                .set('Authorization', `Bearer ${token}`)
                .expect(200);

            expect(cartResponse.body.data.items).toHaveLength(0);
        });

        it('should clear entire cart', async () => {
            // Add multiple items
            await request(app)
                .post('/api/cart/items')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    productId,
                    quantity: 2,
                })
                .expect(200);

            // Clear cart
            await request(app)
                .delete('/api/cart')
                .set('Authorization', `Bearer ${token}`)
                .expect(200);

            // Verify cart is empty
            const cartResponse = await request(app)
                .get('/api/cart')
                .set('Authorization', `Bearer ${token}`)
                .expect(200);

            expect(cartResponse.body.data.items).toHaveLength(0);
        });
    });
});
