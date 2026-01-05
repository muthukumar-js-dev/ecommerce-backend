import { Money } from '@domain/product/value-objects/money.vo';
import { ID } from '@shared/types/common';
import { AsyncResult } from '@shared/types/result';

export interface PaymentIntent {
    id: string;
    amount: Money;
    status: 'pending' | 'succeeded' | 'failed';
    clientSecret?: string;
}

export interface IPaymentGateway {
    createCustomer(email: string, name: string): AsyncResult<{ customerId: string }>;
    createPaymentIntent(
        amount: Money,
        customerId: string,
        metadata?: Record<string, string>
    ): AsyncResult<PaymentIntent>;
    capturePayment(paymentIntentId: string): AsyncResult<void>;
    refundPayment(paymentIntentId: string, amount?: Money): AsyncResult<{ refundId: string }>;
}
