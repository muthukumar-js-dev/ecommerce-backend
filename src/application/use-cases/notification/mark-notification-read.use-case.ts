import { INotificationRepository } from '@domain/notification/repositories/notification.repository.interface';
import { AsyncResult, success, failure } from '@shared/types/result';
import { NotFoundError } from '@shared/errors';
import { ID } from '@shared/types/common';

export class MarkNotificationReadUseCase {
  constructor(private readonly notificationRepository: INotificationRepository) {}

  async execute(userId: ID, notificationId: ID): AsyncResult<void> {
    const notification = await this.notificationRepository.findById(notificationId);
    if (!notification) {
      return failure(new NotFoundError('Notification', notificationId));
    }

    const notificationProps = (notification as any).props;

    // Verify notification belongs to user
    if (notificationProps.userId !== userId) {
      return failure(new NotFoundError('Notification', notificationId));
    }

    // Mark as read
    notificationProps.isRead = true;
    notificationProps.readAt = new Date();

    const updateResult = await this.notificationRepository.update(notification);
    if (!updateResult.success) {
      return failure(updateResult.error);
    }

    return success(undefined);
  }
}
