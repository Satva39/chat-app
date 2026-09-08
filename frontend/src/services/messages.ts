import { apiRequest } from "./api";
import type { Message } from "../types/chat";

export interface MessageCursor {
    createdAt: string;
    id: string;
}

export interface MessagesResponse {
    messages: Message[];
    hasMore: boolean;
    nextCursor: MessageCursor | null;
}

export async function getMessages(
    roomId: string,
    limit = 50,
    before?: MessageCursor | null
): Promise<MessagesResponse> {
    const params = new URLSearchParams();

    params.set("limit", String(limit));

    if (before) {
        params.set(
            "beforeCreatedAt",
            before.createdAt
        );

        params.set(
            "beforeId",
            before.id
        );
    }

    const response =
        await apiRequest<MessagesResponse>(
            `/api/rooms/${roomId}/messages?${params.toString()}`
        );

    return response;
}