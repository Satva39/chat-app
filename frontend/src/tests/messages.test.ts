import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

const { apiRequestMock } = vi.hoisted(() => ({
    apiRequestMock: vi.fn(),
}));

vi.mock("../services/api", () => ({
    apiRequest: apiRequestMock,
}));

import { getMessages } from "../services/messages";

describe("messages service", () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it("loads messages with the default limit", async () => {
        const response = {
            messages: [],
            hasMore: false,
            nextCursor: null,
        };

        apiRequestMock.mockResolvedValue(
            response
        );

        const result =
            await getMessages("room-1");

        expect(result).toEqual(
            response
        );

        expect(
            apiRequestMock
        ).toHaveBeenCalledWith(
            "/api/rooms/room-1/messages?limit=50"
        );
    });

    it("uses the requested message limit", async () => {
        apiRequestMock.mockResolvedValue({
            messages: [],
            hasMore: false,
            nextCursor: null,
        });

        await getMessages(
            "room-1",
            25
        );

        expect(
            apiRequestMock
        ).toHaveBeenCalledWith(
            "/api/rooms/room-1/messages?limit=25"
        );
    });

    it("includes pagination cursor parameters", async () => {
        apiRequestMock.mockResolvedValue({
            messages: [],
            hasMore: true,
            nextCursor: {
                createdAt:
                    "2026-09-07T10:00:00.000Z",
                id: "message-1",
            },
        });

        await getMessages(
            "room-1",
            50,
            {
                createdAt:
                    "2026-09-07T10:00:00.000Z",
                id: "message-1",
            }
        );

        expect(
            apiRequestMock
        ).toHaveBeenCalledWith(
            "/api/rooms/room-1/messages?limit=50&beforeCreatedAt=2026-09-07T10%3A00%3A00.000Z&beforeId=message-1"
        );
    });
});