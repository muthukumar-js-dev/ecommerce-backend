import { OrderStatus, PaymentMethod } from '@shared/types/common';

/**
 * Order item DTO
 */
export interface OrderItemDTO {
  productId: string;
  quantity: number;
  status: OrderStatus;
  orderedDate: string;
  deliveredDate?: string;
  deliveryDate?: string;
  cancelOrder: boolean;
  cancelStatus?: string;
  returnProduct: boolean;
  returnOption?: string;
  returnStatus?: string;
}

/**
 * Request DTO for placing an order
 */
export interface PlaceOrderRequestDTO {
  paymentMethod: PaymentMethod;
  shippingAddressId: string;
  items: {
    productId: string;
    quantity: number;
    price: number;
  }[];
}

/**
 * Response DTO for order
 */
export interface OrderResponseDTO {
  id: string;
  userId: string;
  items: OrderItemDTO[];
  paymentMethod: PaymentMethod;
  itemCount: number;
  totalQuantity: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Response DTO for order list
 */
export interface ListOrdersResponseDTO {
  orders: OrderResponseDTO[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * Request DTO for updating order status
 */
export interface UpdateOrderStatusRequestDTO {
  productId: string;
  status: OrderStatus;
}

/**
 * Request DTO for canceling order item
 */
export interface CancelOrderItemRequestDTO {
  productId: string;
  reason?: string;
}
