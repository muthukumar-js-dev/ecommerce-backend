import { Query } from './query.interface';
import { AsyncResult } from '@shared/types/result';

export interface QueryHandler<TQuery extends Query, TResult> {
  handle(query: TQuery): AsyncResult<TResult>;
}
