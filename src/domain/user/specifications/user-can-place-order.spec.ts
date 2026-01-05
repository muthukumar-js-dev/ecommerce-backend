import { Specification } from '@shared/domain/specification';
import { User } from '../aggregates/user.aggregate';

/**
 * Specification: User Can Place Order
 * Encapsulates the business rule for order placement eligibility
 */
export class UserCanPlaceOrderSpecification implements Specification<User> {
  isSatisfiedBy(user: User): boolean {
    return user.canPlaceOrder;
  }

  getReason(user: User): string | null {
    if (!user.canPlaceOrder) {
      if (!user.isActive) {
        return 'User account is not active';
      }
      if (user.currentOrderCount >= 50) {
        return 'User has reached maximum order limit';
      }
    }
    return null;
  }
}
