import { BaseCommand } from '../command.interface';
import { ID } from '@shared/types/common';

export interface OrderItemData {
  productId: ID;
  quantity: number;
  price: number;
}

export class PlaceOrderCommand extends BaseCommand {
  constructor(
    userId: ID,
    public readonly items: OrderItemData[],
    public readonly shippingAddressId: ID,
    public readonly paymentMethodId: ID
  ) {
    super('PlaceOrderCommand', userId);
  }
}
