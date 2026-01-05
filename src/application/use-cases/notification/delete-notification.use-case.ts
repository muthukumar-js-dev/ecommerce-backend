import { INotificationRepository } from '@domain/notification/repositories/notification.repository.interface';
import { AsyncResult, failure } from '@shared/types/result';
import { NotFoundError } from '@shared/errors';
import { ID } from '@shared/types/common';

export class DeleteNotificationUseCase {
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

    return this.notificationRepository.delete(notificationId);
  }
}
