import mongoose, { Schema, Document } from 'mongoose';

export interface ICartDocument extends Document {
  userId: string;
  items: Array<{
    product: string;
    quantity: number;
    later: boolean;
  }>;
  totalAmount: number;
  totalActualAmount: number;
  totalDiscount: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

const cartSchema = new Schema<ICartDocument>(
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
        later: {
          type: Boolean,
          default: false,
        },
      },
    ],
    totalAmount: {
      type: Number,
      default: 0,
      min: [0, 'Total amount cannot be negative'],
    },
    totalActualAmount: {
      type: Number,
      default: 0,
      min: [0, 'Total actual amount cannot be negative'],
    },
    totalDiscount: {
      type: Number,
      default: 0,
      min: [0, 'Total discount cannot be negative'],
    },
    currency: {
      type: String,
      default: 'INR',
    },
  },
  {
    timestamps: true,
    collection: 'carts',
  }
);

cartSchema.index({ userId: 1 }, { unique: true });

export const CartModel = mongoose.model<ICartDocument>('Cart', cartSchema);
