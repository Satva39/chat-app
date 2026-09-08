export interface UploadedAttachment {
    id: string;
    message_id: string;
    original_name: string;
    storage_key: string;
    mime_type: string;
    size_bytes: number;
    created_at: string;
}

export interface AttachmentMessage {
    id: string;
    room_id: string;
    sender_id: string;
    content: string;
    created_at: string;
    edited_at: string | null;
    deleted_at: string | null;
    reply_to_message_id:
    | string
    | null;
    attachment?: UploadedAttachment;
}

const API_URL =
    import.meta.env.VITE_API_URL ||
    (import.meta.env.PROD
        ? "https://chat-app-backend-mqql.onrender.com"
        : "http://localhost:5000");

export async function uploadAttachment(
    roomId: string,
    file: File
): Promise<{
    message: AttachmentMessage;
    attachment: UploadedAttachment;
}> {
    const formData =
        new FormData();

    formData.append(
        "file",
        file
    );

    const response =
        await fetch(
            `${API_URL}/api/rooms/${roomId}/attachments`,
            {
                method: "POST",
                credentials:
                    "include",
                body: formData,
            }
        );

    const data =
        await response.json();

    if (!response.ok) {
        throw new Error(
            data.message ||
            "Failed to upload file"
        );
    }

    return data;
}

export function getAttachmentUrl(
    storageKey: string
): string {
    return `${API_URL}/api/attachments/${encodeURIComponent(
        storageKey
    )}`;
}