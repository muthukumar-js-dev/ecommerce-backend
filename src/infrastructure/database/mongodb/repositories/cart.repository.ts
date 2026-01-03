// import mongoose from 'mongoose'; // Removed unused import
import { ICartRepository } from '@domain/cart/repositories/cart.repository.interface';
import { Cart, CartProps } from '@domain/cart/entities/cart.entity';
import { CartModel, ICartDocument } from '../schemas/cart.schema';
import { ID } from '@shared/types/common';
import { Result, success, failure } from '@shared/types/result';
import { DatabaseError, NotFoundError } from '@shared/errors';

export class CartRepository implements ICartRepository {
  async findById(id: ID): Promise<Cart | null> {
    try {
      const doc = await CartModel.findById(id).exec();
      if (doc === null) {
        return null;
      }
      return this.toDomain(doc);
    } catch (error) {
      throw new DatabaseError('Failed to find cart by ID', 'CART_FIND_BY_ID_ERROR', error as Error);
    }
  }

  async findByUserId(userId: ID): Promise<Cart | null> {
    try {
      const doc = await CartModel.findOne({ userId }).exec();
      if (doc === null) {
        return null;
      }
      return this.toDomain(doc);
    } catch (error) {
      throw new DatabaseError('Failed to find cart by user ID', 'CART_FIND_BY_USER_ERROR', error as Error);
    }
  }

  async save(cart: Cart): Promise<Result<Cart>> {
    try {
      const doc = new CartModel(this.toPersistence(cart));
      const saved = await doc.save();
      return success(this.toDomain(saved));
    } catch (error: unknown) {
      const err = error as { code?: number };
      if (err.code === 11000) {
        return failure(new DatabaseError('Cart already exists for this user', 'CART_DUPLICATE', error as Error));
      }
      return failure(new DatabaseError('Failed to save cart', 'CART_SAVE_ERROR', error as Error));
    }
  }

  async update(cart: Cart): Promise<Result<Cart>> {
    try {
      const doc = await CartModel.findByIdAndUpdate(cart.id, this.toPersistence(cart), {
        new: true,
        runValidators: true,
      }).exec();

      if (doc === null) {
        return failure(new NotFoundError('Cart', cart.id));
      }

      return success(this.toDomain(doc));
    } catch (error) {
      return failure(new DatabaseError('Failed to update cart', 'CART_UPDATE_ERROR', error as Error));
    }
  }

  async delete(id: ID): Promise<Result<void>> {
    try {
      const result = await CartModel.findByIdAndDelete(id).exec();
      if (result === null) {
        return failure(new NotFoundError('Cart', id));
      }
      return success(undefined);
    } catch (error) {
      return failure(new DatabaseError('Failed to delete cart', 'CART_DELETE_ERROR', error as Error));
    }
  }

  private toDomain(doc: ICartDocument): Cart {
    return Cart.create(
      {
        userId: doc.userId,
        items: doc.items.map((item) => ({
          productId: item.product,
          quantity: item.quantity,
          later: item.later,
        })),
        totalAmount: doc.totalAmount,
        totalActualAmount: doc.totalActualAmount,
        totalDiscount: doc.totalDiscount,
        currency: doc.currency,
      },
      doc._id
    );
  }

  private toPersistence(cart: Cart): Partial<ICartDocument> {
    const props = (cart as unknown as { props: CartProps }).props;
    return {
      _id: cart.id,
      userId: props.userId,
      items: props.items.map((item) => ({
        product: item.productId,
        quantity: item.quantity,
        later: item.later,
      })),
      totalAmount: props.totalAmount,
      totalActualAmount: props.totalActualAmount,
      totalDiscount: props.totalDiscount,
      currency: props.currency,
    };
  }
}
