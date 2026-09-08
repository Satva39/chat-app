import path from "node:path";

const ALLOWED_TYPES = {
    "image/jpeg": [".jpg", ".jpeg"],
    "image/png": [".png"],
    "image/gif": [".gif"],
    "image/webp": [".webp"],
    "application/pdf": [".pdf"],
    "text/plain": [".txt"],
} as const;

function startsWithBytes(
    buffer: Buffer,
    bytes: number[]
): boolean {
    if (buffer.length < bytes.length) {
        return false;
    }

    return bytes.every(
        (value, index) => buffer[index] === value
    );
}

function isJpeg(buffer: Buffer): boolean {
    return (
        startsWithBytes(buffer, [0xff, 0xd8, 0xff]) &&
        buffer.length >= 4 &&
        buffer[buffer.length - 2] === 0xff &&
        buffer[buffer.length - 1] === 0xd9
    );
}

function isPng(buffer: Buffer): boolean {
    return startsWithBytes(buffer, [
        0x89,
        0x50,
        0x4e,
        0x47,
        0x0d,
        0x0a,
        0x1a,
        0x0a,
    ]);
}

function isGif(buffer: Buffer): boolean {
    return (
        buffer.subarray(0, 6).toString("ascii") ===
        "GIF87a" ||
        buffer.subarray(0, 6).toString("ascii") ===
        "GIF89a"
    );
}

function isWebp(buffer: Buffer): boolean {
    return (
        buffer.length >= 12 &&
        buffer.subarray(0, 4).toString("ascii") ===
        "RIFF" &&
        buffer.subarray(8, 12).toString("ascii") ===
        "WEBP"
    );
}

function isPdf(buffer: Buffer): boolean {
    return (
        buffer.length >= 5 &&
        buffer.subarray(0, 5).toString("ascii") ===
        "%PDF-"
    );
}

function isPlainText(buffer: Buffer): boolean {
    if (buffer.length === 0) {
        return true;
    }

    for (const byte of buffer) {
        if (
            byte === 0x00 ||
            (byte < 0x09) ||
            (byte > 0x0d && byte < 0x20)
        ) {
            return false;
        }
    }

    return true;
}

export function isAllowedFileType(
    buffer: Buffer,
    mimeType: string
): boolean {
    switch (mimeType) {
        case "image/jpeg":
            return isJpeg(buffer);

        case "image/png":
            return isPng(buffer);

        case "image/gif":
            return isGif(buffer);

        case "image/webp":
            return isWebp(buffer);

        case "application/pdf":
            return isPdf(buffer);

        case "text/plain":
            return isPlainText(buffer);

        default:
            return false;
    }
}

export function getSafeExtension(
    originalName: string,
    mimeType: string
): string {
    const allowedExtensions =
        ALLOWED_TYPES[mimeType as keyof typeof ALLOWED_TYPES];

    const originalExtension =
        path.extname(originalName).toLowerCase();

    if (
        allowedExtensions &&
        allowedExtensions.includes(
            originalExtension as never
        )
    ) {
        return originalExtension;
    }

    return allowedExtensions?.[0] ?? "";
}