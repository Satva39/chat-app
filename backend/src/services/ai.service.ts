const AI_SERVICE_URL =
    process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";

const AI_INTERNAL_TOKEN =
    process.env.AI_INTERNAL_TOKEN || "";

interface AIChatResponse {
    response: string;
    model: string;
}

interface AISummarizeResponse {
    summary: string;
    model: string;
}

interface AISearchMessage {
    id: string;
    content: string;
}

interface AISearchResponse {
    message_ids: string[];
    model: string;
}

interface AISpamResponse {
    is_spam: boolean;
    confidence: number;
    reason: string;
    model: string;
}

async function aiFetch(
    endpoint: string,
    body: unknown,
): Promise<Response> {
    if (!AI_INTERNAL_TOKEN) {
        throw new Error("AI_INTERNAL_TOKEN is not configured");
    }

    return fetch(`${AI_SERVICE_URL}${endpoint}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-AI-Internal-Token": AI_INTERNAL_TOKEN,
        },
        body: JSON.stringify(body),
    });
}

export async function pingAIService() {
    if (!AI_INTERNAL_TOKEN) {
        throw new Error("AI_INTERNAL_TOKEN is not configured");
    }

    const response = await fetch(
        `${AI_SERVICE_URL}/internal/ping`,
        {
            method: "GET",
            headers: {
                "X-AI-Internal-Token": AI_INTERNAL_TOKEN,
            },
        },
    );

    if (!response.ok) {
        const body = await response.text();

        throw new Error(
            `AI service returned ${response.status}: ${body}`,
        );
    }

    return response.json() as Promise<{
        status: string;
        service: string;
        message: string;
    }>;
}

export async function askAI(
    message: string,
): Promise<AIChatResponse> {
    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
        throw new Error("Message is required");
    }

    if (trimmedMessage.length > 4000) {
        throw new Error("Message is too long");
    }

    const response = await aiFetch(
        "/internal/chat",
        {
            message: trimmedMessage,
        },
    );

    if (!response.ok) {
        const body = await response.text();

        throw new Error(
            `AI service returned ${response.status}: ${body}`,
        );
    }

    return response.json() as Promise<AIChatResponse>;
}

export async function summarizeMessages(
    messages: string[],
): Promise<AISummarizeResponse> {
    if (messages.length === 0) {
        throw new Error("Messages are required");
    }

    if (messages.length > 50) {
        throw new Error("Too many messages");
    }

    const cleanedMessages = messages
        .map((message) => message.trim())
        .filter(Boolean);

    if (cleanedMessages.length === 0) {
        throw new Error("Messages are required");
    }

    const response = await aiFetch(
        "/internal/summarize",
        {
            messages: cleanedMessages,
        },
    );

    if (!response.ok) {
        const body = await response.text();

        throw new Error(
            `AI service returned ${response.status}: ${body}`,
        );
    }

    return response.json() as Promise<AISummarizeResponse>;
}

export async function smartSearchMessages(
    query: string,
    messages: AISearchMessage[]
): Promise<AISearchResponse> {
    const trimmedQuery =
        query.trim();

    if (!trimmedQuery) {
        throw new Error(
            "Search query is required"
        );
    }

    if (trimmedQuery.length > 500) {
        throw new Error(
            "Search query is too long"
        );
    }

    if (messages.length === 0) {
        return {
            message_ids: [],
            model: "gemma3",
        };
    }

    if (messages.length > 100) {
        throw new Error(
            "Too many messages"
        );
    }

    /*
     * First do a very fast local ranking.
     *
     * This prevents us from sending all 100 messages
     * to Gemma for every search.
     */
    const queryWords =
        trimmedQuery
            .toLowerCase()
            .split(/\s+/)
            .map((word) =>
                word.replace(
                    /[^a-z0-9]/g,
                    ""
                )
            )
            .filter(
                (word) =>
                    word.length >= 2
            );

    const scoredMessages =
        messages.map(
            (message, index) => {
                const content =
                    message.content.toLowerCase();

                let score = 0;

                for (const word of queryWords) {
                    if (
                        content.includes(word)
                    ) {
                        score += 10;
                    }
                }

                /*
                 * Keep recent messages as candidates
                 * even when there is no exact word match.
                 */
                const recencyScore =
                    Math.max(
                        0,
                        5 - index * 0.05
                    );

                score += recencyScore;

                return {
                    message,
                    score,
                };
            }
        );

    scoredMessages.sort(
        (a, b) =>
            b.score - a.score
    );

    /*
     * Only send the best 25 candidates to Gemma.
     */
    const candidates =
        scoredMessages
            .slice(0, 25)
            .map(
                (item) =>
                    item.message
            );

    const formattedMessages =
        candidates
            .map(
                (message) =>
                    `[${message.id}] ${message.content}`
            )
            .join("\n");

    const prompt = `
Find the messages that are most relevant
to the user's search request.

Search:
${trimmedQuery}

Messages:
${formattedMessages}

Rules:
- Match by meaning, not only exact words.
- Return ONLY matching message IDs.
- Use only IDs provided above.
- Return at most 10 IDs.
- If nothing matches, return NONE.
`;

    const response =
        await aiFetch(
            "/internal/search",
            {
                query: trimmedQuery,
                messages: candidates,
            }
        );

    if (!response.ok) {
        const body =
            await response.text();

        throw new Error(
            `AI service returned ${response.status}: ${body}`
        );
    }

    return response.json() as Promise<AISearchResponse>;
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

    const response = await aiFetch(
        "/internal/spam-check",
        {
            message: trimmedMessage,
        }
    );

    if (!response.ok) {
        const body =
            await response.text();

        throw new Error(
            `AI service returned ${response.status}: ${body}`
        );
    }

    const data =
        await response.json();

    return data as AISpamResponse;
}

interface AIToxicityResponse {
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

    const response = await aiFetch(
        "/internal/toxicity-check",
        {
            message: trimmedMessage,
        }
    );

    if (!response.ok) {
        const body =
            await response.text();

        throw new Error(
            `AI service returned ${response.status}: ${body}`
        );
    }

    const data =
        await response.json();

    return data as AIToxicityResponse;
}

interface AIModerationResponse {
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

    const response = await aiFetch(
        "/internal/moderate",
        {
            message: trimmedMessage,
        }
    );

    if (!response.ok) {
        const body =
            await response.text();

        throw new Error(
            `AI service returned ${response.status}: ${body}`
        );
    }

    const data =
        await response.json();

    return data as AIModerationResponse;
}

interface AISmartReplyResponse {
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

    const response = await aiFetch(
        "/internal/smart-replies",
        {
            message: trimmedMessage,
        }
    );

    if (!response.ok) {
        const body =
            await response.text();

        throw new Error(
            `AI service returned ${response.status}: ${body}`
        );
    }

    const data =
        await response.json();

    return data as AISmartReplyResponse;
}