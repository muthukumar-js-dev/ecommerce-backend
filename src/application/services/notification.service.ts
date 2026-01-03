import { CreateNotificationUseCase } from '../use-cases/notification/create-notification.use-case';
import { ListNotificationsUseCase } from '../use-cases/notification/list-notifications.use-case';
import { INotificationRepository } from '@domain/notification/repositories/notification.repository.interface';
import {
  CreateNotificationRequestDTO,
  NotificationResponseDTO,
  ListNotificationsResponseDTO,
} from '../dtos/notification/notification.dto';
import { AsyncResult } from '@shared/types/result';
import { ID } from '@shared/types/common';

export class NotificationService {
  private createNotificationUseCase: CreateNotificationUseCase;
  private listNotificationsUseCase: ListNotificationsUseCase;

  constructor(notificationRepository: INotificationRepository) {
    this.createNotificationUseCase = new CreateNotificationUseCase(notificationRepository);
    this.listNotificationsUseCase = new ListNotificationsUseCase(notificationRepository);
  }

  async createNotification(
    dto: CreateNotificationRequestDTO
  ): AsyncResult<NotificationResponseDTO> {
    return this.createNotificationUseCase.execute(dto);
  }

  async listNotifications(userId: ID): AsyncResult<ListNotificationsResponseDTO> {
    return this.listNotificationsUseCase.execute(userId);
  }
}
