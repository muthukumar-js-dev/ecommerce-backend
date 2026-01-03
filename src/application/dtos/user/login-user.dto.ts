/**
 * Request DTO for user login
 */
export interface LoginUserRequestDTO {
  email: string;
  password: string;
}

/**
 * Response DTO for user login
 */
export interface LoginUserResponseDTO {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  token: string;
  expiresIn: string;
}
