import { Product } from '../entities/product.entity';
import { ID } from '@shared/types/common';
import { Result } from '@shared/types/result';

/**
 * Repository interface for Product aggregate
 * Defines all data access operations for Product entities
 */
export interface IProductRepository {
  /**
   * Find a product by its unique ID
   * @param id - Product ID
   * @returns Product entity or null if not found
   */
  findById(id: ID): Promise<Product | null>;

  /**
   * Find a product by its PID (product identifier)
   * @param pid - Product PID
   * @returns Product entity or null if not found
   */
  findByPid(pid: string): Promise<Product | null>;

  /**
   * Find all products by seller ID
   * @param sellerId - Seller ID
   * @returns Array of product entities
   */
  findBySellerId(sellerId: ID): Promise<Product[]>;

  /**
   * Find products by category
   * @param category - Product category
   * @param skip - Number of records to skip
   * @param limit - Maximum number of records to return
   * @returns Array of product entities
   */
  findByCategory(
    category: string,
    skip?: number,
    limit?: number
  ): Promise<Product[]>;

  /**
   * Search products by title or description
   * @param query - Search query
   * @param skip - Number of records to skip
   * @param limit - Maximum number of records to return
   * @returns Array of product entities
   */
  search(query: string, skip?: number, limit?: number): Promise<Product[]>;

  /**
   * Find products that are in stock
   * @param skip - Number of records to skip
   * @param limit - Maximum number of records to return
   * @returns Array of product entities
   */
  findInStock(skip?: number, limit?: number): Promise<Product[]>;

  /**
   * Save a new product to the database
   * @param product - Product entity to save
   * @returns Result containing the saved product or error
   */
  save(product: Product): Promise<Result<Product>>;

  /**
   * Update an existing product
   * @param product - Product entity with updated data
   * @returns Result containing the updated product or error
   */
  update(product: Product): Promise<Result<Product>>;

  /**
   * Delete a product by ID
   * @param id - Product ID to delete
   * @returns Result indicating success or error
   */
  delete(id: ID): Promise<Result<void>>;

  /**
   * Get total count of products
   * @returns Total number of products
   */
  count(): Promise<number>;

  /**
   * Find all products (with optional pagination)
   * @param skip - Number of records to skip
   * @param limit - Maximum number of records to return
   * @returns Array of product entities
   */
  findAll(skip?: number, limit?: number): Promise<Product[]>;
}
