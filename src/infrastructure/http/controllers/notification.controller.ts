import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '@application/services/notification.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

/**
 * Notification Controller
 * Handles notification-related HTTP requests
 */
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * Create a notification
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.notificationService.createNotification(req.body);

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
   * List user's notifications
   */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user.id;

      const result = await this.notificationService.listNotifications(userId);

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
