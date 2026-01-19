import { PactV3, Matchers } from '@pact-foundation/pact';
import path from 'path';
import axios from 'axios';

const { like } = Matchers;

describe('Notification Service Contract Tests', () => {
    const provider = new PactV3({
        consumer: 'core-service',
        provider: 'notification-service',
        port: 8990,
        dir: path.resolve(process.cwd(), 'pacts'),
        logLevel: 'info',
    });

    // PactV3 handles lifecycle automatically via executeTest.

    describe('Send Email', () => {
        it('should send email successfully', async () => {
            await provider
                .given('user exists with valid email')
                .uponReceiving('a request to send email')
                .withRequest({
                    method: 'POST',
                    path: '/api/notifications/email',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: like('Bearer token123'),
                    },
                    body: {
                        to: like('user@example.com'),
                        subject: like('Order Confirmation'),
                        template: like('order-confirmation'),
                        data: {
                            orderNumber: like('ORD-001'),
                            totalAmount: like(1000),
                        },
                    },
                })
                .willRespondWith({
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: {
                        notificationId: like('notif-123'),
                        status: 'SENT',
                        channel: 'EMAIL',
                    },
                })
                .executeTest(async (mockServer) => {
                    const response = await axios.post(
                        `${mockServer.url}/api/notifications/email`,
                        {
                            to: 'user@example.com',
                            subject: 'Order Confirmation',
                            template: 'order-confirmation',
                            data: {
                                orderNumber: 'ORD-001',
                                totalAmount: 1000,
                            },
                        },
                        {
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: 'Bearer token123',
                            },
                        }
                    );

                    expect(response.data.notificationId).toBeDefined();
                    expect(response.data.status).toBe('SENT');
                    expect(response.data.channel).toBe('EMAIL');
                });
        });
    });

    describe('Get Notification Status', () => {
        it('should return notification status', async () => {
            await provider
                .given('notification exists')
                .uponReceiving('a request for notification status')
                .withRequest({
                    method: 'GET',
                    path: '/api/notifications/notif-123',
                    headers: {
                        Authorization: like('Bearer token123'),
                    },
                })
                .willRespondWith({
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: {
                        notificationId: 'notif-123',
                        status: like('SENT'),
                        channel: 'EMAIL',
                        sentAt: like('2026-01-01T00:00:00Z'),
                    },
                })
                .executeTest(async (mockServer) => {
                    const response = await axios.get(
                        `${mockServer.url}/api/notifications/notif-123`,
                        {
                            headers: {
                                Authorization: 'Bearer token123',
                            },
                        }
                    );

                    expect(response.data.notificationId).toBe('notif-123');
                    expect(response.data.status).toBeDefined();
                    expect(response.data.channel).toBe('EMAIL');
                });
        });
    });
});
