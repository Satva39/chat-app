import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

const {
    dequeueMock,
    retryMock,
    getRoomMembersMock,
    createNotificationMock,
    ioMock,
} = vi.hoisted(() => ({
    dequeueMock: vi.fn(),
    retryMock: vi.fn(),
    getRoomMembersMock: vi.fn(),
    createNotificationMock: vi.fn(),
    ioMock: {
        in: vi.fn(),
        to: vi.fn(),
    },
}));

vi.mock("../services/queue.service.js", () => ({
    dequeueMessageNotification:
        dequeueMock,
    retryMessageNotification:
        retryMock,
}));

vi.mock("../services/room.service.js", () => ({
    getRoomMembers:
        getRoomMembersMock,
}));

vi.mock("../services/notification.service.js", () => ({
    createNotification:
        createNotificationMock,
}));

import {
    startNotificationWorker,
    stopNotificationWorker,
} from "../services/notification-worker.service.js";

describe("notification worker", () => {
    afterEach(() => {
        stopNotificationWorker();
        vi.clearAllMocks();
    });

    it("can start and stop without processing a job", async () => {
        dequeueMock.mockResolvedValue(null);

        startNotificationWorker(
            ioMock as never
        );

        await new Promise(
            (resolve) =>
                setTimeout(resolve, 20)
        );

        stopNotificationWorker();

        expect(
            dequeueMock
        ).toHaveBeenCalled();
    });

    it("does not start multiple worker loops", async () => {
        dequeueMock.mockResolvedValue(null);

        startNotificationWorker(
            ioMock as never
        );

        startNotificationWorker(
            ioMock as never
        );

        await new Promise(
            (resolve) =>
                setTimeout(resolve, 20)
        );

        stopNotificationWorker();

        expect(
            dequeueMock.mock.calls.length
        ).toBeLessThan(4);
    });

    it("processes a notification job for inactive members", async () => {
        const job = {
            roomId: "room-1",
            senderId: "user-1",
            senderUsername: "Alice",
            messageId: "message-1",
            replyToMessageId: null,
            attempts: 0,
        };

        dequeueMock
            .mockResolvedValueOnce(job)
            .mockResolvedValueOnce(null);

        getRoomMembersMock.mockResolvedValue([
            {
                id: "user-1",
                username: "Alice",
                avatar_url: null,
            },
            {
                id: "user-2",
                username: "Bob",
                avatar_url: null,
            },
        ]);

        const fetchSocketsMock =
            vi.fn().mockResolvedValue([]);

        const roomEmitter = {
            fetchSockets:
                fetchSocketsMock,
        };

        ioMock.in.mockReturnValue(
            roomEmitter
        );

        const userEmitter = {
            emit: vi.fn(),
        };

        ioMock.to.mockReturnValue(
            userEmitter
        );

        createNotificationMock.mockResolvedValue({
            id: "notification-1",
            user_id: "user-2",
        });

        startNotificationWorker(
            ioMock as never
        );

        await new Promise(
            (resolve) =>
                setTimeout(resolve, 50)
        );

        stopNotificationWorker();

        expect(
            createNotificationMock
        ).toHaveBeenCalledWith(
            "user-2",
            "message",
            "New message from Alice",
            "Alice sent a new message",
            "room-1",
            "message-1"
        );

        expect(
            userEmitter.emit
        ).toHaveBeenCalledWith(
            "notification",
            {
                id: "notification-1",
                user_id: "user-2",
            }
        );
    });

    it("retries a failed notification job", async () => {
        const job = {
            roomId: "room-1",
            senderId: "user-1",
            senderUsername: "Alice",
            messageId: "message-1",
            replyToMessageId: null,
            attempts: 0,
        };

        dequeueMock.mockResolvedValueOnce(
            job
        );

        getRoomMembersMock.mockRejectedValue(
            new Error("Database failure")
        );

        retryMock.mockResolvedValue(
            true
        );

        startNotificationWorker(
            ioMock as never
        );

        await new Promise(
            (resolve) =>
                setTimeout(resolve, 50)
        );

        stopNotificationWorker();

        expect(
            retryMock
        ).toHaveBeenCalledWith(job);
    });
});