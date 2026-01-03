import { CreateProductUseCase } from '../use-cases/product/create-product.use-case';
import { GetProductUseCase } from '../use-cases/product/get-product.use-case';
import { ListProductsUseCase } from '../use-cases/product/list-products.use-case';
import { UpdateProductUseCase } from '../use-cases/product/update-product.use-case';
import { IProductRepository } from '@domain/product/repositories/product.repository.interface';
import {
  CreateProductRequestDTO,
  UpdateProductRequestDTO,
  ProductResponseDTO,
  ListProductsResponseDTO,
} from '../dtos/product/product.dto';
import { AsyncResult } from '@shared/types/result';
import { ID } from '@shared/types/common';

/**
 * Application service for Product domain
 * Aggregates all product-related use cases
 */
export class ProductService {
  private createProductUseCase: CreateProductUseCase;
  private getProductUseCase: GetProductUseCase;
  private listProductsUseCase: ListProductsUseCase;
  private updateProductUseCase: UpdateProductUseCase;

  constructor(productRepository: IProductRepository) {
    this.createProductUseCase = new CreateProductUseCase(productRepository);
    this.getProductUseCase = new GetProductUseCase(productRepository);
    this.listProductsUseCase = new ListProductsUseCase(productRepository);
    this.updateProductUseCase = new UpdateProductUseCase(productRepository);
  }

  /**
   * Create a new product
   */
  async createProduct(dto: CreateProductRequestDTO): AsyncResult<ProductResponseDTO> {
    return this.createProductUseCase.execute(dto);
  }

  /**
   * Get product by ID
   */
  async getProduct(productId: ID): AsyncResult<ProductResponseDTO> {
    return this.getProductUseCase.execute(productId);
  }

  /**
   * List products with pagination
   */
  async listProducts(skip?: number, limit?: number): AsyncResult<ListProductsResponseDTO> {
    return this.listProductsUseCase.execute(skip, limit);
  }

  /**
   * Update product
   */
  async updateProduct(productId: ID, dto: UpdateProductRequestDTO): AsyncResult<void> {
    return this.updateProductUseCase.execute(productId, dto);
  }
}
