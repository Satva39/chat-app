export interface ChatData {
    id: string;
    name: string;
    lastMessage: string;
    time: string;
    online: boolean;
    unread: number;
}

export interface Chat {
    id: string;
    name: string;
    description?: string;
    room_type: "direct" | "group";
    is_private: boolean;
}

export interface MessageReaction {
    message_id: string;
    user_id: string;
    reaction: string;
    created_at: string;
}

export interface MessageAttachment {
    id: string;
    message_id: string;
    original_name: string;
    storage_key: string;
    mime_type: string;
    size_bytes: number;
    created_at: string;
}

export interface Message {
    id: string;

    room_id: string;
    sender_id: string;
    content: string;

    created_at: string;
    edited_at: string | null;
    deleted_at: string | null;
    reply_to_message_id: string | null;

    // UI fields
    sender?: "me" | "other";
    text?: string;
    time?: string;
    reactions?: MessageReaction[];
    attachment?: MessageAttachment;
}
