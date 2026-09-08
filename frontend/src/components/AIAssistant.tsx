import {
    useEffect,
    useRef,
    useState,
    type FormEvent,
} from "react";

import {
    askAI,
    summarizeChat,
} from "../services/ai";

interface AIAssistantProps {
    roomId: string | null;
}

interface ChatItem {
    id: number;
    role: "user" | "assistant";
    content: string;
    model?: string;
}

function formatAIText(text: string) {
    return text
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/\r\n/g, "\n")
        .trim();
}

function AIAssistant({ roomId }: AIAssistantProps) {
    const [open, setOpen] = useState(false);

    const [messages, setMessages] =
        useState<ChatItem[]>([]);

    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [summarizing, setSummarizing] = useState(false);
    const [summary, setSummary] = useState("");
    const [error, setError] = useState("");

    const messagesRef =
        useRef<HTMLDivElement | null>(null);

    const [buttonPosition, setButtonPosition] =
        useState({ x: 0, y: 0 });

    const buttonDragRef = useRef({
        dragging: false,
        moved: false,
        startX: 0,
        startY: 0,
    });

    const handleButtonPointerDown = (
        event: React.PointerEvent<HTMLButtonElement>
    ) => {
        buttonDragRef.current = {
            dragging: true,
            moved: false,
            startX: event.clientX,
            startY: event.clientY,
        };

        event.currentTarget.setPointerCapture(
            event.pointerId
        );
    };

    const handleButtonPointerMove = (
        event: React.PointerEvent<HTMLButtonElement>
    ) => {
        const drag = buttonDragRef.current;

        if (!drag.dragging) {
            return;
        }

        const dx = event.clientX - drag.startX;
        const dy = event.clientY - drag.startY;

        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
            drag.moved = true;
        }

        setButtonPosition((current) => {
            const buttonSize = 52;
            const margin = 10;

            const maxX =
                Math.max(
                    0,
                    window.innerWidth -
                    buttonSize -
                    margin
                );

            const maxY =
                Math.max(
                    0,
                    window.innerHeight -
                    buttonSize -
                    margin
                );

            const nextX = Math.min(
                Math.max(
                    current.x + dx,
                    -(
                        window.innerWidth -
                        buttonSize -
                        margin -
                        24
                    )
                ),
                maxX - (window.innerWidth - 24 - buttonSize)
            );

            const nextY = Math.min(
                Math.max(
                    current.y + dy,
                    -(
                        window.innerHeight -
                        buttonSize -
                        margin -
                        20
                    )
                ),
                maxY - (window.innerHeight - 20 - buttonSize)
            );

            return {
                x: nextX,
                y: nextY,
            };
        });

        drag.startX = event.clientX;
        drag.startY = event.clientY;
    };

    const handleButtonPointerUp = (
        event?: React.PointerEvent<HTMLButtonElement>
    ) => {
        buttonDragRef.current.dragging = false;

        if (
            event &&
            event.currentTarget.hasPointerCapture(
                event.pointerId
            )
        ) {
            event.currentTarget.releasePointerCapture(
                event.pointerId
            );
        }
    };

    const handleButtonClick = () => {
        if (buttonDragRef.current.moved) {
            buttonDragRef.current.moved = false;
            return;
        }

        setOpen((current) => !current);
    };

    useEffect(() => {
        messagesRef.current?.scrollTo({
            top: messagesRef.current.scrollHeight,
            behavior: "smooth",
        });
    }, [messages, summary, loading]);

    useEffect(() => {
        setMessages([]);
        setSummary("");
        setError("");
        setInput("");
    }, [roomId]);

    const handleSubmit = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        const text = input.trim();

        if (!text || loading) {
            return;
        }

        setError("");

        setMessages((current) => [
            ...current,
            {
                id: Date.now(),
                role: "user",
                content: text,
            },
        ]);

        setInput("");
        setLoading(true);

        try {
            const result = await askAI(text);

            setMessages((current) => [
                ...current,
                {
                    id: Date.now() + 1,
                    role: "assistant",
                    content: result.response,
                    model: result.model,
                },
            ]);
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : "Failed to get AI response"
            );
        } finally {
            setLoading(false);
        }
    };

    const handleSummarize = async () => {
        if (!roomId || summarizing) {
            return;
        }

        setError("");
        setSummarizing(true);

        try {
            const result =
                await summarizeChat(roomId);

            setSummary(
                formatAIText(result.summary)
            );
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : "Failed to summarize chat"
            );
        } finally {
            setSummarizing(false);
        }
    };

    const panelOpensRight =
        window.innerWidth - 24 - 52 + buttonPosition.x < 382;

    return (
        <div
            className={`ai-assistant-wrapper ${panelOpensRight
                    ? "ai-panel-opens-right"
                    : "ai-panel-opens-up"
                }`}
            style={{
                transform: `translate(${buttonPosition.x}px, ${buttonPosition.y}px)`,
            }}
        >
            {open && (
                <aside className="ai-assistant">
                    <header className="ai-assistant-header">
                        <div className="ai-assistant-title">
                            <div className="ai-avatar">
                                ✦
                            </div>

                            <div>
                                <h3>AI Assistant</h3>

                                <span>
                                    Gemma 3 · Local
                                </span>
                            </div>
                        </div>

                        <button
                            type="button"
                            className="ai-close-button"
                            onClick={() =>
                                setOpen(false)
                            }
                            aria-label="Close"
                        >
                            ×
                        </button>
                    </header>

                    <div className="ai-assistant-toolbar">
                        <button
                            type="button"
                            onClick={handleSummarize}
                            disabled={
                                !roomId ||
                                summarizing
                            }
                        >
                            {summarizing
                                ? "Summarizing..."
                                : "Summarize chat"}
                        </button>

                        {messages.length > 0 && (
                            <button
                                type="button"
                                onClick={() => {
                                    setMessages([]);
                                    setError("");
                                }}
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    <div
                        ref={messagesRef}
                        className="ai-assistant-content"
                    >
                        {summary && (
                            <section className="ai-summary-card">
                                <div className="ai-card-title">
                                    Chat Summary
                                </div>

                                <p>{summary}</p>
                            </section>
                        )}

                        {messages.length === 0 &&
                            !loading && (
                                <div className="ai-welcome">
                                    <div className="ai-welcome-icon">
                                        ✦
                                    </div>

                                    <h4>
                                        How can I help?
                                    </h4>

                                    <p>
                                        Ask me anything,
                                        get help with
                                        your work, or
                                        summarize this
                                        conversation.
                                    </p>

                                    <div className="ai-suggestions">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setInput(
                                                    "Summarize this chat"
                                                )
                                            }
                                        >
                                            Summarize
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setInput(
                                                    "What are the main topics in this chat?"
                                                )
                                            }
                                        >
                                            Main topics
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setInput(
                                                    "Help me with this project"
                                                )
                                            }
                                        >
                                            Help me
                                        </button>
                                    </div>
                                </div>
                            )}

                        <div className="ai-messages">
                            {messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={`ai-message ${message.role ===
                                        "user"
                                        ? "ai-message-user"
                                        : "ai-message-assistant"
                                        }`}
                                >
                                    <div className="ai-message-name">
                                        {message.role ===
                                            "user"
                                            ? "You"
                                            : "Gemma 3"}
                                    </div>

                                    <div className="ai-message-text">
                                        {formatAIText(
                                            message.content
                                        )}
                                    </div>

                                    {message.model && (
                                        <div className="ai-message-model">
                                            {message.model}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {loading && (
                            <div className="ai-typing">
                                <span />
                                <span />
                                <span />

                                <small>
                                    Gemma 3 is thinking
                                </small>
                            </div>
                        )}

                        {error && (
                            <div className="ai-error">
                                {error}
                            </div>
                        )}
                    </div>

                    <form
                        className="ai-assistant-input"
                        onSubmit={handleSubmit}
                    >
                        <input
                            type="text"
                            value={input}
                            onChange={(event) =>
                                setInput(
                                    event.target.value
                                )
                            }
                            placeholder="Ask Gemma 3..."
                            disabled={loading}
                            maxLength={4000}
                        />

                        <button
                            type="submit"
                            disabled={
                                loading ||
                                !input.trim()
                            }
                            aria-label="Send message"
                        >
                            ↑
                        </button>
                    </form>
                </aside>
            )}

            <button
                type="button"
                className="ai-floating-button"
                style={{
                    touchAction: "none",
                }}
                onPointerDown={
                    handleButtonPointerDown
                }
                onPointerMove={
                    handleButtonPointerMove
                }
                onPointerUp={
                    handleButtonPointerUp
                }
                onPointerCancel={
                    handleButtonPointerUp
                }
                onClick={handleButtonClick}
                aria-label={
                    open
                        ? "Close AI Assistant"
                        : "Open AI Assistant"
                }
                title="AI Assistant"
            >
                {open ? "×" : "✦"}
            </button>
        </div>
    );
}

export default AIAssistant;