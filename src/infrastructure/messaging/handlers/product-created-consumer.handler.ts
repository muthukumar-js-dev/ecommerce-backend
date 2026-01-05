import { EachMessagePayload } from 'kafkajs';
import { BaseEventHandler } from './base-event-handler';
import { ProcessedEventRepository } from '@infrastructure/database/mongodb/repositories/processed-event.repository';
import { ProductReadRepository } from '@infrastructure/database/mongodb/read-models/product-read.repository';

/**
 * Handler for ProductCreated events from Kafka
 * Updates product read model when a new product is created
 */
export class ProductCreatedConsumerHandler extends BaseEventHandler {
    constructor(
        processedEventRepo: ProcessedEventRepository,
        private productReadRepo: ProductReadRepository
    ) {
        super(processedEventRepo);
    }

    protected async processEvent(payload: EachMessagePayload): Promise<void> {
        const event = this.parseMessage<{
            productId: string;
            name: string;
            description: string;
            sku: string;
            price: number;
            currency: string;
            quantity: number;
            category: string;
            seller: string;
            images: string[];
            createdAt: string;
        }>(payload);

        // Update product read model
        await this.productReadRepo.create({
            productId: event.productId,
            name: event.name,
            description: event.description,
            sku: event.sku,
            price: event.price,
            currency: event.currency,
            quantity: event.quantity,
            category: event.category,
            seller: event.seller,
            images: event.images,
            isActive: true,
            createdAt: new Date(event.createdAt),
            updatedAt: new Date(),
        });

        console.log(`  ✓ Product read model created for: ${event.name} (${event.sku})`);
    }
}
