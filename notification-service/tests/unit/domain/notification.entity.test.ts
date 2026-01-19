import { Notification, NotificationType, NotificationChannel, NotificationStatus } from '../../../src/domain/notification.entity';

describe('Notification Entity', () => {
    it('should create a notification with pending status', () => {
        const notification = Notification.create(
            NotificationType.WELCOME_EMAIL,
            NotificationChannel.EMAIL,
            'test@example.com',
            'Welcome!',
            '<html>Welcome</html>',
            { name: 'Test User' },
            'notif_123'
        );

        expect(notification.id).toBe('notif_123');
        expect(notification.status).toBe(NotificationStatus.PENDING);
        expect(notification.recipient).toBe('test@example.com');
        expect(notification.retryCount).toBe(0);
    });

    it('should mark notification as sent', () => {
        const notification = Notification.create(
            NotificationType.WELCOME_EMAIL,
            NotificationChannel.EMAIL,
            'test@example.com',
            'Welcome!',
            '<html>Welcome</html>',
            {},
            'notif_123'
        );

        notification.markAsSent();

        expect(notification.status).toBe(NotificationStatus.SENT);
        expect(notification.sentAt).toBeDefined();
    });

    it('should mark notification as failed and increment retry count', () => {
        const notification = Notification.create(
            NotificationType.WELCOME_EMAIL,
            NotificationChannel.EMAIL,
            'test@example.com',
            'Welcome!',
            '<html>Welcome</html>',
            {},
            'notif_123'
        );

        notification.markAsFailed('SendGrid error');

        expect(notification.status).toBe(NotificationStatus.FAILED);
        expect(notification.failureReason).toBe('SendGrid error');
        expect(notification.retryCount).toBe(1);
    });

    it('should allow retry if retry count is less than 3', () => {
        const notification = Notification.create(
            NotificationType.WELCOME_EMAIL,
            NotificationChannel.EMAIL,
            'test@example.com',
            'Welcome!',
            '<html>Welcome</html>',
            {},
            'notif_123'
        );

        expect(notification.canRetry()).toBe(true);

        notification.markAsFailed('Error 1');
        expect(notification.canRetry()).toBe(true);

        notification.markAsFailed('Error 2');
        expect(notification.canRetry()).toBe(true);

        notification.markAsFailed('Error 3');
        expect(notification.canRetry()).toBe(false);
    });
});
