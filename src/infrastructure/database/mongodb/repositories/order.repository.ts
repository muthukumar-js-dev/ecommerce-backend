import { Order, OrderProps } from '@domain/order/aggregates/order.aggregate';
import { IOrderRepository } from '@domain/order/repositories/order.repository.interface';
import { OrderModel, IOrderDocument } from '../schemas/order.schema';
import { ID } from '@shared/types/common';
import { Result, success, failure } from '@shared/types/result';
import { DatabaseError } from '@shared/errors';
import { OrderNumber } from '@domain/order/value-objects/order-number.vo';
import { ShippingAddress } from '@domain/order/value-objects/shipping-address.vo';
import { OrderStatus, OrderStatusEnum } from '@domain/order/value-objects/order-status.vo';
import { OrderItem } from '@domain/order/entities/order-item.entity';
import { Money } from '@domain/product/value-objects/money.vo';
import { Quantity } from '@domain/product/value-objects/quantity.vo';
import { OutboxRepository } from './outbox.repository';
import { KafkaTopic } from '../../../messaging/kafka/topics';
import mongoose from 'mongoose';

export class OrderRepository implements IOrderRepository {
  constructor(private outboxRepository: OutboxRepository) { }
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

  async findByOrderNumber(orderNumber: OrderNumber): Promise<Order | null> {
    try {
      const doc = await OrderModel.findOne({ orderNumber: orderNumber.value }).exec();
      if (doc === null) {
        return null;
      }
      return this.toDomain(doc);
    } catch (error) {
      throw new DatabaseError(
        'Failed to find order by number',
        'ORDER_FIND_BY_NUMBER_ERROR',
        error as Error
      );
    }
  }

  async findByUserId(userId: ID): Promise<Order[]> {
    try {
      const docs = await OrderModel.find({ userId }).sort({ createdAt: -1 }).exec();
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
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Save order to database
      const persistenceData = this.toPersistence(order);
      const doc = await OrderModel.findByIdAndUpdate(order.id, persistenceData, {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
        session,
      }).exec();

      // 2. Save domain events to outbox
      for (const event of order.domainEvents) {
        await this.outboxRepository.save(event, KafkaTopic.ORDER_EVENTS, session);
      }

      // 3. Commit transaction
      await session.commitTransaction();

      // 4. Clear domain events
      order.clearDomainEvents();

      return success(this.toDomain(doc!));
    } catch (error) {
      await session.abortTransaction();
      return failure(new DatabaseError('Failed to save order', 'ORDER_SAVE_ERROR', error as Error));
    } finally {
      session.endSession();
    }
  }

  async update(order: Order): Promise<Result<Order>> {
    return this.save(order); // Save handles upsert with transactions
  }

  private toDomain(doc: IOrderDocument): Order {
    const orderNumber = OrderNumber.fromString(doc.orderNumber);
    const shippingAddress = ShippingAddress.create({
      street: doc.shippingAddress.street,
      city: doc.shippingAddress.city,
      state: doc.shippingAddress.state,
      postalCode: doc.shippingAddress.postalCode,
      country: doc.shippingAddress.country,
      recipientName: doc.shippingAddress.recipientName,
      phoneNumber: doc.shippingAddress.phoneNumber
    });

    const status = OrderStatus.create(doc.status as unknown as OrderStatusEnum);

    // Helper to create Money safely (simplified)
    const toMoney = (amount: number) => Money.create(amount);

    const items = doc.items.map((item) =>
      OrderItem.reconstitute(
        {
          productId: item.product,
          productName: item.productName,
          quantity: Quantity.create(item.quantity),
          unitPrice: toMoney(item.unitPrice),
          totalPrice: toMoney(item.totalPrice),
          status: OrderStatus.create(item.status as unknown as OrderStatusEnum),
          orderedDate: item.orderedDate,
          shippedDate: item.shippedDate,
          deliveredDate: item.deliveredDate,
          canCancel: item.canCancel,
          canReturn: item.canReturn,
        },
        (item as any)._id?.toString() || new Date().getTime().toString()
      )
    );

    const props: OrderProps = {
      orderNumber,
      userId: doc.userId,
      items,
      shippingAddress,
      status,
      subtotal: toMoney(doc.subtotal),
      shippingCost: toMoney(doc.shippingCost),
      tax: toMoney(doc.tax),
      total: toMoney(doc.total),
      paymentMethodId: doc.paymentMethod as any,
      paymentId: doc.paymentId,
      trackingNumber: doc.trackingNumber,
      estimatedDeliveryDate: doc.estimatedDeliveryDate,
      actualDeliveryDate: doc.actualDeliveryDate,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };

    return Order.reconstitute(props, doc._id as string);
  }

  private toPersistence(order: Order): any {
    const props = (order as any).props; // Access private props via any cast or getter
    const shippingAddress = props.shippingAddress.props || props.shippingAddress; // Handle VO structure

    // Map items
    const items = order.items.map((item: any) => ({
      product: item.props.productId,
      productName: item.props.productName,
      quantity: item.props.quantity.value,
      unitPrice: item.props.unitPrice.amount,
      totalPrice: item.props.totalPrice.amount,
      status: item.props.status.value,
      orderedDate: item.props.orderedDate,
      shippedDate: item.props.shippedDate,
      deliveredDate: item.props.deliveredDate,
      canCancel: item.props.canCancel,
      canReturn: item.props.canReturn,
      returnProduct: false // Default
    }));

    return {
      _id: order.id,
      orderNumber: order.orderNumber.value,
      userId: order.userId,
      items,
      shippingAddress: {
        street: shippingAddress.street,
        city: shippingAddress.city,
        state: shippingAddress.state,
        postalCode: shippingAddress.postalCode,
        country: shippingAddress.country,
        recipientName: shippingAddress.recipientName,
        phoneNumber: shippingAddress.phoneNumber
      },
      status: order.status.value,
      subtotal: order.subtotal.amount,
      shippingCost: order.shippingCost.amount,
      tax: order.tax.amount,
      total: order.total.amount,
      paymentMethod: props.paymentMethodId,
      paymentId: props.paymentId,
      trackingNumber: props.trackingNumber,
      estimatedDeliveryDate: props.estimatedDeliveryDate,
      actualDeliveryDate: props.actualDeliveryDate,
      updatedAt: props.updatedAt,
      createdAt: props.createdAt
    };
  }
}
