/**
 * Request DTO for creating/updating an address
 */
export interface AddressRequestDTO {
  name: string;
  mobileNumber: string;
  pincode: string;
  locality: string;
  address: string;
  city: string;
  state: string;
  landmark?: string;
  alternatePhone?: string;
  addressType?: string;
}

/**
 * Response DTO for address
 */
export interface AddressResponseDTO {
  id: string;
  userId: string;
  name: string;
  mobileNumber: string;
  pincode: string;
  locality: string;
  address: string;
  city: string;
  state: string;
  landmark?: string;
  alternatePhone?: string;
  addressType?: string;
  default: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Response DTO for address list
 */
export interface ListAddressesResponseDTO {
  addresses: AddressResponseDTO[];
  total: number;
}
