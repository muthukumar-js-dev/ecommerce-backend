import { QueryHandler } from '../query-handler.interface';
import { GetOrderHistoryQuery } from './get-order-history.query';
import { OrderReadRepository } from '@infrastructure/database/mongodb/read-models/order-read.repository';
import { AsyncResult, success, failure } from '@shared/types/result';

export class GetOrderHistoryHandler implements QueryHandler<GetOrderHistoryQuery, any[]> {
    constructor(private readonly repository: OrderReadRepository) { }

    async handle(query: GetOrderHistoryQuery): AsyncResult<any[]> {
        try {
            const orders = await this.repository.findByUserId(query.userId);
            return success(orders);
        } catch (error) {
            return failure(error as Error);
        }
    }
}
