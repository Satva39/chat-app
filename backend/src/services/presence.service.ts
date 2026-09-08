import { redis } from "../config/redis.js";

const ONLINE_USERS_KEY = "chat:online-users";

function userSocketsKey(userId: string) {
    return `chat:user:${userId}:sockets`;
}

export async function addUserSocket(
    userId: string,
    socketId: string
): Promise<boolean> {
    const key = userSocketsKey(userId);

    const existingConnections = await redis.sCard(key);

    await redis.sAdd(key, socketId);

    await redis.sAdd(
        ONLINE_USERS_KEY,
        userId
    );

    return existingConnections === 0;
}

export async function removeUserSocket(
    userId: string,
    socketId: string
): Promise<boolean> {
    const key = userSocketsKey(userId);

    await redis.sRem(key, socketId);

    const remainingConnections =
        await redis.sCard(key);

    if (remainingConnections === 0) {
        await redis.sRem(
            ONLINE_USERS_KEY,
            userId
        );

        await redis.del(key);

        return true;
    }

    return false;
}

export async function isUserOnline(
    userId: string
): Promise<boolean> {
    const result = await redis.sIsMember(
        ONLINE_USERS_KEY,
        userId
    );

    return result === 1;
}

export async function getOnlineUserIds(): Promise<string[]> {
    return redis.sMembers(
        ONLINE_USERS_KEY
    );
}

export async function clearPresenceForDevelopment() {
    if (process.env.NODE_ENV === "production") {
        return;
    }

    await redis.del(ONLINE_USERS_KEY);

    const keys: string[] = [];

    for await (const keyBatch of redis.scanIterator({
        MATCH: "chat:user:*:sockets",
        COUNT: 100,
    })) {
        keys.push(
            ...(Array.isArray(keyBatch)
                ? keyBatch
                : [keyBatch])
        );
    }

    for (const key of keys) {
        await redis.del(key);
    }

    console.log("Development presence cleared");
}