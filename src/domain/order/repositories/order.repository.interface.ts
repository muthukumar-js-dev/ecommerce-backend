import { Order } from '../aggregates/order.aggregate';
import { ID } from '@shared/types/common';
import { Result } from '@shared/types/result';
import { OrderNumber } from '../value-objects/order-number.vo';

export interface IOrderRepository {
  findById(id: ID): Promise<Order | null>;
  findByOrderNumber(orderNumber: OrderNumber): Promise<Order | null>;
  findByUserId(userId: ID): Promise<Order[]>;
  save(order: Order): Promise<Result<Order>>;
  update(order: Order): Promise<Result<Order>>;
}
