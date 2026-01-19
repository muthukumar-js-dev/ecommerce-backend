import { PhoneNumber } from '../../value-objects/phone-number.vo';
import { ValidationError } from '@shared/errors';

describe('PhoneNumber Value Object', () => {
  it('should create valid phone number', () => {
    const pn = PhoneNumber.create('+1', '1234567890');
    expect(pn.fullNumber).toBe('+11234567890');
  });

  it('should add plus to country code if missing', () => {
    const pn = PhoneNumber.create('1', '1234567890');
    expect(pn.fullNumber).toBe('+11234567890');
  });

  it('should clean non-digits from number', () => {
    const pn = PhoneNumber.create('+1', '(123) 456-7890');
    expect(pn.fullNumber).toBe('+11234567890');
  });

  it('should format number correctly', () => {
    const pn = PhoneNumber.create('+1', '1234567890');
    expect(pn.formatted).toBe('+1 123 456 7890');
  });

  it('should validate length (min 10)', () => {
    expect(() => PhoneNumber.create('+1', '123')).toThrow(ValidationError);
  });

  it('should validate length (max 15)', () => {
    expect(() => PhoneNumber.create('+1', '1234567890123456')).toThrow(ValidationError);
  });

  describe('fromString factory', () => {
    it('should parse valid full string', () => {
      const pn = PhoneNumber.fromString('+919876543210');
      expect(pn.fullNumber).toBe('+919876543210');
    });

    it('should throw on invalid format', () => {
      expect(() => PhoneNumber.fromString('invalid')).toThrow(ValidationError);
      expect(() => PhoneNumber.fromString('12345')).toThrow(ValidationError);
    });
  });
});
