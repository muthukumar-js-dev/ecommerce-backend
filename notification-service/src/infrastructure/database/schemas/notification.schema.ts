import mongoose, { Schema, Document } from 'mongoose';
import {
    NotificationType,
    NotificationChannel,
    NotificationStatus,
} from '@domain/notification.entity';

export interface INotificationDocument extends Document {
    type: NotificationType;
    channel: NotificationChannel;
    recipient: string;
    subject?: string;
    body: string;
    status: NotificationStatus;
    sentAt?: Date;
    failureReason?: string;
    metadata: Record<string, any>;
    retryCount: number;
    createdAt: Date;
    updatedAt: Date;
}

const NotificationSchema = new Schema<INotificationDocument>(
    {
        type: {
            type: String,
            enum: Object.values(NotificationType),
            required: true,
            index: true,
        },
        channel: {
            type: String,
            enum: Object.values(NotificationChannel),
            required: true,
        },
        recipient: {
            type: String,
            required: true,
            index: true,
        },
        subject: String,
        body: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            enum: Object.values(NotificationStatus),
            required: true,
            default: NotificationStatus.PENDING,
            index: true,
        },
        sentAt: Date,
        failureReason: String,
        metadata: {
            type: Schema.Types.Mixed,
            default: {},
        },
        retryCount: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for common queries
NotificationSchema.index({ recipient: 1, createdAt: -1 });
NotificationSchema.index({ status: 1, retryCount: 1 });

export const NotificationModel = mongoose.model<INotificationDocument>(
    'Notification',
    NotificationSchema
);
