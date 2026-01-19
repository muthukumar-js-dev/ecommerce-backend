import { EventHandler } from '../event-handler.interface';
import { OrderPlaced } from '@domain/order/events/order-placed.event';

export class SendOrderConfirmationEmailHandler implements EventHandler<OrderPlaced> {
    handle(event: OrderPlaced): Promise<void> {
        const { orderNumber, totalAmount } = event.payload;

        console.log(`[EmailService] Sending order confirmation email for Order #${orderNumber}. Amount: ${totalAmount}`);

        // In a real app, you would call an email service provider here.
        // await emailProvider.send({ ... });
        return Promise.resolve();
    }
}
