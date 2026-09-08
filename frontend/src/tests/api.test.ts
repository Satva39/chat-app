import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

import { apiRequest } from "../services/api";

describe("apiRequest", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("returns JSON data for a successful request", async () => {
        const fetchMock = vi
            .spyOn(globalThis, "fetch")
            .mockResolvedValue(
                new Response(
                    JSON.stringify({
                        message: "Success",
                    }),
                    {
                        status: 200,
                        headers: {
                            "Content-Type":
                                "application/json",
                        },
                    }
                )
            );

        const result =
            await apiRequest<{
                message: string;
            }>("/api/test");

        expect(result).toEqual({
            message: "Success",
        });

        expect(
            fetchMock
        ).toHaveBeenCalledWith(
            "http://localhost:5000/api/test",
            expect.objectContaining({
                credentials: "include",
            })
        );
    });

    it("throws the API error message for failed requests", async () => {
        vi.spyOn(globalThis, "fetch")
            .mockResolvedValue(
                new Response(
                    JSON.stringify({
                        message: "Unauthorized",
                    }),
                    {
                        status: 401,
                        headers: {
                            "Content-Type":
                                "application/json",
                        },
                    }
                )
            );

        await expect(
            apiRequest("/api/test")
        ).rejects.toThrow(
            "Unauthorized"
        );
    });

    it("sets JSON content type by default", async () => {
        const fetchMock = vi
            .spyOn(globalThis, "fetch")
            .mockResolvedValue(
                new Response(
                    JSON.stringify({
                        ok: true,
                    }),
                    {
                        status: 200,
                    }
                )
            );

        await apiRequest("/api/test");

        expect(
            fetchMock
        ).toHaveBeenCalledWith(
            "http://localhost:5000/api/test",
            expect.objectContaining({
                headers: {
                    "Content-Type":
                        "application/json",
                },
            })
        );
    });
});