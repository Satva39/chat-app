import { Server } from "socket.io";
import type { Server as HttpServer } from "http";

import {
    addMessageReaction,
    createMessage,
    deleteMessage,
    getAttachmentMessage,
    markMessageAsRead,
    removeMessageReaction,
    updateMessage,
    isMessageInRoom,
} from "../services/message.service.js";

import { getUserFromSession } from "../services/auth.service.js";

import {
    addUserSocket,
    getOnlineUserIds,
    removeUserSocket,
} from "../services/presence.service.js";

import {
    getRoomMembers,
    isRoomMember,
} from "../services/room.service.js";

import {
    startNotificationWorker,
} from "../services/notification-worker.service.js";

import {
    enqueueMessageNotification,
} from "../services/queue.service.js";

import {
    getOptionalTrimmedString,
    getTrimmedString,
    isUuid,
    isValidMessageContent,
} from "../utils/validation.js";


function getSessionToken(
    cookieHeader: string | undefined
): string | null {
    if (!cookieHeader) {
        return null;
    }

    const sessionCookie = cookieHeader
        .split(";")
        .map((cookie) => cookie.trim())
        .find((cookie) =>
            cookie.startsWith("session=")
        );

    if (!sessionCookie) {
        return null;
    }

    return decodeURIComponent(
        sessionCookie.substring("session=".length)
    );
}

// async function notifyInactiveRoomMembers(
//     io: Server,
//     roomId: string,
//     senderId: string,
//     senderUsername: string,
//     messageId: string,
//     isReply: boolean
// ) {
//     const members =
//         await getRoomMembers(roomId);

//     const roomName =
//         `room:${roomId}`;

//     const activeSockets =
//         await io
//             .in(roomName)
//             .fetchSockets();

//     const activeUserIds =
//         new Set(
//             activeSockets.map(
//                 (activeSocket) =>
//                     activeSocket.data.user.id
//             )
//         );

//     for (const member of members) {
//         if (member.id === senderId) {
//             continue;
//         }

//         if (activeUserIds.has(member.id)) {
//             continue;
//         }

//         const notification =
//             await createNotification(
//                 member.id,
//                 isReply
//                     ? "reply"
//                     : "message",
//                 isReply
//                     ? `${senderUsername} replied`
//                     : `New message from ${senderUsername}`,
//                 isReply
//                     ? `${senderUsername} replied to your message`
//                     : `${senderUsername} sent a new message`,
//                 roomId,
//                 messageId
//             );

//         io.to(
//             `user:${member.id}`
//         ).emit(
//             "notification",
//             notification
//         );
//     }
// }

