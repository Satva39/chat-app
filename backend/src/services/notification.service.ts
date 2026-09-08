import { sql } from "../config/database.js";

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

export async function createNotification(
    userId: string,
    type: string,
    title: string,
    content: string | null = null,
    roomId: string | null = null,
    messageId: string | null = null
): Promise<Notification> {
    const result = await sql`
    INSERT INTO notifications (
        user_id,
        type,
        title,
        content,
        room_id,
        message_id
    )
    VALUES (
        ${userId},
        ${type},
        ${title},
        ${content},
        ${roomId},
        ${messageId}
    )
    ON CONFLICT (
        user_id,
        type,
        message_id
    )
    WHERE message_id IS NOT NULL
    DO NOTHING
    RETURNING
        id,
        user_id,
        type,
        title,
        content,
        room_id,
        message_id,
        is_read,
        created_at
    `;

    if (result.length === 0) {
        const existing = await sql`
        SELECT
            id,
            user_id,
            type,
            title,
            content,
            room_id,
            message_id,
            is_read,
            created_at
        FROM notifications
        WHERE user_id = ${userId}
          AND type = ${type}
          AND message_id = ${messageId}
        LIMIT 1
    `;

        return existing[0] as Notification;
    }

    return result[0] as Notification;
}

export async function getUserNotifications(
    userId: string,
    limit = 50
): Promise<Notification[]> {
    const safeLimit = Math.min(
        Math.max(limit, 1),
        100
    );

    const result = await sql`
        SELECT
            id,
            user_id,
            type,
            title,
            content,
            room_id,
            message_id,
            is_read,
            created_at
        FROM notifications
        WHERE user_id = ${userId}
        ORDER BY created_at DESC, id DESC
        LIMIT ${safeLimit}
    `;

    return result as Notification[];
}

export async function getUnreadNotificationCount(
    userId: string
): Promise<number> {
    const result = await sql`
        SELECT COUNT(*)::int AS count
        FROM notifications
        WHERE user_id = ${userId}
          AND is_read = false
    `;

    return Number(result[0]?.count ?? 0);
}

export async function markNotificationAsRead(
    notificationId: string,
    userId: string
): Promise<void> {
    await sql`
        UPDATE notifications
        SET is_read = true
        WHERE id = ${notificationId}
          AND user_id = ${userId}
    `;
}

export async function markAllNotificationsAsRead(
    userId: string
): Promise<void> {
    await sql`
        UPDATE notifications
        SET is_read = true
        WHERE user_id = ${userId}
          AND is_read = false
    `;
}