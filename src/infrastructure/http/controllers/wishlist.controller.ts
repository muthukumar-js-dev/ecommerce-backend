import { Request, Response, NextFunction } from 'express';
import { WishlistService } from '@application/services/wishlist.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

/**
 * Wishlist Controller
 * Handles wishlist-related HTTP requests
 */
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  /**
   * Add product to wishlist
   */
  async addProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user.id;

      const result = await this.wishlistService.addToWishlist(userId, req.body);

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
   * Remove product from wishlist
   */
  async removeProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user.id;
      const { productId } = req.params;

      if (!productId) {
        return next(new Error('Product ID is required'));
      }

      const result = await this.wishlistService.removeFromWishlist(userId, productId);

      if (!result.success) {
        return next(result.error);
      }

      res.status(200).json({
        success: true,
        message: 'Product removed from wishlist',
      });
    } catch (error) {
      next(error);
    }
  }
}
