import { CommandHandler } from '../command-handler.interface';
import { CreateProductCommand } from './create-product.command';
import { Product } from '@domain/product/aggregates/product.aggregate';
import { IProductRepository } from '@domain/product/repositories/product.repository.interface';
import { EventBus } from '@infrastructure/events/event-bus';
import { Result, success, failure } from '@shared/types/result';
import { SKU } from '@domain/product/value-objects/sku.vo';
import { Money } from '@domain/product/value-objects/money.vo';
import { Quantity } from '@domain/product/value-objects/quantity.vo';
import { ID } from '@shared/types/common';
import { ConflictError } from '@shared/errors';

export class CreateProductHandler implements CommandHandler<CreateProductCommand, ID> {
    constructor(
        private readonly productRepository: IProductRepository,
        private readonly eventBus: EventBus
    ) { }

    async handle(command: CreateProductCommand): Promise<Result<ID>> {
        try {
            // 1. Check if product exists (sku uniqueness)
            const sku = SKU.create(command.sku);
            const existing = await this.productRepository.findBySku(sku);
            if (existing) {
                return failure(new ConflictError(`Product with SKU ${command.sku} already exists`));
            }

            // 2. Create Aggregate
            const product = Product.create(
                {
                    sku,
                    title: command.title,
                    description: command.description,
                    category: command.category,
                    brand: command.brand,
                    sellingPrice: Money.create(command.sellingPrice),
                    actualPrice: Money.create(command.actualPrice),
                    inventory: Quantity.create(command.inventory),
                    images: command.images,
                    productDetails: command.productDetails,
                    sellerId: command.sellerId,
                },
                new Date().getTime().toString() // Generate ID (or use UUID lib if available)
            );

            // 3. Persist
            await this.productRepository.save(product);

            // 4. Publish Events
            await this.eventBus.publishAll(product.domainEvents);
            product.clearDomainEvents();

            return success(product.id);
        } catch (error) {
            return failure(error as Error);
        }
    }
}
