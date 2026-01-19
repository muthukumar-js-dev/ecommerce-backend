import { IAddressRepository } from '@domain/address/repositories/address.repository.interface';
import { AsyncResult, success, failure } from '@shared/types/result';
import { NotFoundError } from '@shared/errors';
import { ID } from '@shared/types/common';

interface UpdateAddressDTO {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  isDefault?: boolean;
}

export class UpdateAddressUseCase {
  constructor(private readonly addressRepository: IAddressRepository) {}

  async execute(userId: ID, addressId: ID, dto: UpdateAddressDTO): AsyncResult<void> {
    const address = await this.addressRepository.findById(addressId);
    if (!address) {
      return failure(new NotFoundError('Address', addressId));
    }

    // Verify address belongs to user
    const addressProps = (address as any).props;
    if (addressProps.userId !== userId) {
      return failure(new NotFoundError('Address', addressId));
    }

    // Update properties
    if (dto.street) {addressProps.street = dto.street;}
    if (dto.city) {addressProps.city = dto.city;}
    if (dto.state) {addressProps.state = dto.state;}
    if (dto.postalCode) {addressProps.postalCode = dto.postalCode;}
    if (dto.country) {addressProps.country = dto.country;}
    if (dto.isDefault !== undefined) {addressProps.isDefault = dto.isDefault;}

    const updateResult = await this.addressRepository.update(address);
    if (!updateResult.success) {
      return failure(updateResult.error);
    }

    return success(undefined);
  }
}
