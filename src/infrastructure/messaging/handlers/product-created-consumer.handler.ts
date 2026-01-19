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
            id: event.productId,
            pid: event.sku,
            title: event.name,
            description: event.description,
            category: event.category,
            brand: 'Generic', // Default branding or extract from payload if available
            price: event.price,
            images: event.images,
            sellerId: event.seller,
            averageRating: 0,
            outOfStock: false,
            createdAt: new Date(event.createdAt),
            updatedAt: new Date(),
        } as any); // Cast as any to avoid strict type checks on missing optional fields like brand if not in payload

        console.log(`  ✓ Product read model created for: ${event.name} (${event.sku})`);
    }
}
