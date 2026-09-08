import { sql } from "../config/database.js";
import {
    access,
} from "node:fs/promises";

import {
    getUploadedFilePath,
} from "../utils/file-storage.js";

interface AttachmentRow {
    id: string;
    storage_key: string;
}

export async function cleanupMissingAttachments(): Promise<void> {
    const attachments =
        await sql`
        SELECT
            id,
            storage_key
        FROM attachments
    `;

    let removed = 0;

    for (const attachment of attachments as AttachmentRow[]) {
        const filePath =
            getUploadedFilePath(
                attachment.storage_key
            );

        try {
            await access(filePath);
        } catch {
            await sql`
                DELETE FROM attachments
                WHERE id = ${attachment.id}
            `;

            removed += 1;

            console.log(
                `Removed missing attachment record: ${attachment.storage_key}`
            );
        }
    }

    if (removed > 0) {
        console.log(
            `Attachment cleanup removed ${removed} missing file record(s)`
        );
    }
}