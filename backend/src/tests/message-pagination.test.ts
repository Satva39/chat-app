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
    getMessagesPage,
} from "../services/message.service.js";

describe("message pagination", () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it("returns a page with hasMore=false when all messages fit", async () => {
        const messages = [
            {
                id: "message-1",
                room_id: "room-1",
                sender_id: "user-1",
                content: "Hello",
                created_at: "2026-09-07T10:00:00.000Z",
                edited_at: null,
                deleted_at: null,
                reply_to_message_id: null,
            },
            {
                id: "message-2",
                room_id: "room-1",
                sender_id: "user-2",
                content: "Hi",
                created_at: "2026-09-07T10:01:00.000Z",
                edited_at: null,
                deleted_at: null,
                reply_to_message_id: null,
            },
        ];

        sqlMock.mockResolvedValue(
            messages
        );

        const result =
            await getMessagesPage(
                "room-1",
                50
            );

        expect(
            result.messages
        ).toEqual(messages);

        expect(
            result.hasMore
        ).toBe(false);

        expect(
            result.nextCursor
        ).toBeNull();
    });

    it("detects when more messages exist", async () => {
        const messages = Array.from(
            { length: 4 },
            (_, index) => ({
                id: `message-${index + 1}`,
                room_id: "room-1",
                sender_id: "user-1",
                content: `Message ${index + 1}`,
                created_at: `2026-09-07T10:0${index}:00.000Z`,
                edited_at: null,
                deleted_at: null,
                reply_to_message_id: null,
            })
        );

        sqlMock.mockResolvedValue(
            messages
        );

        const result =
            await getMessagesPage(
                "room-1",
                3
            );

        expect(
            result.messages
        ).toHaveLength(3);

        expect(
            result.hasMore
        ).toBe(true);

        expect(
            result.nextCursor
        ).not.toBeNull();
    });

    it("clamps an oversized limit", async () => {
        sqlMock.mockResolvedValue([]);

        await getMessagesPage(
            "room-1",
            500
        );

        expect(
            sqlMock
        ).toHaveBeenCalledTimes(1);
    });

    it("clamps an invalid low limit", async () => {
        sqlMock.mockResolvedValue([]);

        await getMessagesPage(
            "room-1",
            0
        );

        expect(
            sqlMock
        ).toHaveBeenCalledTimes(1);
    });

    it("returns the oldest message as the next cursor", async () => {
        const messages = [
            {
                id: "message-1",
                room_id: "room-1",
                sender_id: "user-1",
                content: "Oldest",
                created_at: "2026-09-07T09:00:00.000Z",
                edited_at: null,
                deleted_at: null,
                reply_to_message_id: null,
            },
            {
                id: "message-2",
                room_id: "room-1",
                sender_id: "user-1",
                content: "Newest",
                created_at: "2026-09-07T10:00:00.000Z",
                edited_at: null,
                deleted_at: null,
                reply_to_message_id: null,
            },
            {
                id: "message-3",
                room_id: "room-1",
                sender_id: "user-1",
                content: "Extra",
                created_at: "2026-09-07T11:00:00.000Z",
                edited_at: null,
                deleted_at: null,
                reply_to_message_id: null,
            },
        ];

        sqlMock.mockResolvedValue(
            messages
        );

        const result =
            await getMessagesPage(
                "room-1",
                2
            );

        expect(
            result.hasMore
        ).toBe(true);

        expect(
            result.nextCursor
        ).toEqual({
            createdAt:
                "2026-09-07T10:00:00.000Z",
            id: "message-2",
        });
    });
});