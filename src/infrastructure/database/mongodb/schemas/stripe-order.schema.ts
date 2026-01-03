import mongoose, { Schema, Document } from 'mongoose';

export interface IStripeOrderDocument extends Document {
  userId: mongoose.Types.ObjectId;
  items: Array<{
    product: mongoose.Types.ObjectId;
    quantity: number;
    price: number;
  }>;
  addressId: mongoose.Types.ObjectId;
  totalAmount: number;
  stripePaymentIntentId?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

const stripeOrderSchema = new Schema<IStripeOrderDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: [true, 'User ID is required'],
      ref: 'User',
    },
    items: [
      {
        product: {
          type: Schema.Types.ObjectId,
          ref: 'Product',
        },
        quantity: {
          type: Number,
          required: true,
          min: [1, 'Quantity must be at least 1'],
        },
        price: {
          type: Number,
          required: true,
          min: [0, 'Price cannot be negative'],
        },
      },
    ],
    addressId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Address ID is required'],
      ref: 'Address',
    },
    totalAmount: {
      type: Number,
      required: true,
      min: [0, 'Total amount cannot be negative'],
    },
    stripePaymentIntentId: {
      type: String,
    },
    status: {
      type: String,
      default: 'pending',
      enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
    },
  },
  {
    timestamps: true,
    collection: 'stripeorders',
  }
);

stripeOrderSchema.index({ userId: 1 });
stripeOrderSchema.index({ stripePaymentIntentId: 1 }, { sparse: true });
stripeOrderSchema.index({ status: 1 });

export const StripeOrderModel = mongoose.model<IStripeOrderDocument>(
  'StripeOrder',
  stripeOrderSchema
);
