import { EachMessagePayload } from 'kafkajs';
import { BaseEventHandler } from './user-registered.handler';
import { SendEmailUseCase } from '@application/use-cases/send-email.use-case';
import { NotificationType } from '@domain/notification.entity';

/**
 * PaymentSucceeded Event Handler
 * Sends payment receipt when payment is successful
 */
export class PaymentSucceededHandler extends BaseEventHandler {
    constructor(private sendEmailUseCase: SendEmailUseCase) {
        super();
    }

    protected async processEvent(payload: EachMessagePayload): Promise<void> {
        const event = this.parseMessage<{
            paymentId: string;
            orderId: string;
            orderNumber: string;
            userEmail: string;
            customerName: string;
            amount: number;
            currency: string;
            paymentMethod: string;
            transactionId: string;
            paymentDate: string;
        }>(payload);

        const result = await this.sendEmailUseCase.execute({
            type: NotificationType.PAYMENT_RECEIPT,
            recipient: event.userEmail,
            data: {
                customerName: event.customerName,
                orderNumber: event.orderNumber,
                amount: event.amount,
                paymentMethod: event.paymentMethod,
                transactionId: event.transactionId,
                paymentDate: new Date(event.paymentDate),
            },
        });

        if (!result.success) {
            console.error(`Failed to send payment receipt to ${event.userEmail}:`, result.error);
            throw result.error;
        }

        console.log(`✉️ Payment receipt sent for order ${event.orderNumber}`);
    }
}
