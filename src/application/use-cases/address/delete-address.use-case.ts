import { IAddressRepository } from '@domain/address/repositories/address.repository.interface';
import { AsyncResult, failure } from '@shared/types/result';
import { NotFoundError } from '@shared/errors';
import { ID } from '@shared/types/common';

export class DeleteAddressUseCase {
  constructor(private readonly addressRepository: IAddressRepository) {}

  async execute(userId: ID, addressId: ID): AsyncResult<void> {
    const address = await this.addressRepository.findById(addressId);
    if (!address) {
      return failure(new NotFoundError('Address', addressId));
    }

    // Verify address belongs to user
    const addressProps = (address as any).props;
    if (addressProps.userId !== userId) {
      return failure(new NotFoundError('Address', addressId));
    }

    return this.addressRepository.delete(addressId);
  }
}
