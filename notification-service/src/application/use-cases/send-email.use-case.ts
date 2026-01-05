import { NotificationType, Notification, NotificationChannel } from '@domain/notification.entity';
import { TemplateService } from '../templates/template.service';
import { IEmailService } from '../ports/email.port';
import { INotificationRepository } from '@domain/repositories/notification.repository.interface';
import { AsyncResult, success, failure } from '@shared/types/result';

export interface SendEmailRequest {
    type: NotificationType;
    recipient: string;
    data: Record<string, any>;
}

/**
 * Send Email Use Case
 * Handles the complete flow of sending an email notification
 */
export class SendEmailUseCase {
    constructor(
        private templateService: TemplateService,
        private emailService: IEmailService,
        private notificationRepo: INotificationRepository
    ) { }

    async execute(request: SendEmailRequest): AsyncResult<{ notificationId: string }> {
        try {
            // Render template
            const subject = this.templateService.getSubject(request.type, request.data);
            const body = this.templateService.render(request.type, request.data);

            // Create notification entity
            const notificationId = this.generateId();
            const notification = Notification.create(
                request.type,
                NotificationChannel.EMAIL,
                request.recipient,
                subject,
                body,
                request.data,
                notificationId
            );

            // Save notification
            const saveResult = await this.notificationRepo.save(notification);
            if (!saveResult.success) {
                return failure(saveResult.error);
            }

            // Send email
            const sendResult = await this.emailService.send({
                to: request.recipient,
                subject,
                body,
            });

            if (!sendResult.success) {
                // Mark as failed
                notification.markAsFailed(sendResult.error.message);
                await this.notificationRepo.update(notification);
                return failure(sendResult.error);
            }

            // Mark as sent
            notification.markAsSent();
            await this.notificationRepo.update(notification);

            return success({ notificationId });
        } catch (error: any) {
            console.error('SendEmailUseCase error:', error);
            return failure(error);
        }
    }

    private generateId(): string {
        return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
