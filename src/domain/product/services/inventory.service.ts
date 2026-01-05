import { Product } from '../aggregates/product.aggregate';
import { Quantity } from '../value-objects/quantity.vo';

export class InventoryService {
  canFulfillOrder(product: Product, requestedQuantity: Quantity): boolean {
    return product.isAvailable && !requestedQuantity.isGreaterThan(product.inventory);
  }

  calculateReorderPoint(averageDailySales: number, leadTimeDays: number): Quantity {
    // Basic formula: (Average Daily Sales * Lead Time) + Safety Stock
    // Using 50% safety stock factor here
    const reorderPoint = Math.ceil(averageDailySales * leadTimeDays * 1.5); 
    return Quantity.create(reorderPoint);
  }

  needsRestock(currentInventory: Quantity, reorderPoint: Quantity): boolean {
    return currentInventory.isLessThan(reorderPoint);
  }
}
