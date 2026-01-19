import { QueryHandler } from '../query-handler.interface';
import { ListProductsQuery } from './list-products.query';
import { IProductRepository } from '@domain/product/repositories/product.repository.interface';
import { AsyncResult, success, failure } from '@shared/types/result';
import { ListProductsResponseDTO, ProductResponseDTO } from '@application/dtos/product/product.dto';
import { Product } from '@domain/product/aggregates/product.aggregate';

export class ListProductsHandler implements QueryHandler<ListProductsQuery, ListProductsResponseDTO> {
    constructor(private readonly repository: IProductRepository) { }

    async handle(query: ListProductsQuery): AsyncResult<ListProductsResponseDTO> {
        try {
            let products: Product[];
            let total = 0; // Total count logic usually requires separate query, approximating or fetching all if needed. Repository has count().

            // Ideally repository supports count with filter.
            // For now, simple implementation using available methods.

            if (query.search) {
                products = await this.repository.search(query.search);
                total = products.length;
            } else if (query.category) {
                products = await this.repository.findByCategory(query.category, query.skip, query.limit);
                total = await this.repository.count();
            } else {
                products = await this.repository.findAll(query.skip, query.limit);
                total = await this.repository.count();
            }

            const dtos = products.map(p => this.toDTO(p));
            const pageSize = query.limit || 10;
            const page = Math.floor((query.skip || 0) / pageSize) + 1;

            return success({
                products: dtos,
                total,
                page,
                pageSize,
                hasMore: (query.skip || 0) + products.length < total
            });
        } catch (error) {
            console.error('[ListProductsHandler] Error:', error);
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
            brand: (product as any).props.brand,
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
