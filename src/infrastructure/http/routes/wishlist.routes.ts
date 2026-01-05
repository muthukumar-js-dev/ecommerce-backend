import { Router } from 'express';
import { WishlistController } from '../controllers/wishlist.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { addToWishlistSchema } from '../validation/wishlist.schemas';

export function createWishlistRoutes(controller: WishlistController): Router {
  const router = Router();

  router.use(authMiddleware);

  router.post(
    '/',
    validateRequest(addToWishlistSchema),
    (req, res, next) => controller.addProduct(req, res, next)
  );

  router.delete(
    '/:productId',
    (req, res, next) => controller.removeProduct(req, res, next)
  );

  return router;
}
