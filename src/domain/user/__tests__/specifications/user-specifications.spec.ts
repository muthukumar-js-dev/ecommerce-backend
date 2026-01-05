import { UserCanPlaceOrderSpecification } from '../../specifications/user-can-place-order.spec';
import { UserCanBecomeSellerSpecification } from '../../specifications/user-can-become-seller.spec';
import { User } from '../../aggregates/user.aggregate';
import { Email } from '../../value-objects/email.vo';
import { UserRole } from '@shared/types/common';

describe('User Specifications', () => {
  let user: User;

  beforeEach(() => {
    user = User.create(
      {
        name: 'Test User',
        email: Email.create('test@example.com'),
        password: {} as any,
        role: UserRole.USER,
      },
      '123'
    );
  });

  describe('UserCanPlaceOrderSpecification', () => {
    const spec = new UserCanPlaceOrderSpecification();

    it('should be satisfied for active user under limit', () => {
      expect(spec.isSatisfiedBy(user)).toBe(true);
    });

    it('should not be satisfied for inactive user', () => {
      user.deactivate();
      expect(spec.isSatisfiedBy(user)).toBe(false);
      expect(spec.getReason(user)).toContain('not active');
    });

    it('should not be satisfied if max orders reached', () => {
      // Mock or manually set high order count if possible, 
      // or loop increment. Aggregate protects setting directly.
      for(let i=0; i<50; i++) user.incrementOrderCount();
      
      expect(spec.isSatisfiedBy(user)).toBe(false);
      expect(spec.getReason(user)).toContain('maximum order limit');
    });
  });

  describe('UserCanBecomeSellerSpecification', () => {
    const spec = new UserCanBecomeSellerSpecification();

    it('should not be satisfied initially (0 orders)', () => {
        expect(spec.isSatisfiedBy(user)).toBe(false);
        expect(spec.getReason(user)).toContain('needs 5 more');
    });

    it('should be satisfied with 5 completed orders', () => {
        for(let i=0; i<5; i++) user.incrementOrderCount();
        expect(spec.isSatisfiedBy(user)).toBe(true);
    });

    it('should account for returns', () => {
        for(let i=0; i<6; i++) user.incrementOrderCount();
        user.incrementReturnCount(); // 6 orders, 1 return = 5 completed
        expect(spec.isSatisfiedBy(user)).toBe(true);
        
        user.incrementReturnCount(); // 6 orders, 2 returns = 4 completed
        
        // Assert state explicitly to debug
        expect(user.returnedOrderCount).toBe(2);
        expect(user.currentOrderCount).toBe(6);
        
        expect(spec.isSatisfiedBy(user)).toBe(false);
    });
  });
});
