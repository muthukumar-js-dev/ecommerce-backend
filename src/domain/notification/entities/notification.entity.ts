import { Entity } from '@shared/domain/entity';
import { ID, Timestamp, NotificationType } from '@shared/types/common';

export interface NotificationProps {
  userId: ID;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  status: number;
  productId?: ID;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export class Notification extends Entity<NotificationProps> {
  private constructor(props: NotificationProps, id: ID) {
    super(props, id);
  }

  static create(props: Omit<NotificationProps, 'createdAt' | 'updatedAt'>, id: ID): Notification {
    const now = new Date();
    return new Notification(
      {
        ...props,
        read: props.read ?? false,
        status: props.status ?? 1,
        createdAt: now,
        updatedAt: now,
      },
      id
    );
  }

  get userId(): ID {
    return this.props.userId;
  }

  get type(): NotificationType {
    return this.props.type;
  }

  get title(): string {
    return this.props.title;
  }

  get message(): string {
    return this.props.message;
  }

  get read(): boolean {
    return this.props.read;
  }

  get status(): number {
    return this.props.status;
  }

  get productId(): ID | undefined {
    return this.props.productId;
  }

  get isUnread(): boolean {
    return !this.props.read;
  }

  markAsRead(): void {
    (this.props as { read: boolean }).read = true;
    (this.props as { updatedAt: Timestamp }).updatedAt = new Date();
  }

  markAsUnread(): void {
    (this.props as { read: boolean }).read = false;
    (this.props as { updatedAt: Timestamp }).updatedAt = new Date();
  }
}
