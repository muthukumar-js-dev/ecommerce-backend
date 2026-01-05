import { BaseCommand } from '@application/commands/command.interface';

export class LoginUserCommand extends BaseCommand {
    constructor(
        public readonly email: string,
        public readonly password: string
    ) {
        super('LoginUserCommand');
    }
}
