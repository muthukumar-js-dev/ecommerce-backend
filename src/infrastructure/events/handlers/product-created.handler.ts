import { EventHandler } from '../event-handler.interface';
import { ProductCreated } from '@domain/product/events/product-created.event';
import { ProductReadRepository } from '@infrastructure/database/mongodb/read-models/product-read.repository';

export class ProductCreatedHandler implements EventHandler<ProductCreated> {
    constructor(private readonly repository: ProductReadRepository = new ProductReadRepository()) { }

    async handle(event: ProductCreated): Promise<void> {
        console.log(`[ProductCreatedHandler] Processing product: ${event.payload.productId}`);

        await this.repository.save({
            id: event.payload.productId,
            _id: event.payload.productId,
            pid: event.payload.sku,
            title: event.payload.title,
            category: event.payload.category,
            price: event.payload.price,
            sellerId: event.payload.sellerId,
            brand: event.payload.brand,
            description: event.payload.description,
            images: event.payload.images,
            createdAt: event.payload.createdAt,
            outOfStock: false
        } as any);
    }
}
