import { Entity } from './entity';
import { DomainEvent } from './domain-event';

/**
 * Base class for Aggregate Roots
 * Aggregates are clusters of domain objects that can be treated as a single unit
 * The aggregate root is the only member of the aggregate that outside objects are allowed to hold references to
 */
export abstract class AggregateRoot<T> extends Entity<T> {
  private _domainEvents: DomainEvent<any>[] = [];

  get domainEvents(): ReadonlyArray<DomainEvent<any>> {
    return this._domainEvents;
  }

  protected addDomainEvent(event: DomainEvent<any>): void {
    this._domainEvents.push(event);
  }

  public clearDomainEvents(): void {
    this._domainEvents = [];
  }

  /**
   * Check if aggregate has uncommitted domain events
   */
  public hasDomainEvents(): boolean {
    return this._domainEvents.length > 0;
  }
}
