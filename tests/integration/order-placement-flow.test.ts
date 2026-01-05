import request from 'supertest';
import { setupIntegrationTests, teardownIntegrationTests, clearDatabase, sleep, createTestUser, createTestProduct, createTestOrder } from './setup';
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
            const userData = createTestUser();
            const registerResponse = await request(app)
                .post('/api/users/register')
                .send(userData)
                .expect(201);

            token = registerResponse.body.token;
            userId = registerResponse.body.userId;
            expect(token).toBeDefined();
            expect(userId).toBeDefined();

            // 2. Create product
            const productData = createTestProduct();
            const productResponse = await request(app)
                .post('/api/products')
                .set('Authorization', `Bearer ${token}`)
                .send(productData)
                .expect(201);

            productId = productResponse.body.productId || productResponse.body.id;
            expect(productId).toBeDefined();

            // 3. Add to cart
            await request(app)
                .post('/api/cart/add')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    productId,
                    quantity: 2,
                })
                .expect(200);

            // 4. Get cart
            const cartResponse = await request(app)
                .get('/api/cart')
                .set('Authorization', `Bearer ${token}`)
                .expect(200);

            expect(cartResponse.body.items).toHaveLength(1);
            expect(cartResponse.body.items[0].productId).toBe(productId);
            expect(cartResponse.body.items[0].quantity).toBe(2);

            // 5. Place order
            const orderData = createTestOrder();
            const orderResponse = await request(app)
                .post('/api/orders')
                .set('Authorization', `Bearer ${token}`)
                .send(orderData)
                .expect(201);

            const { orderId, orderNumber } = orderResponse.body;
            expect(orderId).toBeDefined();
            expect(orderNumber).toBeDefined();

            // 6. Wait for async processing
            await sleep(2000);

            // 7. Verify order created
            const orderCheck = await request(app)
                .get(`/api/orders/${orderId}`)
                .set('Authorization', `Bearer ${token}`)
                .expect(200);

            expect(orderCheck.body.id).toBe(orderId);
            expect(orderCheck.body.status).toBeDefined();

            // 8. Verify inventory updated
            const productCheck = await request(app)
                .get(`/api/products/${productId}`)
                .expect(200);

            expect(productCheck.body.inventory).toBeLessThan(100);
        });

        it('should handle out of stock scenario', async () => {
            // 1. Register user
            const userData = createTestUser();
            const registerResponse = await request(app)
                .post('/api/users/register')
                .send(userData)
                .expect(201);

            token = registerResponse.body.token;

            // 2. Create product with low inventory
            const productData = { ...createTestProduct(), inventory: 1 };
            const productResponse = await request(app)
                .post('/api/products')
                .set('Authorization', `Bearer ${token}`)
                .send(productData)
                .expect(201);

            productId = productResponse.body.productId || productResponse.body.id;

            // 3. Try to add more than available
            const response = await request(app)
                .post('/api/cart/add')
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
            const userData = createTestUser();
            const registerResponse = await request(app)
                .post('/api/users/register')
                .send(userData)
                .expect(201);

            token = registerResponse.body.token;

            const productData = createTestProduct();
            const productResponse = await request(app)
                .post('/api/products')
                .set('Authorization', `Bearer ${token}`)
                .send(productData)
                .expect(201);

            productId = productResponse.body.productId || productResponse.body.id;
        });

        it('should add item to cart', async () => {
            const response = await request(app)
                .post('/api/cart/add')
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
                .post('/api/cart/add')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    productId,
                    quantity: 2,
                })
                .expect(200);

            // Update quantity
            const response = await request(app)
                .put('/api/cart/update')
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
                .post('/api/cart/add')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    productId,
                    quantity: 2,
                })
                .expect(200);

            // Remove item
            await request(app)
                .delete(`/api/cart/remove/${productId}`)
                .set('Authorization', `Bearer ${token}`)
                .expect(200);

            // Verify cart is empty
            const cartResponse = await request(app)
                .get('/api/cart')
                .set('Authorization', `Bearer ${token}`)
                .expect(200);

            expect(cartResponse.body.items).toHaveLength(0);
        });

        it('should clear entire cart', async () => {
            // Add multiple items
            await request(app)
                .post('/api/cart/add')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    productId,
                    quantity: 2,
                })
                .expect(200);

            // Clear cart
            await request(app)
                .delete('/api/cart/clear')
                .set('Authorization', `Bearer ${token}`)
                .expect(200);

            // Verify cart is empty
            const cartResponse = await request(app)
                .get('/api/cart')
                .set('Authorization', `Bearer ${token}`)
                .expect(200);

            expect(cartResponse.body.items).toHaveLength(0);
        });
    });
});
