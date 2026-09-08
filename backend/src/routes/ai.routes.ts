import { Router } from "express";

import { requireAuth } from "../middleware/auth.middleware.js";

import {
    pingAIService,
    askAI,
    summarizeMessages,
    smartSearchMessages,
    checkSpam,
    checkToxicity,
    moderateMessage,
    generateSmartReplies,
} from "../services/ai.service.js";

import {
    getMessages,
    getSearchCandidates,
} from "../services/message.service.js";

import {
    isRoomMember,
} from "../services/room.service.js";

const router = Router();


router.get(
    "/ai/health",
    requireAuth,
    async (_req, res) => {
        try {
            const result =
                await pingAIService();

            res.json({
                status: "ok",
                node: "chat-app-backend",
                ai: result,
            });
        } catch (error) {
            console.error(
                "AI service health check failed:",
                error
            );

            res.status(502).json({
                message:
                    "AI service unavailable",
            });
        }
    }
);

router.post(
    "/ai/chat",
    requireAuth,
    async (req, res) => {
        try {
            const message =
                typeof req.body.message ===
                    "string"
                    ? req.body.message
                    : "";

            if (!message.trim()) {
                res.status(400).json({
                    message:
                        "Message is required",
                });

                return;
            }

            if (message.length > 4000) {
                res.status(400).json({
                    message:
                        "Message is too long",
                });

                return;
            }

            const result =
                await askAI(message);

            res.json({
                response:
                    result.response,
                model:
                    result.model,
            });
        } catch (error) {
            console.error(
                "AI chat request failed:",
                error
            );

            res.status(502).json({
                message:
                    "AI service unavailable",
            });
        }
    }
);

router.post(
    "/ai/summarize",
    requireAuth,
    async (req, res) => {
        try {
            const { roomId } = req.body;

            if (!roomId || typeof roomId !== "string") {
                return res.status(400).json({
                    message: "Room ID is required",
                });
            }

            const member = await isRoomMember(
                roomId,
                req.user!.id
            );

            if (!member) {
                return res.status(403).json({
                    message: "You are not a member of this room",
                });
            }

            const messages = await getMessages(
                roomId,
                50
            );

            const result = await summarizeMessages(
                messages.map(
                    (message) => message.content
                )
            );

            return res.json(result);
        } catch (error) {
            console.error(
                "AI summarize error:",
                error
            );

            return res.status(502).json({
                message:
                    error instanceof Error
                        ? error.message
                        : "Failed to summarize chat",
            });
        }
    }
);

router.post(
    "/ai/search",
    requireAuth,
    async (req, res) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    message:
                        "Authentication required",
                });
            }

            const roomId =
                typeof req.body.roomId === "string"
                    ? req.body.roomId.trim()
                    : "";

            const query =
                typeof req.body.query === "string"
                    ? req.body.query.trim()
                    : "";

            if (!roomId) {
                return res.status(400).json({
                    message:
                        "Room ID is required",
                });
            }

            if (!query) {
                return res.status(400).json({
                    message:
                        "Search query is required",
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
                await getSearchCandidates(
                    roomId,
                    query,
                    25
                );

            const result =
                await smartSearchMessages(
                    query,
                    messages
                        .filter(
                            (message) =>
                                !message.deleted_at &&
                                message.content.trim()
                        )
                        .map((message) => ({
                            id: message.id,
                            content:
                                message.content,
                        }))
                );

            return res.json(result);
        } catch (error) {
            console.error(
                "AI smart search error:",
                error
            );

            return res.status(502).json({
                message:
                    error instanceof Error
                        ? error.message
                        : "AI smart search failed",
            });
        }
    }
);

router.post(
    "/ai/spam-check",
    requireAuth,
    async (req, res) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    message:
                        "Authentication required",
                });
            }

            const message =
                typeof req.body.message === "string"
                    ? req.body.message.trim()
                    : "";

            if (!message) {
                return res.status(400).json({
                    message:
                        "Message is required",
                });
            }

            if (message.length > 4000) {
                return res.status(400).json({
                    message:
                        "Message is too long",
                });
            }

            const result =
                await checkSpam(message);

            return res.json(result);

        } catch (error) {
            console.error(
                "AI spam detection error:",
                error
            );

            return res.status(502).json({
                message:
                    error instanceof Error
                        ? error.message
                        : "AI spam detection failed",
            });
        }
    }
);

router.post(
    "/ai/toxicity-check",
    requireAuth,
    async (req, res) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    message:
                        "Authentication required",
                });
            }

            const message =
                typeof req.body.message === "string"
                    ? req.body.message.trim()
                    : "";

            if (!message) {
                return res.status(400).json({
                    message:
                        "Message is required",
                });
            }

            if (message.length > 4000) {
                return res.status(400).json({
                    message:
                        "Message is too long",
                });
            }

            const result =
                await checkToxicity(
                    message
                );

            return res.json(result);

        } catch (error) {
            console.error(
                "AI toxicity detection error:",
                error
            );

            return res.status(502).json({
                message:
                    error instanceof Error
                        ? error.message
                        : "AI toxicity detection failed",
            });
        }
    }
);

router.post(
    "/ai/moderate",
    requireAuth,
    async (req, res) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    message:
                        "Authentication required",
                });
            }

            const message =
                typeof req.body.message === "string"
                    ? req.body.message.trim()
                    : "";

            if (!message) {
                return res.status(400).json({
                    message:
                        "Message is required",
                });
            }

            if (message.length > 4000) {
                return res.status(400).json({
                    message:
                        "Message is too long",
                });
            }

            const result =
                await moderateMessage(
                    message
                );

            return res.json(result);

        } catch (error) {
            console.error(
                "AI auto moderation error:",
                error
            );

            return res.status(502).json({
                message:
                    error instanceof Error
                        ? error.message
                        : "Auto moderation failed",
            });
        }
    }
);

router.post(
    "/ai/smart-replies",
    requireAuth,
    async (req, res) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    message:
                        "Authentication required",
                });
            }

            const message =
                typeof req.body.message === "string"
                    ? req.body.message.trim()
                    : "";

            if (!message) {
                return res.status(400).json({
                    message:
                        "Message is required",
                });
            }

            if (message.length > 4000) {
                return res.status(400).json({
                    message:
                        "Message is too long",
                });
            }

            const result =
                await generateSmartReplies(
                    message
                );

            return res.json(result);

        } catch (error) {
            console.error(
                "AI smart replies error:",
                error
            );

            return res.status(502).json({
                message:
                    error instanceof Error
                        ? error.message
                        : "Smart replies failed",
            });
        }
    }
);

export default router;