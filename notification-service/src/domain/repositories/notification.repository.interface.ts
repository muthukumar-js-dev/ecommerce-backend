import { Notification } from '../notification.entity';
import { ID } from '@shared/types/common';
import { Result } from '@shared/types/result';

/**
 * Repository interface for Notification entity
 */
export interface INotificationRepository {
    /**
     * Save a new notification
     */
    save(notification: Notification): Promise<Result<void>>;

    /**
     * Update an existing notification
     */
    update(notification: Notification): Promise<Result<void>>;

    /**
     * Find notification by ID
     */
    findById(id: ID): Promise<Result<Notification | null>>;

    /**
     * Find notifications by recipient
     */
    findByRecipient(recipient: string, limit?: number): Promise<Result<Notification[]>>;

    /**
     * Find failed notifications that can be retried
     */
    findRetryable(): Promise<Result<Notification[]>>;
}
