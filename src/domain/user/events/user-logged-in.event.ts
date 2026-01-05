import { DomainEvent } from '@shared/domain/domain-event';
import { ID } from '@shared/types/common';

export interface UserLoggedInPayload {
  userId: ID;
  email: string;
  loginAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Domain Event: User Logged In
 * Raised when a user successfully authenticates
 */
export class UserLoggedIn extends DomainEvent<UserLoggedInPayload> {
  constructor(payload: UserLoggedInPayload) {
    super('UserLoggedIn', payload, 1);
  }
}
