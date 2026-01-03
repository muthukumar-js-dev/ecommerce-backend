import mongoose from 'mongoose';
import { INotificationRepository } from '@domain/notification/repositories/notification.repository.interface';
import { Notification, NotificationProps } from '@domain/notification/entities/notification.entity';
import { NotificationModel, INotificationDocument } from '../schemas/notification.schema';
import { ID } from '@shared/types/common';
import { Result, success, failure } from '@shared/types/result';
import { DatabaseError, NotFoundError } from '@shared/errors';

export class NotificationRepository implements INotificationRepository {
  async findById(id: ID): Promise<Notification | null> {
    try {
      const doc = await NotificationModel.findById(id).exec();
      if (doc === null) {
        return null;
      }
      return this.toDomain(doc);
    } catch (error) {
      throw new DatabaseError(
        'Failed to find notification by ID',
        'NOTIFICATION_FIND_BY_ID_ERROR',
        error as Error
      );
    }
  }

  async findByUserId(userId: ID, skip = 0, limit = 50): Promise<Notification[]> {
    try {
      const docs = await NotificationModel.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec();
      return docs.map((doc) => this.toDomain(doc));
    } catch (error) {
      throw new DatabaseError(
        'Failed to find notifications by user ID',
        'NOTIFICATION_FIND_BY_USER_ERROR',
        error as Error
      );
    }
  }

  async findUnreadByUserId(userId: ID): Promise<Notification[]> {
    try {
      const docs = await NotificationModel.find({ userId, read: false })
        .sort({ createdAt: -1 })
        .exec();
      return docs.map((doc) => this.toDomain(doc));
    } catch (error) {
      throw new DatabaseError(
        'Failed to find unread notifications',
        'NOTIFICATION_FIND_UNREAD_ERROR',
        error as Error
      );
    }
  }

  async save(notification: Notification): Promise<Result<Notification>> {
    try {
      const doc = new NotificationModel(this.toPersistence(notification));
      const saved = await doc.save();
      return success(this.toDomain(saved));
    } catch (error) {
      return failure(
        new DatabaseError('Failed to save notification', 'NOTIFICATION_SAVE_ERROR', error as Error)
      );
    }
  }

  async update(notification: Notification): Promise<Result<Notification>> {
    try {
      const doc = await NotificationModel.findByIdAndUpdate(
        notification.id,
        this.toPersistence(notification),
        { new: true, runValidators: true }
      ).exec();

      if (doc === null) {
        return failure(new NotFoundError('Notification', notification.id));
      }

      return success(this.toDomain(doc));
    } catch (error) {
      return failure(
        new DatabaseError(
          'Failed to update notification',
          'NOTIFICATION_UPDATE_ERROR',
          error as Error
        )
      );
    }
  }

  async delete(id: ID): Promise<Result<void>> {
    try {
      const result = await NotificationModel.findByIdAndDelete(id).exec();
      if (result === null) {
        return failure(new NotFoundError('Notification', id));
      }
      return success(undefined);
    } catch (error) {
      return failure(
        new DatabaseError(
          'Failed to delete notification',
          'NOTIFICATION_DELETE_ERROR',
          error as Error
        )
      );
    }
  }

  async countUnread(userId: ID): Promise<number> {
    try {
      return await NotificationModel.countDocuments({ userId, read: false }).exec();
    } catch (error) {
      throw new DatabaseError(
        'Failed to count unread notifications',
        'NOTIFICATION_COUNT_UNREAD_ERROR',
        error as Error
      );
    }
  }

  private toDomain(doc: INotificationDocument): Notification {
    return Notification.create(
      {
        userId: doc.userId.toString(),
        type: doc.type,
        title: doc.title,
        message: doc.message,
        read: doc.read,
        status: doc.status,
        productId: doc.productId?.toString(),
      },
      doc._id.toString()
    );
  }

  private toPersistence(notification: Notification): Partial<INotificationDocument> {
    const props = (notification as unknown as { props: NotificationProps }).props;
    return {
      _id: notification.id as unknown as mongoose.Types.ObjectId,
      userId: props.userId as unknown as mongoose.Types.ObjectId,
      type: props.type,
      title: props.title,
      message: props.message,
      read: props.read,
      status: props.status,
      productId: props.productId as unknown as mongoose.Types.ObjectId | undefined,
    };
  }
}
