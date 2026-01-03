import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  placeOrderSchema,
  getOrderSchema,
  listOrdersSchema,
  cancelOrderItemSchema,
  updateOrderStatusSchema,
} from '../validation/order.schemas';

/**
 * Create order routes
 */
export function createOrderRoutes(controller: OrderController): Router {
  const router = Router();

  // All order routes require authentication
  router.use(authMiddleware);

  /**
   * @route   POST /api/orders
   * @desc    Place a new order
   * @access  Private
   */
  router.post(
    '/',
    validateRequest(placeOrderSchema),
    (req, res, next) => controller.placeOrder(req, res, next)
  );

  /**
   * @route   GET /api/orders/:orderId
   * @desc    Get order by ID
   * @access  Private
   */
  router.get(
    '/:orderId',
    validateRequest(getOrderSchema),
    (req, res, next) => controller.getById(req, res, next)
  );

  /**
   * @route   GET /api/orders
   * @desc    List user's orders
   * @access  Private
   */
  router.get(
    '/',
    validateRequest(listOrdersSchema),
    (req, res, next) => controller.listOrders(req, res, next)
  );

  /**
   * @route   POST /api/orders/:orderId/cancel
   * @desc    Cancel order item
   * @access  Private
   */
  router.post(
    '/:orderId/cancel',
    validateRequest(cancelOrderItemSchema),
    (req, res, next) => controller.cancelItem(req, res, next)
  );

  /**
   * @route   PATCH /api/orders/:orderId/status
   * @desc    Update order status
   * @access  Private
   */
  router.patch(
    '/:orderId/status',
    validateRequest(updateOrderStatusSchema),
    (req, res, next) => controller.updateStatus(req, res, next)
  );

  return router;
}
