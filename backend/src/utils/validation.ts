export function getTrimmedString(
    value: unknown
): string | null {
    if (typeof value !== "string") {
        return null;
    }

    const trimmed = value.trim();

    return trimmed.length > 0
        ? trimmed
        : null;
}

export function getOptionalTrimmedString(
    value: unknown
): string | null {
    if (value == null) {
        return null;
    }

    if (typeof value !== "string") {
        return null;
    }

    const trimmed = value.trim();

    return trimmed.length > 0
        ? trimmed
        : null;
}

export function isUuid(value: unknown): value is string {
    return (
        typeof value === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            value
        )
    );
}

export function isValidUsername(
    value: string
): boolean {
    return (
        value.length >= 2 &&
        value.length <= 50 &&
        !/[\u0000-\u001F\u007F]/.test(
            value
        )
    );
}

export function isValidEmail(
    value: string
): boolean {
    if (
        value.length === 0 ||
        value.length > 254
    ) {
        return false;
    }

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        value
    );
}

export function isValidMessageContent(
    value: string
): boolean {
    return (
        value.length > 0 &&
        value.length <= 5000 &&
        !/[\u0000]/.test(value)
    );
}
