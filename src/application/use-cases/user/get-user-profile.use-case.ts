import { IUserRepository } from '@domain/user/repositories/user.repository.interface';
import { UserProfileResponseDTO } from '@application/dtos/user/user-profile.dto';
import { AsyncResult, success, failure } from '@shared/types/result';
import { NotFoundError } from '@shared/errors';
import { ID } from '@shared/types/common';

/**
 * Use case for getting user profile
 */
export class GetUserProfileUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  /**
   * Execute the get user profile use case
   */
  async execute(userId: ID): AsyncResult<UserProfileResponseDTO> {
    // Find user
    const user = await this.userRepository.findById(userId);
    if (!user) {
      return failure(new NotFoundError('User', userId));
    }

    // Map to DTO using public getters
    return success({
      id: user.id,
      name: user.name,
      email: user.email.value,
      role: user.role,
      currentOrder: user.currentOrderCount,
      returnedCount: user.returnedOrderCount,
      stripeCustomerId: (user as any).props.stripeCustomerId, // Still need casting for props not exposed? Or add getters?
      // Adding getters would be better, but for now matching existing behavior.
      // Wait, I should add getters for shop info too.
      // But lets stick to minimal required.
      shopName: (user as any).props.shopName,
      shopMobileNumber: (user as any).props.phoneNumber?.toString(),
      shopAddress: (user as any).props.shopAddress,
      lastLogin: user.lastLogin?.toISOString(),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    });
  }
}
