import { CommandHandler } from '../command-handler.interface';
import { RegisterUserCommand } from './register-user.command';
import { IUserRepository } from '@domain/user/repositories/user.repository.interface';
import { User } from '@domain/user/aggregates/user.aggregate';
import { Email } from '@domain/user/value-objects/email.vo';
import { Password } from '@domain/user/value-objects/password.vo';
import { UserDomainService } from '@domain/user/services/user-domain.service';
import { AsyncResult, success, failure } from '@shared/types/result';
import { ID } from '@shared/types/common';
import { EventBus } from '../../../infrastructure/events/event-bus';

export interface RegisterUserResult {
    userId: ID;
    email: string;
    name: string;
}

export class RegisterUserHandler implements CommandHandler<RegisterUserCommand, RegisterUserResult> {
    constructor(
        private readonly userRepository: IUserRepository,
        private readonly userDomainService: UserDomainService,
        private readonly eventBus: EventBus
    ) { }

    async handle(command: RegisterUserCommand): AsyncResult<RegisterUserResult> {
        // Create value objects
        const email = Email.create(command.email);
        const password = await Password.create(command.password);

        // Check business rules
        await this.userDomainService.ensureEmailIsUnique(email);

        // Create aggregate
        const userId = this.generateId();
        const user = User.create(
            {
                name: command.name,
                email,
                password,
                role: command.role,
            },
            userId
        );

        // Validate
        user.validate();

        // Persist
        const saveResult = await this.userRepository.save(user);
        if (!saveResult.success) {
            return failure(saveResult.error);
        }

        // Publish domain events
        await this.publishEvents(user);

        return success({
            userId: user.id,
            email: user.email.value,
            name: user.name,
        });
    }

    private async publishEvents(user: User): Promise<void> {
        if (!user.domainEvents) return;

        for (const event of user.domainEvents) {
            await this.eventBus.publish(event);
        }
        user.clearDomainEvents();
    }

    private generateId(): ID {
        return new Date().getTime().toString(); // Simple ID generation for now
    }
}
