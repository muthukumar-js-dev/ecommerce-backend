import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';

export function createNotificationRoutes(controller: NotificationController): Router {
    const router = Router();

    // Health check
    router.get('/health', controller.health);

    // Manual email trigger
    router.post('/send', controller.sendEmail);

    return router;
}
