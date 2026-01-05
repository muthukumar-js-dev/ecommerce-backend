import { BaseQuery } from '../query.interface';

export class GetOrderHistoryQuery extends BaseQuery {
    constructor(
        public readonly userId: string,
        correlationId?: string
    ) {
        super('GetOrderHistoryQuery', correlationId);
    }
}
