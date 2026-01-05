import { DomainEvent } from '@shared/domain/domain-event';

export interface EventHandler<TEvent extends DomainEvent<any>> {
  handle(event: TEvent): Promise<void>;
}
