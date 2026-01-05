import mongoose, { Schema, Document } from 'mongoose';
import { PaymentStatus } from '../../../domain/payment.aggregate';

export interface IPaymentDocument extends Document {
    _id: string;
    orderId: string;
    userId: string;
    amount: number;
    currency: string;
    status: PaymentStatus;
    stripePaymentIntentId?: string;
    stripeCustomerId: string;
    failureReason?: string;
    refundId?: string;
    metadata: Record<string, string>;
    createdAt: Date;
    updatedAt: Date;
}

const PaymentSchema = new Schema<IPaymentDocument>(
    {
        _id: { type: String, required: true },
        orderId: { type: String, required: true, index: true },
        userId: { type: String, required: true, index: true },
        amount: { type: Number, required: true },
        currency: { type: String, required: true },
        status: {
            type: String,
            enum: Object.values(PaymentStatus),
            required: true,
            index: true,
        },
        stripePaymentIntentId: { type: String, unique: true, sparse: true },
        stripeCustomerId: { type: String, required: true },
        failureReason: { type: String },
        refundId: { type: String },
        metadata: { type: Map, of: String, default: {} },
    },
    {
        timestamps: true,
        collection: 'payments',
    }
);

// Indexes
PaymentSchema.index({ orderId: 1, createdAt: -1 });
PaymentSchema.index({ userId: 1, createdAt: -1 });
PaymentSchema.index({ status: 1, createdAt: -1 });

export const PaymentModel = mongoose.model<IPaymentDocument>('Payment', PaymentSchema);
