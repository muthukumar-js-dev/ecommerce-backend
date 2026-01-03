// import mongoose from 'mongoose'; // Removed unused import
import { IOrderRepository } from '@domain/order/repositories/order.repository.interface';
import { Order, OrderProps } from '@domain/order/entities/order.entity';
import { OrderModel, IOrderDocument } from '../schemas/order.schema';
import { ID } from '@shared/types/common';
import { Result, success, failure } from '@shared/types/result';
import { DatabaseError, NotFoundError } from '@shared/errors';

export class OrderRepository implements IOrderRepository {
  async findById(id: ID): Promise<Order | null> {
    try {
      const doc = await OrderModel.findById(id).exec();
      if (doc === null) {
        return null;
      }
      return this.toDomain(doc);
    } catch (error) {
      throw new DatabaseError('Failed to find order by ID', 'ORDER_FIND_BY_ID_ERROR', error as Error);
    }
  }

  async findByUserId(userId: ID, skip = 0, limit = 50): Promise<Order[]> {
    try {
      const docs = await OrderModel.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec();
      return docs.map((doc) => this.toDomain(doc));
    } catch (error) {
      throw new DatabaseError(
        'Failed to find orders by user ID',
        'ORDER_FIND_BY_USER_ERROR',
        error as Error
      );
    }
  }

  async save(order: Order): Promise<Result<Order>> {
    try {
      const doc = new OrderModel(this.toPersistence(order));
      const saved = await doc.save();
      return success(this.toDomain(saved));
    } catch (error) {
      return failure(new DatabaseError('Failed to save order', 'ORDER_SAVE_ERROR', error as Error));
    }
  }

  async update(order: Order): Promise<Result<Order>> {
    try {
      const doc = await OrderModel.findByIdAndUpdate(order.id, this.toPersistence(order), {
        new: true,
        runValidators: true,
      }).exec();

      if (doc === null) {
        return failure(new NotFoundError('Order', order.id));
      }

      return success(this.toDomain(doc));
    } catch (error) {
      return failure(
        new DatabaseError('Failed to update order', 'ORDER_UPDATE_ERROR', error as Error)
      );
    }
  }

  async delete(id: ID): Promise<Result<void>> {
    try {
      const result = await OrderModel.findByIdAndDelete(id).exec();
      if (result === null) {
        return failure(new NotFoundError('Order', id));
      }
      return success(undefined);
    } catch (error) {
      return failure(
        new DatabaseError('Failed to delete order', 'ORDER_DELETE_ERROR', error as Error)
      );
    }
  }

  async count(): Promise<number> {
    try {
      return await OrderModel.countDocuments().exec();
    } catch (error) {
      throw new DatabaseError('Failed to count orders', 'ORDER_COUNT_ERROR', error as Error);
    }
  }

  private toDomain(doc: IOrderDocument): Order {
    return Order.create(
      {
        userId: doc.userId,
        items: doc.items.map((item) => ({
          productId: item.product,
          quantity: item.quantity,
          status: item.status,
          orderedDate: item.orderedDate,
          deliveryDate: item.deliveryDate,
          deliveredDate: item.deliveredDate,
          cancelOrder: item.cancelOrder,
          returnOption: item.returnOption,
          cancelStatus: item.cancelStatus,
          returnStatus: item.returnStatus,
          shippingAddressId: item.shippingAddress,
          returnProduct: item.returnProduct,
        })),
        paymentMethod: doc.paymentMethod,
      },
      doc._id
    );
  }

  private toPersistence(order: Order): Partial<IOrderDocument> {
    const props = (order as unknown as { props: OrderProps }).props;
    return {
      _id: order.id,
      userId: props.userId,
      items: props.items.map((item) => ({
        product: item.productId,
        quantity: item.quantity,
        status: item.status,
        orderedDate: item.orderedDate,
        deliveryDate: item.deliveryDate,
        deliveredDate: item.deliveredDate,
        cancelOrder: item.cancelOrder,
        returnOption: item.returnOption,
        cancelStatus: item.cancelStatus,
        returnStatus: item.returnStatus,
        shippingAddress: item.shippingAddressId,
        returnProduct: item.returnProduct,
      })),
      paymentMethod: props.paymentMethod as any,
    };
  }
}
