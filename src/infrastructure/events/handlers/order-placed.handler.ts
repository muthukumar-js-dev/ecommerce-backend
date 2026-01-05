import { EventHandler } from '../event-handler.interface';
import { OrderPlaced } from '@domain/order/events/order-placed.event';
import { OrderReadRepository } from '@infrastructure/database/mongodb/read-models/order-read.repository';

export class OrderPlacedHandler implements EventHandler<OrderPlaced> {
    constructor(private readonly repository: OrderReadRepository = new OrderReadRepository()) { }

    async handle(event: OrderPlaced): Promise<void> {
        console.log(`[OrderPlacedHandler] Processing order: ${event.payload.orderNumber}`);

        await this.repository.save({
            orderId: event.payload.orderId,
            orderNumber: event.payload.orderNumber,
            userId: event.payload.userId,
            status: event.payload.status,
            totalAmount: event.payload.totalAmount,
            itemCount: event.payload.itemCount,
            items: event.payload.items,
            placedAt: event.payload.placedAt,
        } as any);
    }
}
