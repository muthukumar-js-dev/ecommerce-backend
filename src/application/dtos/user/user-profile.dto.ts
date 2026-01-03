import { UserRole } from '@shared/types/common';

/**
 * Response DTO for user profile
 */
export interface UserProfileResponseDTO {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  currentOrder: number;
  returnedCount: number;
  stripeCustomerId?: string;
  shopName?: string;
  shopMobileNumber?: string;
  shopAddress?: string;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}
