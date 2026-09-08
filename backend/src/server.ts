import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import authRoutes from "./routes/auth.routes.js";
import { requireAuth } from "./middleware/auth.middleware.js";
import { csrfProtection } from "./middleware/csrf.middleware.js";
import { initializeSocket } from "./realtime/socket.js";
import messageRoutes from "./routes/message.routes.js";
import roomRoutes from "./routes/room.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import attachmentRoutes from "./routes/attachment.routes.js";
import {
    connectRedis,
    disconnectRedis,
} from "./config/redis.js";

import {
    stopNotificationWorker,
} from "./services/notification-worker.service.js";
import aiRoutes from "./routes/ai.routes.js";

import {
    clearPresenceForDevelopment,
} from "./services/presence.service.js";

import {
    createRateLimit,
} from "./middleware/rate-limit.middleware.js";

import {
    cleanupMissingAttachments,
} from "./services/attachment-cleanup.service.js";

const app = express();

app.disable("x-powered-by");

app.use((_req, res, next) => {
    res.setHeader(
        "X-Content-Type-Options",
        "nosniff"
    );

    res.setHeader(
        "X-Frame-Options",
        "DENY"
    );

    res.setHeader(
        "Referrer-Policy",
        "strict-origin-when-cross-origin"
    );

    res.setHeader(
        "Permissions-Policy",
        "camera=(), microphone=(), geolocation=()"
    );

    next();
});

const PORT = Number(process.env.PORT) || 5000;
const FRONTEND_URL =
    process.env.FRONTEND_URL ||
    (process.env.NODE_ENV === "production"
        ? ""
        : "http://localhost:5173");

if (
    process.env.NODE_ENV === "production" &&
    !FRONTEND_URL
) {
    throw new Error(
        "FRONTEND_URL is required in production"
    );
}

const apiRateLimit =
    createRateLimit({
        windowMs:
            15 * 60 * 1000,
        maxRequests: 300,
        keyPrefix:
            "api",
        message:
            "Too many requests. Please slow down.",
    });

app.use(
    cors({
        origin: FRONTEND_URL,
        credentials: true
    })
);

app.use(
    express.json({
        limit: "16kb",
    })
);


app.use("/api", csrfProtection);
app.use("/api/auth", authRoutes);
app.use("/api", apiRateLimit, messageRoutes);
app.use("/api", apiRateLimit, roomRoutes);
app.use("/api", apiRateLimit, attachmentRoutes);
app.use("/api", apiRateLimit, notificationRoutes);
app.use("/api", aiRoutes);

app.get("/api/health", (_req, res) => {
    res.json({
        status: "ok",
        service: "chat-app-backend"
    });
});

app.get("/api/protected", requireAuth, (req, res) => {
    res.json({
        message: "You are authenticated",
        user: req.user,
    });
});

const httpServer = createServer(app);

initializeSocket(httpServer);

async function startServer() {
    await connectRedis();

    if (process.env.NODE_ENV !== "production") {
        await clearPresenceForDevelopment();
    }

    await cleanupMissingAttachments();

    httpServer.listen(PORT, () => {
        console.log(`Backend running on port ${PORT}`);
    });
}

startServer().catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
});

async function gracefulShutdown(
    signal: string
) {
    console.log(
        `${signal} received. Shutting down...`
    );

    stopNotificationWorker();

    await new Promise<void>(
        (resolve) => {
            httpServer.close(() => {
                resolve();
            });
        }
    );

    await disconnectRedis();

    process.exit(0);
}

process.on(
    "SIGINT",
    () => {
        void gracefulShutdown("SIGINT");
    }
);

process.on(
    "SIGTERM",
    () => {
        void gracefulShutdown("SIGTERM");
    }
);