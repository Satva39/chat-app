import { apiRequest } from "./api";

export interface Notification {
    id: string;
    user_id: string;
    type: string;
    title: string;
    content: string | null;
    room_id: string | null;
    message_id: string | null;
    is_read: boolean;
    created_at: string;
}

interface NotificationsResponse {
    notifications: Notification[];
    unreadCount: number;
}

export async function getNotifications(): Promise<NotificationsResponse> {
    return apiRequest<NotificationsResponse>(
        "/api/notifications"
    );
}

export async function markNotificationAsRead(
    notificationId: string
): Promise<void> {
    await apiRequest(
        `/api/notifications/${notificationId}/read`,
        {
            method: "PATCH",
        }
    );
}

export async function markAllNotificationsAsRead(): Promise<void> {
    await apiRequest(
        "/api/notifications/read-all",
        {
            method: "PATCH",
        }
    );
}