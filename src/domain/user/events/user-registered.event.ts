import { DomainEvent } from '@shared/domain/domain-event';
import { ID, UserRole } from '@shared/types/common';

export interface UserRegisteredPayload {
  userId: ID;
  email: string;
  name: string;
  role: UserRole;
  registeredAt: Date;
}

/**
 * Domain Event: User Registered
 * Raised when a new user account is created
 */
export class UserRegistered extends DomainEvent<UserRegisteredPayload> {
  constructor(payload: UserRegisteredPayload) {
    super('UserRegistered', payload, 1); // version 1
  }
}
