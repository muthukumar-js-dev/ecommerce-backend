import { QueryHandler } from '@application/queries/query-handler.interface';
import { GetProductQuery } from './get-product.query';
import { AsyncResult } from '@shared/types/result';
import { ProductResponseDTO } from '@application/dtos/product/product.dto';
import { GetProductUseCase } from '@application/use-cases/product/get-product.use-case';
import { IProductRepository } from '@domain/product/repositories/product.repository.interface';

export class GetProductHandler implements QueryHandler<GetProductQuery, ProductResponseDTO> {
    private useCase: GetProductUseCase;

    constructor(
        productRepository: IProductRepository // Or ReadModel repo
    ) {
        this.useCase = new GetProductUseCase(productRepository);
    }

    async handle(query: GetProductQuery): AsyncResult<ProductResponseDTO> {
        return this.useCase.execute(query.productId);
    }
}
