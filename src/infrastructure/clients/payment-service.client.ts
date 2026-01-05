import axios, { AxiosInstance } from 'axios';
import { AsyncResult, success, failure } from '@shared/types/result';
import { ExternalServiceError } from '@shared/errors/external-service.error';

export interface InitiatePaymentRequest {
    userId: string;
    amount: number;
    currency: string;
    paymentMethodId: string;
}

export interface InitiatePaymentResponse {
    paymentId: string;
    status: string;
}

/**
 * Payment Service HTTP Client
 * Communicates with the payment microservice
 */
export class PaymentServiceClient {
    private client: AxiosInstance;

    constructor(baseURL: string = process.env.PAYMENT_SERVICE_URL || 'http://localhost:3001') {
        this.client = axios.create({
            baseURL,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }

    async initiatePayment(request: InitiatePaymentRequest): AsyncResult<InitiatePaymentResponse> {
        try {
            const response = await this.client.post('/api/payments/initiate', request);

            return success(response.data);
        } catch (error: any) {
            console.error('Payment initiation failed:', error.response?.data || error.message);
            return failure(
                new ExternalServiceError('PaymentService', 'Failed to initiate payment', error)
            );
        }
    }

    async refundPayment(paymentId: string): AsyncResult<void> {
        try {
            await this.client.post(`/api/payments/${paymentId}/refund`);

            return success(undefined);
        } catch (error: any) {
            console.error('Payment refund failed:', error.response?.data || error.message);
            return failure(
                new ExternalServiceError('PaymentService', 'Failed to refund payment', error)
            );
        }
    }

    async getPaymentStatus(paymentId: string): AsyncResult<{ status: string }> {
        try {
            const response = await this.client.get(`/api/payments/${paymentId}`);

            return success({ status: response.data.status });
        } catch (error: any) {
            console.error('Get payment status failed:', error.response?.data || error.message);
            return failure(
                new ExternalServiceError('PaymentService', 'Failed to get payment status', error)
            );
        }
    }
}
