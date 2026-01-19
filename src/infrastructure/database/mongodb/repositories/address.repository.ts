
import { IAddressRepository } from '@domain/address/repositories/address.repository.interface';
import { Address, AddressProps } from '@domain/address/entities/address.entity';
import { AddressModel, IAddressDocument } from '../schemas/address.schema';
import { ID } from '@shared/types/common';
import { Result, success, failure } from '@shared/types/result';
import { DatabaseError, NotFoundError } from '@shared/errors';

export class AddressRepository implements IAddressRepository {
  async findById(id: ID): Promise<Address | null> {
    try {
      const doc = await AddressModel.findById(id).exec();
      if (doc === null) {
        return null;
      }
      return this.toDomain(doc);
    } catch (error) {
      throw new DatabaseError('Failed to find address by ID', 'ADDRESS_FIND_BY_ID_ERROR', error as Error);
    }
  }

  async findByUserId(userId: ID): Promise<Address[]> {
    try {
      const docs = await AddressModel.find({ userId }).exec();
      return docs.map((doc) => this.toDomain(doc));
    } catch (error) {
      throw new DatabaseError('Failed to find addresses by user ID', 'ADDRESS_FIND_BY_USER_ERROR', error as Error);
    }
  }

  async findDefaultByUserId(userId: ID): Promise<Address | null> {
    try {
      const doc = await AddressModel.findOne({ userId, default: true }).exec();
      if (doc === null) {
        return null;
      }
      return this.toDomain(doc);
    } catch (error) {
      throw new DatabaseError('Failed to find default address', 'ADDRESS_FIND_DEFAULT_ERROR', error as Error);
    }
  }

  async save(address: Address): Promise<Result<Address>> {
    try {
      const doc = new AddressModel(this.toPersistence(address));
      const saved = await doc.save();
      return success(this.toDomain(saved));
    } catch (error) {
      return failure(new DatabaseError('Failed to save address', 'ADDRESS_SAVE_ERROR', error as Error));
    }
  }

  async update(address: Address): Promise<Result<Address>> {
    try {
      const doc = await AddressModel.findByIdAndUpdate(address.id, this.toPersistence(address), {
        new: true,
        runValidators: true,
      }).exec();

      if (doc === null) {
        return failure(new NotFoundError('Address', address.id));
      }

      return success(this.toDomain(doc));
    } catch (error) {
      return failure(new DatabaseError('Failed to update address', 'ADDRESS_UPDATE_ERROR', error as Error));
    }
  }

  async delete(id: ID): Promise<Result<void>> {
    try {
      const result = await AddressModel.findByIdAndDelete(id).exec();
      if (result === null) {
        return failure(new NotFoundError('Address', id));
      }
      return success(undefined);
    } catch (error) {
      return failure(new DatabaseError('Failed to delete address', 'ADDRESS_DELETE_ERROR', error as Error));
    }
  }

  private toDomain(doc: IAddressDocument): Address {
    return Address.create(
      {
        userId: doc.userId.toString(),
        name: doc.name,
        firstLine: doc.firstLine,
        secondLine: doc.secondLine,
        city: doc.city,
        state: doc.state,
        country: doc.country,
        countryCode: doc.countryCode,
        postalCode: doc.postalCode,
        phone: doc.phone,
        phoneCode: doc.phoneCode,
        isDefault: doc.default,
        status: doc.status,
      },
      doc._id.toString()
    );
  }

  private toPersistence(address: Address): Partial<IAddressDocument> {
    const props = (address as unknown as { props: AddressProps }).props;
    return {
      _id: address.id, // Keep as string - Address model uses string IDs
      userId: props.userId, // Keep as string - User model uses string IDs
      name: props.name,
      firstLine: props.firstLine,
      secondLine: props.secondLine,
      city: props.city,
      state: props.state,
      country: props.country,
      countryCode: props.countryCode,
      postalCode: props.postalCode,
      phone: props.phone,
      phoneCode: props.phoneCode,
      default: props.isDefault,
      status: props.status,
    };
  }
}
