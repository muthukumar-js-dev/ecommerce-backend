import { SagaStep, SagaContext } from '@infrastructure/saga/saga.interface';
import { PaymentServiceClient } from '@infrastructure/clients/payment-service.client';

/**
 * Process Payment Step
 * Initiates payment via payment microservice
 */
export class ProcessPaymentStep implements SagaStep {
    name = 'ProcessPayment';

    constructor(private paymentClient: PaymentServiceClient) { }

    async execute(context: SagaContext): Promise<void> {
        const { userId, items, paymentMethodId } = context.data;

        const totalAmount = items.reduce(
            (sum: number, item: any) => sum + item.price * item.quantity,
            0
        );

        console.log(`💳 Initiating payment of ₹${totalAmount} for user ${userId}`);

        // Initiate payment
        const result = await this.paymentClient.initiatePayment({
            userId,
            amount: totalAmount,
            currency: 'INR',
            paymentMethodId,
        });

        if (!result.success) {
            throw new Error(`Payment failed: ${result.error.message}`);
        }

        // Store payment ID for compensation
        context.stepData.set('paymentId', result.data.paymentId);
        context.stepData.set('paymentAmount', totalAmount);

        console.log(`✅ Payment initiated: ${result.data.paymentId}`);
    }

    async compensate(context: SagaContext): Promise<void> {
        const paymentId = context.stepData.get('paymentId');

        if (paymentId) {
            console.log(`🔙 Refunding payment: ${paymentId}`);

            const result = await this.paymentClient.refundPayment(paymentId);

            if (result.success) {
                console.log(`✅ Payment refunded successfully: ${paymentId}`);
            } else {
                console.error(`❌ Failed to refund payment ${paymentId}:`, result.error.message);
            }
        } else {
            console.log('ℹ️ No payment to refund');
        }
    }
}
