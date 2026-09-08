import { useState } from "react";

interface ChatHeaderProps {
    name: string;
    status: string;
    onSearch: (query: string) => void;
}

function ChatHeader({
    name,
    status,
    onSearch,
}: ChatHeaderProps) {
    const isOnline =
        status !== "Offline";

    const [searchOpen, setSearchOpen] =
        useState(false);

    const [query, setQuery] =
        useState("");

    const handleSubmit = (
        event: React.FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        const trimmedQuery =
            query.trim();

        if (!trimmedQuery) {
            return;
        }

        onSearch(trimmedQuery);
    };

    const handleClose = () => {
        setSearchOpen(false);
        setQuery("");
        onSearch("");
    };

    return (
        <div className="chat-header">
            <div className="avatar">
                {name
                    .charAt(0)
                    .toUpperCase()}
            </div>

            <div>
                <h2>{name}</h2>

                <span
                    className={
                        isOnline
                            ? "online-status"
                            : "offline-status"
                    }
                >
                    {status}
                </span>
            </div>

            <div className="chat-header-actions">
                {searchOpen ? (
                    <form
                        className="chat-header-search"
                        onSubmit={handleSubmit}
                    >
                        <div className="chat-header-search-input">
                            <input
                                type="text"
                                value={query}
                                onChange={(event) =>
                                    setQuery(event.target.value)
                                }
                                placeholder="Search messages..."
                                autoFocus
                            />

                            {query && (
                                <button
                                    type="button"
                                    className="chat-header-search-clear"
                                    onClick={handleClose}
                                    aria-label="Clear search"
                                >
                                    ×
                                </button>
                            )}
                        </div>

                        <button
                            type="submit"
                            className="chat-header-search-submit"
                        >
                            Search
                        </button>
                    </form>
                ) : (
                    <button
                        type="button"
                        onClick={() =>
                            setSearchOpen(true)
                        }
                    >
                        Search
                    </button>
                )}

                <button
                    type="button"
                >
                    More
                </button>
            </div>
        </div>
    );
}

export default ChatHeader;
