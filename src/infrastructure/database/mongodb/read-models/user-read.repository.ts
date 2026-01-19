import { UserReadModel, IUserReadModel } from './user-read.model';
import { ID } from '@shared/types/common';

export interface IUserReadRepository {
  findById(id: ID): Promise<IUserReadModel | null>;
  findByEmail(email: string): Promise<IUserReadModel | null>;
  search(query: string, limit: number): Promise<IUserReadModel[]>;
}

export class UserReadRepository implements IUserReadRepository {
  async findById(id: ID): Promise<IUserReadModel | null> {
    return UserReadModel.findOne({ id }).exec();
  }

  async findByEmail(email: string): Promise<IUserReadModel | null> {
    return UserReadModel.findOne({ email }).exec();
  }

  async search(query: string, limit: number = 10): Promise<IUserReadModel[]> {
    return UserReadModel.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
      ],
    })
      .limit(limit)
      .exec();
  }

  async create(data: IUserReadModel): Promise<void> {
    await UserReadModel.create(data);
  }
}
