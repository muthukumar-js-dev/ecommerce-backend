import { DomainEvent } from '@shared/domain/domain-event';
import { ID } from '@shared/types/common';

export interface IEventStore {
    save(event: DomainEvent<any>): Promise<void>;
    getByAggregateId(aggregateId: ID): Promise<DomainEvent<any>[]>;
    getByEventName(eventName: string, limit?: number): Promise<DomainEvent<any>[]>;
    getAllEvents(offset?: number, limit?: number): Promise<DomainEvent<any>[]>;
    replay(fromEventId?: ID): Promise<void>;
}
