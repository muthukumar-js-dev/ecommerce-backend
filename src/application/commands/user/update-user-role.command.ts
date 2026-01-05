import { BaseCommand } from '@application/commands/command.interface';
import { ID, UserRole } from '@shared/types/common';

export class UpdateUserRoleCommand extends BaseCommand {
    constructor(
        public readonly userId: ID,
        public readonly role: UserRole,
        public readonly changedBy: ID
    ) {
        super('UpdateUserRoleCommand', changedBy);
    }
}
