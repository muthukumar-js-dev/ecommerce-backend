import { Order } from '../entities/order.entity';
import { ID } from '@shared/types/common';
import { Result } from '@shared/types/result';

export interface IOrderRepository {
  findById(id: ID): Promise<Order | null>;
  findByUserId(userId: ID, skip?: number, limit?: number): Promise<Order[]>;
  save(order: Order): Promise<Result<Order>>;
  update(order: Order): Promise<Result<Order>>;
  delete(id: ID): Promise<Result<void>>;
  count(): Promise<number>;
}
