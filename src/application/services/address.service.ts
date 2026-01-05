import { CreateAddressUseCase } from '../use-cases/address/create-address.use-case';
import { ListAddressesUseCase } from '../use-cases/address/list-addresses.use-case';
import { UpdateAddressUseCase } from '../use-cases/address/update-address.use-case';
import { DeleteAddressUseCase } from '../use-cases/address/delete-address.use-case';
import { IAddressRepository } from '@domain/address/repositories/address.repository.interface';
import {
  AddressRequestDTO,
  AddressResponseDTO,
  ListAddressesResponseDTO,
} from '../dtos/address/address.dto';
import { AsyncResult } from '@shared/types/result';
import { ID } from '@shared/types/common';

/**
 * Application service for Address domain
 */
export class AddressService {
  private createAddressUseCase: CreateAddressUseCase;
  private listAddressesUseCase: ListAddressesUseCase;
  private updateAddressUseCase: UpdateAddressUseCase;
  private deleteAddressUseCase: DeleteAddressUseCase;

  constructor(addressRepository: IAddressRepository) {
    this.createAddressUseCase = new CreateAddressUseCase(addressRepository);
    this.listAddressesUseCase = new ListAddressesUseCase(addressRepository);
    this.updateAddressUseCase = new UpdateAddressUseCase(addressRepository);
    this.deleteAddressUseCase = new DeleteAddressUseCase(addressRepository);
  }

  async createAddress(userId: ID, dto: AddressRequestDTO): AsyncResult<AddressResponseDTO> {
    return this.createAddressUseCase.execute(userId, dto);
  }

  async listAddresses(userId: ID): AsyncResult<ListAddressesResponseDTO> {
    return this.listAddressesUseCase.execute(userId);
  }

  async updateAddress(userId: ID, addressId: ID, dto: Partial<AddressRequestDTO>): AsyncResult<void> {
    return this.updateAddressUseCase.execute(userId, addressId, dto);
  }

  async deleteAddress(userId: ID, addressId: ID): AsyncResult<void> {
    return this.deleteAddressUseCase.execute(userId, addressId);
  }
}
