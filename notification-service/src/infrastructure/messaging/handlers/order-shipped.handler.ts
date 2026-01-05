import { EachMessagePayload } from 'kafkajs';
import { BaseEventHandler } from './user-registered.handler';
import { SendEmailUseCase } from '@application/use-cases/send-email.use-case';
import { NotificationType } from '@domain/notification.entity';

/**
 * OrderShipped Event Handler
 * Sends shipping notification when an order ships
 */
export class OrderShippedHandler extends BaseEventHandler {
    constructor(private sendEmailUseCase: SendEmailUseCase) {
        super();
    }

    protected async processEvent(payload: EachMessagePayload): Promise<void> {
        const event = this.parseMessage<{
            orderId: string;
            orderNumber: string;
            userEmail: string;
            customerName: string;
            trackingNumber: string;
            carrier: string;
            trackingUrl: string;
            estimatedDelivery: string;
        }>(payload);

        const result = await this.sendEmailUseCase.execute({
            type: NotificationType.ORDER_SHIPPED,
            recipient: event.userEmail,
            data: {
                customerName: event.customerName,
                orderNumber: event.orderNumber,
                trackingNumber: event.trackingNumber,
                carrier: event.carrier,
                trackingUrl: event.trackingUrl,
                estimatedDelivery: new Date(event.estimatedDelivery),
            },
        });

        if (!result.success) {
            console.error(`Failed to send shipping notification to ${event.userEmail}:`, result.error);
            throw result.error;
        }

        console.log(`✉️ Shipping notification sent for order ${event.orderNumber}`);
    }
}
