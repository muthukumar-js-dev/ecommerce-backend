import { IUserRepository } from '@domain/user/repositories/user.repository.interface';

import { Email } from '@domain/user/value-objects/email.vo';
import {
  LoginUserRequestDTO,
  LoginUserResponseDTO,
} from '@application/dtos/user/login-user.dto';
import { AsyncResult, success, failure } from '@shared/types/result';
import { AuthenticationError, ValidationError } from '@shared/errors';
import { APP_CONSTANTS } from '@shared/constants';
import jwt from 'jsonwebtoken';

/**
 * Use case for user login
 */
export class LoginUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly jwtSecret: string
  ) {}

  /**
   * Execute the login use case
   */
  async execute(dto: LoginUserRequestDTO): AsyncResult<LoginUserResponseDTO> {
    // Validate input
    if (!dto.email || !dto.password) {
      return failure(
        new ValidationError('Email and password are required', [
          { field: 'email', message: 'Email is required' },
          { field: 'password', message: 'Password is required' },
        ])
      );
    }

    try {
      // Create Email VO (handles validation)
      const email = Email.create(dto.email);

      // Find user
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        return failure(new AuthenticationError('Invalid email or password'));
      }

      // Verify password using aggregate method
      const isPasswordValid = await user.verifyPassword(dto.password);
      if (!isPasswordValid) {
        return failure(new AuthenticationError('Invalid email or password'));
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email.value,
          role: user.role,
        },
        this.jwtSecret,
        { expiresIn: APP_CONSTANTS.JWT_EXPIRY }
      );

      // Update last login
      user.recordLogin();
      await this.userRepository.update(user);

      // Return response
      return success({
        user: {
          id: user.id,
          name: user.name,
          email: user.email.value,
          role: user.role,
        },
        token,
        expiresIn: APP_CONSTANTS.JWT_EXPIRY,
      });

    } catch (error) {
       // If Email.create throws ValidationError, catch it?
       // Or usually AuthenticationError is safer to return for login failures
       // regardless of reason to avoid enumeration?
       // But if email format is invalid, returning Validation error is fine.
       if (error instanceof ValidationError) {
         return failure(new AuthenticationError('Invalid email or password')); // obscure specific error?
         // Or just return validation error.
         // return failure(error);
       }
       return failure(new AuthenticationError('Invalid email or password'));
    }
  }
}
