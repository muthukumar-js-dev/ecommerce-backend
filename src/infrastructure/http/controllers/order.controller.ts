import { Request, Response, NextFunction } from 'express';
import { OrderService } from '@application/services/order.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

/**
 * Order Controller
 * Handles order-related HTTP requests
 */
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  /**
   * Place a new order
   */
  async placeOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user.id;

      const result = await this.orderService.placeOrder(userId, req.body);

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
   * Get order by ID
   */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orderId } = req.params;
      
      if (!orderId) {
        return next(new Error('Order ID is required'));
      }

      const result = await this.orderService.getOrder(orderId);

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
   * List user's orders
   */
  async listOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user.id;
      const skip = parseInt(req.query.skip as string) || 0;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await this.orderService.listOrders(userId, skip, limit);

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
   * Cancel order item
   */
  async cancelItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orderId } = req.params;
      
      if (!orderId) {
        return next(new Error('Order ID is required'));
      }

      const result = await this.orderService.cancelOrderItem(orderId, req.body);

      if (!result.success) {
        return next(result.error);
      }

      res.status(200).json({
        success: true,
        message: 'Order item cancelled successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update order status
   */
  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orderId } = req.params;
      
      if (!orderId) {
        return next(new Error('Order ID is required'));
      }

      const result = await this.orderService.updateOrderStatus(orderId, req.body);

      if (!result.success) {
        return next(result.error);
      }

      res.status(200).json({
        success: true,
        message: 'Order status updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
