import mongoose, { Schema, Document } from 'mongoose';

export interface IWishlistDocument extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  productIds: mongoose.Types.ObjectId[];
  status: number;
  createdAt: Date;
  updatedAt: Date;
}

const wishlistSchema = new Schema<IWishlistDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: [true, 'User ID is required'],
      ref: 'User',
    },
    name: {
      type: String,
      required: true,
      default: 'New Folder',
      trim: true,
    },
    productIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
    status: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
    collection: 'wishlists',
  }
);

wishlistSchema.index({ userId: 1 });

export const WishlistModel = mongoose.model<IWishlistDocument>('Wishlist', wishlistSchema);
