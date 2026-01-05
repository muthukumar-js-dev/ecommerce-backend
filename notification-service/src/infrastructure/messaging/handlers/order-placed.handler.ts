import { EachMessagePayload } from 'kafkajs';
import { BaseEventHandler } from './user-registered.handler';
import { SendEmailUseCase } from '@application/use-cases/send-email.use-case';
import { NotificationType } from '@domain/notification.entity';

/**
 * OrderPlaced Event Handler
 * Sends order confirmation email when an order is placed
 */
export class OrderPlacedHandler extends BaseEventHandler {
    constructor(private sendEmailUseCase: SendEmailUseCase) {
        super();
    }

    protected async processEvent(payload: EachMessagePayload): Promise<void> {
        const event = this.parseMessage<{
            orderId: string;
            orderNumber: string;
            userId: string;
            userEmail: string;
            customerName: string;
            items: Array<{
                name: string;
                quantity: number;
                price: number;
            }>;
            subtotal: number;
            shipping: number;
            tax: number;
            total: number;
            shippingAddress: {
                recipientName: string;
                street: string;
                city: string;
                state: string;
                postalCode: string;
                country: string;
            };
            estimatedDelivery: string;
        }>(payload);

        const result = await this.sendEmailUseCase.execute({
            type: NotificationType.ORDER_CONFIRMATION,
            recipient: event.userEmail,
            data: {
                customerName: event.customerName,
                orderNumber: event.orderNumber,
                orderDate: new Date(),
                estimatedDelivery: new Date(event.estimatedDelivery),
                items: event.items,
                subtotal: event.subtotal,
                shipping: event.shipping,
                tax: event.tax,
                total: event.total,
                shippingAddress: event.shippingAddress,
            },
        });

        if (!result.success) {
            console.error(`Failed to send order confirmation to ${event.userEmail}:`, result.error);
            throw result.error;
        }

        console.log(`✉️ Order confirmation sent for order ${event.orderNumber}`);
    }
}
