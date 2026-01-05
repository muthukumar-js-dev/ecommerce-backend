import { OrderNumber } from '../../value-objects/order-number.vo';

describe('OrderNumber Value Object', () => {
  it('should generate valid order number', () => {
    const on = OrderNumber.generate(new Date(), 'user-123');
    expect(on.value).toMatch(/^ORD-\d{8}-USER-[A-Z0-9]{4}$/);
  });
});
