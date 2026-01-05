import { Quantity } from '../../value-objects/quantity.vo';
import { ValidationError } from '@shared/errors';

describe('Quantity Value Object', () => {
  it('should create valid quantity', () => {
    const q = Quantity.create(10);
    expect(q.value).toBe(10);
  });

  it('should throw for negative quantity', () => {
    expect(() => Quantity.create(-1)).toThrow(ValidationError);
  });

  it('should throw for non-integer quantity', () => {
    expect(() => Quantity.create(1.5)).toThrow(ValidationError);
  });

  it('should check isZero', () => {
    expect(Quantity.zero().isZero).toBe(true);
    expect(Quantity.create(1).isZero).toBe(false);
  });

  it('should add correctly', () => {
    const q1 = Quantity.create(10);
    const q2 = Quantity.create(5);
    expect(q1.add(q2).value).toBe(15);
  });

  it('should subtract correctly', () => {
    const q1 = Quantity.create(10);
    const q2 = Quantity.create(5);
    expect(q1.subtract(q2).value).toBe(5);
  });

  it('should throw when subtracting results in negative', () => {
    const q1 = Quantity.create(5);
    const q2 = Quantity.create(10);
    expect(() => q1.subtract(q2)).toThrow(ValidationError);
  });
});
