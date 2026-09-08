import type {
    NextFunction,
    Request,
    Response,
} from "express";

interface RateLimitOptions {
    windowMs: number;
    maxRequests: number;
    message?: string;
    keyPrefix?: string;
}

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

const buckets =
    new Map<string, RateLimitEntry>();

let cleanupTimer:
    ReturnType<typeof setInterval> | null = null;

function startCleanupTimer() {
    if (cleanupTimer) {
        return;
    }

    cleanupTimer = setInterval(() => {
        const now = Date.now();

        for (const [
            key,
            entry,
        ] of buckets) {
            if (entry.resetAt <= now) {
                buckets.delete(key);
            }
        }
    }, 60_000);

    cleanupTimer.unref();
}

function getClientKey(
    req: Request,
    keyPrefix: string
): string {
    const forwardedFor =
        req.headers["x-forwarded-for"];

    const forwardedIp =
        typeof forwardedFor === "string"
            ? forwardedFor
                .split(",")[0]
                ?.trim()
            : null;

    const ip =
        forwardedIp ||
        req.ip ||
        req.socket.remoteAddress ||
        "unknown";

    return `${keyPrefix}:${ip}`;
}

export function createRateLimit(
    options: RateLimitOptions
) {
    const {
        windowMs,
        maxRequests,
        message =
        "Too many requests. Please try again later.",
        keyPrefix = "api",
    } = options;

    startCleanupTimer();

    return (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        const key =
            getClientKey(
                req,
                keyPrefix
            );

        const now = Date.now();

        let entry =
            buckets.get(key);

        if (
            !entry ||
            entry.resetAt <= now
        ) {
            entry = {
                count: 0,
                resetAt:
                    now + windowMs,
            };

            buckets.set(
                key,
                entry
            );
        }

        entry.count += 1;

        const remaining =
            Math.max(
                maxRequests -
                entry.count,
                0
            );

        const retryAfterSeconds =
            Math.ceil(
                (entry.resetAt - now) /
                1000
            );

        res.setHeader(
            "X-RateLimit-Limit",
            String(maxRequests)
        );

        res.setHeader(
            "X-RateLimit-Remaining",
            String(remaining)
        );

        res.setHeader(
            "X-RateLimit-Reset",
            String(
                Math.ceil(
                    entry.resetAt /
                    1000
                )
            )
        );

        if (
            entry.count >
            maxRequests
        ) {
            res.setHeader(
                "Retry-After",
                String(
                    retryAfterSeconds
                )
            );

            res.status(429).json({
                message,
            });

            return;
        }

        next();
    };
}