import { ID } from '../types/common';

/**
 * Base class for entities
 * Entities are compared by identity (ID), not by value
 */
export abstract class Entity<T> {
  protected readonly _id: ID;
  protected readonly props: T;

  constructor(props: T, id: ID) {
    this._id = id;
    this.props = props;
  }

  /**
   * Get entity ID
   */
  get id(): ID {
    return this._id;
  }

  /**
   * Check equality with another entity
   */
  equals(other: Entity<T>): boolean {
    if (other === null || other === undefined) {
      return false;
    }
    if (!(other instanceof Entity)) {
      return false;
    }
    return this._id === other._id;
  }
}
