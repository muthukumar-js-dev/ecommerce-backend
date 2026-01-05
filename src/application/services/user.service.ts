import { BaseApplicationService } from './base-application.service';
import { CommandBus } from '../commands/command-bus';
import { QueryBus } from '../queries/query-bus';
import { EventBus } from '@infrastructure/events/event-bus';
import { RegisterUserCommand } from '../commands/user/register-user.command';
import { LoginUserCommand } from '../commands/user/login-user.command';
import { UpdateUserRoleCommand } from '../commands/user/update-user-role.command';
import { GetUserProfileQuery } from '../queries/user/get-user-profile.query';
import {
  RegisterUserRequestDTO,
  RegisterUserResponseDTO,
} from '../dtos/user/register-user.dto';
import { LoginUserRequestDTO, LoginUserResponseDTO } from '../dtos/user/login-user.dto';
import { UserProfileResponseDTO } from '../dtos/user/user-profile.dto';
import { UpdateUserRoleRequestDTO } from '../use-cases/user/update-user-role.use-case';
import { AsyncResult } from '@shared/types/result';
import { ID } from '@shared/types/common';
import { LogExecution } from '../decorators/logging.decorator';

/**
 * Application service for User domain
 * Uses CommandBus and QueryBus to execute operations
 */
export class UserService extends BaseApplicationService {
  constructor(
    commandBus: CommandBus,
    queryBus: QueryBus,
    eventBus: EventBus
  ) {
    super(commandBus, queryBus, eventBus);
  }

  /**
   * Register a new user
   */
  @LogExecution()
  async register(dto: RegisterUserRequestDTO): AsyncResult<RegisterUserResponseDTO> {
    const command = new RegisterUserCommand(dto.name, dto.email, dto.password, dto.userRole);
    return this.executeCommand<AsyncResult<RegisterUserResponseDTO>>(command);
  }

  /**
   * Login user
   */
  @LogExecution()
  async login(dto: LoginUserRequestDTO): AsyncResult<LoginUserResponseDTO> {
    const command = new LoginUserCommand(dto.email, dto.password);
    return this.executeCommand<AsyncResult<LoginUserResponseDTO>>(command);
  }

  /**
   * Get user profile
   */
  @LogExecution()
  async getUserProfile(userId: ID): AsyncResult<UserProfileResponseDTO> {
    const query = new GetUserProfileQuery(userId);
    return this.executeQuery<AsyncResult<UserProfileResponseDTO>>(query);
  }

  /**
   * Update user role
   */
  @LogExecution()
  async updateUserRole(userId: ID, dto: UpdateUserRoleRequestDTO): AsyncResult<void> {
    const command = new UpdateUserRoleCommand(userId, dto.role, 'SYSTEM'); // TODO: Pass actual actor ID
    return this.executeCommand<AsyncResult<void>>(command);
  }
}
