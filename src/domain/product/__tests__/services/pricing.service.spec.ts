import { PricingService } from '../../services/pricing.service';
import { Money } from '../../value-objects/money.vo';

describe('PricingService', () => {
  let service: PricingService;

  beforeEach(() => {
    service = new PricingService();
  });

  describe('calculateDiscount', () => {
    it('should calculate correct percentage', () => {
      const actual = Money.create(100);
      const selling = Money.create(80);
      expect(service.calculateDiscount(actual, selling)).toBe(20);
    });

    it('should calculate correct percentage with rounding', () => {
        const actual = Money.create(100);
        const selling = Money.create(66.6); // 33.4 discount
        expect(service.calculateDiscount(actual, selling)).toBe(33);
    });
  });

  describe('applyDiscountPercentage', () => {
    it('should apply discount correctly', () => {
      const price = Money.create(100);
      const result = service.applyDiscountPercentage(price, 20);
      expect(result.amount).toBe(80);
    });

    it('should throw for invalid percentage', () => {
      const price = Money.create(100);
      expect(() => service.applyDiscountPercentage(price, -1)).toThrow();
      expect(() => service.applyDiscountPercentage(price, 101)).toThrow();
    });
  });

  describe('calculateBulkDiscount', () => {
    it('should return 0 discount for quantity < 10', () => {
      const price = Money.create(100);
      const result = service.calculateBulkDiscount(price, 9);
      expect(result.amount).toBe(100);
    });

    it('should return 5% discount for 10 <= quantity < 50', () => {
      const price = Money.create(100);
      const result = service.calculateBulkDiscount(price, 10);
      expect(result.amount).toBe(95);
    });

    it('should return 10% discount for 50 <= quantity < 100', () => {
      const price = Money.create(100);
      const result = service.calculateBulkDiscount(price, 50);
      expect(result.amount).toBe(90);
    });

    it('should return 15% discount for quantity >= 100', () => {
      const price = Money.create(100);
      const result = service.calculateBulkDiscount(price, 100);
      expect(result.amount).toBe(85);
    });
  });
});
