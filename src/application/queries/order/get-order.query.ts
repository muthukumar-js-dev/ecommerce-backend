import { BaseQuery } from '../query.interface';
import { ID } from '@shared/types/common';

export class GetOrderQuery extends BaseQuery {
    constructor(public readonly orderId: ID) {
        super('GetOrderQuery');
    }
}
