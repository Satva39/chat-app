import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

const {
    sqlMock,
    getCacheMock,
    setCacheMock,
    deleteCacheMock,
} = vi.hoisted(() => ({
    sqlMock: vi.fn(),
    getCacheMock: vi.fn(),
    setCacheMock: vi.fn(),
    deleteCacheMock: vi.fn(),
}));

vi.mock("../config/database.js", () => ({
    sql: sqlMock,
}));

vi.mock("../services/cache.service.js", () => ({
    getCache: getCacheMock,
    setCache: setCacheMock,
    deleteCache: deleteCacheMock,
}));

import {
    getUserRooms,
    isRoomMember,
    getRoomMembers,
} from "../services/room.service.js";

describe("room service caching", () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it("returns cached user rooms without querying the database", async () => {
        const cachedRooms = [
            {
                id: "room-1",
                name: "General",
                description: null,
                is_private: false,
                created_by: "user-1",
                created_at: "2026-01-01T00:00:00.000Z",
                room_type: "group" as const,
            },
        ];

        getCacheMock.mockResolvedValue(
            cachedRooms
        );

        const result =
            await getUserRooms("user-1");

        expect(result).toEqual(
            cachedRooms
        );
        expect(
            sqlMock
        ).not.toHaveBeenCalled();
        expect(
            setCacheMock
        ).not.toHaveBeenCalled();
    });

    it("queries the database and caches user rooms on a cache miss", async () => {
        const rooms = [
            {
                id: "room-1",
                name: "General",
                description: null,
                is_private: false,
                created_by: "user-1",
                created_at: "2026-01-01T00:00:00.000Z",
                room_type: "group" as const,
            },
        ];

        getCacheMock.mockResolvedValue(null);
        sqlMock.mockResolvedValue(rooms);

        const result =
            await getUserRooms("user-1");

        expect(result).toEqual(rooms);

        expect(
            sqlMock
        ).toHaveBeenCalledTimes(1);

        expect(
            setCacheMock
        ).toHaveBeenCalledWith(
            "user-rooms:user-1",
            rooms,
            30
        );
    });

    it("returns cached room membership without querying the database", async () => {
        getCacheMock.mockResolvedValue(true);

        const result =
            await isRoomMember(
                "room-1",
                "user-1"
            );

        expect(result).toBe(true);

        expect(
            sqlMock
        ).not.toHaveBeenCalled();

        expect(
            setCacheMock
        ).not.toHaveBeenCalled();
    });

    it("checks membership in the database and caches the result", async () => {
        getCacheMock.mockResolvedValue(null);
        sqlMock.mockResolvedValue([
            { "?column?": 1 },
        ]);

        const result =
            await isRoomMember(
                "room-1",
                "user-1"
            );

        expect(result).toBe(true);

        expect(
            sqlMock
        ).toHaveBeenCalledTimes(1);

        expect(
            setCacheMock
        ).toHaveBeenCalledWith(
            "room-member:room-1:user-1",
            true,
            60
        );
    });

    it("returns cached room members without querying the database", async () => {
        const cachedMembers = [
            {
                id: "user-1",
                username: "testuser",
                avatar_url: null,
            },
        ];

        getCacheMock.mockResolvedValue(
            cachedMembers
        );

        const result =
            await getRoomMembers("room-1");

        expect(result).toEqual(
            cachedMembers
        );

        expect(
            sqlMock
        ).not.toHaveBeenCalled();
    });

    it("queries and caches room members on a cache miss", async () => {
        const members = [
            {
                id: "user-1",
                username: "testuser",
                avatar_url: null,
            },
        ];

        getCacheMock.mockResolvedValue(null);
        sqlMock.mockResolvedValue(members);

        const result =
            await getRoomMembers("room-1");

        expect(result).toEqual(members);

        expect(
            sqlMock
        ).toHaveBeenCalledTimes(1);

        expect(
            setCacheMock
        ).toHaveBeenCalledWith(
            "room-members:room-1",
            members,
            60
        );
    });
});