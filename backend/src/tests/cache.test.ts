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
        get: vi.fn(),
        set: vi.fn(),
        del: vi.fn(),
    },
}));

vi.mock("../config/redis.js", () => ({
    redis: redisMock,
}));

import {
    deleteCache,
    getCache,
    setCache,
} from "../services/cache.service.js";

describe("cache service", () => {
    afterEach(() => {
        vi.clearAllMocks();
        redisMock.isReady = true;
    });

    it("returns null when Redis is not ready", async () => {
        redisMock.isReady = false;

        const result =
            await getCache<string>("test-key");

        expect(result).toBeNull();
        expect(redisMock.get).not.toHaveBeenCalled();
    });

    it("reads and parses cached data", async () => {
        redisMock.get.mockResolvedValue(
            JSON.stringify({
                name: "Satva",
            })
        );

        const result =
            await getCache<{ name: string }>(
                "test-key"
            );

        expect(result).toEqual({
            name: "Satva",
        });

        expect(
            redisMock.get
        ).toHaveBeenCalledWith("test-key");
    });

    it("stores data with an expiration", async () => {
        const data = {
            roomId: "room-1",
        };

        await setCache(
            "room-cache",
            data,
            30
        );

        expect(
            redisMock.set
        ).toHaveBeenCalledWith(
            "room-cache",
            JSON.stringify(data),
            {
                EX: 30,
            }
        );
    });

    it("deletes cached data", async () => {
        await deleteCache(
            "room-cache"
        );

        expect(
            redisMock.del
        ).toHaveBeenCalledWith(
            "room-cache"
        );
    });
});