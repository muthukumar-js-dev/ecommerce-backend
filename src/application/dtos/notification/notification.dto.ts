/**
 * Request DTO for creating a notification
 */
export interface CreateNotificationRequestDTO {
  userId: string;
  message: string;
  type?: string;
}

/**
 * Response DTO for notification
 */
export interface NotificationResponseDTO {
  id: string;
  userId: string;
  message: string;
  type?: string;
  read: boolean;
  createdAt: string;
}

/**
 * Response DTO for notification list
 */
export interface ListNotificationsResponseDTO {
  notifications: NotificationResponseDTO[];
  total: number;
  unreadCount: number;
}
