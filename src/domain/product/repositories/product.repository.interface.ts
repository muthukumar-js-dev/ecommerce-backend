import { Product } from '../aggregates/product.aggregate';
import { ID } from '@shared/types/common';
import { SKU } from '../value-objects/sku.vo';
import { Result } from '@shared/types/result';

export interface IProductRepository {
  findById(id: ID): Promise<Product | null>;
  findBySku(sku: SKU): Promise<Product | null>;
  save(product: Product): Promise<Result<Product>>;
  update(product: Product): Promise<Result<Product>>;
  delete(id: ID): Promise<Result<void>>;
  findAll(skip?: number, limit?: number): Promise<Product[]>;
  findByCategory(category: string, skip?: number, limit?: number): Promise<Product[]>;
  search(query: string): Promise<Product[]>;
}
