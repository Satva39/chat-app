import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
    addRoomMember,
    createRoom,
    getRoomMembers,
    getUserRooms,
    isRoomMember,
    getOrCreateDirectRoom,
} from "../services/room.service.js";
import { searchUsers } from "../services/user.service.js";

const router = Router();

router.get(
    "/rooms",
    requireAuth,
    async (req, res) => {
        try {
            if (!req.user) {
                res.status(401).json({
                    message: "Authentication required",
                });

                return;
            }

            const rooms = await getUserRooms(req.user.id);

            res.json({
                rooms,
            });
        } catch (error) {
            console.error(
                "Failed to load rooms:",
                error
            );

            res.status(500).json({
                message: "Failed to load rooms",
            });
        }
    }
);

router.post(
    "/rooms",
    requireAuth,
    async (req, res) => {
        try {
            const name =
                typeof req.body.name === "string"
                    ? req.body.name.trim()
                    : "";

            const description =
                typeof req.body.description === "string"
                    ? req.body.description.trim()
                    : null;

            const isPrivate =
                req.body.isPrivate === true;

            if (!name) {
                res.status(400).json({
                    message: "Room name is required",
                });

                return;
            }

            if (name.length > 100) {
                res.status(400).json({
                    message: "Room name is too long",
                });

                return;
            }

            if (!req.user) {
                res.status(401).json({
                    message: "Authentication required",
                });

                return;
            }

            const room = await createRoom(
                name,
                req.user.id,
                isPrivate,
                description || null
            );

            res.status(201).json({
                room,
            });
        } catch (error) {
            console.error(
                "Failed to create room:",
                error
            );

            res.status(500).json({
                message: "Failed to create room",
            });
        }
    }
);

router.post(
    "/rooms/:roomId/members",
    requireAuth,
    async (req, res) => {
        try {
            if (!req.user) {
                res.status(401).json({
                    message: "Authentication required",
                });

                return;
            }

            const roomId = Array.isArray(req.params.roomId)
                ? req.params.roomId[0]
                : req.params.roomId;

            const userId =
                typeof req.body.userId === "string"
                    ? req.body.userId.trim()
                    : "";

            if (!roomId || !userId) {
                res.status(400).json({
                    message:
                        "Room ID and user ID are required",
                });

                return;
            }

            const requesterMember =
                await isRoomMember(
                    roomId,
                    req.user.id
                );

            if (!requesterMember) {
                res.status(403).json({
                    message:
                        "You are not a member of this room",
                });

                return;
            }

            await addRoomMember(
                roomId,
                userId
            );

            res.status(201).json({
                message: "Member added",
            });
        } catch (error) {
            console.error(
                "Failed to add room member:",
                error
            );

            res.status(500).json({
                message: "Failed to add room member",
            });
        }
    }
);

router.get(
    "/rooms/:roomId/members",
    requireAuth,
    async (req, res) => {
        try {
            if (!req.user) {
                res.status(401).json({
                    message: "Authentication required",
                });

                return;
            }

            const roomId = Array.isArray(
                req.params.roomId
            )
                ? req.params.roomId[0]
                : req.params.roomId;

            if (!roomId) {
                res.status(400).json({
                    message: "Room ID is required",
                });

                return;
            }

            const member =
                await isRoomMember(
                    roomId,
                    req.user.id
                );

            if (!member) {
                res.status(403).json({
                    message:
                        "You are not a member of this room",
                });

                return;
            }

            const members =
                await getRoomMembers(roomId);

            res.json({
                members,
            });
        } catch (error) {
            console.error(
                "Failed to load room members:",
                error
            );

            res.status(500).json({
                message:
                    "Failed to load room members",
            });
        }
    }
);

router.get(
    "/users/search",
    requireAuth,
    async (req, res) => {
        try {
            if (!req.user) {
                res.status(401).json({
                    message: "Authentication required",
                });

                return;
            }

            const query =
                typeof req.query.q === "string"
                    ? req.query.q.trim()
                    : "";

            if (!query) {
                res.json({
                    users: [],
                });

                return;
            }

            const users = await searchUsers(
                req.user.id,
                query
            );

            res.json({
                users,
            });
        } catch (error) {
            console.error(
                "Failed to search users:",
                error
            );

            res.status(500).json({
                message: "Failed to search users",
            });
        }
    }
);

router.post(
    "/rooms/direct",
    requireAuth,
    async (req, res) => {
        try {
            if (!req.user) {
                res.status(401).json({
                    message: "Authentication required",
                });

                return;
            }

            const otherUserId =
                typeof req.body.userId === "string"
                    ? req.body.userId.trim()
                    : "";

            if (!otherUserId) {
                res.status(400).json({
                    message: "User ID is required",
                });

                return;
            }

            const room =
                await getOrCreateDirectRoom(
                    req.user.id,
                    otherUserId
                );

            res.status(201).json({
                room,
            });
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to create direct room";

            res.status(400).json({
                message,
            });
        }
    }
);

export default router;