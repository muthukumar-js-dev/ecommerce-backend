import { BaseQuery } from '../query.interface';

export class ListProductsQuery extends BaseQuery {
    constructor(
        public readonly skip: number = 0,
        public readonly limit: number = 20,
        public readonly category?: string,
        public readonly search?: string,
        correlationId?: string
    ) {
        super('ListProductsQuery', correlationId);
    }
}
