import { EachMessagePayload } from 'kafkajs';
import { BaseEventHandler } from './base-event-handler';
import { ProcessedEventRepository } from '@infrastructure/database/mongodb/repositories/processed-event.repository';
import { OrderReadRepository } from '@infrastructure/database/mongodb/read-models/order-read.repository';

/**
 * Handler for OrderPlaced events from Kafka
 * Updates order read model when an order is placed
 */
export class OrderPlacedConsumerHandler extends BaseEventHandler {
    constructor(
        processedEventRepo: ProcessedEventRepository,
        private orderReadRepo: OrderReadRepository
    ) {
        super(processedEventRepo);
    }

    protected async processEvent(payload: EachMessagePayload): Promise<void> {
        const event = this.parseMessage<{
            orderId: string;
            orderNumber: string;
            userId: string;
            items: Array<{
                productId: string;
                productName: string;
                quantity: number;
                price: number;
            }>;
            totalAmount: number;
            status: string;
            shippingAddress: {
                street: string;
                city: string;
                state: string;
                zipCode: string;
                country: string;
            };
            createdAt: string;
        }>(payload);

        // Update order read model
        await this.orderReadRepo.create({
            orderId: event.orderId,
            orderNumber: event.orderNumber,
            userId: event.userId,
            items: event.items.map(item => ({
                productId: item.productId,
                name: item.productName,
                quantity: item.quantity,
                price: item.price
            })),
            itemCount: event.items.length,
            totalAmount: event.totalAmount,
            status: event.status,
            placedAt: new Date(event.createdAt),
            updatedAt: new Date(),
        } as any); // Cast as any because shippingAddress is in payload but maybe not in IOrderReadModel strictly or simplified

        console.log(`  ✓ Order read model created for: ${event.orderNumber}`);
    }
}
