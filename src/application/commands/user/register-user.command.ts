import { BaseCommand } from '../command.interface';
import { UserRole } from '@shared/types/common';

export class RegisterUserCommand extends BaseCommand {
  constructor(
    public readonly name: string,
    public readonly email: string,
    public readonly password: string,
    public readonly role: UserRole = UserRole.USER
  ) {
    super('RegisterUserCommand');
  }
}
