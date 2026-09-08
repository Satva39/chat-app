import { describe, expect, it } from "vitest";

import {
    getOptionalTrimmedString,
    getTrimmedString,
    isUuid,
    isValidMessageContent,
} from "../utils/validation.js";

describe("validation utilities", () => {
    it("trims valid strings", () => {
        expect(
            getTrimmedString("  hello  ")
        ).toBe("hello");
    });

    it("returns null for invalid trimmed strings", () => {
        expect(
            getTrimmedString("   ")
        ).toBeNull();

        expect(
            getTrimmedString(123)
        ).toBeNull();
    });

    it("handles optional strings", () => {
        expect(
            getOptionalTrimmedString("  test  ")
        ).toBe("test");

        expect(
            getOptionalTrimmedString("")
        ).toBeNull();

        expect(
            getOptionalTrimmedString(undefined)
        ).toBeNull();
    });

    it("validates UUIDs", () => {
        expect(
            isUuid(
                "550e8400-e29b-41d4-a716-446655440000"
            )
        ).toBe(true);

        expect(
            isUuid("not-a-uuid")
        ).toBe(false);
    });

    it("validates message content", () => {
        expect(
            isValidMessageContent("Hello world")
        ).toBe(true);

        expect(
            isValidMessageContent("")
        ).toBe(false);

        expect(
            isValidMessageContent("Valid message")
        ).toBe(true);
    });
});