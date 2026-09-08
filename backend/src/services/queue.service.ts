import { redis } from "../config/redis.js";

const MESSAGE_NOTIFICATION_QUEUE =
    "queue:message-notifications";

const MESSAGE_NOTIFICATION_DEAD_LETTER_QUEUE =
    "queue:message-notifications:dead-letter";

const MAX_NOTIFICATION_ATTEMPTS = 3;

export interface MessageNotificationJob {
    roomId: string;
    senderId: string;
    senderUsername: string;
    messageId: string;
    replyToMessageId: string | null;
    attempts?: number;
}

export async function enqueueMessageNotification(
    job: MessageNotificationJob
): Promise<void> {
    if (!redis.isReady) {
        throw new Error(
            "Redis is not ready; notification job could not be queued"
        );
    }

    await redis.rPush(
        MESSAGE_NOTIFICATION_QUEUE,
        JSON.stringify({
            ...job,
            attempts: job.attempts ?? 0,
        })
    );
}

export async function retryMessageNotification(
    job: MessageNotificationJob
): Promise<boolean> {
    if (!redis.isReady) {
        return false;
    }

    const attempts =
        (job.attempts ?? 0) + 1;

    if (attempts > MAX_NOTIFICATION_ATTEMPTS) {
        await redis.rPush(
            MESSAGE_NOTIFICATION_DEAD_LETTER_QUEUE,
            JSON.stringify({
                ...job,
                attempts,
            })
        );

        return false;
    }

    await redis.rPush(
        MESSAGE_NOTIFICATION_QUEUE,
        JSON.stringify({
            ...job,
            attempts,
        })
    );

    return true;
}

export async function dequeueMessageNotification():
    Promise<MessageNotificationJob | null> {
    if (!redis.isReady) {
        return null;
    }

    const result =
        await redis.blPop(
            MESSAGE_NOTIFICATION_QUEUE,
            1
        );

    if (!result) {
        return null;
    }

    try {
        return JSON.parse(
            result.element
        ) as MessageNotificationJob;
    } catch (error) {
        console.error(
            "Invalid notification queue job:",
            error
        );

        return null;
    }
}