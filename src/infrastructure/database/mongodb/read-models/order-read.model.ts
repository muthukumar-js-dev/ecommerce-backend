import mongoose, { Schema, Document } from 'mongoose';

export interface IOrderReadModel extends Document {
    orderId: string;
    orderNumber: string;
    userId: string;
    status: string;
    totalAmount: number;
    itemCount: number;
    items: Array<{
        productId: string;
        name: string;
        quantity: number;
        price: number;
    }>;
    placedAt: Date;
    updatedAt: Date;
}

const orderReadSchema = new Schema<IOrderReadModel>(
    {
        orderId: { type: String, required: true, unique: true },
        orderNumber: { type: String, required: true, index: true },
        userId: { type: String, required: true, index: true },
        status: { type: String, required: true },
        totalAmount: { type: Number, required: true },
        itemCount: { type: Number, required: true },
        items: [
            {
                productId: String,
                name: String,
                quantity: Number,
                price: Number,
            },
        ],
        placedAt: { type: Date, required: true },
    },
    {
        timestamps: true,
        collection: 'orders_read',
    }
);

export const OrderReadModel = mongoose.model<IOrderReadModel>(
    'OrderRead',
    orderReadSchema
);
