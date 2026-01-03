import { Address } from '../entities/address.entity';
import { ID } from '@shared/types/common';
import { Result } from '@shared/types/result';

export interface IAddressRepository {
  findById(id: ID): Promise<Address | null>;
  findByUserId(userId: ID): Promise<Address[]>;
  findDefaultByUserId(userId: ID): Promise<Address | null>;
  save(address: Address): Promise<Result<Address>>;
  update(address: Address): Promise<Result<Address>>;
  delete(id: ID): Promise<Result<void>>;
}
