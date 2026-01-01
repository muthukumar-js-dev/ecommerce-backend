import { DomainError } from './base.error';

export interface ValidationErrorDetail {
  field: string;
  message: string;
  value?: unknown;
}

/**
 * Validation error - thrown when input validation fails
 */
export class ValidationError extends DomainError {
  constructor(
    message: string,
    public readonly details: ValidationErrorDetail[]
  ) {
    super(message, 'VALIDATION_ERROR', 400);
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      details: this.details,
    };
  }
}
