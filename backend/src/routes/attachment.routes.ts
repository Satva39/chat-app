import path from "node:path";

import {
    Router,
} from "express";
import multer from "multer";

import {
    requireAuth,
} from "../middleware/auth.middleware.js";

import {
    createMessage,
    createAttachment,
    getAttachmentForDownload,
} from "../services/message.service.js";

import {
    isRoomMember,
} from "../services/room.service.js";

import {
    saveUploadedFile,
    deleteUploadedFile,
    getUploadedFilePath,
} from "../utils/file-storage.js";

import {
    stat,
} from "node:fs/promises";

import crypto from "node:crypto";
import {
    isAllowedFileType,
    getSafeExtension,
} from "../utils/file-security.js";

const router = Router();

const MAX_FILE_SIZE =
    10 * 1024 * 1024;

const allowedMimeTypes =
    new Set([
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "application/pdf",
        "text/plain",
    ]);

const upload =
    multer({
        storage:
            multer.memoryStorage(),
        limits: {
            fileSize:
                MAX_FILE_SIZE,
        },
    });

router.post(
    "/rooms/:roomId/attachments",
    requireAuth,
    upload.single("file"),
    async (req, res) => {
        let storageKey:
            | string
            | null = null;

        try {
            if (!req.user) {
                res.status(401).json({
                    message:
                        "Authentication required",
                });

                return;
            }

            const roomId =
                Array.isArray(
                    req.params.roomId
                )
                    ? req.params.roomId[0]
                    : req.params.roomId;

            if (!roomId) {
                res.status(400).json({
                    message:
                        "Room ID is required",
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

            if (!req.file) {
                res.status(400).json({
                    message:
                        "File is required",
                });

                return;
            }

            const file = req.file;

            if (
                !allowedMimeTypes.has(
                    file.mimetype
                )
            ) {
                res.status(400).json({
                    message:
                        "Unsupported file type",
                });

                return;
            }

            if (
                !isAllowedFileType(
                    file.buffer,
                    file.mimetype
                )
            ) {
                res.status(400).json({
                    message:
                        "File content does not match the allowed file type",
                });

                return;
            }

            const originalName =
                req.file.originalname
                    .trim();

            if (!originalName) {
                res.status(400).json({
                    message:
                        "Invalid file name",
                });

                return;
            }

            const extension = getSafeExtension(
                req.file.originalname,
                req.file.mimetype
            );

            storageKey =
                `${crypto.randomUUID()}${extension}`;

            await saveUploadedFile(
                req.file.buffer,
                storageKey
            );

            const message =
                await createMessage(
                    roomId,
                    req.user.id,
                    ""
                );

            const attachment =
                await createAttachment(
                    message.id,
                    originalName,
                    storageKey,
                    req.file.mimetype,
                    req.file.size
                );

            res.status(201).json({
                message,
                attachment,
            });
        } catch (error) {
            if (storageKey) {
                await deleteUploadedFile(
                    storageKey
                );
            }

            console.error(
                "Failed to upload attachment:",
                error
            );

            if (
                error instanceof multer.MulterError
            ) {
                if (
                    error.code ===
                    "LIMIT_FILE_SIZE"
                ) {
                    res.status(400).json({
                        message:
                            "File is too large. Maximum size is 10 MB",
                    });

                    return;
                }
            }

            res.status(500).json({
                message:
                    "Failed to upload attachment",
            });
        }
    }
);

router.get(
    "/attachments/:attachmentRef",
    requireAuth,
    async (req, res) => {
        try {
            if (!req.user) {
                res.status(401).json({
                    message:
                        "Authentication required",
                });

                return;
            }

            const attachmentRef =
                Array.isArray(
                    req.params.attachmentRef
                )
                    ? req.params.attachmentRef[0]
                    : req.params.attachmentRef;

            if (!attachmentRef) {
                res.status(400).json({
                    message:
                        "Attachment reference is required",
                });

                return;
            }

            const attachment =
                await getAttachmentForDownload(
                    attachmentRef
                );

            if (!attachment) {
                res.status(404).json({
                    message:
                        "Attachment not found",
                });

                return;
            }

            const member =
                await isRoomMember(
                    attachment.room_id,
                    req.user.id
                );

            if (!member) {
                res.status(403).json({
                    message:
                        "You are not a member of this room",
                });

                return;
            }

            const filePath =
                getUploadedFilePath(
                    attachment.storage_key
                );

            const fileStats =
                await stat(filePath);

            if (!fileStats.isFile()) {
                console.error(
                    `Attachment record exists but physical file is missing: ${filePath}`
                );

                res.status(404).json({
                    message:
                        "File not found",
                });

                return;
            }

            res.setHeader(
                "Content-Type",
                attachment.mime_type
            );

            res.setHeader(
                "Content-Disposition",
                `inline; filename="${attachment.original_name.replace(
                    /["\r\n]/g,
                    "_"
                )}"`
            );

            res.setHeader(
                "X-Content-Type-Options",
                "nosniff"
            );

            res.sendFile(
                filePath
            );
        } catch (error) {
            console.error(
                "Failed to serve attachment:",
                error
            );

            res.status(404).json({
                message:
                    "File not found",
            });
        }
    }
);

export default router;