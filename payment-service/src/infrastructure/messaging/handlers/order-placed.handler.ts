import { EachMessagePayload } from 'kafkajs';
import { InitiatePaymentCommand } from '../../../application/commands/initiate-payment.command';
import { InitiatePaymentHandler } from '../../../application/commands/initiate-payment.handler';

/**
 * Handler for OrderPlaced events
 * Initiates payment when an order is placed
 */
export class OrderPlacedHandler {
    private processedEvents: Set<string> = new Set();

    constructor(private initiatePaymentHandler: InitiatePaymentHandler) { }

    async handle(payload: EachMessagePayload): Promise<void> {
        const message = this.parseMessage(payload);

        // Idempotency check
        const eventId = payload.message.headers?.eventId?.toString();
        if (eventId && this.processedEvents.has(eventId)) {
            console.log(`Event ${eventId} already processed, skipping`);
            return;
        }

        console.log(`Processing OrderPlaced event for order ${message.orderId}`);

        // Create command
        const command = new InitiatePaymentCommand(
            message.orderId,
            message.userId,
            message.totalAmount,
            message.currency || 'INR',
            message.stripeCustomerId
        );

        // Execute command
        const result = await this.initiatePaymentHandler.handle(command);

        if (!result.success) {
            console.error(`Failed to initiate payment for order ${message.orderId}:`, result.error);
            throw result.error;
        }

        // Mark as processed
        if (eventId) {
            this.processedEvents.add(eventId);
        }

        console.log(`✓ Payment initiated for order ${message.orderId}: ${result.data.paymentId}`);
    }

    private parseMessage(payload: EachMessagePayload): {
        orderId: string;
        userId: string;
        totalAmount: number;
        currency?: string;
        stripeCustomerId: string;
    } {
        const value = payload.message.value?.toString();
        if (!value) {
            throw new Error('Empty message value');
        }

        const data = JSON.parse(value);
        return {
            orderId: data.orderId || data.payload?.orderId,
            userId: data.userId || data.payload?.userId,
            totalAmount: data.totalAmount || data.payload?.totalAmount,
            currency: data.currency || data.payload?.currency,
            stripeCustomerId: data.stripeCustomerId || data.payload?.stripeCustomerId,
        };
    }
}
