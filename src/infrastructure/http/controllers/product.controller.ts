import { Request, Response, NextFunction } from 'express';
import { ProductService } from '@application/services/product.service';

/**
 * Product Controller
 * Handles product-related HTTP requests
 */
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  /**
   * Create a new product
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.productService.createProduct(req.body);

      if (!result.success) {
        return next(result.error);
      }

      res.status(201).json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get product by ID
   */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { productId } = req.params;
      
      if (!productId) {
        return next(new Error('Product ID is required'));
      }

      const result = await this.productService.getProduct(productId);

      if (!result.success) {
        return next(result.error);
      }

      res.status(200).json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List products with pagination
   */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const skip = parseInt(req.query.skip as string) || 0;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await this.productService.listProducts(skip, limit);

      if (!result.success) {
        return next(result.error);
      }

      res.status(200).json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update product
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { productId } = req.params;
      
      if (!productId) {
        return next(new Error('Product ID is required'));
      }

      const result = await this.productService.updateProduct(productId, req.body);

      if (!result.success) {
        return next(result.error);
      }

      res.status(200).json({
        success: true,
        message: 'Product updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete product
   */
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { productId } = req.params;
      
      if (!productId) {
        return next(new Error('Product ID is required'));
      }

      const sellerId = (req as any).user?.userId || '';
      const result = await this.productService.deleteProduct(productId, sellerId);

      if (!result.success) {
        return next(result.error);
      }

      res.status(200).json({
        success: true,
        message: 'Product deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
