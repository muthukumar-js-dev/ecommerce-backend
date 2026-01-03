import mongoose, { Schema, Document } from 'mongoose';

export interface IAddressDocument extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  firstLine: string;
  secondLine?: string;
  city: string;
  state: string;
  country: string;
  countryCode?: string;
  postalCode: string;
  phone: string;
  phoneCode: string;
  default: boolean;
  status: number;
  createdAt: Date;
  updatedAt: Date;
}

const addressSchema = new Schema<IAddressDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: [true, 'User ID is required'],
      ref: 'User',
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    firstLine: {
      type: String,
      required: [true, 'Address line 1 is required'],
      trim: true,
    },
    secondLine: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true,
    },
    country: {
      type: String,
      required: [true, 'Country is required'],
      trim: true,
    },
    countryCode: {
      type: String,
      trim: true,
    },
    postalCode: {
      type: String,
      required: [true, 'Postal code is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
    },
    phoneCode: {
      type: String,
      required: [true, 'Phone code is required'],
    },
    default: {
      type: Boolean,
      default: false,
    },
    status: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
    collection: 'addresses',
  }
);

addressSchema.index({ userId: 1 });
addressSchema.index({ userId: 1, default: 1 });

export const AddressModel = mongoose.model<IAddressDocument>('Address', addressSchema);
