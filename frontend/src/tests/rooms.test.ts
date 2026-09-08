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

import {
    getRooms,
    createRoom,
    getRoomMembers,
    createDirectRoom,
    addRoomMember,
} from "../services/rooms";

describe("rooms service", () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it("loads rooms", async () => {
        const rooms = [
            {
                id: "room-1",
                name: "General",
                description: null,
                is_private: false,
                created_by: "user-1",
                created_at:
                    "2026-09-07T10:00:00.000Z",
                room_type: "group" as const,
            },
        ];

        apiRequestMock.mockResolvedValue({
            rooms,
        });

        const result =
            await getRooms();

        expect(result).toEqual(
            rooms
        );

        expect(
            apiRequestMock
        ).toHaveBeenCalledWith(
            "/api/rooms"
        );
    });

    it("creates a room", async () => {
        const room = {
            id: "room-1",
            name: "Friends",
            description: "Friends chat",
            is_private: false,
            created_by: "user-1",
            created_at:
                "2026-09-07T10:00:00.000Z",
            room_type: "group" as const,
        };

        apiRequestMock.mockResolvedValue({
            room,
        });

        const result =
            await createRoom(
                "Friends",
                "Friends chat"
            );

        expect(result).toEqual(
            room
        );

        expect(
            apiRequestMock
        ).toHaveBeenCalledWith(
            "/api/rooms",
            {
                method: "POST",
                body: JSON.stringify({
                    name: "Friends",
                    description: "Friends chat",
                    isPrivate: false,
                }),
            }
        );
    });

    it("loads room members", async () => {
        const members = [
            {
                id: "user-1",
                username: "Alice",
                avatar_url: null,
            },
        ];

        apiRequestMock.mockResolvedValue({
            members,
        });

        const result =
            await getRoomMembers(
                "room-1"
            );

        expect(result).toEqual(
            members
        );

        expect(
            apiRequestMock
        ).toHaveBeenCalledWith(
            "/api/rooms/room-1/members"
        );
    });

    it("creates a direct room", async () => {
        const room = {
            id: "room-2",
            name: "Bob",
            description: null,
            is_private: true,
            created_by: "user-1",
            created_at:
                "2026-09-07T10:00:00.000Z",
            room_type: "direct" as const,
        };

        apiRequestMock.mockResolvedValue({
            room,
        });

        const result =
            await createDirectRoom(
                "user-2"
            );

        expect(result).toEqual(
            room
        );

        expect(
            apiRequestMock
        ).toHaveBeenCalledWith(
            "/api/rooms/direct",
            {
                method: "POST",
                body: JSON.stringify({
                    userId: "user-2",
                }),
            }
        );
    });

    it("adds a member to a room", async () => {
        apiRequestMock.mockResolvedValue(
            undefined
        );

        await addRoomMember(
            "room-1",
            "user-2"
        );

        expect(
            apiRequestMock
        ).toHaveBeenCalledWith(
            "/api/rooms/room-1/members",
            {
                method: "POST",
                body: JSON.stringify({
                    userId: "user-2",
                }),
            }
        );
    });
});