import { createClient } from "redis";

const redisUrl =
    process.env.REDIS_URL ||
    "redis://localhost:6379";

export const redis = createClient({
    url: redisUrl,
    socket: {
        reconnectStrategy: (retries) => {
            const delay =
                Math.min(
                    retries * 100,
                    3000
                );

            return delay;
        },
    },
});

redis.on("error", (error) => {
    console.error(
        "Redis Client Error:",
        error
    );
});

redis.on("connect", () => {
    console.log("Redis connecting...");
});

redis.on("ready", () => {
    console.log("Redis ready");
});

redis.on("reconnecting", () => {
    console.log(
        "Redis reconnecting..."
    );
});

redis.on("end", () => {
    console.log(
        "Redis connection closed"
    );
});

export async function connectRedis() {
    if (redis.isReady) {
        return;
    }

    if (redis.isOpen) {
        return;
    }

    await redis.connect();

    console.log("Redis connected");
}

export async function disconnectRedis() {
    if (!redis.isOpen) {
        return;
    }

    await redis.quit();

    console.log("Redis disconnected");
}