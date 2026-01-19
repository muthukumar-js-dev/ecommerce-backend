import { IUserRepository } from '@domain/user/repositories/user.repository.interface';
import { AsyncResult, failure, success } from '@shared/types/result';
import { NotFoundError } from '@shared/errors';
import { ID } from '@shared/types/common';
import { Email } from '@domain/user/value-objects/email.vo';
import { PhoneNumber } from '@domain/user/value-objects/phone-number.vo';

interface UpdateUserProfileDTO {
  name?: string;
  email?: string;
  phone?: string;
}

/**
 * Update User Profile Use Case
 * Handles user profile updates
 */
export class UpdateUserProfileUseCase {
  constructor(private readonly userRepository: IUserRepository) { }

  async execute(userId: ID, dto: UpdateUserProfileDTO): AsyncResult<void> {
    // Find user
    const user = await this.userRepository.findById(userId);

    if (!user) {
      return failure(new NotFoundError('User', userId));
    }

    // Check if email is being changed and if it's already taken
    if (dto.email && dto.email !== user.email.value) {
      const newEmail = Email.create(dto.email);
      const existingUser = await this.userRepository.findByEmail(newEmail);
      if (existingUser) {
        return failure(new Error('Email already in use'));
      }

      user.changeEmail(newEmail);
    }

    if (dto.name || dto.phone) {
      let phoneNumber: PhoneNumber | undefined;
      if (dto.phone) {
        // Assuming update provides formatted or full string?
        // Using fromString for flexibility
        if (dto.phone.startsWith('+')) {
          phoneNumber = PhoneNumber.fromString(dto.phone);
        } else {
          phoneNumber = PhoneNumber.create('+91', dto.phone); // Default logic
        }
      }

      user.updateProfile(dto.name || user.name, phoneNumber);
    }

    // Save updated user
    const result = await this.userRepository.update(user);
    if (!result.success) {
      return failure(result.error);
    }

    return success(undefined);
  }
}
