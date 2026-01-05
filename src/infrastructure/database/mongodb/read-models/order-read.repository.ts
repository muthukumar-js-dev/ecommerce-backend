import { OrderReadModel, IOrderReadModel } from './order-read.model';

export class OrderReadRepository {
    async findByUserId(userId: string): Promise<IOrderReadModel[]> {
        return OrderReadModel.find({ userId }).sort({ placedAt: -1 }).exec();
    }

    async findByOrderNumber(orderNumber: string): Promise<IOrderReadModel | null> {
        return OrderReadModel.findOne({ orderNumber }).exec();
    }

    async save(data: Partial<IOrderReadModel>): Promise<void> {
        const orderId = data.orderId;
        if (!orderId) throw new Error('Cannot save OrderReadModel without orderId');

        await OrderReadModel.findOneAndUpdate(
            { orderId },
            data,
            { upsert: true, new: true }
        ).exec();
    }
}
