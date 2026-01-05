import { Request, Response } from 'express';
import { SendEmailUseCase } from '@application/use-cases/send-email.use-case';
import { NotificationType } from '@domain/notification.entity';

/**
 * Notification Controller
 * Handles HTTP requests for manual notification triggers
 */
export class NotificationController {
    constructor(private sendEmailUseCase: SendEmailUseCase) { }

    /**
     * Health check endpoint
     */
    health = async (req: Request, res: Response): Promise<void> => {
        res.json({
            status: 'healthy',
            service: 'notification-service',
            timestamp: new Date().toISOString(),
        });
    };

    /**
     * Manual email trigger (for testing)
     */
    sendEmail = async (req: Request, res: Response): Promise<void> => {
        try {
            const { type, recipient, data } = req.body;

            // Validate input
            if (!type || !recipient || !data) {
                res.status(400).json({
                    error: 'Missing required fields: type, recipient, data',
                });
                return;
            }

            // Validate notification type
            if (!Object.values(NotificationType).includes(type)) {
                res.status(400).json({
                    error: `Invalid notification type. Must be one of: ${Object.values(NotificationType).join(', ')}`,
                });
                return;
            }

            const result = await this.sendEmailUseCase.execute({
                type,
                recipient,
                data,
            });

            if (result.success) {
                res.json({
                    success: true,
                    notificationId: result.data.notificationId,
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: result.error.message,
                });
            }
        } catch (error: any) {
            console.error('Error in sendEmail controller:', error);
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    };
}
