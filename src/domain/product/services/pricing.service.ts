import { Money } from '../value-objects/money.vo';

export class PricingService {
  calculateDiscount(actualPrice: Money, sellingPrice: Money): number {
    const discount = actualPrice.subtract(sellingPrice);
    return Math.round((discount.amount / actualPrice.amount) * 100);
  }

  applyDiscountPercentage(price: Money, discountPercent: number): Money {
    if (discountPercent < 0 || discountPercent > 100) {
      throw new Error('Discount percentage must be between 0 and 100');
    }

    const discountAmount = price.amount * (discountPercent / 100);
    return Money.create(price.amount - discountAmount, price.currency);
  }

  calculateBulkDiscount(price: Money, quantity: number): Money {
    let discountPercent = 0;

    if (quantity >= 10 && quantity < 50) {
      discountPercent = 5;
    } else if (quantity >= 50 && quantity < 100) {
      discountPercent = 10;
    } else if (quantity >= 100) {
      discountPercent = 15;
    }

    return this.applyDiscountPercentage(price, discountPercent);
  }
}
