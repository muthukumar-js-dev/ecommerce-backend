import { ID } from '@shared/types/common';

/**
 * Base class for Domain Events
 * Domain events represent something that happened in the domain that domain experts care about
 */
export abstract class DomainEvent<T> {
  public readonly eventId: ID;
  public readonly occurredOn: Date;
  public readonly eventName: string;
  public readonly payload: T;
  public readonly version: number;

  constructor(eventName: string, payload: T, version: number = 1) {
    this.eventId = this.generateId();
    this.occurredOn = new Date();
    this.eventName = eventName;
    this.payload = payload;
    this.version = version;
  }

  private generateId(): ID {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get event data for serialization
   */
  public toJSON() {
    return {
      eventId: this.eventId,
      eventName: this.eventName,
      occurredOn: this.occurredOn,
      payload: this.payload,
      version: this.version,
    };
  }
}
