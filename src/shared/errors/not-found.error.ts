import { DomainError } from './base.error';

/**
 * Not found error - thrown when a resource is not found
 */
export class NotFoundError extends DomainError {
  constructor(
    resource: string,
    identifier: string | number
  ) {
    super(
      `${resource} with identifier '${identifier}' not found`,
      'NOT_FOUND',
      404
    );
  }
}
