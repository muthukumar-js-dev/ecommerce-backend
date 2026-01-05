import { IPaymentGateway, PaymentIntent } from '@application/ports/payment-gateway.port';
import { Money } from '@domain/product/value-objects/money.vo';
import { AsyncResult } from '@shared/types/result';
import { CircuitBreaker } from '../resilience/circuit-breaker';
import { withRetry } from '../resilience/retry';

export class ResilientPaymentGateway implements IPaymentGateway {
    private circuitBreaker: CircuitBreaker;

    constructor(private readonly innerGateway: IPaymentGateway) {
        this.circuitBreaker = new CircuitBreaker(5, 60000, 2);
    }

    async createCustomer(email: string, name: string): AsyncResult<{ customerId: string }> {
        return this.circuitBreaker.execute(() =>
            withRetry(() => this.innerGateway.createCustomer(email, name), {
                maxAttempts: 3,
                delayMs: 1000,
            })
        );
    }

    async createPaymentIntent(
        amount: Money,
        customerId: string,
        metadata?: Record<string, string>
    ): AsyncResult<PaymentIntent> {
        return this.circuitBreaker.execute(() =>
            withRetry(
                () => this.innerGateway.createPaymentIntent(amount, customerId, metadata),
                {
                    maxAttempts: 3,
                    delayMs: 1000,
                }
            )
        );
    }

    async capturePayment(paymentIntentId: string): AsyncResult<void> {
        return this.circuitBreaker.execute(() =>
            withRetry(() => this.innerGateway.capturePayment(paymentIntentId), {
                maxAttempts: 3,
                delayMs: 1000,
            })
        );
    }

    async refundPayment(
        paymentIntentId: string,
        amount?: Money
    ): AsyncResult<{ refundId: string }> {
        return this.circuitBreaker.execute(() =>
            withRetry(() => this.innerGateway.refundPayment(paymentIntentId, amount), {
                maxAttempts: 3,
                delayMs: 1000,
            })
        );
    }
}
