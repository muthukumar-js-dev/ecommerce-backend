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
}
