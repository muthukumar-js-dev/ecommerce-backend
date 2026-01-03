import { INotificationRepository } from '@domain/notification/repositories/notification.repository.interface';
import {
  ListNotificationsResponseDTO,
  NotificationResponseDTO,
} from '@application/dtos/notification/notification.dto';
import { AsyncResult, success } from '@shared/types/result';
import { ID } from '@shared/types/common';

export class ListNotificationsUseCase {
  constructor(private readonly notificationRepository: INotificationRepository) {}

  async execute(userId: ID): AsyncResult<ListNotificationsResponseDTO> {
    const notifications = await this.notificationRepository.findByUserId(userId);
    const unreadCount = await this.notificationRepository.countUnread(userId);

    const notificationDTOs: NotificationResponseDTO[] = notifications.map((notification) => {
      const props = (notification as any).props;
      return {
        id: notification.id,
        userId: props.userId,
        message: props.message,
        type: props.type,
        read: props.read,
        createdAt: props.createdAt.toISOString(),
      };
    });

    return success({
      notifications: notificationDTOs,
      total: notificationDTOs.length,
      unreadCount,
    });
  }
}
