import { Specification } from '@shared/domain/specification';
import { User } from '../aggregates/user.aggregate';

/**
 * Specification: User Can Become Seller
 * Encapsulates the business rule for seller eligibility
 */
export class UserCanBecomeSellerSpecification implements Specification<User> {
  private readonly MIN_COMPLETED_ORDERS = 5;

  isSatisfiedBy(user: User): boolean {
    const completedOrders = user.currentOrderCount - user.returnedOrderCount;
    return completedOrders >= this.MIN_COMPLETED_ORDERS;
  }

  getReason(user: User): string | null {
    if (!this.isSatisfiedBy(user)) {
      const completedOrders = user.currentOrderCount - user.returnedOrderCount;
      const remaining = this.MIN_COMPLETED_ORDERS - completedOrders;
      return `User needs ${remaining} more completed orders to become a seller`;
    }
    return null;
  }
}
