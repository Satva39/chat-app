const API_URL =
    import.meta.env.VITE_API_URL ||
    "http://localhost:5000";

export interface AIChatResponse {
    response: string;
    model: string;
}

export interface AISummarizeResponse {
    summary: string;
    model: string;
}

export async function askAI(
    message: string
): Promise<AIChatResponse> {
    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
        throw new Error("Message is required");
    }

    if (trimmedMessage.length > 4000) {
        throw new Error("Message is too long");
    }

    const response = await fetch(
        `${API_URL}/api/ai/chat`,
        {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                message: trimmedMessage,
            }),
        }
    );

    let data: unknown;

    try {
        data = await response.json();
    } catch {
        throw new Error(
            "Invalid response from AI service"
        );
    }

    if (!response.ok) {
        const message =
            typeof data === "object" &&
                data !== null &&
                "message" in data &&
                typeof data.message === "string"
                ? data.message
                : "Failed to get AI response";

        throw new Error(message);
    }

    return data as AIChatResponse;
}

export async function summarizeChat(
    roomId: string
): Promise<AISummarizeResponse> {
    if (!roomId) {
        throw new Error("Room ID is required");
    }

    const response = await fetch(
        `${API_URL}/api/ai/summarize`,
        {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                roomId,
            }),
        }
    );

    let data: unknown;

    try {
        data = await response.json();
    } catch {
        throw new Error(
            "Invalid response from AI service"
        );
    }

    if (!response.ok) {
        const message =
            typeof data === "object" &&
                data !== null &&
                "message" in data &&
                typeof data.message === "string"
                ? data.message
                : "Failed to summarize chat";

        throw new Error(message);
    }

    return data as AISummarizeResponse;
}

export interface AISearchResponse {
    message_ids: string[];
    model: string;
}

export async function smartSearchChat(
    roomId: string,
    query: string
): Promise<AISearchResponse> {
    const trimmedQuery = query.trim();

    if (!roomId) {
        throw new Error("Room ID is required");
    }

    if (!trimmedQuery) {
        throw new Error("Search query is required");
    }

    const response = await fetch(
        `${API_URL}/api/ai/search`,
        {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                roomId,
                query: trimmedQuery,
            }),
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.message ||
            "Smart search failed"
        );
    }

    return data as AISearchResponse;
}

export interface AISpamResponse {
    is_spam: boolean;
    confidence: number;
    reason: string;
    model: string;
}

export async function checkSpam(
    message: string
): Promise<AISpamResponse> {
    const trimmedMessage =
        message.trim();

    if (!trimmedMessage) {
        throw new Error(
            "Message is required"
        );
    }

    if (trimmedMessage.length > 4000) {
        throw new Error(
            "Message is too long"
        );
    }

    const response = await fetch(
        `${API_URL}/api/ai/spam-check`,
        {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type":
                    "application/json",
            },
            body: JSON.stringify({
                message:
                    trimmedMessage,
            }),
        }
    );

    const data =
        await response.json();

    if (!response.ok) {
        throw new Error(
            data.message ||
            "Spam detection failed"
        );
    }

    return data as AISpamResponse;
}

export interface AIToxicityResponse {
    is_toxic: boolean;
    confidence: number;
    reason: string;
    model: string;
}

export async function checkToxicity(
    message: string
): Promise<AIToxicityResponse> {
    const trimmedMessage =
        message.trim();

    if (!trimmedMessage) {
        throw new Error(
            "Message is required"
        );
    }

    if (trimmedMessage.length > 4000) {
        throw new Error(
            "Message is too long"
        );
    }

    const response = await fetch(
        `${API_URL}/api/ai/toxicity-check`,
        {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type":
                    "application/json",
            },
            body: JSON.stringify({
                message:
                    trimmedMessage,
            }),
        }
    );

    const data =
        await response.json();

    if (!response.ok) {
        throw new Error(
            data.message ||
            "Toxicity detection failed"
        );
    }

    return data as AIToxicityResponse;
}

export interface AIModerationResponse {
    allowed: boolean;
    is_spam: boolean;
    is_toxic: boolean;
    confidence: number;
    reason: string;
    model: string;
}

export async function moderateMessage(
    message: string
): Promise<AIModerationResponse> {
    const trimmedMessage =
        message.trim();

    if (!trimmedMessage) {
        throw new Error(
            "Message is required"
        );
    }

    if (trimmedMessage.length > 4000) {
        throw new Error(
            "Message is too long"
        );
    }

    const response = await fetch(
        `${API_URL}/api/ai/moderate`,
        {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type":
                    "application/json",
            },
            body: JSON.stringify({
                message:
                    trimmedMessage,
            }),
        }
    );

    const data =
        await response.json();

    if (!response.ok) {
        throw new Error(
            data.message ||
            "Auto moderation failed"
        );
    }

    return data as AIModerationResponse;
}

export interface AISmartReplyResponse {
    replies: string[];
    model: string;
}

export async function generateSmartReplies(
    message: string
): Promise<AISmartReplyResponse> {
    const trimmedMessage =
        message.trim();

    if (!trimmedMessage) {
        throw new Error(
            "Message is required"
        );
    }

    if (trimmedMessage.length > 4000) {
        throw new Error(
            "Message is too long"
        );
    }

    const response = await fetch(
        `${API_URL}/api/ai/smart-replies`,
        {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type":
                    "application/json",
            },
            body: JSON.stringify({
                message:
                    trimmedMessage,
            }),
        }
    );

    const data =
        await response.json();

    if (!response.ok) {
        throw new Error(
            data.message ||
            "Smart replies failed"
        );
    }

    return data as AISmartReplyResponse;
}