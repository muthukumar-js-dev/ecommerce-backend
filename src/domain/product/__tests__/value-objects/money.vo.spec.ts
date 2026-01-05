import { Money } from '../../value-objects/money.vo';
import { ValidationError } from '@shared/errors';

describe('Money Value Object', () => {
  it('should create valid money', () => {
    const money = Money.create(100.50, 'USD');
    expect(money.amount).toBe(100.50);
    expect(money.currency).toBe('USD');
  });

  it('should round amount to 2 decimal places', () => {
    const money = Money.create(100.555, 'USD');
    expect(money.amount).toBe(100.56);
  });

  it('should throw error for negative amount', () => {
    expect(() => Money.create(-1)).toThrow(ValidationError);
  });

  it('should add money correctly', () => {
    const m1 = Money.create(50, 'USD');
    const m2 = Money.create(25, 'USD');
    const result = m1.add(m2);
    expect(result.amount).toBe(75);
  });

  it('should throw error when adding different currencies', () => {
    const m1 = Money.create(50, 'USD');
    const m2 = Money.create(25, 'EUR');
    expect(() => m1.add(m2)).toThrow(ValidationError);
  });

  it('should subtract money correctly', () => {
    const m1 = Money.create(50, 'USD');
    const m2 = Money.create(20, 'USD');
    const result = m1.subtract(m2);
    expect(result.amount).toBe(30);
  });

  it('should format money correctly', () => {
    const inr = Money.create(1234.5, 'INR');
    expect(inr.formatted).toBe('₹1,234.50');
    
    const usd = Money.create(100, 'USD');
    expect(usd.formatted).toBe('$100.00');
  });
});
