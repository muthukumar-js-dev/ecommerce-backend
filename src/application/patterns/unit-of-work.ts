import { AggregateRoot } from '@shared/domain/aggregate-root';
import { EventBus } from '@infrastructure/events/event-bus';

export class UnitOfWork {
    private aggregates: AggregateRoot<any>[] = [];

    constructor(private readonly eventBus: EventBus) { }

    registerAggregate(aggregate: AggregateRoot<any>): void {
        if (!this.aggregates.find(agg => agg.id.value === aggregate.id.value)) {
            this.aggregates.push(aggregate);
        }
    }

    async commit(): Promise<void> {
        // Collect all events
        const allEvents = this.aggregates.flatMap((agg) => agg.domainEvents);

        if (allEvents.length > 0) {
            // Publish events
            await this.eventBus.publishAll(allEvents);

            // Clear events from aggregates
            this.aggregates.forEach((agg) => agg.clearDomainEvents());
        }

        // Clear registered aggregates
        this.aggregates = [];
    }

    rollback(): void {
        // Clear events without publishing
        this.aggregates.forEach((agg) => agg.clearDomainEvents());
        this.aggregates = [];
    }
}
