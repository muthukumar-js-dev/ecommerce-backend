import mongoose, { Schema, Document } from 'mongoose';

export interface IUserReadModel extends Document {
  id: string;
  name: string;
  email: string;
  role: string;
  currentOrderCount: number;
  returnedOrderCount: number;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userReadSchema = new Schema<IUserReadModel>(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    role: { type: String, required: true },
    currentOrderCount: { type: Number, default: 0 },
    returnedOrderCount: { type: Number, default: 0 },
    lastLogin: { type: Date },
  },
  {
    timestamps: true,
    collection: 'users_read',
  }
);

// Indexes for fast queries
userReadSchema.index({ email: 1 });
userReadSchema.index({ role: 1 });
userReadSchema.index({ createdAt: -1 });

export const UserReadModel = mongoose.model<IUserReadModel>('UserRead', userReadSchema);
