import mongoose, { Schema, Document } from 'mongoose';
import { OrderStatus, PaymentMethod } from '@shared/types/common';

export interface IOrderDocument extends Document {
  orderNumber: string;
  userId: string;
  items: Array<{
    product: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    status: OrderStatus;
    orderedDate: Date;
    shippedDate?: Date;
    deliveredDate?: Date;
    canCancel: boolean;
    canReturn: boolean;
    returnOption?: 'refund' | 'return';
    cancelStatus?: 'applied' | 'accepted';
    returnStatus?: 'initiated' | 'process' | 'completed';
    returnProduct: boolean;
  }>;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    recipientName: string;
    phoneNumber: string;
  };
  status: OrderStatus;
  subtotal: number;
  shippingCost: number;
  tax: number;
  total: number;
  paymentMethod?: PaymentMethod;
  paymentId?: string;
  trackingNumber?: string;
  estimatedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new Schema<IOrderDocument>(
  {
    _id: {
      type: String,
      required: true,
    },
    orderNumber: {
      type: String,
      required: true,
      unique: true,
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
        productName: { type: String, required: true }, // Added for snapshot
        quantity: {
          type: Number,
          required: true,
          min: [1, 'Quantity must be at least 1'],
        },
        unitPrice: { type: Number, required: true }, // Added for snapshot
        totalPrice: { type: Number, required: true }, // Added for snapshot
        status: {
          type: String,
          enum: Object.values(OrderStatus),
          default: OrderStatus.ORDERED,
        },
        orderedDate: { type: Date, default: Date.now },
        shippedDate: { type: Date },
        deliveredDate: { type: Date },
        canCancel: { type: Boolean, default: true },
        canReturn: { type: Boolean, default: true },
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
        returnProduct: {
          type: Boolean,
          default: false,
        },
      },
    ],
    shippingAddress: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
      recipientName: String,
      phoneNumber: String,
    },
    status: {
      type: String,
      enum: Object.values(OrderStatus),
      required: true,
    },
    subtotal: { type: Number, required: true },
    shippingCost: { type: Number, required: true },
    tax: { type: Number, required: true },
    total: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: Object.values(PaymentMethod),
      // required: [true, 'Payment method is required'], // Optional during creation phase
    },
    paymentId: { type: String },
    trackingNumber: { type: String },
    estimatedDeliveryDate: { type: Date },
    actualDeliveryDate: { type: Date },
  },
  {
    timestamps: true,
    collection: 'orders',
  }
);

orderSchema.index({ userId: 1 });
orderSchema.index({ orderNumber: 1 }, { unique: true });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });

export const OrderModel = mongoose.model<IOrderDocument>('Order', orderSchema);
