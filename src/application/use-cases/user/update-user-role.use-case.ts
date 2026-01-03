import { IUserRepository } from '@domain/user/repositories/user.repository.interface';
import { AsyncResult, success, failure } from '@shared/types/result';
import { NotFoundError, ValidationError } from '@shared/errors';
import { ID, UserRole } from '@shared/types/common';

/**
 * Request DTO for updating user role
 */
export interface UpdateUserRoleRequestDTO {
  role: UserRole;
}

/**
 * Use case for updating user role
 */
export class UpdateUserRoleUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(userId: ID, dto: UpdateUserRoleRequestDTO): AsyncResult<void> {
    if (!dto.role) {
      return failure(
        new ValidationError('Role is required', [{ field: 'role', message: 'Role is required' }])
      );
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      return failure(new NotFoundError('User', userId));
    }

    // Update role via props (entity doesn't have updateRole method)
    (user as any).props.role = dto.role;
    (user as any).props.updatedAt = new Date();

    const updateResult = await this.userRepository.update(user);
    if (!updateResult.success) {
      return failure(updateResult.error);
    }

    return success(undefined);
  }
}
