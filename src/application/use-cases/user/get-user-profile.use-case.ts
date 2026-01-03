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

    // Map to DTO
    const props = (user as any).props;
    return success({
      id: user.id,
      name: props.name,
      email: props.email,
      role: props.role,
      currentOrder: props.currentOrder,
      returnedCount: props.returnedCount,
      stripeCustomerId: props.stripeCustomerId,
      shopName: props.shopName,
      shopMobileNumber: props.shopMobileNumber,
      shopAddress: props.shopAddress,
      lastLogin: props.lastLogin?.toISOString(),
      createdAt: props.createdAt.toISOString(),
      updatedAt: props.updatedAt.toISOString(),
    });
  }
}
