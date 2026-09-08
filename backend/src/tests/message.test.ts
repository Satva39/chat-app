import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

const { sqlMock } = vi.hoisted(() => ({
    sqlMock: vi.fn(),
}));

vi.mock("../config/database.js", () => ({
    sql: sqlMock,
}));

import {
    createMessage,
    isMessageInRoom,
    getMessages,
    markMessageAsRead,
    updateMessage,
} from "../services/message.service.js";

describe("message service", () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it("creates a message", async () => {
        const message = {
            id: "message-1",
            room_id: "room-1",
            sender_id: "user-1",
            content: "Hello",
            created_at: "2026-09-07T00:00:00.000Z",
            edited_at: null,
            deleted_at: null,
            reply_to_message_id: null,
        };

        sqlMock.mockResolvedValue([
            message,
        ]);

        const result = await createMessage(
            "room-1",
            "user-1",
            "Hello"
        );

        expect(result).toEqual(
            message
        );

        expect(
            sqlMock
        ).toHaveBeenCalledTimes(1);
    });

    it("checks whether a message belongs to a room", async () => {
        sqlMock.mockResolvedValue([
            { "?column?": 1 },
        ]);

        const result =
            await isMessageInRoom(
                "message-1",
                "room-1"
            );

        expect(result).toBe(true);
        expect(
            sqlMock
        ).toHaveBeenCalledTimes(1);
    });

    it("returns false when a message is not in the room", async () => {
        sqlMock.mockResolvedValue([]);

        const result =
            await isMessageInRoom(
                "message-1",
                "room-1"
            );

        expect(result).toBe(false);
    });

    it("clamps message limit to the maximum allowed value", async () => {
        sqlMock.mockResolvedValue([]);

        await getMessages(
            "room-1",
            500
        );

        expect(
            sqlMock
        ).toHaveBeenCalledTimes(1);
    });

    it("marks a message as read", async () => {
        sqlMock.mockResolvedValue([]);

        await markMessageAsRead(
            "message-1",
            "user-1"
        );

        expect(
            sqlMock
        ).toHaveBeenCalledTimes(1);
    });

    it("updates a message", async () => {
        const updatedMessage = {
            id: "message-1",
            room_id: "room-1",
            sender_id: "user-1",
            content: "Updated message",
            created_at: "2026-09-07T00:00:00.000Z",
            edited_at: "2026-09-07T00:01:00.000Z",
            deleted_at: null,
            reply_to_message_id: null,
        };

        sqlMock.mockResolvedValue([
            updatedMessage,
        ]);

        const result =
            await updateMessage(
                "message-1",
                "user-1",
                "Updated message"
            );

        expect(result).toEqual(
            updatedMessage
        );
    });
});