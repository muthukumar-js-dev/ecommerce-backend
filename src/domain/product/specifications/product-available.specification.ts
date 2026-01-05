import { Specification } from '@shared/domain/specification';
import { Product } from '../aggregates/product.aggregate';

export class ProductAvailableSpecification implements Specification<Product> {
  isSatisfiedBy(product: Product): boolean {
    return product.isAvailable;
  }

  getReason(product: Product): string | null {
    if (!product.isAvailable) {
      if (!product.isActive) {
        return 'Product is not active';
      }
      if (product.inventory.isZero) {
        return 'Product is out of stock';
      }
    }
    return null;
  }
}
