import mongoose from 'mongoose';
import { IStripeOrderRepository } from '@domain/stripe-order/repositories/stripe-order.repository.interface';
import { StripeOrder, StripeOrderProps } from '@domain/stripe-order/entities/stripe-order.entity';
import { StripeOrderModel, IStripeOrderDocument } from '../schemas/stripe-order.schema';
import { ID } from '@shared/types/common';
import { Result, success, failure } from '@shared/types/result';
import { DatabaseError, NotFoundError } from '@shared/errors';

export class StripeOrderRepository implements IStripeOrderRepository {
  async findById(id: ID): Promise<StripeOrder | null> {
    try {
      const doc = await StripeOrderModel.findById(id).exec();
      if (doc === null) {
        return null;
      }
      return this.toDomain(doc);
    } catch (error) {
      throw new DatabaseError(
        'Failed to find stripe order by ID',
        'STRIPE_ORDER_FIND_BY_ID_ERROR',
        error as Error
      );
    }
  }

  async findByUserId(userId: ID): Promise<StripeOrder[]> {
    try {
      const docs = await StripeOrderModel.find({ userId }).sort({ createdAt: -1 }).exec();
      return docs.map((doc) => this.toDomain(doc));
    } catch (error) {
      throw new DatabaseError(
        'Failed to find stripe orders by user ID',
        'STRIPE_ORDER_FIND_BY_USER_ERROR',
        error as Error
      );
    }
  }

  async findByPaymentIntentId(intentId: string): Promise<StripeOrder | null> {
    try {
      const doc = await StripeOrderModel.findOne({ stripePaymentIntentId: intentId }).exec();
      if (doc === null) {
        return null;
      }
      return this.toDomain(doc);
    } catch (error) {
      throw new DatabaseError(
        'Failed to find stripe order by payment intent ID',
        'STRIPE_ORDER_FIND_BY_INTENT_ERROR',
        error as Error
      );
    }
  }

  async save(order: StripeOrder): Promise<Result<StripeOrder>> {
    try {
      const doc = new StripeOrderModel(this.toPersistence(order));
      const saved = await doc.save();
      return success(this.toDomain(saved));
    } catch (error) {
      return failure(
        new DatabaseError('Failed to save stripe order', 'STRIPE_ORDER_SAVE_ERROR', error as Error)
      );
    }
  }

  async update(order: StripeOrder): Promise<Result<StripeOrder>> {
    try {
      const doc = await StripeOrderModel.findByIdAndUpdate(order.id, this.toPersistence(order), {
        new: true,
        runValidators: true,
      }).exec();

      if (doc === null) {
        return failure(new NotFoundError('StripeOrder', order.id));
      }

      return success(this.toDomain(doc));
    } catch (error) {
      return failure(
        new DatabaseError(
          'Failed to update stripe order',
          'STRIPE_ORDER_UPDATE_ERROR',
          error as Error
        )
      );
    }
  }

  async delete(id: ID): Promise<Result<void>> {
    try {
      const result = await StripeOrderModel.findByIdAndDelete(id).exec();
      if (result === null) {
        return failure(new NotFoundError('StripeOrder', id));
      }
      return success(undefined);
    } catch (error) {
      return failure(
        new DatabaseError(
          'Failed to delete stripe order',
          'STRIPE_ORDER_DELETE_ERROR',
          error as Error
        )
      );
    }
  }

  private toDomain(doc: IStripeOrderDocument): StripeOrder {
    return StripeOrder.create(
      {
        userId: doc.userId.toString(),
        items: doc.items.map((item) => ({
          productId: item.product.toString(),
          quantity: item.quantity,
          price: item.price,
        })),
        addressId: doc.addressId.toString(),
        totalAmount: doc.totalAmount,
        stripePaymentIntentId: doc.stripePaymentIntentId,
        status: doc.status,
      },
      doc._id.toString()
    );
  }

  private toPersistence(order: StripeOrder): Partial<IStripeOrderDocument> {
    const props = (order as unknown as { props: StripeOrderProps }).props;
    return {
      _id: order.id as unknown as mongoose.Types.ObjectId,
      userId: props.userId as unknown as mongoose.Types.ObjectId,
      items: props.items.map((item) => ({
        product: item.productId as unknown as mongoose.Types.ObjectId,
        quantity: item.quantity,
        price: item.price,
      })),
      addressId: props.addressId as unknown as mongoose.Types.ObjectId,
      totalAmount: props.totalAmount,
      stripePaymentIntentId: props.stripePaymentIntentId,
      status: props.status,
    };
  }
}
