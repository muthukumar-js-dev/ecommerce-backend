/**
 * Request DTO for creating a product
 */
export interface CreateProductRequestDTO {
  pid: string;
  title: string;
  category: string;
  actualPrice: number;
  sellingPrice: number;
  brand: string;
  description: string;
  images: string[];
  productDetails: Array<{ key: string; value: string }>;
  sellerId: string;
  subCategory?: string;
  stripeId?: string;
  url?: string;
}

/**
 * Request DTO for updating a product
 */
export interface UpdateProductRequestDTO {
  title?: string;
  actualPrice?: number;
  sellingPrice?: number;
  description?: string;
  images?: string[];
  productDetails?: Array<{ key: string; value: string }>;
  subCategory?: string;
  outOfStock?: boolean;
}

/**
 * Response DTO for product
 */
export interface ProductResponseDTO {
  id: string;
  pid: string;
  title: string;
  category: string;
  actualPrice: number;
  sellingPrice: number;
  discount: number;
  brand: string;
  description: string;
  outOfStock: boolean;
  images: string[];
  productDetails: Array<{ key: string; value: string }>;
  averageRating: number;
  sellerId: string;
  subCategory?: string;
  stripeId?: string;
  url?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Response DTO for product list
 */
export interface ListProductsResponseDTO {
  products: ProductResponseDTO[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
