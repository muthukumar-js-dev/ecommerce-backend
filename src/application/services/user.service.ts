import { RegisterUserUseCase } from '../use-cases/user/register-user.use-case';
import { LoginUserUseCase } from '../use-cases/user/login-user.use-case';
import { GetUserProfileUseCase } from '../use-cases/user/get-user-profile.use-case';
import { UpdateUserRoleUseCase, UpdateUserRoleRequestDTO } from '../use-cases/user/update-user-role.use-case';
import { IUserRepository } from '@domain/user/repositories/user.repository.interface';
import {
  RegisterUserRequestDTO,
  RegisterUserResponseDTO,
} from '../dtos/user/register-user.dto';
import { LoginUserRequestDTO, LoginUserResponseDTO } from '../dtos/user/login-user.dto';
import { UserProfileResponseDTO } from '../dtos/user/user-profile.dto';
import { AsyncResult } from '@shared/types/result';
import { ID } from '@shared/types/common';

/**
 * Application service for User domain
 * Aggregates all user-related use cases
 */
export class UserService {
  private registerUseCase: RegisterUserUseCase;
  private loginUseCase: LoginUserUseCase;
  private getUserProfileUseCase: GetUserProfileUseCase;
  private updateUserRoleUseCase: UpdateUserRoleUseCase;

  constructor(userRepository: IUserRepository, jwtSecret: string) {
    this.registerUseCase = new RegisterUserUseCase(userRepository);
    this.loginUseCase = new LoginUserUseCase(userRepository, jwtSecret);
    this.getUserProfileUseCase = new GetUserProfileUseCase(userRepository);
    this.updateUserRoleUseCase = new UpdateUserRoleUseCase(userRepository);
  }

  /**
   * Register a new user
   */
  async register(dto: RegisterUserRequestDTO): AsyncResult<RegisterUserResponseDTO> {
    return this.registerUseCase.execute(dto);
  }

  /**
   * Login user
   */
  async login(dto: LoginUserRequestDTO): AsyncResult<LoginUserResponseDTO> {
    return this.loginUseCase.execute(dto);
  }

  /**
   * Get user profile
   */
  async getUserProfile(userId: ID): AsyncResult<UserProfileResponseDTO> {
    return this.getUserProfileUseCase.execute(userId);
  }

  /**
   * Update user role
   */
  async updateUserRole(userId: ID, dto: UpdateUserRoleRequestDTO): AsyncResult<void> {
    return this.updateUserRoleUseCase.execute(userId, dto);
  }
}
