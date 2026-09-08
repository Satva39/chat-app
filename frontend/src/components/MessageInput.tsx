import {
    useEffect,
    useRef,
    useState,
    type FormEvent,
} from "react";
import {
    startTyping,
    stopTyping,
} from "../services/socket";

import {
    uploadAttachment,
} from "../services/attachments";

interface MessageInputProps {
    roomId: string;
    onSend: (message: string) => void;
    replyingTo?: {
        id: string;
        content: string;
    } | null;
    onCancelReply?: () => void;
    onAttachmentUploaded?: (
        result: Awaited<
            ReturnType<
                typeof uploadAttachment
            >
        >
    ) => void;
    onSuggestedMessage?: (
        message: string
    ) => void;
    suggestedMessage?: string;
}

function MessageInput({
    roomId,
    onSend,
    replyingTo = null,
    onCancelReply,
    onAttachmentUploaded,
    suggestedMessage = "",
}: MessageInputProps) {
    const [message, setMessage] =
        useState("");

    useEffect(() => {
        if (!suggestedMessage) {
            return;
        }

        setMessage(
            suggestedMessage
        );
    }, [suggestedMessage]);

    const [uploadingFile, setUploadingFile] =
        useState(false);

    const typingTimer =
        useRef<ReturnType<
            typeof setTimeout
        > | null>(null);

    const handleChange = (
        value: string
    ) => {
        setMessage(value);

        if (!roomId) {
            return;
        }

        startTyping(roomId);

        if (typingTimer.current) {
            clearTimeout(
                typingTimer.current
            );
        }

        typingTimer.current =
            setTimeout(() => {
                stopTyping(roomId);
            }, 1000);
    };

    const handleFileChange = async (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file =
            event.target.files?.[0];

        event.target.value = "";

        if (!file || !roomId) {
            return;
        }

        try {
            setUploadingFile(true);

            const result =
                await uploadAttachment(
                    roomId,
                    file
                );

            onAttachmentUploaded?.(
                result
            );
        } catch (error) {
            alert(
                error instanceof Error
                    ? error.message
                    : "Failed to upload file"
            );
        } finally {
            setUploadingFile(false);
        }
    };

    const handleSubmit = (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        const trimmedMessage =
            message.trim();

        if (!trimmedMessage) {
            return;
        }

        onSend(trimmedMessage);
        setMessage("");

        stopTyping(roomId);
    };

    useEffect(() => {
        return () => {
            if (typingTimer.current) {
                clearTimeout(
                    typingTimer.current
                );
            }

            stopTyping(roomId);
        };
    }, [roomId]);

    return (
        <>
            {replyingTo && (
                <div className="replying-to">
                    <div>
                        <strong>
                            Replying to
                        </strong>

                        <span>
                            {replyingTo.content}
                        </span>
                    </div>

                    {onCancelReply && (
                        <button
                            type="button"
                            onClick={onCancelReply}
                            aria-label="Cancel reply"
                        >
                            ×
                        </button>
                    )}
                </div>
            )}

            <form
                className="message-input-area"
                onSubmit={handleSubmit}
            >
                <label
                    className="input-action"
                    aria-label="Attach file"
                >
                    +
                    <input
                        type="file"
                        hidden
                        disabled={
                            uploadingFile
                        }
                        accept={[
                            "image/jpeg",
                            "image/png",
                            "image/gif",
                            "image/webp",
                            "application/pdf",
                            "text/plain",
                        ].join(",")}
                        onChange={
                            handleFileChange
                        }
                    />
                </label>

                <input
                    type="text"
                    value={message}
                    onChange={(event) =>
                        handleChange(
                            event.target.value
                        )
                    }
                    placeholder="Write a message..."
                    aria-label="Write a message"
                />

                <button
                    type="submit"
                    className="send-button"
                >
                    Send
                </button>
            </form>

        </>
    );
}

export default MessageInput;