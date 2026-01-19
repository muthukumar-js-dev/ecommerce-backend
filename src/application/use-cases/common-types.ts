/**
 * Common type definitions for use cases
 * These interfaces represent the shape of data from domain entities
 */

export interface CartItemData {
    productId: string;
    quantity: number;
    later?: boolean;
}

export interface OrderItemData {
    productId: string;
    quantity: number;
    status?: string;
    orderedDate?: Date;
    deliveredDate?: Date;
    deliveryDate?: Date;
    cancelOrder?: boolean;
    cancelStatus?: string;
    returnProduct?: boolean;
    returnOption?: string;
    returnStatus?: string;
}

export interface ProductData {
    id: string;
    title: string;
    price: number;
    category?: string;
    [key: string]: unknown;
}

export interface OrderData {
    id: string;
    userId: string;
    items: OrderItemData[];
    paymentMethod?: string;
    itemCount: number;
    totalQuantity: number;
    createdAt: Date;
    updatedAt: Date;
    [key: string]: unknown;
}
