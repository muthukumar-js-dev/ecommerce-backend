import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { authMiddleware, requireRole } from '../middleware/auth.middleware';
import { createNotificationSchema } from '../validation/notification.schemas';
import { UserRole } from '@shared/types/common';

export function createNotificationRoutes(controller: NotificationController): Router {
  const router = Router();

  router.use(authMiddleware);

  // Only admin can create notifications manually via API
  router.post(
    '/',
    requireRole(UserRole.ADMIN),
    validateRequest(createNotificationSchema),
    (req, res, next) => controller.create(req, res, next)
  );

  router.get(
    '/',
    (req, res, next) => controller.list(req, res, next)
  );

  return router;
}
