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
    getCurrentUser,
    logout,
} from "../services/auth";

describe("auth service", () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it("loads the current user", async () => {
        const user = {
            id: "user-1",
            username: "Alice",
            email: "alice@example.com",
            avatar_url: null,
        };

        apiRequestMock.mockResolvedValue({
            user,
        });

        const result =
            await getCurrentUser();

        expect(result).toEqual(
            user
        );

        expect(
            apiRequestMock
        ).toHaveBeenCalledWith(
            "/api/auth/me"
        );
    });

    it("logs out the current user", async () => {
        apiRequestMock.mockResolvedValue(
            undefined
        );

        await logout();

        expect(
            apiRequestMock
        ).toHaveBeenCalledWith(
            "/api/auth/logout",
            {
                method: "POST",
            }
        );
    });
});