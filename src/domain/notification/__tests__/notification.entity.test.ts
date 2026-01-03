import { Notification } from '../entities/notification.entity';
import { NotificationType } from '@shared/types/common';

describe('Notification Entity', () => {
  const validProps = {
    userId: 'user123',
    type: NotificationType.ORDER_STATUS,
    title: 'Order Shipped',
    message: 'Your order has been shipped',
    read: false,
    status: 1,
    productId: 'prod123',
  };

  describe('create', () => {
    it('should create a notification with valid props', () => {
      const notification = Notification.create(validProps, 'notif123');

      expect(notification.id).toBe('notif123');
      expect(notification.title).toBe('Order Shipped');
      expect(notification.type).toBe(NotificationType.ORDER_STATUS);
    });

    it('should set default values', () => {
      const props = { ...validProps, read: undefined, status: undefined };
      const notification = Notification.create(props as unknown as typeof validProps, 'notif123');

      expect(notification.read).toBe(false);
      expect(notification.status).toBe(1);
    });
  });

  describe('computed properties', () => {
    it('should determine isUnread correctly', () => {
      const unread = Notification.create(validProps, 'notif123');
      const read = Notification.create({ ...validProps, read: true }, 'notif456');

      expect(unread.isUnread).toBe(true);
      expect(read.isUnread).toBe(false);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', () => {
      const notification = Notification.create(validProps, 'notif123');

      notification.markAsRead();

      expect(notification.read).toBe(true);
      expect(notification.isUnread).toBe(false);
    });
  });

  describe('markAsUnread', () => {
    it('should mark notification as unread', () => {
      const notification = Notification.create({ ...validProps, read: true }, 'notif123');

      notification.markAsUnread();

      expect(notification.read).toBe(false);
      expect(notification.isUnread).toBe(true);
    });
  });
});
