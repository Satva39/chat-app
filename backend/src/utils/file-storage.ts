import path from "node:path";
import { fileURLToPath } from "node:url";
import {
    mkdir,
    unlink,
    writeFile,
} from "node:fs/promises";

const CURRENT_FILE = fileURLToPath(
    import.meta.url
);

const CURRENT_DIR = path.dirname(
    CURRENT_FILE
);

/*
    backend/src/utils
    ../../uploads
    ↓
    backend/uploads
*/
const UPLOAD_DIR = path.resolve(
    CURRENT_DIR,
    "../../uploads"
);

async function ensureUploadDir() {
    await mkdir(
        UPLOAD_DIR,
        {
            recursive: true,
        }
    );
}

function getSafeExtension(
    originalName: string
): string {
    const extension =
        path.extname(
            originalName
        ).toLowerCase();

    const allowedExtensions =
        new Set([
            ".jpg",
            ".jpeg",
            ".png",
            ".gif",
            ".webp",
            ".pdf",
            ".txt",
        ]);

    if (
        !allowedExtensions.has(
            extension
        )
    ) {
        return "";
    }

    return extension;
}

export async function saveUploadedFile(
    buffer: Buffer,
    storageKey: string
): Promise<void> {
    await ensureUploadDir();

    const safeStorageKey =
        path.basename(storageKey);

    if (
        safeStorageKey !== storageKey
    ) {
        throw new Error(
            "Invalid storage key"
        );
    }

    const extension =
        path.extname(
            safeStorageKey
        ).toLowerCase();

    const allowedExtensions =
        new Set([
            ".jpg",
            ".jpeg",
            ".png",
            ".gif",
            ".webp",
            ".pdf",
            ".txt",
        ]);

    if (
        !allowedExtensions.has(
            extension
        )
    ) {
        throw new Error(
            "Unsupported file extension"
        );
    }

    const filePath =
        path.join(
            UPLOAD_DIR,
            safeStorageKey
        );

    await writeFile(
        filePath,
        buffer
    );

    console.log(
        `Attachment saved: ${filePath}`
    );
}

export async function deleteUploadedFile(
    storageKey: string
): Promise<void> {
    try {
        const filePath =
            getUploadedFilePath(
                storageKey
            );

        await unlink(
            filePath
        );
    } catch {
        // File may already be missing.
    }
}

export function getUploadedFilePath(
    storageKey: string
): string {
    const safeStorageKey =
        path.basename(
            storageKey
        );

    return path.join(
        UPLOAD_DIR,
        safeStorageKey
    );
}