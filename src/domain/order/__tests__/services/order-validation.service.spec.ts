import { OrderValidationService } from '../../services/order-validation.service';
import { IProductRepository } from '@domain/product/repositories/product.repository.interface';
import { Order } from '../../aggregates/order.aggregate';
import { OrderItem } from '../../entities/order-item.entity';
import { Quantity } from '@domain/product/value-objects/quantity.vo';
import { Money } from '@domain/product/value-objects/money.vo';
import { ShippingAddress } from '../../value-objects/shipping-address.vo';

describe('OrderValidationService', () => {
  let service: OrderValidationService;
  let mockProductRepo: jest.Mocked<IProductRepository>;

  beforeEach(() => {
    mockProductRepo = {
      findById: jest.fn(),
    } as any;
    service = new OrderValidationService(mockProductRepo);
  });

  const createOrder = () => {
      const item = OrderItem.create('p1', 'Prod', Quantity.create(1), Money.create(100), 'i1');
      const address = ShippingAddress.create({
          street: '123 St', city: 'City', state: 'St', postalCode: '123456', country: 'C',
          recipientName: 'Bob', phoneNumber: '1234567890'
      });
      return Order.create('u1', [item], address, 'o1');
  };

  it('should validate successfully when product exists and has inventory', async () => {
    mockProductRepo.findById.mockResolvedValue({
      id: 'p1',
      isAvailable: true,
      title: 'Prod',
      inventory: Quantity.create(10),
    } as any);

    const order = createOrder();
    await expect(service.validateOrderItems(order)).resolves.not.toThrow();
  });

  it('should throw if product not found', async () => {
    mockProductRepo.findById.mockResolvedValue(null);
    const order = createOrder();
    await expect(service.validateOrderItems(order)).rejects.toThrow('Product p1 not found');
  });

  it('should throw if product not available', async () => {
    mockProductRepo.findById.mockResolvedValue({
        id: 'p1',
        isAvailable: false,
        title: 'Prod',
    } as any);
    const order = createOrder();
    await expect(service.validateOrderItems(order)).rejects.toThrow('Product Prod is not available');
  });

  it('should throw if insufficient inventory', async () => {
    mockProductRepo.findById.mockResolvedValue({
        id: 'p1',
        isAvailable: true,
        title: 'Prod',
        inventory: Quantity.create(0), // Less than 1
    } as any);
    const order = createOrder();
    await expect(service.validateOrderItems(order)).rejects.toThrow('Insufficient inventory for Prod');
  });
});
