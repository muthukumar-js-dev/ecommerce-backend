import { IUserRepository } from '@domain/user/repositories/user.repository.interface';
import { User } from '@domain/user/aggregates/user.aggregate';
import { Email } from '@domain/user/value-objects/email.vo';
import { Password } from '@domain/user/value-objects/password.vo';
import {
  RegisterUserRequestDTO,
  RegisterUserResponseDTO,
} from '@application/dtos/user/register-user.dto';
import { success, failure, AsyncResult } from '@shared/types/result';
import { ValidationError, ConflictError } from '@shared/errors';
import { UserRole } from '@shared/types/common';
import { randomUUID } from 'crypto';

/**
 * Use case for registering a new user
 */
export class RegisterUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  /**
   * Execute the register user use case
   */
  async execute(dto: RegisterUserRequestDTO): AsyncResult<RegisterUserResponseDTO> {
    try {
      // Create value objects (will throw validation error if invalid)
      const email = Email.create(dto.email);
      
      // Check if user already exists
      // Note: Domain service usually handles this (ensureEmailIsUnique), 
      // but simple check here is fine for now/Phase 2.
      const exists = await this.userRepository.exists(email);
      if (exists) {
        return failure(new ConflictError('User with this email already exists'));
      }

      // Password creation handles validation and hashing
      const password = await Password.create(dto.password);

      // Create user aggregate
      // Assuming name validation happens in validate() or value object?
      // User aggregate validates name length.
      
      const user = User.create(
        {
          name: dto.name,
          email,
          password,
          role: dto.userRole ?? UserRole.USER,
          shopName: undefined, // Optional
          shopAddress: undefined, // Optional
          stripeCustomerId: undefined,
          phoneNumber: undefined,
        },
        randomUUID()
      );

      // Save user
      const saveResult = await this.userRepository.save(user);
      if (!saveResult.success) {
        return failure(saveResult.error);
      }

      // Return response
      return success(this.toDTO(saveResult.data));
    } catch (error) {
      if (error instanceof ValidationError) {
        return failure(error);
      }
      // Re-throw or handle unknown errors
      throw error;
    }
  }

  /**
   * Map User entity to DTO
   */
  private toDTO(user: User): RegisterUserResponseDTO {
    // Access public getters
    return {
      id: user.id,
      name: user.name,
      email: user.email.value,
      role: user.role,
      createdAt: (user as any).props.createdAt.toISOString(), // Accessing protected prop via cast for now as createdAt getter might be missing?
      // TODO: Add createdAt getter to User aggregate
    };
  }
}
