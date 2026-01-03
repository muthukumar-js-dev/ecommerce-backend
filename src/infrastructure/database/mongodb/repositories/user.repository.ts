// import mongoose from 'mongoose'; // Removed unused import to fix TS6133
import { IUserRepository } from '@domain/user/repositories/user.repository.interface';
import { User, UserProps } from '@domain/user/entities/user.entity';
import { UserModel, IUserDocument } from '../schemas/user.schema';
import { ID, Email } from '@shared/types/common';
import { Result, success, failure } from '@shared/types/result';
import { DatabaseError, NotFoundError } from '@shared/errors';

/**
 * MongoDB implementation of User repository
 * Handles data persistence and retrieval for User entities
 */
export class UserRepository implements IUserRepository {
  async findById(id: ID): Promise<User | null> {
    try {
      const doc = await UserModel.findById(id).exec();
      if (doc === null) {
        return null;
      }
      return this.toDomain(doc);
    } catch (error) {
      throw new DatabaseError(
        'Failed to find user by ID',
        'USER_FIND_BY_ID_ERROR',
        error as Error
      );
    }
  }

  async findByEmail(email: Email): Promise<User | null> {
    try {
      const doc = await UserModel.findOne({ email }).exec();
      if (doc === null) {
        return null;
      }
      return this.toDomain(doc);
    } catch (error) {
      throw new DatabaseError(
        'Failed to find user by email',
        'USER_FIND_BY_EMAIL_ERROR',
        error as Error
      );
    }
  }

  async findByStripeCustomerId(stripeCustomerId: string): Promise<User | null> {
    try {
      const doc = await UserModel.findOne({ stripeCustomerId }).exec();
      if (doc === null) {
        return null;
      }
      return this.toDomain(doc);
    } catch (error) {
      throw new DatabaseError(
        'Failed to find user by Stripe customer ID',
        'USER_FIND_BY_STRIPE_ID_ERROR',
        error as Error
      );
    }
  }

  async save(user: User): Promise<Result<User>> {
    try {
      const doc = new UserModel(this.toPersistence(user));
      const saved = await doc.save();
      return success(this.toDomain(saved));
    } catch (error: unknown) {
      const util = require('util');
      process.stdout.write('REPO ERROR: ' + util.format(error) + '\n');
      const err = error as { code?: number };
      if (err.code === 11000) {
        return failure(
          new DatabaseError('Email already exists', 'USER_DUPLICATE_EMAIL', error as Error)
        );
      }
      return failure(
        new DatabaseError('Failed to save user', 'USER_SAVE_ERROR', error as Error)
      );
    }
  }

  async update(user: User): Promise<Result<User>> {
    try {
      const doc = await UserModel.findByIdAndUpdate(
        user.id,
        this.toPersistence(user),
        { new: true, runValidators: true }
      ).exec();

      if (doc === null) {
        return failure(new NotFoundError('User', user.id));
      }

      return success(this.toDomain(doc));
    } catch (error) {
      return failure(
        new DatabaseError('Failed to update user', 'USER_UPDATE_ERROR', error as Error)
      );
    }
  }

  async delete(id: ID): Promise<Result<void>> {
    try {
      const result = await UserModel.findByIdAndDelete(id).exec();
      if (result === null) {
        return failure(new NotFoundError('User', id));
      }
      return success(undefined);
    } catch (error) {
      return failure(
        new DatabaseError('Failed to delete user', 'USER_DELETE_ERROR', error as Error)
      );
    }
  }

  async exists(email: Email): Promise<boolean> {
    try {
      const count = await UserModel.countDocuments({ email }).exec();
      return count > 0;
    } catch (error) {
      throw new DatabaseError(
        'Failed to check user existence',
        'USER_EXISTS_ERROR',
        error as Error
      );
    }
  }

  async count(): Promise<number> {
    try {
      return await UserModel.countDocuments().exec();
    } catch (error) {
      throw new DatabaseError(
        'Failed to count users',
        'USER_COUNT_ERROR',
        error as Error
      );
    }
  }

  async findAll(skip = 0, limit = 100): Promise<User[]> {
    try {
      const docs = await UserModel.find().skip(skip).limit(limit).exec();
      return docs.map((doc) => this.toDomain(doc));
    } catch (error) {
      throw new DatabaseError(
        'Failed to find all users',
        'USER_FIND_ALL_ERROR',
        error as Error
      );
    }
  }

  /**
   * Map Mongoose document to domain entity
   * @param doc - Mongoose document
   * @returns User domain entity
   */
  private toDomain(doc: IUserDocument): User {
    return User.create(
      {
        name: doc.name,
        email: doc.email,
        passwordHash: doc.password,
        role: doc.userRole,
        token: doc.token,
        lastLogin: doc.lastLogin,
        currentOrder: doc.currentOrder,
        returnedCount: doc.returnedCount,
        stripeCustomerId: doc.stripeCustomerId,
        shopName: doc.shopName,
        shopMobileNumber: doc.shopMobileNumber,
        shopAddress: doc.shopAddress,
      },
      doc._id.toString()
    );
  }

  /**
   * Map domain entity to Mongoose document
   * @param user - User domain entity
   * @returns Mongoose document data
   */
  private toPersistence(user: User): Partial<IUserDocument> {
    const props = (user as unknown as { props: UserProps }).props;
    return {
      _id: user.id,
      name: props.name,
      email: props.email,
      password: props.passwordHash,
      userRole: props.role,
      token: props.token,
      lastLogin: props.lastLogin,
      currentOrder: props.currentOrder,
      returnedCount: props.returnedCount,
      stripeCustomerId: props.stripeCustomerId,
      shopName: props.shopName,
      shopMobileNumber: props.shopMobileNumber,
      shopAddress: props.shopAddress,
    };
  }
}
