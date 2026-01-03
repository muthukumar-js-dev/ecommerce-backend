import mongoose from 'mongoose';
import { IWishlistRepository } from '@domain/wishlist/repositories/wishlist.repository.interface';
import { Wishlist, WishlistProps } from '@domain/wishlist/entities/wishlist.entity';
import { WishlistModel, IWishlistDocument } from '../schemas/wishlist.schema';
import { ID } from '@shared/types/common';
import { Result, success, failure } from '@shared/types/result';
import { DatabaseError, NotFoundError } from '@shared/errors';

export class WishlistRepository implements IWishlistRepository {
  async findById(id: ID): Promise<Wishlist | null> {
    try {
      const doc = await WishlistModel.findById(id).exec();
      if (doc === null) {
        return null;
      }
      return this.toDomain(doc);
    } catch (error) {
      throw new DatabaseError('Failed to find wishlist by ID', 'WISHLIST_FIND_BY_ID_ERROR', error as Error);
    }
  }

  async findByUserId(userId: ID): Promise<Wishlist[]> {
    try {
      const docs = await WishlistModel.find({ userId }).exec();
      return docs.map((doc) => this.toDomain(doc));
    } catch (error) {
      throw new DatabaseError('Failed to find wishlists by user ID', 'WISHLIST_FIND_BY_USER_ERROR', error as Error);
    }
  }

  async save(wishlist: Wishlist): Promise<Result<Wishlist>> {
    try {
      const doc = new WishlistModel(this.toPersistence(wishlist));
      const saved = await doc.save();
      return success(this.toDomain(saved));
    } catch (error) {
      return failure(new DatabaseError('Failed to save wishlist', 'WISHLIST_SAVE_ERROR', error as Error));
    }
  }

  async update(wishlist: Wishlist): Promise<Result<Wishlist>> {
    try {
      const doc = await WishlistModel.findByIdAndUpdate(wishlist.id, this.toPersistence(wishlist), {
        new: true,
        runValidators: true,
      }).exec();

      if (doc === null) {
        return failure(new NotFoundError('Wishlist', wishlist.id));
      }

      return success(this.toDomain(doc));
    } catch (error) {
      return failure(new DatabaseError('Failed to update wishlist', 'WISHLIST_UPDATE_ERROR', error as Error));
    }
  }

  async delete(id: ID): Promise<Result<void>> {
    try {
      const result = await WishlistModel.findByIdAndDelete(id).exec();
      if (result === null) {
        return failure(new NotFoundError('Wishlist', id));
      }
      return success(undefined);
    } catch (error) {
      return failure(new DatabaseError('Failed to delete wishlist', 'WISHLIST_DELETE_ERROR', error as Error));
    }
  }

  private toDomain(doc: IWishlistDocument): Wishlist {
    return Wishlist.create(
      {
        userId: doc.userId.toString(),
        name: doc.name,
        productIds: doc.productIds.map((id) => id.toString()),
        status: doc.status,
      },
      doc._id.toString()
    );
  }

  private toPersistence(wishlist: Wishlist): Partial<IWishlistDocument> {
    const props = (wishlist as unknown as { props: WishlistProps }).props;
    return {
      _id: wishlist.id as unknown as mongoose.Types.ObjectId,
      userId: props.userId as unknown as mongoose.Types.ObjectId,
      name: props.name,
      productIds: props.productIds.map((id) => id as unknown as mongoose.Types.ObjectId),
      status: props.status,
    };
  }
}
