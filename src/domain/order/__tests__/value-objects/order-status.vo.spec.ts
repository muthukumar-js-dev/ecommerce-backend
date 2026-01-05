import { OrderStatus, OrderStatusEnum } from '../../value-objects/order-status.vo';

describe('OrderStatus Value Object', () => {
  it('should create pending status', () => {
    const status = OrderStatus.pending();
    expect(status.isPending).toBe(true);
    expect(status.value).toBe(OrderStatusEnum.PENDING);
  });

  it('should allow valid transition', () => {
    const status = OrderStatus.pending();
    const newStatus = status.transitionTo(OrderStatusEnum.CONFIRMED);
    expect(newStatus.isConfirmed).toBe(true);
  });

  it('should prevent invalid transition', () => {
    const status = OrderStatus.pending();
    expect(() => status.transitionTo(OrderStatusEnum.SHIPPED)).toThrow();
  });

  it('should check cancellation eligibility', () => {
    expect(OrderStatus.pending().canBeCancelled).toBe(true);
    // Cancelled status cannot be cancelled again / redundant
    expect(OrderStatus.create(OrderStatusEnum.CANCELLED).canBeCancelled).toBe(false); 
  });
});
