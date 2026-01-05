import mongoose, { Schema, Document } from 'mongoose';

export interface IProductReadModel extends Document {
    id: string; // duplicate _id for easier access
    pid: string; // sku
    title: string;
    description: string;
    category: string;
    brand: string;
    price: number; // selling price
    images: string[];
    sellerId: string;
    averageRating: number;
    outOfStock: boolean;
    createdAt: Date;
}

const productReadSchema = new Schema<IProductReadModel>(
    {
        _id: { type: String, required: true },
        id: { type: String, required: true },
        pid: { type: String, required: true, index: true },
        title: { type: String, required: true, index: 'text' },
        description: { type: String, required: true },
        category: { type: String, required: true, index: true },
        brand: { type: String, required: true },
        price: { type: Number, required: true, index: true },
        images: { type: [String], default: [] },
        sellerId: { type: String, required: true, index: true },
        averageRating: { type: Number, default: 0 },
        outOfStock: { type: Boolean, default: false },
        createdAt: { type: Date, required: true },
    },
    {
        timestamps: true, // adds updatedAt automatically
        collection: 'products_read', // Separate collection for read model
    }
);

productReadSchema.index({ price: 1, averageRating: -1 });

export const ProductReadModel = mongoose.model<IProductReadModel>(
    'ProductRead',
    productReadSchema
);
