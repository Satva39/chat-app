// import { useState } from "react";
import type { ChatData } from "../types/chat";

interface SidebarProps {
    chats: ChatData[];
    selectedChatId: string;
    onSelectChat: (id: string) => void;
    onNewChat: () => void;
    searchQuery: string;
    onSearchChange: (value: string) => void;
}

function Sidebar({
    chats,
    selectedChatId,
    onSelectChat,
    onNewChat,
    searchQuery,
    onSearchChange,
}: SidebarProps) {

    const filteredChats = chats.filter(
        (chat) =>
            chat.name
                .toLowerCase()
                .includes(
                    searchQuery
                        .trim()
                        .toLowerCase()
                )
    );

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <h2>Messages</h2>

                <button
                    type="button"
                    className="new-chat-button"
                    onClick={onNewChat}
                >
                    New
                </button>
            </div>

            <input
                type="search"
                className="chat-search"
                value={searchQuery}
                onChange={(event) =>
                    onSearchChange(
                        event.target.value
                    )
                }
                placeholder="Search chats..."
                aria-label="Search chats"
            />

            <div className="chat-list">
                {filteredChats.length === 0 ? (
                    <div className="empty-search">
                        No chats found
                    </div>
                ) : (
                    filteredChats.map((chat) => (
                        <button
                            type="button"
                            key={chat.id}
                            className={`chat-item ${selectedChatId === chat.id
                                ? "active"
                                : ""
                                }`}
                            onClick={() =>
                                onSelectChat(chat.id)
                            }
                        >
                            <div className="avatar">
                                {chat.name
                                    .charAt(0)
                                    .toUpperCase()}
                            </div>

                            <div className="chat-item-content">
                                <div className="chat-item-top">
                                    <strong>{chat.name}</strong>
                                    <span>{chat.time}</span>
                                </div>

                                <div className="chat-item-bottom">
                                    <span>
                                        {chat.lastMessage}
                                    </span>

                                    {chat.unread > 0 && (
                                        <span className="unread-count">
                                            {chat.unread}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </button>
                    ))
                )}
            </div>
        </aside>
    );
}

export default Sidebar;
