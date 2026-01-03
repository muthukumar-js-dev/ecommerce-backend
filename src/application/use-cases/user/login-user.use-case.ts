import { IUserRepository } from '@domain/user/repositories/user.repository.interface';
import {
  LoginUserRequestDTO,
  LoginUserResponseDTO,
} from '@application/dtos/user/login-user.dto';
import { AsyncResult, success, failure } from '@shared/types/result';
import { AuthenticationError, ValidationError } from '@shared/errors';
import { APP_CONSTANTS } from '@shared/constants';
import bcrypt from 'bcrypt';
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

    // Find user
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) {
      return failure(new AuthenticationError('Invalid email or password'));
    }

    // Verify password
    const props = (user as any).props;
    const isPasswordValid = await bcrypt.compare(dto.password, props.passwordHash);
    if (!isPasswordValid) {
      return failure(new AuthenticationError('Invalid email or password'));
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: props.email,
        role: props.role,
      },
      this.jwtSecret,
      { expiresIn: APP_CONSTANTS.JWT_EXPIRY }
    );

    // Update last login
    user.updateLastLogin();
    await this.userRepository.update(user);

    // Return response
    return success({
      user: {
        id: user.id,
        name: props.name,
        email: props.email,
        role: props.role,
      },
      token,
      expiresIn: APP_CONSTANTS.JWT_EXPIRY,
    });
  }
}
