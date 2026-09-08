import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";

import {
    getMessages,
    getMessagesPage,
    searchMessages,
} from "../services/message.service.js";

import {
    isRoomMember,
} from "../services/room.service.js";

const router = Router();

router.get(
    "/rooms/:roomId/messages",
    requireAuth,
    async (req, res) => {
        try {
            const roomId = Array.isArray(req.params.roomId)
                ? req.params.roomId[0]
                : req.params.roomId;

            if (!roomId) {
                res.status(400).json({
                    message: "Room ID is required",
                });
                return;
            }

            const limit =
                typeof req.query.limit === "string"
                    ? Number(req.query.limit)
                    : 50;

            const beforeCreatedAt =
                typeof req.query.beforeCreatedAt === "string"
                    ? req.query.beforeCreatedAt
                    : undefined;

            const beforeId =
                typeof req.query.beforeId === "string"
                    ? req.query.beforeId
                    : undefined;

            const page = await getMessagesPage(
                roomId,
                Number.isFinite(limit) ? limit : 50,
                beforeCreatedAt,
                beforeId
            );

            res.json(page);
        } catch (error) {
            console.error("Failed to load messages:", error);

            res.status(500).json({
                message: "Failed to load messages",
            });
        }
    }
);

router.get(
    "/rooms/:roomId/messages/search",
    requireAuth,
    async (req, res) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    message: "Authentication required",
                });
            }

            const roomId = Array.isArray(
                req.params.roomId
            )
                ? req.params.roomId[0]
                : req.params.roomId;

            const query =
                typeof req.query.q === "string"
                    ? req.query.q.trim()
                    : "";

            if (!roomId) {
                return res.status(400).json({
                    message: "Room ID is required",
                });
            }

            if (!query) {
                return res.json({
                    messages: [],
                });
            }

            if (query.length > 500) {
                return res.status(400).json({
                    message: "Search query is too long",
                });
            }

            const member =
                await isRoomMember(
                    roomId,
                    req.user.id
                );

            if (!member) {
                return res.status(403).json({
                    message:
                        "You are not a member of this room",
                });
            }

            const messages =
                await searchMessages(
                    roomId,
                    query
                );

            return res.json({
                messages,
            });
        } catch (error) {
            console.error(
                "Failed to search messages:",
                error
            );

            return res.status(500).json({
                message:
                    "Failed to search messages",
            });
        }
    }
);

export default router;