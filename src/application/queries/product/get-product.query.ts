import { Query } from '@application/queries/query.interface';
import { ID } from '@shared/types/common';

export class GetProductQuery implements Query {
    queryName = 'GetProductQuery';
    timestamp: Date = new Date();

    constructor(
        public readonly productId: ID
    ) { }
}
