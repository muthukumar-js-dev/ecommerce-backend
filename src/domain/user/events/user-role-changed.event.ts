import { DomainEvent } from '@shared/domain/domain-event';
import { ID, UserRole } from '@shared/types/common';

export interface UserRoleChangedPayload {
  userId: ID;
  previousRole: UserRole;
  newRole: UserRole;
  changedAt: Date;
  changedBy: ID;
}

/**
 * Domain Event: User Role Changed
 * Raised when a user's role is modified
 */
export class UserRoleChanged extends DomainEvent<UserRoleChangedPayload> {
  constructor(payload: UserRoleChangedPayload) {
    super('UserRoleChanged', payload, 1);
  }
}
