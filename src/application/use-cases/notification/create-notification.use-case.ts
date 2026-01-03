import { INotificationRepository } from '@domain/notification/repositories/notification.repository.interface';
import { Notification } from '@domain/notification/entities/notification.entity';
import {
  CreateNotificationRequestDTO,
  NotificationResponseDTO,
} from '@application/dtos/notification/notification.dto';
import { AsyncResult, success, failure } from '@shared/types/result';
import { ValidationError } from '@shared/errors';
import { NotificationType } from '@shared/types/common';
import { randomUUID } from 'crypto';

export class CreateNotificationUseCase {
  constructor(private readonly notificationRepository: INotificationRepository) {}

  async execute(dto: CreateNotificationRequestDTO): AsyncResult<NotificationResponseDTO> {
    if (!dto.userId || !dto.message) {
      return failure(
        new ValidationError('User ID and message are required', [
          { field: 'userId', message: 'User ID is required' },
          { field: 'message', message: 'Message is required' },
        ])
      );
    }

    const notification = Notification.create(
      {
        userId: dto.userId,
        type: NotificationType.INFO,
        title: dto.type || 'Notification',
        message: dto.message,
        read: false,
        status: 1,
      },
      randomUUID()
    );

    const saveResult = await this.notificationRepository.save(notification);
    if (!saveResult.success) {
      return failure(saveResult.error);
    }

    return success(this.toDTO(saveResult.data));
  }

  private toDTO(notification: Notification): NotificationResponseDTO {
    const props = (notification as any).props;
    return {
      id: notification.id,
      userId: props.userId,
      message: props.message,
      type: props.type,
      read: props.read,
      createdAt: props.createdAt.toISOString(),
    };
  }
}
