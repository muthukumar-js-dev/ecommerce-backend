import mongoose, { Schema, Document } from 'mongoose';
import { OrderStatus, PaymentMethod } from '@shared/types/common';

export interface IOrderDocument extends Document {
  userId: string;
  items: Array<{
    product: string;
    quantity: number;
    status: OrderStatus;
    orderedDate: Date;
    deliveryDate?: Date;
    deliveredDate?: Date;
    cancelOrder: boolean;
    returnOption?: 'refund' | 'return';
    cancelStatus?: 'applied' | 'accepted';
    returnStatus?: 'initiated' | 'process' | 'completed';
    shippingAddress?: string;
    returnProduct: boolean;
  }>;
  paymentMethod: PaymentMethod;
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new Schema<IOrderDocument>(
  {
    _id: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: [true, 'User ID is required'],
      ref: 'User',
    },
    items: [
      {
        product: {
          type: String,
          required: true,
          ref: 'Product',
        },
        quantity: {
          type: Number,
          required: true,
          min: [1, 'Quantity must be at least 1'],
        },
        status: {
          type: String,
          enum: Object.values(OrderStatus),
          default: OrderStatus.ORDERED,
        },
        orderedDate: {
          type: Date,
          default: Date.now,
        },
        deliveryDate: {
          type: Date,
        },
        deliveredDate: {
          type: Date,
        },
        cancelOrder: {
          type: Boolean,
          default: false,
        },
        returnOption: {
          type: String,
          enum: ['refund', 'return'],
        },
        cancelStatus: {
          type: String,
          enum: ['applied', 'accepted'],
        },
        returnStatus: {
          type: String,
          enum: ['initiated', 'process', 'completed'],
        },
        shippingAddress: {
          type: String,
          ref: 'Address',
        },
        returnProduct: {
          type: Boolean,
          default: false,
        },
      },
    ],
    paymentMethod: {
      type: String,
      enum: Object.values(PaymentMethod),
      required: [true, 'Payment method is required'],
    },
  },
  {
    timestamps: true,
    collection: 'orders',
  }
);

orderSchema.index({ userId: 1 });
orderSchema.index({ 'items.status': 1 });
orderSchema.index({ createdAt: -1 });

export const OrderModel = mongoose.model<IOrderDocument>('Order', orderSchema);
