import { CreateAddressUseCase } from '../use-cases/address/create-address.use-case';
import { ListAddressesUseCase } from '../use-cases/address/list-addresses.use-case';
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

  constructor(addressRepository: IAddressRepository) {
    this.createAddressUseCase = new CreateAddressUseCase(addressRepository);
    this.listAddressesUseCase = new ListAddressesUseCase(addressRepository);
  }

  async createAddress(userId: ID, dto: AddressRequestDTO): AsyncResult<AddressResponseDTO> {
    return this.createAddressUseCase.execute(userId, dto);
  }

  async listAddresses(userId: ID): AsyncResult<ListAddressesResponseDTO> {
    return this.listAddressesUseCase.execute(userId);
  }
}
