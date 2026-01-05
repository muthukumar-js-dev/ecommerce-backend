import { QueryHandler } from '../query-handler.interface';
import { GetUserProfileQuery } from './get-user-profile.query';
import { IUserReadRepository } from '@infrastructure/database/mongodb/read-models/user-read.repository';
import { AsyncResult, success, failure } from '@shared/types/result';
import { NotFoundError } from '@shared/errors';

export interface UserProfileDTO {
  id: string;
  name: string;
  email: string;
  role: string;
  currentOrderCount: number;
  memberSince: string;
  lastLogin?: string;
}

export class GetUserProfileHandler implements QueryHandler<GetUserProfileQuery, UserProfileDTO> {
  constructor(private readonly userReadRepository: IUserReadRepository) {}

  async handle(query: GetUserProfileQuery): AsyncResult<UserProfileDTO> {
    const user = await this.userReadRepository.findById(query.userId);

    if (!user) {
      return failure(new NotFoundError('User', query.userId));
    }

    return success({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      currentOrderCount: user.currentOrderCount,
      memberSince: user.createdAt.toISOString(),
      lastLogin: user.lastLogin?.toISOString(),
    });
  }
}
