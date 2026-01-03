import mongoose, { Schema, Document } from 'mongoose';
import { UserRole } from '@shared/types/common';

/**
 * Mongoose document interface for User
 * Represents the database schema structure
 */
export interface IUserDocument extends Document {
  name: string;
  email: string;
  password: string;
  userRole: UserRole;
  token?: string;
  lastLogin?: Date;
  currentOrder: number;
  returnedCount: number;
  stripeCustomerId?: string;
  shopName?: string;
  shopMobileNumber?: string;
  shopAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUserDocument>(
  {
    _id: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name must not exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
    },
    userRole: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.USER,
    },
    token: {
      type: String,
      required: false,
    },
    lastLogin: {
      type: Date,
      required: false,
    },
    currentOrder: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Current order count cannot be negative'],
    },
    returnedCount: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Returned count cannot be negative'],
    },
    stripeCustomerId: {
      type: String,
      required: false,
    },
    shopName: {
      type: String,
      required: false,
    },
    shopMobileNumber: {
      type: String,
      required: false,
    },
    shopAddress: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
    collection: 'users',
  }
);

// Indexes for performance
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ userRole: 1 });
userSchema.index({ stripeCustomerId: 1 }, { sparse: true });

// Methods
userSchema.methods.toJSON = function (): Partial<IUserDocument> {
  const user = this.toObject();
  delete user.password;
  delete user.token;
  return user;
};

export const UserModel = mongoose.model<IUserDocument>('User', userSchema);
