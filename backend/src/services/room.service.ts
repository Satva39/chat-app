import { sql } from "../config/database.js";

import {
    getCache,
    setCache,
    deleteCache,
} from "./cache.service.js";

export interface Room {
    id: string;
    name: string;
    description: string | null;
    is_private: boolean;
    created_by: string | null;
    created_at: string;
    room_type: "direct" | "group";
}

export async function getUserRooms(
    userId: string
): Promise<Room[]> {
    const cacheKey =
        `user-rooms:${userId}`;

    const cached =
        await getCache<Room[]>(
            cacheKey
        );

    if (cached !== null) {
        return cached;
    }

    const result = await sql`
        SELECT
            r.id,
            CASE
                WHEN r.room_type = 'direct'
                THEN COALESCE(
                    other_user.username,
                    'Direct Chat'
                )
                ELSE r.name
            END AS name,
            r.description,
            r.is_private,
            r.created_by,
            r.created_at,
            r.room_type
        FROM rooms r
        INNER JOIN room_members rm
            ON rm.room_id = r.id
        LEFT JOIN room_members other_rm
            ON other_rm.room_id = r.id
            AND other_rm.user_id <> ${userId}
        LEFT JOIN users other_user
            ON other_user.id = other_rm.user_id
        WHERE rm.user_id = ${userId}
        ORDER BY r.created_at DESC
    `;

    const rooms = result as Room[];

    await setCache(
        cacheKey,
        rooms,
        30
    );

    return rooms;
}

export async function createRoom(
    name: string,
    userId: string,
    isPrivate = false,
    description: string | null = null
): Promise<Room> {
    const result = await sql`
        INSERT INTO rooms (
            name,
            description,
            is_private,
            created_by,
            room_type
        )
        VALUES (
            ${name},
            ${description},
            ${isPrivate},
            ${userId},
            'group'
        )
        RETURNING
            id,
            name,
            description,
            is_private,
            created_by,
            created_at,
            room_type
    `;

    const room = result[0] as Room;

    await sql`
        INSERT INTO room_members (
            room_id,
            user_id
        )
        VALUES (
            ${room.id},
            ${userId}
        )
    `;

    await Promise.all([
        deleteCache(
            `room-member:${room.id}:${userId}`
        ),
        deleteCache(
            `room-members:${room.id}`
        ),
        deleteCache(
            `user-rooms:${userId}`
        ),
    ]);

    return room;
}

export async function addRoomMember(
    roomId: string,
    userId: string
): Promise<void> {
    await sql`
        INSERT INTO room_members (
            room_id,
            user_id
        )
        VALUES (
            ${roomId},
            ${userId}
        )
        ON CONFLICT (room_id, user_id)
        DO NOTHING
    `;

    await Promise.all([
        deleteCache(
            `room-member:${roomId}:${userId}`
        ),
        deleteCache(
            `room-members:${roomId}`
        ),
        deleteCache(
            `user-rooms:${userId}`
        ),
    ]);
}

export async function isRoomMember(
    roomId: string,
    userId: string
): Promise<boolean> {
    const cacheKey =
        `room-member:${roomId}:${userId}`;

    const cached =
        await getCache<boolean>(
            cacheKey
        );

    if (cached !== null) {
        return cached;
    }

    const result = await sql`
        SELECT 1
        FROM room_members
        WHERE room_id = ${roomId}
          AND user_id = ${userId}
        LIMIT 1
    `;

    const isMember =
        result.length > 0;

    await setCache(
        cacheKey,
        isMember,
        60
    );

    return isMember;
}

export interface RoomMember {
    id: string;
    username: string;
    avatar_url: string | null;
}

export async function getRoomMembers(
    roomId: string
): Promise<RoomMember[]> {
    const cacheKey =
        `room-members:${roomId}`;

    const cached =
        await getCache<RoomMember[]>(
            cacheKey
        );

    if (cached !== null) {
        return cached;
    }

    const result = await sql`
        SELECT
            u.id,
            u.username,
            u.avatar_url
        FROM room_members rm
        INNER JOIN users u
            ON u.id = rm.user_id
        WHERE rm.room_id = ${roomId}
        ORDER BY u.username ASC
    `;

    const members =
        result as RoomMember[];

    await setCache(
        cacheKey,
        members,
        60
    );

    return members;
}

function createDirectKey(
    userA: string,
    userB: string
): string {
    return [userA, userB]
        .sort()
        .join(":");
}

export async function getOrCreateDirectRoom(
    currentUserId: string,
    otherUserId: string
): Promise<Room> {
    if (currentUserId === otherUserId) {
        throw new Error(
            "Cannot create direct room with yourself"
        );
    }

    const directKey = createDirectKey(
        currentUserId,
        otherUserId
    );

    const existing = await sql`
        SELECT
            id,
            name,
            description,
            is_private,
            created_by,
            created_at,
            room_type
        FROM rooms
        WHERE room_type = 'direct'
          AND direct_key = ${directKey}
        LIMIT 1
    `;

    if (existing.length > 0) {
        const room = existing[0] as Room;

        await sql`
            INSERT INTO room_members (
                room_id,
                user_id
            )
            VALUES
                (${room.id}, ${currentUserId}),
                (${room.id}, ${otherUserId})
            ON CONFLICT (
                room_id,
                user_id
            )
            DO NOTHING
        `;

        return room;
    }

    const result = await sql`
        INSERT INTO rooms (
            name,
            description,
            is_private,
            created_by,
            room_type,
            direct_key
        )
        VALUES (
            '',
            NULL,
            TRUE,
            ${currentUserId},
            'direct',
            ${directKey}
        )
        ON CONFLICT (direct_key)
        WHERE room_type = 'direct'
        DO UPDATE SET
            updated_at = CURRENT_TIMESTAMP
        RETURNING
            id,
            name,
            description,
            is_private,
            created_by,
            created_at,
            room_type
    `;

    const room = result[0] as Room;

    await sql`
        INSERT INTO room_members (
            room_id,
            user_id
        )
        VALUES
            (${room.id}, ${currentUserId}),
            (${room.id}, ${otherUserId})
        ON CONFLICT (
            room_id,
            user_id
        )
        DO NOTHING
    `;

    return room;
}