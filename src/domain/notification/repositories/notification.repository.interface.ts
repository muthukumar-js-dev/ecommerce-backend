import { Notification } from '../entities/notification.entity';
import { ID } from '@shared/types/common';
import { Result } from '@shared/types/result';

export interface INotificationRepository {
  findById(id: ID): Promise<Notification | null>;
  findByUserId(userId: ID, skip?: number, limit?: number): Promise<Notification[]>;
  findUnreadByUserId(userId: ID): Promise<Notification[]>;
  save(notification: Notification): Promise<Result<Notification>>;
  update(notification: Notification): Promise<Result<Notification>>;
  delete(id: ID): Promise<Result<void>>;
  countUnread(userId: ID): Promise<number>;
}
