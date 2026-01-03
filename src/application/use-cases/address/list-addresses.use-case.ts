import { IAddressRepository } from '@domain/address/repositories/address.repository.interface';
import { ListAddressesResponseDTO, AddressResponseDTO } from '@application/dtos/address/address.dto';
import { AsyncResult, success } from '@shared/types/result';
import { ID } from '@shared/types/common';

/**
 * Use case for listing user's addresses
 */
export class ListAddressesUseCase {
  constructor(private readonly addressRepository: IAddressRepository) {}

  async execute(userId: ID): AsyncResult<ListAddressesResponseDTO> {
    const addresses = await this.addressRepository.findByUserId(userId);

    const addressDTOs: AddressResponseDTO[] = addresses.map((address) => {
      const props = (address as any).props;
      return {
        id: address.id,
        userId: props.userId,
        name: props.name,
        mobileNumber: props.mobileNumber,
        pincode: props.pincode,
        locality: props.locality,
        address: props.address,
        city: props.city,
        state: props.state,
        landmark: props.landmark,
        alternatePhone: props.alternatePhone,
        addressType: props.addressType,
        default: props.default,
        createdAt: props.createdAt.toISOString(),
        updatedAt: props.updatedAt.toISOString(),
      };
    });

    return success({
      addresses: addressDTOs,
      total: addressDTOs.length,
    });
  }
}
