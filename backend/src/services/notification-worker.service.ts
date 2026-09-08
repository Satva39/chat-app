import {
    dequeueMessageNotification,
    retryMessageNotification,
    type MessageNotificationJob,
} from "./queue.service.js";

import {
    getRoomMembers,
} from "./room.service.js";

import {
    createNotification,
} from "./notification.service.js";

import type { Server } from "socket.io";

let workerRunning = false;

export function stopNotificationWorker(): void {
    workerRunning = false;

    console.log(
        "Notification worker stopping..."
    );
}

async function processNotificationJob(
    io: Server,
    job: MessageNotificationJob
): Promise<void> {
    const members = await getRoomMembers(job.roomId);

    const roomName = `room:${job.roomId}`;

    const activeSockets =
        await io.in(roomName).fetchSockets();

    const activeUserIds = new Set(
        activeSockets.map(
            (roomSocket) =>
                roomSocket.data.user.id
        )
    );

    const isReply =
        Boolean(job.replyToMessageId);

    for (const member of members) {
        if (member.id === job.senderId) {
            continue;
        }

        if (activeUserIds.has(member.id)) {
            continue;
        }

        const notification =
            await createNotification(
                member.id,
                isReply
                    ? "reply"
                    : "message",
                isReply
                    ? `${job.senderUsername} replied`
                    : `New message from ${job.senderUsername}`,
                isReply
                    ? `${job.senderUsername} replied to your message`
                    : `${job.senderUsername} sent a new message`,
                job.roomId,
                job.messageId
            );

        io.to(`user:${member.id}`).emit(
            "notification",
            notification
        );
    }
}

export function startNotificationWorker(
    io: Server
): void {
    if (workerRunning) {
        return;
    }

    workerRunning = true;

    void (async () => {
        console.log(
            "Notification worker started"
        );

        while (workerRunning) {
            try {
                const job =
                    await dequeueMessageNotification();

                if (!job) {
                    await new Promise(
                        (resolve) =>
                            setTimeout(
                                resolve,
                                1000
                            )
                    );

                    continue;
                }

                try {
                    await processNotificationJob(
                        io,
                        job
                    );
                } catch (error) {
                    console.error(
                        "Notification job failed:",
                        error
                    );

                    const retried =
                        await retryMessageNotification(job);

                    if (retried) {
                        console.log(
                            `Notification job requeued: ${job.messageId}`
                        );
                    } else {
                        console.error(
                            `Notification job moved to dead-letter queue: ${job.messageId}`
                        );
                    }
                }

            } catch (error) {
                console.error(
                    "Notification worker error:",
                    error
                );

                await new Promise(
                    (resolve) =>
                        setTimeout(
                            resolve,
                            1000
                        )
                );
            }
        }
    })();
}