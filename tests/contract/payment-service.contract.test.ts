import { PactV3, Matchers } from '@pact-foundation/pact';
import path from 'path';
import axios from 'axios';

const { like, regex } = Matchers;

describe('Payment Service Contract Tests', () => {
    const provider = new PactV3({
        consumer: 'core-service',
        provider: 'payment-service',
        port: 8989,
        dir: path.resolve(process.cwd(), 'pacts'),
        logLevel: 'info',
    });

    // PactV3 handles lifecycle automatically via executeTest.

    describe('Initiate Payment', () => {
        it('should initiate payment for valid order', async () => {
            await provider
                .given('order exists and user has valid payment method')
                .uponReceiving('a request to initiate payment')
                .withRequest({
                    method: 'POST',
                    path: '/api/payments/initiate',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: like('Bearer token123'),
                    },
                    body: {
                        orderId: like('order-123'),
                        userId: like('user-123'),
                        amount: like(1000),
                        currency: 'INR',
                    },
                })
                .willRespondWith({
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: {
                        paymentId: like('pay-123'),
                        status: 'AUTHORIZED',
                        amount: like(1000),
                        currency: 'INR',
                    },
                })
                .executeTest(async (mockServer) => {
                    const response = await axios.post(
                        `${mockServer.url}/api/payments/initiate`,
                        {
                            orderId: 'order-123',
                            userId: 'user-123',
                            amount: 1000,
                            currency: 'INR',
                        },
                        {
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: 'Bearer token123',
                            },
                        }
                    );

                    expect(response.data.paymentId).toBeDefined();
                    expect(response.data.status).toBe('AUTHORIZED');
                    expect(response.data.amount).toBe(1000);
                });
        });
    });

    describe('Get Payment Status', () => {
        it('should return payment status for valid payment ID', async () => {
            await provider
                .given('payment exists')
                .uponReceiving('a request for payment status')
                .withRequest({
                    method: 'GET',
                    path: '/api/payments/pay-123',
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
                        paymentId: 'pay-123',
                        status: like('CAPTURED'),
                        amount: like(1000),
                        currency: 'INR',
                        createdAt: regex('\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}', '2026-01-01T00:00:00'),
                    },
                })
                .executeTest(async (mockServer) => {
                    const response = await axios.get(`${mockServer.url}/api/payments/pay-123`, {
                        headers: {
                            Authorization: 'Bearer token123',
                        },
                    });

                    expect(response.data.paymentId).toBe('pay-123');
                    expect(response.data.status).toBeDefined();
                    expect(response.data.amount).toBeDefined();
                });
        });
    });

    describe('Refund Payment', () => {
        it('should refund payment successfully', async () => {
            await provider
                .given('payment is captured')
                .uponReceiving('a request to refund payment')
                .withRequest({
                    method: 'POST',
                    path: '/api/payments/pay-123/refund',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: like('Bearer token123'),
                    },
                    body: {
                        amount: like(1000),
                        reason: like('Customer requested refund'),
                    },
                })
                .willRespondWith({
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: {
                        refundId: like('ref-123'),
                        paymentId: 'pay-123',
                        status: 'REFUNDED',
                        amount: like(1000),
                    },
                })
                .executeTest(async (mockServer) => {
                    const response = await axios.post(
                        `${mockServer.url}/api/payments/pay-123/refund`,
                        {
                            amount: 1000,
                            reason: 'Customer requested refund',
                        },
                        {
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: 'Bearer token123',
                            },
                        }
                    );

                    expect(response.data.refundId).toBeDefined();
                    expect(response.data.status).toBe('REFUNDED');
                });
        });
    });
});
