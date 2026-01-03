import { User } from '../entities/user.entity';
import { ID, Email } from '@shared/types/common';
import { Result } from '@shared/types/result';

/**
 * Repository interface for User aggregate
 * Defines all data access operations for User entities
 */
export interface IUserRepository {
  /**
   * Find a user by their unique ID
   * @param id - User ID
   * @returns User entity or null if not found
   */
  findById(id: ID): Promise<User | null>;

  /**
   * Find a user by their email address
   * @param email - User email
   * @returns User entity or null if not found
   */
  findByEmail(email: Email): Promise<User | null>;

  /**
   * Find a user by their Stripe customer ID
   * @param stripeCustomerId - Stripe customer ID
   * @returns User entity or null if not found
   */
  findByStripeCustomerId(stripeCustomerId: string): Promise<User | null>;

  /**
   * Save a new user to the database
   * @param user - User entity to save
   * @returns Result containing the saved user or error
   */
  save(user: User): Promise<Result<User>>;

  /**
   * Update an existing user
   * @param user - User entity with updated data
   * @returns Result containing the updated user or error
   */
  update(user: User): Promise<Result<User>>;

  /**
   * Delete a user by ID
   * @param id - User ID to delete
   * @returns Result indicating success or error
   */
  delete(id: ID): Promise<Result<void>>;

  /**
   * Check if a user exists with the given email
   * @param email - Email to check
   * @returns True if user exists, false otherwise
   */
  exists(email: Email): Promise<boolean>;

  /**
   * Get total count of users
   * @returns Total number of users
   */
  count(): Promise<number>;

  /**
   * Find all users (with optional pagination)
   * @param skip - Number of records to skip
   * @param limit - Maximum number of records to return
   * @returns Array of user entities
   */
  findAll(skip?: number, limit?: number): Promise<User[]>;
}
