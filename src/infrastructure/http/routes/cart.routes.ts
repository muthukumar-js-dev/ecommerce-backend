import { Router } from 'express';
import { CartController } from '../controllers/cart.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  addToCartSchema,
  updateCartItemSchema,
  removeFromCartSchema,
} from '../validation/cart.schemas';

/**
 * Create cart routes
 */
export function createCartRoutes(controller: CartController): Router {
  const router = Router();

  // All cart routes require authentication
  router.use(authMiddleware);

  /**
   * @route   POST /api/cart/items
   * @desc    Add item to cart
   * @access  Private
   */
  router.post(
    '/items',
    validateRequest(addToCartSchema),
    (req, res, next) => controller.addItem(req, res, next)
  );

  /**
   * @route   GET /api/cart
   * @desc    Get user's cart
   * @access  Private
   */
  router.get(
    '/',
    (req, res, next) => controller.getCart(req, res, next)
  );

  /**
   * @route   DELETE /api/cart/items/:productId
   * @desc    Remove item from cart
   * @access  Private
   */
  router.delete(
    '/items/:productId',
    validateRequest(removeFromCartSchema),
    (req, res, next) => controller.removeItem(req, res, next)
  );

  /**
   * @route   PATCH /api/cart/items
   * @desc    Update cart item quantity
   * @access  Private
   */
  router.patch(
    '/items',
    validateRequest(updateCartItemSchema),
    (req, res, next) => controller.updateQuantity(req, res, next)
  );

  /**
   * @route   DELETE /api/cart
   * @desc    Clear cart
   * @access  Private
   */
  router.delete(
    '/',
    (req, res, next) => controller.clearCart(req, res, next)
  );

  return router;
}
