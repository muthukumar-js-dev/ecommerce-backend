import { DomainError } from './base.error';

/**
 * External service error - thrown when external API fails
 */
export class ExternalServiceError extends DomainError {
  constructor(
    serviceName: string,
    message: string,
    public readonly originalError?: Error,
    code: string = 'EXTERNAL_SERVICE_ERROR'
  ) {
    super(
      `External service '${serviceName}' error: ${message}`,
      code,
      502
    );
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      originalError: this.originalError?.message,
    };
  }
}

/**
 * Payment service error
 */
export class PaymentServiceError extends ExternalServiceError {
  constructor(message: string, originalError?: Error) {
    super('PaymentService', message, originalError, 'PAYMENT_SERVICE_ERROR');
  }
}

/**
 * Storage service error (AWS S3)
 */
export class StorageServiceError extends ExternalServiceError {
  constructor(message: string, originalError?: Error) {
    super('StorageService', message, originalError, 'STORAGE_SERVICE_ERROR');
  }
}
