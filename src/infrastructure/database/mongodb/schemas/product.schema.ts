import mongoose, { Schema, Document } from 'mongoose';

/**
 * Mongoose document interface for Product
 * Represents the database schema structure
 */
export interface IProductDocument extends Document {
  pid: string;
  url?: string;
  title: string;
  category: string;
  actual_price: number;
  selling_price: number;
  brand: string;
  description: string;
  average_rating: number;
  discount: number;
  out_of_stock: boolean;
  inventory: number;
  images: string[];
  product_details: Array<{ key: string; value: string }>;
  seller: string;
  sub_category?: string;
  stripeId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProductDocument>(
  {
    _id: {
      type: String,
      required: true,
    },
    pid: {
      type: String,
      required: [true, 'Product ID is required'],
      unique: true,
      trim: true,
    },
    url: {
      type: String,
      required: false,
    },
    title: {
      type: String,
      required: [true, 'Product title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [200, 'Title must not exceed 200 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
    actual_price: {
      type: Number,
      required: [true, 'Actual price is required'],
      min: [0, 'Actual price cannot be negative'],
    },
    selling_price: {
      type: Number,
      required: [true, 'Selling price is required'],
      min: [0, 'Selling price cannot be negative'],
    },
    brand: {
      type: String,
      required: [true, 'Brand is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      minlength: [10, 'Description must be at least 10 characters'],
    },
    average_rating: {
      type: Number,
      default: 0,
      min: [0, 'Rating cannot be less than 0'],
      max: [5, 'Rating cannot exceed 5'],
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, 'Discount cannot be negative'],
      max: [100, 'Discount cannot exceed 100%'],
    },
    out_of_stock: {
      type: Boolean,
      required: true,
      default: false,
    },
    inventory: {
      type: Number,
      required: true,
      default: 0,
    },
    images: {
      type: [String],
      required: [true, 'At least one image is required'],
      validate: {
        validator: function (images: string[]) {
          return images.length > 0;
        },
        message: 'At least one image is required',
      },
    },
    product_details: {
      type: [
        {
          key: { type: String, required: true },
          value: { type: String, required: true },
        },
      ],
      required: true,
      default: [],
    },
    seller: {
      type: String,
      required: [true, 'Seller ID is required'],
      ref: 'User',
    },
    sub_category: {
      type: String,
      required: false,
      trim: true,
    },
    stripeId: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
    collection: 'products',
  }
);

// Indexes for performance
productSchema.index({ pid: 1 }, { unique: true });
productSchema.index({ seller: 1 });
productSchema.index({ category: 1 });
productSchema.index({ sub_category: 1 });
productSchema.index({ out_of_stock: 1 });
productSchema.index({ title: 'text', description: 'text' });
productSchema.index({ selling_price: 1 });
productSchema.index({ average_rating: -1 });

// Virtual for discount percentage
productSchema.virtual('discountPercentage').get(function () {
  if (this.discount > 0) {
    return this.discount;
  }
  if (this.actual_price > 0) {
    return Math.round(
      ((this.actual_price - this.selling_price) / this.actual_price) * 100
    );
  }
  return 0;
});

// Methods
productSchema.methods.toJSON = function (): Partial<IProductDocument> {
  const product = this.toObject({ virtuals: true });
  return product;
};

export const ProductModel = mongoose.model<IProductDocument>(
  'Product',
  productSchema
);
