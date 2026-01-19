/**
 * Unique identifier type (MongoDB ObjectId as string)
 */
export type ID = string;

/**
 * Timestamp type
 */
export type Timestamp = Date;

/**
 * ISO 8601 date string
 */
export type ISODateString = string;

/**
 * Email address (will be validated at runtime)
 */
export type Email = string;

/**
 * Currency codes
 */
export type Currency = 'INR' | 'USD' | 'EUR' | 'GBP';

/**
 * User roles
 */
export enum UserRole {
  USER = 'user',
  SELLER = 'seller',
  ADMIN = 'admin',
}

/**
 * Order status
 */
export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PAID = 'PAID',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  RETURNED = 'RETURNED',
}

/**
 * Payment method
 */
export enum PaymentMethod {
  CARD = 'card',
  CASH_ON_DELIVERY = 'cashondelivery',
  UPI = 'upi',
  NET_BANKING = 'netbanking',
}

/**
 * Notification type
 */
export enum NotificationType {
  ORDER_STATUS = 'order_status',
  PROMOTION = 'promotion',
  OFFER = 'offer',
  INFO = 'info',
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  size: number;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    size: number;
    totalPages: number;
    totalItems: number;
  };
}

/**
 * Sort order
 */
export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}
