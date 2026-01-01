/**
 * Base error class for all domain errors
 */
export abstract class DomainError extends Error {
  public readonly timestamp: Date;

  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date();
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to JSON for logging
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    };
  }
}
