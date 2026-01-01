import { DomainError } from './base.error';

/**
 * Business rule violation error
 */
export class BusinessRuleError extends DomainError {
  constructor(message: string, code: string = 'BUSINESS_RULE_VIOLATION') {
    super(message, code, 400);
  }
}

/**
 * Conflict error - thrown when operation conflicts with current state
 */
export class ConflictError extends DomainError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
  }
}

/**
 * Out of stock error
 */
export class OutOfStockError extends BusinessRuleError {
  constructor(productName: string) {
    super(`Product '${productName}' is out of stock`, 'OUT_OF_STOCK');
  }
}

/**
 * Insufficient funds error
 */
export class InsufficientFundsError extends BusinessRuleError {
  constructor() {
    super('Insufficient funds for this transaction', 'INSUFFICIENT_FUNDS');
  }
}
