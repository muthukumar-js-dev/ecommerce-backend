import { UserRole } from '@shared/types/common';

/**
 * Request DTO for user registration
 */
export interface RegisterUserRequestDTO {
  name: string;
  email: string;
  password: string;
  userRole?: UserRole;
}

/**
 * Response DTO for user registration
 */
export interface RegisterUserResponseDTO {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}
