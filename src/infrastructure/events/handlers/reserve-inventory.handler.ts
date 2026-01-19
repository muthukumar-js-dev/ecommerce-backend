import { EventHandler } from '../event-handler.interface';
import { OrderPlaced } from '@domain/order/events/order-placed.event';
import { IProductRepository } from '@domain/product/repositories/product.repository.interface';
import { Quantity } from '@domain/product/value-objects/quantity.vo';


export class ReserveInventoryHandler implements EventHandler<OrderPlaced> {
    constructor(
        private readonly productRepository: IProductRepository
    ) { }

    async handle(event: OrderPlaced): Promise<void> {
        const { items, orderNumber } = event.payload;

        console.log(`[ReserveInventoryHandler] Reserving inventory for Order #${orderNumber}`);

        for (const item of items) {
            const product = await this.productRepository.findById(item.productId);

            if (product) {
                // Update inventory
                // Update inventory
                product.reserveInventory(Quantity.create(item.quantity));
                await this.productRepository.save(product);
                console.log(`[ReserveInventoryHandler] Reserved ${item.quantity} for Product ${item.productId}`);
            } else {
                console.error(`[ReserveInventoryHandler] Product ${item.productId} not found for Order #${orderNumber}`);
            }
        }
    }
}
