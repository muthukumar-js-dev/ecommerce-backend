import { OrderItem } from '../../entities/order-item.entity';
import { Money } from '@domain/product/value-objects/money.vo';
import { Quantity } from '@domain/product/value-objects/quantity.vo';
import { OrderStatusEnum } from '../../value-objects/order-status.vo';

describe('OrderItem Entity', () => {
  it('should create item with total price calculation', () => {
    const item = OrderItem.create(
      'p1',
      'Product 1',
      Quantity.create(2),
      Money.create(100),
      'i1'
    );

    expect(item.totalPrice.amount).toBe(200);
    expect(item.status.isPending).toBe(true);
  });

  it('should update status', () => {
    const item = OrderItem.create(
      'p1',
      'Product 1',
      Quantity.create(1),
      Money.create(100),
      'i1'
    );

    item.updateStatus(OrderStatusEnum.CONFIRMED);
    expect(item.status.isConfirmed).toBe(true);
  });
});
