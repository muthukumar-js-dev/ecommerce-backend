/**
 * Base class for value objects
 * Value objects are immutable and compared by value, not identity
 */
export abstract class ValueObject<T> {
  protected readonly _value: T;

  constructor(value: T) {
    this._value = Object.freeze(value);
  }

  /**
   * Get the raw value
   */
  getValue(): T {
    return this._value;
  }

  /**
   * Check equality with another value object
   */
  equals(other: ValueObject<T>): boolean {
    if (other === null || other === undefined) {
      return false;
    }
    if (other.constructor !== this.constructor) {
      return false;
    }
    return JSON.stringify(this._value) === JSON.stringify(other._value);
  }

  /**
   * Convert to string
   */
  toString(): string {
    return JSON.stringify(this._value);
  }
}
