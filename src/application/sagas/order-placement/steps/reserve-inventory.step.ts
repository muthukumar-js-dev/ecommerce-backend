import { SagaStep, SagaContext } from '@infrastructure/saga/saga.interface';
import { IProductRepository } from '@domain/product/repositories/product.repository.interface';

/**
 * Reserve Inventory Step
 * Reserves inventory for all order items
 */
export class ReserveInventoryStep implements SagaStep {
    name = 'ReserveInventory';

    constructor(private productRepository: IProductRepository) { }

    async execute(context: SagaContext): Promise<void> {
        const { items } = context.data;
        const reservedItems: Array<{ productId: string; quantity: number }> = [];

        for (const item of items) {
            const product = await this.productRepository.findById(item.productId);
            if (!product) {
                throw new Error(`Product not found: ${item.productId}`);
            }

            // Reserve inventory
            product.reserveInventory(item.quantity);

            const updateResult = await this.productRepository.update(product);
            if (!updateResult.success) {
                throw updateResult.error;
            }

            reservedItems.push({
                productId: item.productId,
                quantity: item.quantity,
            });

            console.log(`✅ Reserved ${item.quantity} units of product ${item.productId}`);
        }

        // Store reserved items for compensation
        context.stepData['reservedItems'] = reservedItems;
    }

    async compensate(context: SagaContext): Promise<void> {
        const reservedItems = context.stepData['reservedItems'] || [];

        console.log(`🔙 Releasing ${reservedItems.length} reserved items`);

        for (const item of reservedItems) {
            try {
                const product = await this.productRepository.findById(item.productId);
                if (product) {
                    product.restockInventory(item.quantity);
                    await this.productRepository.update(product);

                    console.log(`✅ Released ${item.quantity} units of product ${item.productId}`);
                }
            } catch (error: any) {
                console.error(`❌ Failed to release inventory for ${item.productId}:`, error.message);
            }
        }
    }
}
