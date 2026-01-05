import { ID, Timestamp } from '@shared/types/common';

export enum NotificationType {
    WELCOME_EMAIL = 'WELCOME_EMAIL',
    ORDER_CONFIRMATION = 'ORDER_CONFIRMATION',
    ORDER_SHIPPED = 'ORDER_SHIPPED',
    ORDER_DELIVERED = 'ORDER_DELIVERED',
    PAYMENT_RECEIPT = 'PAYMENT_RECEIPT',
    PASSWORD_RESET = 'PASSWORD_RESET',
}

export enum NotificationChannel {
    EMAIL = 'EMAIL',
    SMS = 'SMS',
    PUSH = 'PUSH',
}

export enum NotificationStatus {
    PENDING = 'PENDING',
    SENT = 'SENT',
    FAILED = 'FAILED',
    BOUNCED = 'BOUNCED',
}

export interface NotificationProps {
    type: NotificationType;
    channel: NotificationChannel;
    recipient: string;
    subject?: string;
    body: string;
    status: NotificationStatus;
    sentAt?: Timestamp;
    failureReason?: string;
    metadata: Record<string, any>;
    retryCount: number;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

/**
 * Notification Entity
 * Represents a notification that can be sent via email, SMS, or push
 */
export class Notification {
    private constructor(
        private props: NotificationProps,
        private _id: ID
    ) { }

    static create(
        type: NotificationType,
        channel: NotificationChannel,
        recipient: string,
        subject: string | undefined,
        body: string,
        metadata: Record<string, any>,
        id: ID
    ): Notification {
        const now = new Date();
        return new Notification(
            {
                type,
                channel,
                recipient,
                subject,
                body,
                status: NotificationStatus.PENDING,
                metadata,
                retryCount: 0,
                createdAt: now,
                updatedAt: now,
            },
            id
        );
    }

    /**
     * Mark notification as successfully sent
     */
    markAsSent(): void {
        this.props.status = NotificationStatus.SENT;
        this.props.sentAt = new Date();
        this.props.updatedAt = new Date();
    }

    /**
     * Mark notification as failed with reason
     */
    markAsFailed(reason: string): void {
        this.props.status = NotificationStatus.FAILED;
        this.props.failureReason = reason;
        this.props.retryCount += 1;
        this.props.updatedAt = new Date();
    }

    /**
     * Check if notification can be retried
     * Max 3 retry attempts
     */
    canRetry(): boolean {
        return this.props.retryCount < 3;
    }

    // Getters
    get id(): ID {
        return this._id;
    }

    get recipient(): string {
        return this.props.recipient;
    }

    get type(): NotificationType {
        return this.props.type;
    }

    get channel(): NotificationChannel {
        return this.props.channel;
    }

    get status(): NotificationStatus {
        return this.props.status;
    }

    get subject(): string | undefined {
        return this.props.subject;
    }

    get body(): string {
        return this.props.body;
    }

    get metadata(): Record<string, any> {
        return this.props.metadata;
    }

    get retryCount(): number {
        return this.props.retryCount;
    }

    get sentAt(): Timestamp | undefined {
        return this.props.sentAt;
    }

    get failureReason(): string | undefined {
        return this.props.failureReason;
    }

    get createdAt(): Timestamp {
        return this.props.createdAt;
    }

    get updatedAt(): Timestamp {
        return this.props.updatedAt;
    }

    /**
     * Convert to plain object for persistence
     */
    toObject(): NotificationProps & { id: ID } {
        return {
            id: this._id,
            ...this.props,
        };
    }
}
