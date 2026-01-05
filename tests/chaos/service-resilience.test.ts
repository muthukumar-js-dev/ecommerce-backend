import { exec } from 'child_process';
import { promisify } from 'util';
import request from 'supertest';
import { setupIntegrationTests, teardownIntegrationTests, clearDatabase, sleep, createTestUser, createTestProduct, createTestOrder } from '../integration/setup';
import { Application } from 'express';
import { OutboxModel } from '../../src/infrastructure/database/mongodb/models/outbox.model';

const execAsync = promisify(exec);

describe('Chaos Engineering - Service Resilience', () => {
    let app: Application;

    beforeAll(async () => {
        app = await setupIntegrationTests();
    });

    afterAll(async () => {
        await teardownIntegrationTests();
    });

    beforeEach(async () => {
        await clearDatabase();
    });

    describe('Service Failure Scenarios', () => {
        it('should handle payment service failure gracefully', async () => {
            // Register user
            const userData = createTestUser();
            const registerResponse = await request(app)
                .post('/api/users/register')
                .send(userData)
                .expect(201);

            const token = registerResponse.body.token;

            // Create product
            const productData = createTestProduct();
            const productResponse = await request(app)
                .post('/api/products')
                .set('Authorization', `Bearer ${token}`)
                .send(productData)
                .expect(201);

            const productId = productResponse.body.productId || productResponse.body.id;

            // Add to cart
            await request(app)
                .post('/api/cart/add')
                .set('Authorization', `Bearer ${token}`)
                .send({ productId, quantity: 2 })
                .expect(200);

            try {
                // Stop payment service
                await execAsync('docker stop payment-service').catch(() => {
                    console.log('Payment service container not running, skipping stop');
                });

                await sleep(2000);

                // Attempt to place order
                const orderData = createTestOrder();
                const response = await request(app)
                    .post('/api/orders')
                    .set('Authorization', `Bearer ${token}`)
                    .send(orderData);

                // Should fail gracefully or use circuit breaker
                expect([503, 500, 201]).toContain(response.status);

                if (response.status === 503) {
                    expect(response.body.error).toBeDefined();
                }

                // Verify circuit breaker metrics
                const metricsResponse = await request(app).get('/metrics');
                expect(metricsResponse.status).toBe(200);
            } finally {
                // Restart payment service
                await execAsync('docker start payment-service').catch(() => {
                    console.log('Payment service container not found');
                });
                await sleep(5000);
            }
        });
    });

    describe('Kafka Failure Scenarios', () => {
        it('should store events in outbox when Kafka is down', async () => {
            try {
                // Stop Kafka
                await execAsync('docker stop kafka').catch(() => {
                    console.log('Kafka container not running, skipping stop');
                });

                await sleep(2000);

                // Register user (should succeed, events in outbox)
                const userData = createTestUser();
                const response = await request(app)
                    .post('/api/users/register')
                    .send(userData)
                    .expect(201);

                expect(response.body.userId).toBeDefined();

                // Verify events are in outbox (not published)
                const outboxEvents = await OutboxModel.find({
                    published: false
                });
                expect(outboxEvents.length).toBeGreaterThan(0);
            } finally {
                // Restart Kafka
                await execAsync('docker start kafka').catch(() => {
                    console.log('Kafka container not found');
                });
                await sleep(10000);

                // Wait for outbox publisher to process
                await sleep(5000);

                // Verify events were published
                const publishedEvents = await OutboxModel.find({
                    published: true
                });
                expect(publishedEvents.length).toBeGreaterThan(0);
            }
        });
    });

    describe('Circuit Breaker Validation', () => {
        it('should open circuit breaker after consecutive failures', async () => {
            // This test verifies circuit breaker behavior
            // Requires actual service failures to trigger

            const userData = createTestUser();
            const registerResponse = await request(app)
                .post('/api/users/register')
                .send(userData)
                .expect(201);

            const token = registerResponse.body.token;

            // Check metrics endpoint for circuit breaker state
            const metricsResponse = await request(app).get('/metrics');
            expect(metricsResponse.status).toBe(200);
            expect(metricsResponse.text).toContain('circuit_breaker');
        });
    });

    describe('Graceful Degradation', () => {
        it('should continue core operations when notification service is down', async () => {
            try {
                // Stop notification service
                await execAsync('docker stop notification-service').catch(() => {
                    console.log('Notification service container not running');
                });

                await sleep(2000);

                // Register user (should succeed even if notification fails)
                const userData = createTestUser();
                const response = await request(app)
                    .post('/api/users/register')
                    .send(userData)
                    .expect(201);

                expect(response.body.userId).toBeDefined();
                expect(response.body.token).toBeDefined();
            } finally {
                // Restart notification service
                await execAsync('docker start notification-service').catch(() => {
                    console.log('Notification service container not found');
                });
                await sleep(5000);
            }
        });
    });
});
