import { IAddressRepository } from '@domain/address/repositories/address.repository.interface';
import { Address } from '@domain/address/entities/address.entity';
import { AddressRequestDTO, AddressResponseDTO } from '@application/dtos/address/address.dto';
import { AsyncResult, success, failure, Result } from '@shared/types/result';
import { ValidationError } from '@shared/errors';
import { ID } from '@shared/types/common';
import { APP_CONSTANTS } from '@shared/constants';
import { randomUUID } from 'crypto';

/**
 * Use case for creating a new address
 */
export class CreateAddressUseCase {
  constructor(private readonly addressRepository: IAddressRepository) {}

  async execute(userId: ID, dto: AddressRequestDTO): AsyncResult<AddressResponseDTO> {
    // Validate input
    const validationResult = this.validate(dto);
    if (!validationResult.success) {
      return validationResult as any;
    }

    // Create address entity
    const address = Address.create(
      {
        userId,
        name: dto.name,
        firstLine: dto.address,
        secondLine: dto.locality,
        city: dto.city,
        state: dto.state,
        country: 'India',
        postalCode: dto.pincode,
        phone: dto.mobileNumber,
        phoneCode: '+91',
        isDefault: false,
        status: 1,
      },
      randomUUID()
    );

    // Save address
    const saveResult = await this.addressRepository.save(address);
    if (!saveResult.success) {
      return failure(saveResult.error);
    }

    return success(this.toDTO(saveResult.data));
  }

  private validate(dto: AddressRequestDTO): Result<void> {
    const errors: Array<{ field: string; message: string }> = [];

    if (!dto.name || dto.name.trim().length < APP_CONSTANTS.MIN_NAME_LENGTH) {
      errors.push({ field: 'name', message: 'Name is required' });
    }

    if (!dto.mobileNumber || dto.mobileNumber.trim().length < 10) {
      errors.push({ field: 'mobileNumber', message: 'Valid mobile number is required' });
    }

    if (!dto.pincode || dto.pincode.trim().length < 6) {
      errors.push({ field: 'pincode', message: 'Valid pincode is required' });
    }

    if (!dto.address || dto.address.trim().length < 10) {
      errors.push({ field: 'address', message: 'Address must be at least 10 characters' });
    }

    if (!dto.city || dto.city.trim().length === 0) {
      errors.push({ field: 'city', message: 'City is required' });
    }

    if (!dto.state || dto.state.trim().length === 0) {
      errors.push({ field: 'state', message: 'State is required' });
    }

    if (errors.length > 0) {
      return failure(new ValidationError('Validation failed', errors));
    }

    return success(undefined);
  }

  private toDTO(address: Address): AddressResponseDTO {
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
  }
}
