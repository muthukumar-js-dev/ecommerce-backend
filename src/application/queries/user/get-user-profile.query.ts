import { BaseQuery } from '../query.interface';
import { ID } from '@shared/types/common';

export class GetUserProfileQuery extends BaseQuery {
  constructor(
    public readonly userId: ID,
    requestingUserId?: ID
  ) {
    super('GetUserProfileQuery', requestingUserId);
  }
}
