import { Order } from '../aggregates/order.aggregate';
import { IProductRepository } from '@domain/product/repositories/product.repository.interface';
import { BusinessRuleError } from '@shared/errors';

export class OrderValidationService {
  constructor(private readonly productRepository: IProductRepository) {}

  async validateOrderItems(order: Order): Promise<void> {
    for (const item of order.items) {
      const product = await this.productRepository.findById(item.productId);

      if (!product) {
        throw new BusinessRuleError(
          `Product ${item.productId} not found`,
          'PRODUCT_NOT_FOUND'
        );
      }

      if (!product.isAvailable) {
        throw new BusinessRuleError(
          `Product ${product.title} is not available`,
          'PRODUCT_UNAVAILABLE'
        );
      }

      if (item.quantity.isGreaterThan(product.inventory)) {
        throw new BusinessRuleError(
          `Insufficient inventory for ${product.title}`,
          'INSUFFICIENT_INVENTORY'
        );
      }
    }
  }
}
