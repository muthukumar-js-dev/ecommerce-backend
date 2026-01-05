import { CommandHandler } from '@application/commands/command-handler.interface';
import { UpdateUserRoleCommand } from '@application/commands/user/update-user-role.command';
import { AsyncResult, success, failure } from '@shared/types/result';
import { IUserRepository } from '@domain/user/repositories/user.repository.interface';
import { BusinessRuleError } from '@shared/errors';

export class UpdateUserRoleHandler implements CommandHandler<UpdateUserRoleCommand, void> {
    constructor(
        private readonly userRepository: IUserRepository
    ) { }

    async handle(command: UpdateUserRoleCommand): AsyncResult<void> {
        const user = await this.userRepository.findById(command.userId);
        if (!user) {
            return failure(new BusinessRuleError('User not found', 'USER_NOT_FOUND'));
        }

        user.changeRole(command.role, command.changedBy);

        const result = await this.userRepository.save(user);
        if (!result.success) return failure(result.error);

        return success(undefined);
    }
}
