import { IUserRepository } from '@domain/user/repositories/user.repository.interface';
import { User } from '@domain/user/aggregates/user.aggregate';
import { UserModel, IUserDocument } from '../schemas/user.schema';
import { ID } from '@shared/types/common';
import { Email } from '@domain/user/value-objects/email.vo';
import { Password } from '@domain/user/value-objects/password.vo';
import { PhoneNumber } from '@domain/user/value-objects/phone-number.vo';
import { Result, success, failure } from '@shared/types/result';
import { DatabaseError, NotFoundError } from '@shared/errors';
import { OutboxRepository } from './outbox.repository';
import { KafkaTopic } from '../../../messaging/kafka/topics';
import mongoose from 'mongoose';

/**
 * MongoDB implementation of User repository
 * Handles data persistence and retrieval for User entities
 * Uses Transactional Outbox pattern for reliable event publishing
 */
export class UserRepository implements IUserRepository {
  constructor(private outboxRepository: OutboxRepository) { }
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
      const doc = await UserModel.findOne({ email: email.value }).exec();
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
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Save user to database
      const persistenceData = this.toPersistence(user);
      const doc = new UserModel(persistenceData);
      await doc.save({ session });

      // 2. Save domain events to outbox
      for (const event of user.domainEvents) {
        await this.outboxRepository.save(event, KafkaTopic.USER_EVENTS, session);
      }

      // 3. Commit transaction
      await session.commitTransaction();

      // 4. Clear domain events
      user.clearDomainEvents();

      return success(this.toDomain(doc));
    } catch (error: unknown) {
      await session.abortTransaction();
      const err = error as { code?: number };
      if (err.code === 11000) {
        return failure(
          new DatabaseError('Email already exists', 'USER_DUPLICATE_EMAIL', error as Error)
        );
      }
      return failure(
        new DatabaseError('Failed to save user', 'USER_SAVE_ERROR', error as Error)
      );
    } finally {
      session.endSession();
    }
  }

  async update(user: User): Promise<Result<User>> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Update user in database
      const doc = await UserModel.findByIdAndUpdate(
        user.id,
        this.toPersistence(user),
        { new: true, runValidators: true, session }
      ).exec();

      if (doc === null) {
        await session.abortTransaction();
        return failure(new NotFoundError('User', user.id));
      }

      // 2. Save domain events to outbox
      for (const event of user.domainEvents) {
        await this.outboxRepository.save(event, KafkaTopic.USER_EVENTS, session);
      }

      // 3. Commit transaction
      await session.commitTransaction();

      // 4. Clear domain events
      user.clearDomainEvents();

      return success(this.toDomain(doc));
    } catch (error) {
      await session.abortTransaction();
      return failure(
        new DatabaseError('Failed to update user', 'USER_UPDATE_ERROR', error as Error)
      );
    } finally {
      session.endSession();
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
      const count = await UserModel.countDocuments({ email: email.value }).exec();
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
   */
  private toDomain(doc: IUserDocument): User {
    let phoneNumber: PhoneNumber | undefined;
    if (doc.shopMobileNumber) {
      try {
        // Try parsing, if fails due to missing +, add default +91 for now as migration
        // or just ignore/log.
        if (doc.shopMobileNumber.startsWith('+')) {
          phoneNumber = PhoneNumber.fromString(doc.shopMobileNumber);
        } else {
          phoneNumber = PhoneNumber.create('+91', doc.shopMobileNumber);
        }
      } catch (e) {
        // Log error? For now ignore invalid phone numbers in DB
      }
    }

    // Convert string password to VO (assuming valid hash in DB)
    const password = Password.fromHash(doc.password);

    // Convert string email to VO (assuming valid email in DB)
    // We can assume DB is valid or handle error.
    // Use factory that might throw if DB is invalid?
    // Better to use a "reconstitute" friendly method if validation is strict.
    // For now assuming DB data is valid.
    const email = Email.create(doc.email);

    return User.reconstitute(
      {
        name: doc.name,
        email: email,
        password: password,
        role: doc.userRole,
        // token: doc.token, // Removing token as it's not in Aggregate props
        lastLogin: doc.lastLogin,
        currentOrderCount: doc.currentOrder,
        returnedOrderCount: doc.returnedCount,
        stripeCustomerId: doc.stripeCustomerId,
        shopName: doc.shopName,
        shopAddress: doc.shopAddress,
        phoneNumber: phoneNumber,
        isActive: true, // Default to true as schema doesn't have it
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      },
      doc._id.toString()
    );
  }

  /**
   * Map domain entity to Mongoose document
   */
  private toPersistence(user: User): Partial<IUserDocument> {
    // Access protected props via type assertion or public getters
    // Using simple property access if getters are available for everything

    // We need access to all props, but some are not exposed via getters in full
    // (e.g. passwordHash might needed, but password VO has it)

    // Using "any" trick to access props for persistence mapping if needed
    // or adding public accessors for persistence.
    // User aggregate has public getters for most things.

    return {
      _id: user.id,
      name: user.name,
      email: user.email.value,
      password: user['props']['password'].hash, // Accessing via props or adding getter to Password VO? Password VO has .hash getter!
      userRole: user.role,
      // token: user.token?, // Aggregate doesn't have token
      lastLogin: user['props']['lastLogin'], // Need getter or props access
      currentOrder: user.currentOrderCount,
      returnedCount: user.returnedOrderCount,
      stripeCustomerId: (user as any).props.stripeCustomerId,
      shopName: (user as any).props.shopName,
      shopMobileNumber: (user as any).props.phoneNumber?.toString(),
      shopAddress: (user as any).props.shopAddress,
    };
  }
}
