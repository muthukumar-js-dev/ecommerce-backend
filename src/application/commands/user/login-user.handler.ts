import { CommandHandler } from '@application/commands/command-handler.interface';
import { LoginUserCommand } from '@application/commands/user/login-user.command';
import { AsyncResult } from '@shared/types/result';
import { LoginUserUseCase } from '@application/use-cases/user/login-user.use-case';
import { IUserRepository } from '@domain/user/repositories/user.repository.interface';
import { LoginUserResponseDTO } from '@application/dtos/user/login-user.dto';

export class LoginUserHandler implements CommandHandler<LoginUserCommand, LoginUserResponseDTO> {
    private useCase: LoginUserUseCase;

    constructor(
        userRepository: IUserRepository,
        jwtSecret: string
    ) {
        this.useCase = new LoginUserUseCase(userRepository, jwtSecret);
    }

    async handle(command: LoginUserCommand): AsyncResult<LoginUserResponseDTO> {
        return this.useCase.execute({
            email: command.email,
            password: command.password
        });
    }
}
