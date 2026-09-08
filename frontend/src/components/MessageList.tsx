import type { Message } from "../types/chat";
import {
    getAttachmentUrl,
} from "../services/attachments";

interface MessageListProps {
    messages: Message[];
    currentUserId?: string | null;
    readMessageIds?: string[];

    onEditMessage?: (
        message: Message
    ) => void;

    onDeleteMessage?: (
        message: Message
    ) => void;

    onReplyMessage?: (
        message: Message
    ) => void;

    onReaction?: (
        message: Message,
        reaction: string
    ) => void;

    messageReactions?: Record<
        string,
        {
            userId: string;
            reaction: string;
        }[]
    >;
}

const reactionOptions = [
    "😀",
    "❤️",
    "👍",
    "😂",
    "😮",
    "😢",
];

function MessageList({
    messages,
    currentUserId,
    readMessageIds = [],
    onEditMessage,
    onDeleteMessage,
    onReplyMessage,
    onReaction,
    messageReactions = {},
}: MessageListProps) {
    return (
        <main className="message-list">
            {messages.map((message) => {
                const isMine =
                    message.sender_id ===
                    currentUserId;

                const isDeleted =
                    Boolean(
                        message.deleted_at
                    );

                const isRead =
                    readMessageIds.includes(
                        message.id
                    );

                const reactions =
                    messageReactions[
                    message.id
                    ] ?? [];

                return (
                    <div
                        key={message.id}
                        className={`message-row ${isMine
                                ? "sent"
                                : "received"
                            }`}
                    >
                        <div className="message-bubble">

                            {isDeleted ? (
                                <p className="deleted-message">
                                    This message was deleted
                                </p>
                            ) : (
                                <>
                                    {message.content && (
                                        <p>
                                            {
                                                message.content
                                            }
                                        </p>
                                    )}

                                    {message.attachment && (
                                        <div className="message-attachment">

                                            {message.attachment.mime_type.startsWith(
                                                "image/"
                                            ) ? (
                                                <a
                                                    href={getAttachmentUrl(
                                                        message.attachment.storage_key
                                                    )}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="attachment-image-link"
                                                >
                                                    <img
                                                        src={getAttachmentUrl(
                                                            message.attachment.storage_key
                                                        )}
                                                        alt={
                                                            message.attachment
                                                                .original_name
                                                        }
                                                        className="attachment-image"
                                                        loading="lazy"
                                                    />
                                                </a>
                                            ) : (
                                                <a
                                                    href={getAttachmentUrl(
                                                        message.attachment.storage_key
                                                    )}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="attachment-file"
                                                >
                                                    <span>
                                                        📎
                                                    </span>

                                                    <span>
                                                        {
                                                            message.attachment
                                                                .original_name
                                                        }
                                                    </span>
                                                </a>
                                            )}

                                        </div>
                                    )}
                                </>
                            )}

                            {!isDeleted &&
                                onReaction && (
                                    <div className="message-reactions">
                                        {reactionOptions.map(
                                            (reaction) => {
                                                const count =
                                                    reactions.filter(
                                                        (item) =>
                                                            item.reaction ===
                                                            reaction
                                                    ).length;

                                                return (
                                                    <button
                                                        key={reaction}
                                                        type="button"
                                                        className="reaction-button"
                                                        onClick={() =>
                                                            onReaction(
                                                                message,
                                                                reaction
                                                            )
                                                        }
                                                    >
                                                        {reaction}

                                                        {count >
                                                            0 && (
                                                                <span className="reaction-count">
                                                                    {count}
                                                                </span>
                                                            )}
                                                    </button>
                                                );
                                            }
                                        )}
                                    </div>
                                )}

                            <span className="message-time">
                                {message.time ??
                                    new Date(
                                        message.created_at
                                    ).toLocaleTimeString(
                                        [],
                                        {
                                            hour:
                                                "2-digit",
                                            minute:
                                                "2-digit",
                                        }
                                    )}

                                {message.edited_at &&
                                    !isDeleted &&
                                    " · Edited"}

                                {isMine &&
                                    !isDeleted &&
                                    ` · ${isRead
                                        ? "Read"
                                        : "Sent"
                                    }`}
                            </span>

                            {!isDeleted && (
                                <div className="message-actions">

                                    {onReplyMessage && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                onReplyMessage(
                                                    message
                                                )
                                            }
                                        >
                                            Reply
                                        </button>
                                    )}

                                    {isMine &&
                                        onEditMessage && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    onEditMessage(
                                                        message
                                                    )
                                                }
                                            >
                                                Edit
                                            </button>
                                        )}

                                    {isMine &&
                                        onDeleteMessage && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    onDeleteMessage(
                                                        message
                                                    )
                                                }
                                            >
                                                Delete
                                            </button>
                                        )}

                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </main>
    );
}

export default MessageList;