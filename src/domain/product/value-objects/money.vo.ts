import { ValueObject } from '@shared/domain/value-object';
import { ValidationError } from '@shared/errors';
import { Currency } from '@shared/types/common';

interface MoneyProps {
  amount: number;
  currency: Currency;
}

export class Money extends ValueObject<MoneyProps> {
  private constructor(props: MoneyProps) {
    super(props);
  }

  static create(amount: number, currency: Currency = 'INR'): Money {
    if (amount < 0) {
      throw new ValidationError('Invalid amount', [
        { field: 'amount', message: 'Amount cannot be negative' },
      ]);
    }

    // Round to 2 decimal places to avoid standard JS float errors during creation
    return new Money({ amount: Math.round(amount * 100) / 100, currency });
  }

  get amount(): number {
    return this._value.amount;
  }

  get currency(): Currency {
    return this._value.currency;
  }

  get formatted(): string {
    const symbol = this.getCurrencySymbol();
    // Using en-IN for formatting as per requirement context implying INR focus
    return `${symbol}${this._value.amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  add(other: Money): Money {
    this.ensureSameCurrency(other);
    return Money.create(this.amount + other.amount, this.currency);
  }

  subtract(other: Money): Money {
    this.ensureSameCurrency(other);
    return Money.create(this.amount - other.amount, this.currency);
  }

  multiply(factor: number): Money {
    if (factor < 0) {
        throw new ValidationError('Invalid factor', [{ field: 'factor', message: 'Factor cannot be negative' }]);
    }
    return Money.create(this.amount * factor, this.currency);
  }

  isGreaterThan(other: Money): boolean {
    this.ensureSameCurrency(other);
    return this.amount > other.amount;
  }

  isLessThan(other: Money): boolean {
    this.ensureSameCurrency(other);
    return this.amount < other.amount;
  }
  
  equals(other: Money): boolean {
      return this.amount === other.amount && this.currency === other.currency;
  }

  private ensureSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new ValidationError('Currency mismatch', [
        { field: 'currency', message: 'Cannot operate on different currencies' },
      ]);
    }
  }

  private getCurrencySymbol(): string {
    const symbols: Record<string, string> = {
      INR: '₹',
      USD: '$',
      EUR: '€',
      GBP: '£',
    };
    return symbols[this.currency] || this.currency;
  }
  
  toString(): string {
      return this.formatted;
  }
}
