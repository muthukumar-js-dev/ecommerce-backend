import { CommandHandler } from '../command-handler.interface';
import { CreateProductCommand } from './create-product.command';
import { Product } from '@domain/product/aggregates/product.aggregate';
import { IProductRepository } from '@domain/product/repositories/product.repository.interface';
import { EventBus } from '@infrastructure/events/event-bus';
import { Result, success, failure } from '@shared/types/result';
import { SKU } from '@domain/product/value-objects/sku.vo';
import { Money } from '@domain/product/value-objects/money.vo';
import { Quantity } from '@domain/product/value-objects/quantity.vo';
import { ConflictError } from '@shared/errors';
import { ProductResponseDTO } from '@application/dtos/product/product.dto';
import { randomUUID } from 'crypto';

export class CreateProductHandler implements CommandHandler<CreateProductCommand, ProductResponseDTO> {
    constructor(
        private readonly productRepository: IProductRepository,
        private readonly eventBus: EventBus
    ) { }

    async handle(command: CreateProductCommand): Promise<Result<ProductResponseDTO>> {
        try {
            // 1. Check if product exists (sku uniqueness)
            const sku = SKU.create(command.sku);
            const existing = await this.productRepository.findBySku(sku);
            if (existing) {
                console.error('[CreateProductHandler] Conflict: SKU exists', command.sku);
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
                randomUUID()
            );

            // 3. Persist
            const saveResult = await this.productRepository.save(product);
            if (!saveResult.success) {
                console.error('[CreateProductHandler] Save Failed:', saveResult.error);
                return failure(saveResult.error);
            }

            // 4. Publish Events
            await this.eventBus.publishAll(product.domainEvents);
            product.clearDomainEvents();

            const dto = this.toDTO(saveResult.data);
            console.log('[CreateProductHandler] Success:', JSON.stringify(dto));
            return success(dto);
        } catch (error) {
            console.error('[CreateProductHandler] Error:', error);
            return failure(error as Error);
        }
    }

    private toDTO(product: Product): ProductResponseDTO {
        return {
            id: product.id,
            pid: product.sku.value,
            title: product.title,
            category: product.category,
            actualPrice: product.actualPrice.amount,
            sellingPrice: product.sellingPrice.amount,
            discount: product.discountPercentage,
            brand: (product as any).props.brand, // Accessing protected prop until public getter is verified/added
            description: product.description,
            outOfStock: !product.isAvailable,
            inventory: product.inventory.value,
            images: product.images,
            productDetails: (product as any).props.productDetails,
            averageRating: product.averageRating,
            sellerId: product.sellerId,
            subCategory: (product as any).props.subCategory,
            stripeId: product.stripeId,
            url: product.url,
            createdAt: product.createdAt.toISOString(),
            updatedAt: product.updatedAt.toISOString(),
        };
    }
}
