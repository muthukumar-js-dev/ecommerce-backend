import { QueryHandler } from '../query-handler.interface';
import { ListProductsQuery } from './list-products.query';
import { ProductReadRepository } from '@infrastructure/database/mongodb/read-models/product-read.repository';
import { AsyncResult, success, failure } from '@shared/types/result';

export class ListProductsHandler implements QueryHandler<ListProductsQuery, any[]> {
    constructor(private readonly repository: ProductReadRepository) { }

    async handle(query: ListProductsQuery): AsyncResult<any[]> {
        try {
            let products;
            if (query.search) {
                products = await this.repository.search(query.search, query.skip, query.limit);
            } else if (query.category) {
                products = await this.repository.findByCategory(query.category, query.skip, query.limit);
            } else {
                products = await this.repository.findAll(query.skip, query.limit);
            }

            return success(products);
        } catch (error) {
            return failure(error as Error);
        }
    }
}
