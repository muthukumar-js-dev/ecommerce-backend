import { Query } from './query.interface';
import { QueryHandler } from './query-handler.interface';
import { AsyncResult, failure } from '@shared/types/result';
import { DomainError } from '@shared/errors';

class NoHandlerError extends DomainError {
    constructor(queryName: string) {
        super(`No handler registered for query: ${queryName}`, 'NO_HANDLER', 500);
    }
}

export class QueryBus {
    private handlers = new Map<string, QueryHandler<any, any>>();

    register<TQuery extends Query, TResult>(
        queryName: string,
        handler: QueryHandler<TQuery, TResult>
    ): void {
        if (this.handlers.has(queryName)) {
            throw new Error(`Handler for query ${queryName} already registered`);
        }
        this.handlers.set(queryName, handler);
    }

    async execute<TQuery extends Query, TResult>(query: TQuery): AsyncResult<TResult> {
        const handler = this.handlers.get(query.queryName);

        if (!handler) {
            return failure(new NoHandlerError(query.queryName));
        }

        return handler.handle(query);
    }
}
