import { User } from '../aggregates/user.aggregate';
import { Email } from '../value-objects/email.vo';
import { IUserRepository } from '../repositories/user.repository.interface';
import { ConflictError } from '@shared/errors';

/**
 * User Domain Service
 * Contains domain logic that doesn't naturally fit within a single aggregate
 */
export class UserDomainService {
  constructor(private readonly userRepository: IUserRepository) {}

  async ensureEmailIsUnique(email: Email): Promise<void> {
    const exists = await this.userRepository.exists(email);
    if (exists) {
      throw new ConflictError('Email already exists');
    }
  }

  async canUserBecomeSeller(user: User): Promise<boolean> {
    // Business rule: User must have at least 5 completed orders to become seller
    const completedOrders = user.currentOrderCount - user.returnedOrderCount;
    return completedOrders >= 5;
  }

  calculateUserTrustScore(user: User): number {
    const totalOrders = user.currentOrderCount;
    const returnedOrders = user.returnedOrderCount;
    
    if (totalOrders === 0) {
      return 100; // New users start with full trust
    }

    const returnRate = returnedOrders / totalOrders;
    const trustScore = Math.max(0, 100 - returnRate * 100);
    
    return Math.round(trustScore);
  }

  /**
   * Determine if user is eligible for premium features
   */
  isEligibleForPremium(user: User): boolean {
    const trustScore = this.calculateUserTrustScore(user);
    return user.isActive && trustScore >= 80 && user.currentOrderCount >= 10;
  }
}
