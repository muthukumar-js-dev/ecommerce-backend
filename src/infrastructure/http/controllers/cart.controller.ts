import { Request, Response, NextFunction } from 'express';
import { CartService } from '@application/services/cart.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

/**
 * Cart Controller
 * Handles cart-related HTTP requests
 */
export class CartController {
  constructor(private readonly cartService: CartService) {}

  /**
   * Add item to cart
   */
  async addItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user.id;

      const result = await this.cartService.addToCart(userId, req.body);

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
   * Get user's cart
   */
  async getCart(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user.id;

      const result = await this.cartService.getCart(userId);

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
   * Remove item from cart
   */
  async removeItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user.id;
      const { productId } = req.params;

      if (!productId) {
        return next(new Error('Product ID is required'));
      }

      const result = await this.cartService.removeFromCart(userId, productId);

      if (!result.success) {
        return next(result.error);
      }

      res.status(200).json({
        success: true,
        message: 'Item removed from cart',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update cart item quantity
   */
  async updateQuantity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user.id;

      const result = await this.cartService.updateCartItemQuantity(userId, req.body);

      if (!result.success) {
        return next(result.error);
      }

      res.status(200).json({
        success: true,
        message: 'Cart item quantity updated',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Clear cart
   */
  async clearCart(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user.id;

      const result = await this.cartService.clearCart(userId);

      if (!result.success) {
        return next(result.error);
      }

      res.status(200).json({
        success: true,
        message: 'Cart cleared successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
