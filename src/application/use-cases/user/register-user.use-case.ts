import { IUserRepository } from '@domain/user/repositories/user.repository.interface';
import { User } from '@domain/user/entities/user.entity';
import {
  RegisterUserRequestDTO,
  RegisterUserResponseDTO,
} from '@application/dtos/user/register-user.dto';
import { Result, success, failure, AsyncResult } from '@shared/types/result';
import { ValidationError, ConflictError } from '@shared/errors';
import { UserRole } from '@shared/types/common';
import { APP_CONSTANTS } from '@shared/constants';
import bcrypt from 'bcrypt';
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
    // Validate input
    const validationResult = this.validate(dto);
    if (!validationResult.success) {
      return validationResult as any;
    }

    // Check if user already exists
    const exists = await this.userRepository.exists(dto.email);
    if (exists) {
      return failure(new ConflictError('User with this email already exists'));
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Create user entity
    const user = User.create(
      {
        name: dto.name,
        email: dto.email,
        passwordHash,
        role: dto.userRole ?? UserRole.USER,
        currentOrder: 0,
        returnedCount: 0,
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
  }

  /**
   * Validate registration input
   */
  private validate(dto: RegisterUserRequestDTO): Result<void> {
    const errors: Array<{ field: string; message: string }> = [];

    if (!dto.name || dto.name.trim().length < APP_CONSTANTS.MIN_NAME_LENGTH) {
      errors.push({
        field: 'name',
        message: `Name must be at least ${APP_CONSTANTS.MIN_NAME_LENGTH} characters`,
      });
    }

    if (dto.name && dto.name.length > APP_CONSTANTS.MAX_NAME_LENGTH) {
      errors.push({
        field: 'name',
        message: `Name must not exceed ${APP_CONSTANTS.MAX_NAME_LENGTH} characters`,
      });
    }

    if (!dto.email || !this.isValidEmail(dto.email)) {
      errors.push({ field: 'email', message: 'Invalid email format' });
    }

    if (!dto.password || dto.password.length < APP_CONSTANTS.MIN_PASSWORD_LENGTH) {
      errors.push({
        field: 'password',
        message: `Password must be at least ${APP_CONSTANTS.MIN_PASSWORD_LENGTH} characters`,
      });
    }

    if (dto.password && dto.password.length > APP_CONSTANTS.MAX_PASSWORD_LENGTH) {
      errors.push({
        field: 'password',
        message: `Password must not exceed ${APP_CONSTANTS.MAX_PASSWORD_LENGTH} characters`,
      });
    }

    if (errors.length > 0) {
      return failure(new ValidationError('Validation failed', errors));
    }

    return success(undefined);
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Map User entity to DTO
   */
  private toDTO(user: User): RegisterUserResponseDTO {
    const props = (user as any).props;
    return {
      id: user.id,
      name: props.name,
      email: props.email,
      role: props.role,
      createdAt: props.createdAt.toISOString(),
    };
  }
}
