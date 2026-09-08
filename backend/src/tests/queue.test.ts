import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

const { redisMock } = vi.hoisted(() => ({
    redisMock: {
        isReady: true,
        rPush: vi.fn(),
        blPop: vi.fn(),
    },
}));

vi.mock("../config/redis.js", () => ({
    redis: redisMock,
}));

import {
    dequeueMessageNotification,
    enqueueMessageNotification,
    retryMessageNotification,
} from "../services/queue.service.js";

describe("notification queue service", () => {
    afterEach(() => {
        vi.clearAllMocks();
        redisMock.isReady = true;
    });

    it("rejects enqueue when Redis is not ready", async () => {
        redisMock.isReady = false;

        await expect(
            enqueueMessageNotification({
                roomId: "room-1",
                senderId: "user-1",
                senderUsername: "testuser",
                messageId: "message-1",
                replyToMessageId: null,
            })
        ).rejects.toThrow(
            "Redis is not ready; notification job could not be queued"
        );

        expect(
            redisMock.rPush
        ).not.toHaveBeenCalled();
    });

    it("enqueues a notification job", async () => {
        const job = {
            roomId: "room-1",
            senderId: "user-1",
            senderUsername: "testuser",
            messageId: "message-1",
            replyToMessageId: null,
        };

        await enqueueMessageNotification(job);

        expect(
            redisMock.rPush
        ).toHaveBeenCalledWith(
            "queue:message-notifications",
            JSON.stringify({
                ...job,
                attempts: 0,
            })
        );
    });

    it("requeues a failed job for retry", async () => {
        const job = {
            roomId: "room-1",
            senderId: "user-1",
            senderUsername: "testuser",
            messageId: "message-1",
            replyToMessageId: null,
            attempts: 1,
        };

        const result =
            await retryMessageNotification(job);

        expect(result).toBe(true);

        expect(
            redisMock.rPush
        ).toHaveBeenCalledWith(
            "queue:message-notifications",
            JSON.stringify({
                ...job,
                attempts: 2,
            })
        );
    });

    it("moves a job to the dead-letter queue after maximum retries", async () => {
        const job = {
            roomId: "room-1",
            senderId: "user-1",
            senderUsername: "testuser",
            messageId: "message-1",
            replyToMessageId: null,
            attempts: 3,
        };

        const result =
            await retryMessageNotification(job);

        expect(result).toBe(false);

        expect(
            redisMock.rPush
        ).toHaveBeenCalledWith(
            "queue:message-notifications:dead-letter",
            JSON.stringify({
                ...job,
                attempts: 4,
            })
        );
    });

    it("dequeues and parses a valid notification job", async () => {
        const job = {
            roomId: "room-1",
            senderId: "user-1",
            senderUsername: "testuser",
            messageId: "message-1",
            replyToMessageId: null,
            attempts: 0,
        };

        redisMock.blPop.mockResolvedValue({
            key: "queue:message-notifications",
            element: JSON.stringify(job),
        });

        const result =
            await dequeueMessageNotification();

        expect(result).toEqual(job);

        expect(
            redisMock.blPop
        ).toHaveBeenCalledWith(
            "queue:message-notifications",
            1
        );
    });

    it("returns null for an invalid queued job", async () => {
        redisMock.blPop.mockResolvedValue({
            key: "queue:message-notifications",
            element: "invalid-json",
        });

        const result =
            await dequeueMessageNotification();

        expect(result).toBeNull();
    });
});