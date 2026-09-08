import { redis } from "../config/redis.js";

const DEFAULT_TTL_SECONDS = 60;

export async function getCache<T>(
    key: string
): Promise<T | null> {
    if (!redis.isReady) {
        return null;
    }

    try {
        const value = await redis.get(key);

        if (!value) {
            return null;
        }

        return JSON.parse(value) as T;
    } catch (error) {
        console.error(
            `Cache read failed for ${key}:`,
            error
        );

        return null;
    }
}

export async function setCache<T>(
    key: string,
    value: T,
    ttlSeconds = DEFAULT_TTL_SECONDS
): Promise<void> {
    if (!redis.isReady) {
        return;
    }

    try {
        await redis.set(
            key,
            JSON.stringify(value),
            {
                EX: ttlSeconds,
            }
        );
    } catch (error) {
        console.error(
            `Cache write failed for ${key}:`,
            error
        );
    }
}

export async function deleteCache(
    key: string
): Promise<void> {
    if (!redis.isReady) {
        return;
    }

    try {
        await redis.del(key);
    } catch (error) {
        console.error(
            `Cache delete failed for ${key}:`,
            error
        );
    }
}