import Stripe from 'stripe';
import { IPaymentGateway, PaymentIntent } from '@shared/application/ports/payment-gateway.port';
import { Money } from '@shared/domain/product/value-objects/money.vo';
import { AsyncResult, success, failure } from '@shared/types/result';
import { ExternalServiceError } from '@shared/errors/external-service.error';

/**
 * Stripe adapter for Payment Service
 * Implements Anti-Corruption Layer for Stripe API
 */
export class StripeAdapter implements IPaymentGateway {
    private stripe: Stripe;

    constructor(apiKey: string) {
        this.stripe = new Stripe(apiKey, { apiVersion: '2023-10-16' });
    }

    async createCustomer(email: string, name: string): AsyncResult<{ customerId: string }> {
        try {
            const customer = await this.stripe.customers.create({
                email,
                name,
            });

            return success({ customerId: customer.id });
        } catch (error: any) {
            return failure(
                new ExternalServiceError('Stripe', 'Failed to create customer', error)
            );
        }
    }

    async createPaymentIntent(
        amount: Money,
        customerId: string,
        metadata?: Record<string, string>
    ): AsyncResult<PaymentIntent> {
        try {
            const paymentIntent = await this.stripe.paymentIntents.create({
                amount: Math.round(amount.amount * 100), // Convert to cents
                currency: amount.currency.toLowerCase(),
                customer: customerId,
                metadata,
                capture_method: 'manual', // Authorize first, capture later
            });

            return success(this.toPaymentIntent(paymentIntent, amount.currency));
        } catch (error: any) {
            return failure(
                new ExternalServiceError('Stripe', 'Failed to create payment intent', error)
            );
        }
    }

    async capturePayment(paymentIntentId: string): AsyncResult<void> {
        try {
            await this.stripe.paymentIntents.capture(paymentIntentId);
            return success(undefined);
        } catch (error: any) {
            return failure(
                new ExternalServiceError('Stripe', 'Failed to capture payment', error)
            );
        }
    }

    async refundPayment(
        paymentIntentId: string,
        amount?: Money
    ): AsyncResult<{ refundId: string }> {
        try {
            const refund = await this.stripe.refunds.create({
                payment_intent: paymentIntentId,
                amount: amount ? Math.round(amount.amount * 100) : undefined,
            });

            return success({ refundId: refund.id });
        } catch (error: any) {
            return failure(
                new ExternalServiceError('Stripe', 'Failed to process refund', error)
            );
        }
    }

    /**
     * Verify Stripe webhook signature
     */
    verifyWebhookSignature(
        payload: string | Buffer,
        signature: string,
        secret: string
    ): Stripe.Event {
        return this.stripe.webhooks.constructEvent(payload, signature, secret);
    }

    private toPaymentIntent(stripeIntent: Stripe.PaymentIntent, currency: string): PaymentIntent {
        return {
            id: stripeIntent.id,
            amount: Money.create(stripeIntent.amount / 100, currency as any),
            status: this.mapStatus(stripeIntent.status),
            clientSecret: stripeIntent.client_secret || undefined,
        };
    }

    private mapStatus(
        stripeStatus: Stripe.PaymentIntent.Status
    ): 'pending' | 'succeeded' | 'failed' {
        switch (stripeStatus) {
            case 'succeeded':
                return 'succeeded';
            case 'canceled':
                return 'failed';
            default:
                return 'pending';
        }
    }
}
