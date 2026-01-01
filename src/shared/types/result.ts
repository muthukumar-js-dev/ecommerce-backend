/**
 * Success result
 */
export interface Success<T> {
  success: true;
  data: T;
}

/**
 * Failure result
 */
export interface Failure<E = Error> {
  success: false;
  error: E;
}

/**
 * Result type - represents either success or failure
 * Inspired by Rust's Result<T, E> and functional programming patterns
 */
export type Result<T, E = Error> = Success<T> | Failure<E>;

/**
 * Helper to create a success result
 */
export function success<T>(data: T): Success<T> {
  return { success: true, data };
}

/**
 * Helper to create a failure result
 */
export function failure<E = Error>(error: E): Failure<E> {
  return { success: false, error };
}

/**
 * Type guard to check if result is success
 */
export function isSuccess<T, E>(result: Result<T, E>): result is Success<T> {
  return result.success === true;
}

/**
 * Type guard to check if result is failure
 */
export function isFailure<T, E>(result: Result<T, E>): result is Failure<E> {
  return result.success === false;
}

/**
 * Async Result type
 */
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;