export function initializeSocket(
    httpServer: HttpServer
) {
    const frontendUrl =
        process.env.FRONTEND_URL ||
        "http://localhost:5173";

    const io = new Server(httpServer, {
        cors: {
            origin: frontendUrl,
            credentials: true,
        },

        allowRequest: (req, callback) => {
            const origin = req.headers.origin;

            if (!origin || origin === frontendUrl) {
                callback(null, true);
                return;
            }

            callback(
                "WebSocket origin not allowed",
                false
            );
        },

        maxHttpBufferSize: 1e6,

        connectionStateRecovery: {
            maxDisconnectionDuration:
                2 * 60 * 1000,
            skipMiddlewares: false,
        },
    });

    startNotificationWorker(io);

    io.use(async (socket, next) => {
        try {
            const sessionToken =
                getSessionToken(
                    socket.handshake.headers.cookie
                );

            if (!sessionToken) {
                next(
                    new Error(
                        "Authentication required"
                    )
                );

                return;
            }

            const user =
                await getUserFromSession(
                    sessionToken
                );

            if (!user) {
                next(
                    new Error(
                        "Authentication required"
                    )
                );

                return;
            }

            socket.data.user = user;

            next();
        } catch (error) {
            console.error(
                "Socket authentication failed:",
                error
            );

            next(
                new Error(
                    "Authentication failed"
                )
            );
        }
    });

    io.on(
        "connection",
        (socket) => {
            const user =
                socket.data.user;

            /*
             * Register room and message handlers immediately.
             * Do not perform awaited startup work before these
             * listeners exist, otherwise a fast client can send
             * join_room/send_message before the listeners are ready.
             */
            socket.on(
                "join_room",
                async (
                    roomId: string
                ) => {
                    try {
                        const validRoomId =
                            getTrimmedString(roomId);

                        if (
                            !validRoomId ||
                            !isUuid(validRoomId)
                        ) {
                            socket.emit(
                                "room_error",
                                {
                                    message:
                                        "Room ID is required",
                                }
                            );

                            return;
                        }

                        const member =
                            await isRoomMember(
                                validRoomId,
                                user.id
                            );

                        if (!member) {
                            socket.emit(
                                "room_error",
                                {
                                    message:
                                        "You are not a member of this room",
                                }
                            );

                            return;
                        }

                        const roomName =
                            `room:${validRoomId}`;

                        await socket.join(
                            roomName
                        );

                        console.log(
                            `Socket ${socket.id} joined room ${validRoomId}`
                        );

                        socket.emit(
                            "room_joined",
                            {
                                roomId:
                                    validRoomId,
                            }
                        );

                        console.log(
                            `REALTIME: room joined ${validRoomId} by ${socket.id}`
                        );
                    } catch (error) {
                        console.error(
                            "Failed to join room:",
                            error
                        );

                        socket.emit(
                            "room_error",
                            {
                                message:
                                    "Failed to join room",
                            }
                        );
                    }
                }
            );

            /*
             * Run user presence initialization in the background.
             * This must not delay registration of message handlers.
             */
            void (async () => {
                try {
                    await socket.join(
                        `user:${user.id}`
                    );

                    const becameOnline =
                        await addUserSocket(
                            user.id,
                            socket.id
                        );

                    const onlineUserIds =
                        await getOnlineUserIds();

                    socket.emit(
                        "online_users",
                        {
                            userIds:
                                onlineUserIds,
                        }
                    );

                    if (becameOnline) {
                        io.emit(
                            "user_online",
                            {
                                userId:
                                    user.id,
                            }
                        );
                    }

                    console.log(
                        `Socket connected: ${socket.id} (${user.username})`
                    );
                } catch (error) {
                    console.error(
                        "Failed to initialize socket presence:",
                        error
                    );
                }
            })();

            socket.on(
                "leave_room",
                (roomId: string) => {
                    if (!roomId) {
                        return;
                    }

                    socket.leave(
                        `room:${roomId}`
                    );
                }
            );

            socket.on(
                "send_message",
                async (data: {
                    roomId: string;
                    content: string;
                    replyToMessageId?: string | null;
                }) => {
                    try {
                        const roomId =
                            getTrimmedString(
                                data?.roomId
                            );

                        const content =
                            getTrimmedString(
                                data?.content
                            );

                        const replyToMessageId =
                            getOptionalTrimmedString(
                                data?.replyToMessageId
                            );

                        if (
                            !roomId ||
                            !isUuid(roomId) ||
                            !content ||
                            !isValidMessageContent(content)
                        ) {
                            socket.emit(
                                "message_error",
                                {
                                    message:
                                        "Invalid message data",
                                }
                            );

                            return;
                        }

                        if (
                            content.length >
                            5000
                        ) {
                            socket.emit(
                                "message_error",
                                {
                                    message:
                                        "Message is too long",
                                }
                            );

                            return;
                        }

                        const member =
                            await isRoomMember(
                                roomId,
                                user.id
                            );

                        if (!member) {
                            socket.emit(
                                "message_error",
                                {
                                    message:
                                        "You are not a member of this room",
                                }
                            );

                            return;
                        }

                        if (replyToMessageId) {
                            const replyMessageInRoom =
                                await isMessageInRoom(
                                    replyToMessageId,
                                    roomId
                                );

                            if (!replyMessageInRoom) {
                                socket.emit(
                                    "message_error",
                                    {
                                        message:
                                            "Reply target does not belong to this room",
                                    }
                                );

                                return;
                            }
                        }

                        const message =
                            await createMessage(
                                roomId,
                                user.id,
                                content,
                                replyToMessageId
                            );

                        const roomName =
                            `room:${roomId}`;

                        const room = io.to(
                            `room:${roomId}`
                        );

                        room.emit(
                            "new_message",
                            message
                        );

                        void enqueueMessageNotification({
                            roomId,
                            senderId: user.id,
                            senderUsername: user.username,
                            messageId: message.id,
                            replyToMessageId,
                        }).catch((error) => {
                            console.error(
                                "Failed to enqueue message notification:",
                                error
                            );
                        });

                    } catch (error) {
                        console.error(
                            "Failed to create message:",
                            error
                        );

                        socket.emit(
                            "message_error",
                            {
                                message:
                                    "Failed to send message",
                            }
                        );
                    }
                }
            );

            socket.on(
                "edit_message",
                async (data: {
                    roomId: string;
                    messageId: string;
                    content: string;
                }) => {
                    try {
                        const roomId =
                            getTrimmedString(
                                data?.roomId
                            );

                        const messageId =
                            getTrimmedString(
                                data?.messageId
                            );

                        const content =
                            getTrimmedString(
                                data?.content
                            );

                        if (
                            !roomId ||
                            !isUuid(roomId) ||
                            !messageId ||
                            !isUuid(messageId) ||
                            !content ||
                            !isValidMessageContent(content)
                        ) {
                            socket.emit(
                                "message_error",
                                {
                                    message:
                                        "Invalid message data",
                                }
                            );

                            return;
                        }

                        if (
                            content.length >
                            5000
                        ) {
                            socket.emit(
                                "message_error",
                                {
                                    message:
                                        "Message is too long",
                                }
                            );

                            return;
                        }

                        const member =
                            await isRoomMember(
                                roomId,
                                user.id
                            );

                        if (!member) {
                            return;
                        }

                        const messageInRoom =
                            await isMessageInRoom(
                                messageId,
                                roomId
                            );

                        if (!messageInRoom) {
                            socket.emit(
                                "message_error",
                                {
                                    message:
                                        "Message does not belong to this room",
                                }
                            );

                            return;
                        }

                        const message =
                            await updateMessage(
                                messageId,
                                user.id,
                                content
                            );

                        io.to(
                            `room:${roomId}`
                        ).emit(
                            "message_updated",
                            message
                        );
                    } catch (error) {
                        console.error(
                            "Failed to edit message:",
                            error
                        );

                        socket.emit(
                            "message_error",
                            {
                                message:
                                    error instanceof Error
                                        ? error.message
                                        : "Failed to edit message",
                            }
                        );
                    }
                }
            );

            socket.on(
                "delete_message",
                async (data: {
                    roomId: string;
                    messageId: string;
                }) => {
                    try {
                        const roomId =
                            getTrimmedString(
                                data?.roomId
                            );

                        const messageId =
                            getTrimmedString(
                                data?.messageId
                            );

                        if (
                            !roomId ||
                            !isUuid(roomId) ||
                            !messageId ||
                            !isUuid(messageId)
                        ) {
                            socket.emit(
                                "message_error",
                                {
                                    message:
                                        "Invalid message data",
                                }
                            );

                            return;
                        }

                        const member =
                            await isRoomMember(
                                roomId,
                                user.id
                            );

                        if (!member) {
                            return;
                        }

                        const messageInRoom =
                            await isMessageInRoom(
                                messageId,
                                roomId
                            );

                        if (!messageInRoom) {
                            socket.emit(
                                "message_error",
                                {
                                    message:
                                        "Message does not belong to this room",
                                }
                            );

                            return;
                        }

                        const message =
                            await deleteMessage(
                                messageId,
                                user.id
                            );

                        io.to(
                            `room:${roomId}`
                        ).emit(
                            "message_deleted",
                            message
                        );
                    } catch (error) {
                        console.error(
                            "Failed to delete message:",
                            error
                        );

                        socket.emit(
                            "message_error",
                            {
                                message:
                                    error instanceof Error
                                        ? error.message
                                        : "Failed to delete message",
                            }
                        );
                    }
                }
            );

            socket.on(
                "attachment_created",
                async (data: {
                    roomId: string;
                    messageId: string;
                    attachmentId: string;
                }) => {
                    try {
                        const roomId =
                            getTrimmedString(
                                data?.roomId
                            );

                        const messageId =
                            getTrimmedString(
                                data?.messageId
                            );

                        const attachmentId =
                            getTrimmedString(
                                data?.attachmentId
                            );

                        if (
                            !roomId ||
                            !isUuid(roomId) ||
                            !messageId ||
                            !isUuid(messageId) ||
                            !attachmentId ||
                            !isUuid(attachmentId)
                        ) {
                            return;
                        }

                        const member =
                            await isRoomMember(
                                roomId,
                                user.id
                            );

                        if (!member) {
                            return;
                        }

                        const result =
                            await getAttachmentMessage(
                                messageId,
                                attachmentId
                            );

                        if (!result) {
                            return;
                        }

                        if (
                            result.message.room_id !==
                            roomId
                        ) {
                            return;
                        }

                        if (
                            result.message.sender_id !==
                            user.id
                        ) {
                            return;
                        }

                        const roomName =
                            `room:${roomId}`;

                        const realtimeMessage = {
                            ...result.message,
                            attachment:
                                result.attachment,
                        };

                        io.to(
                            roomName
                        ).emit(
                            "new_message",
                            realtimeMessage
                        );
                    } catch (error) {
                        console.error(
                            "Failed to broadcast attachment:",
                            error
                        );
                    }
                }
            );

            socket.on(
                "add_reaction",
                async (data: {
                    roomId: string;
                    messageId: string;
                    reaction: string;
                }) => {
                    try {
                        const roomId =
                            getTrimmedString(
                                data?.roomId
                            );

                        const messageId =
                            getTrimmedString(
                                data?.messageId
                            );

                        const reaction =
                            getTrimmedString(
                                data?.reaction
                            );

                        const allowedReactions = [
                            "😀",
                            "❤️",
                            "👍",
                            "😂",
                            "😮",
                            "😢",
                        ];

                        if (
                            !roomId ||
                            !isUuid(roomId) ||
                            !messageId ||
                            !isUuid(messageId) ||
                            !reaction ||
                            !allowedReactions.includes(
                                reaction
                            )
                        ) {
                            return;
                        }

                        const member =
                            await isRoomMember(
                                roomId,
                                user.id
                            );

                        if (!member) {
                            return;
                        }

                        const messageInRoom =
                            await isMessageInRoom(
                                messageId,
                                roomId
                            );

                        if (!messageInRoom) {
                            return;
                        }

                        const savedReaction =
                            await addMessageReaction(
                                messageId,
                                user.id,
                                reaction
                            );

                        io.to(
                            `room:${roomId}`
                        ).emit(
                            "reaction_added",
                            savedReaction
                        );
                    } catch (error) {
                        console.error(
                            "Failed to add reaction:",
                            error
                        );
                    }
                }
            );

            socket.on(
                "remove_reaction",
                async (data: {
                    roomId: string;
                    messageId: string;
                    reaction: string;
                }) => {
                    try {
                        const roomId =
                            getTrimmedString(
                                data?.roomId
                            );

                        const messageId =
                            getTrimmedString(
                                data?.messageId
                            );

                        const reaction =
                            getTrimmedString(
                                data?.reaction
                            );

                        if (
                            !roomId ||
                            !isUuid(roomId) ||
                            !messageId ||
                            !isUuid(messageId) ||
                            !reaction
                        ) {
                            return;
                        }

                        const member =
                            await isRoomMember(
                                roomId,
                                user.id
                            );

                        if (!member) {
                            return;
                        }

                        const messageInRoom =
                            await isMessageInRoom(
                                messageId,
                                roomId
                            );

                        if (!messageInRoom) {
                            return;
                        }

                        await removeMessageReaction(
                            messageId,
                            user.id,
                            reaction
                        );

                        io.to(
                            `room:${roomId}`
                        ).emit(
                            "reaction_removed",
                            {
                                messageId,
                                userId: user.id,
                                reaction,
                            }
                        );
                    } catch (error) {
                        console.error(
                            "Failed to remove reaction:",
                            error
                        );
                    }
                }
            );

            socket.on(
                "typing_start",
                async (
                    roomId: string
                ) => {
                    if (!roomId) {
                        return;
                    }

                    const member =
                        await isRoomMember(
                            roomId,
                            user.id
                        );

                    if (!member) {
                        return;
                    }

                    socket
                        .to(
                            `room:${roomId}`
                        )
                        .emit(
                            "user_typing",
                            {
                                userId:
                                    user.id,
                                username:
                                    user.username,
                            }
                        );
                }
            );

            socket.on(
                "typing_stop",
                async (
                    roomId: string
                ) => {
                    if (!roomId) {
                        return;
                    }

                    const member =
                        await isRoomMember(
                            roomId,
                            user.id
                        );

                    if (!member) {
                        return;
                    }

                    socket
                        .to(
                            `room:${roomId}`
                        )
                        .emit(
                            "user_stopped_typing",
                            {
                                userId:
                                    user.id,
                                username:
                                    user.username,
                            }
                        );
                }
            );

            socket.on(
                "message_read",
                async (data: {
                    roomId: string;
                    messageId: string;
                }) => {
                    try {
                        const roomId =
                            data?.roomId?.trim();

                        const messageId =
                            data?.messageId?.trim();

                        if (
                            !roomId ||
                            !messageId
                        ) {
                            return;
                        }

                        const member =
                            await isRoomMember(
                                roomId,
                                user.id
                            );

                        if (!member) {
                            return;
                        }

                        const messageInRoom =
                            await isMessageInRoom(
                                messageId,
                                roomId
                            );

                        if (!messageInRoom) {
                            return;
                        }

                        await markMessageAsRead(
                            messageId,
                            user.id
                        );

                        socket
                            .to(
                                `room:${roomId}`
                            )
                            .emit(
                                "message_read",
                                {
                                    messageId,
                                    userId:
                                        user.id,
                                }
                            );
                    } catch (error) {
                        console.error(
                            "Failed to mark message as read:",
                            error
                        );
                    }
                }
            );

            socket.on(
                "disconnect",
                async () => {
                    try {
                        const becameOffline =
                            await removeUserSocket(
                                user.id,
                                socket.id
                            );

                        if (becameOffline) {
                            io.emit(
                                "user_offline",
                                {
                                    userId:
                                        user.id,
                                }
                            );
                        }

                        console.log(
                            `Socket disconnected: ${socket.id} (${user.username})`
                        );
                    } catch (error) {
                        console.error(
                            "Failed to remove socket presence:",
                            error
                        );
                    }
                }
            );
        }
    );

    return io;
}
