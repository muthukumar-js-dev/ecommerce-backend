import { INotificationRepository } from '@domain/repositories/notification.repository.interface';
import {
    Notification,
    NotificationChannel,
    NotificationStatus,
    NotificationType,
} from '@domain/notification.entity';
import { NotificationModel, INotificationDocument } from '../schemas/notification.schema';
import { ID } from '@shared/types/common';
import { Result, success, failure } from '@shared/types/result';

/**
 * MongoDB implementation of Notification Repository
 */
export class NotificationRepository implements INotificationRepository {
    async save(notification: Notification): Promise<Result<void>> {
        try {
            const doc = new NotificationModel({
                _id: notification.id,
                type: notification.type,
                channel: notification.channel,
                recipient: notification.recipient,
                subject: notification.subject,
                body: notification.body,
                status: notification.status,
                sentAt: notification.sentAt,
                failureReason: notification.failureReason,
                metadata: notification.metadata,
                retryCount: notification.retryCount,
                createdAt: notification.createdAt,
                updatedAt: notification.updatedAt,
            });

            await doc.save();
            return success(undefined);
        } catch (error: any) {
            console.error('Error saving notification:', error);
            return failure(error);
        }
    }

    async update(notification: Notification): Promise<Result<void>> {
        try {
            await NotificationModel.findByIdAndUpdate(notification.id, {
                status: notification.status,
                sentAt: notification.sentAt,
                failureReason: notification.failureReason,
                retryCount: notification.retryCount,
                updatedAt: notification.updatedAt,
            });

            return success(undefined);
        } catch (error: any) {
            console.error('Error updating notification:', error);
            return failure(error);
        }
    }

    async findById(id: ID): Promise<Result<Notification | null>> {
        try {
            const doc = await NotificationModel.findById(id);
            if (!doc) {
                return success(null);
            }

            const notification = this.toDomain(doc);
            return success(notification);
        } catch (error: any) {
            console.error('Error finding notification:', error);
            return failure(error);
        }
    }

    async findByRecipient(recipient: string, limit: number = 50): Promise<Result<Notification[]>> {
        try {
            const docs = await NotificationModel.find({ recipient })
                .sort({ createdAt: -1 })
                .limit(limit);

            const notifications = docs.map((doc) => this.toDomain(doc));
            return success(notifications);
        } catch (error: any) {
            console.error('Error finding notifications by recipient:', error);
            return failure(error);
        }
    }

    async findRetryable(): Promise<Result<Notification[]>> {
        try {
            const docs = await NotificationModel.find({
                status: NotificationStatus.FAILED,
                retryCount: { $lt: 3 },
            }).limit(100);

            const notifications = docs.map((doc) => this.toDomain(doc));
            return success(notifications);
        } catch (error: any) {
            console.error('Error finding retryable notifications:', error);
            return failure(error);
        }
    }

    private toDomain(doc: INotificationDocument): Notification {
        return Notification.create(
            doc.type as NotificationType,
            doc.channel as NotificationChannel,
            doc.recipient,
            doc.subject,
            doc.body,
            doc.metadata,
            doc._id.toString()
        );
    }
}
