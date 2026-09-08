import { io, type Socket } from "socket.io-client";

const SOCKET_URL =
    import.meta.env.VITE_API_URL ||
    "http://localhost:5000";

export const socket: Socket = io(SOCKET_URL, {
    autoConnect: false,
    withCredentials: true,
});

let desiredRoomId: string | null = null;
let joinedRoomId: string | null = null;

let pendingJoin: {
    roomId: string;
    promise: Promise<void>;
    resolve: () => void;
    reject: (error: Error) => void;
} | null = null;

let connectPromise: Promise<void> | null = null;

function emitRoomJoin(roomId: string) {
    if (!socket.connected) {
        return;
    }

    console.log(
        "REALTIME: joining room",
        roomId
    );

    socket.emit(
        "join_room",
        roomId
    );
}

socket.on("connect", () => {
    console.log(
        "REALTIME: connected",
        socket.id
    );

    if (desiredRoomId) {
        if (
            joinedRoomId !==
            desiredRoomId
        ) {
            emitRoomJoin(
                desiredRoomId
            );
        }
    }
});

socket.on(
    "room_joined",
    (data: { roomId: string }) => {
        const roomId =
            data.roomId;

        joinedRoomId = roomId;

        console.log(
            "REALTIME: room joined",
            roomId
        );

        if (
            pendingJoin &&
            pendingJoin.roomId === roomId
        ) {
            const resolve =
                pendingJoin.resolve;

            pendingJoin = null;
            resolve();
        }
    }
);

socket.on(
    "room_error",
    (data: { message?: string }) => {
        const message =
            data?.message ||
            "Failed to join room";

        console.error(
            "REALTIME: room error",
            message
        );

        if (pendingJoin) {
            const reject =
                pendingJoin.reject;

            pendingJoin = null;
            reject(
                new Error(message)
            );
        }
    }
);

socket.on(
    "disconnect",
    (reason) => {
        console.log(
            "REALTIME: disconnected",
            reason
        );

        joinedRoomId = null;
    }
);

socket.on(
    "connect_error",
    (error) => {
        console.error(
            "REALTIME: connection error",
            error.message
        );

        if (pendingJoin) {
            const reject =
                pendingJoin.reject;

            pendingJoin = null;
            reject(error);
        }
    }
);

export function connectSocket(): Promise<void> {
    if (socket.connected) {
        return Promise.resolve();
    }

    if (connectPromise) {
        return connectPromise;
    }

    connectPromise = new Promise(
        (resolve, reject) => {
            const handleConnect = () => {
                cleanup();
                connectPromise = null;
                resolve();
            };

            const handleConnectError = (
                error: Error
            ) => {
                cleanup();
                connectPromise = null;
                reject(error);
            };

            const cleanup = () => {
                socket.off(
                    "connect",
                    handleConnect
                );

                socket.off(
                    "connect_error",
                    handleConnectError
                );
            };

            socket.once(
                "connect",
                handleConnect
            );

            socket.once(
                "connect_error",
                handleConnectError
            );

            socket.connect();
        }
    );

    return connectPromise;
}

export function disconnectSocket() {
    desiredRoomId = null;
    joinedRoomId = null;

    if (pendingJoin) {
        const reject =
            pendingJoin.reject;

        pendingJoin = null;
        reject(
            new Error(
                "Socket disconnected"
            )
        );
    }

    if (socket.connected) {
        socket.disconnect();
    }
}

export async function joinRoom(
    roomId: string
): Promise<void> {
    const validRoomId =
        roomId.trim();

    if (!validRoomId) {
        throw new Error(
            "Room ID is required"
        );
    }

    desiredRoomId =
        validRoomId;

    await connectSocket();

    if (
        joinedRoomId ===
        validRoomId
    ) {
        return;
    }

    if (
        pendingJoin &&
        pendingJoin.roomId ===
        validRoomId
    ) {
        await pendingJoin.promise;
        return;
    }

    if (
        joinedRoomId &&
        joinedRoomId !==
        validRoomId
    ) {
        socket.emit(
            "leave_room",
            joinedRoomId
        );

        joinedRoomId = null;
    }

    let resolveJoin!: () => void;
    let rejectJoin!: (
        error: Error
    ) => void;

    const promise = new Promise<void>(
        (resolve, reject) => {
            resolveJoin = resolve;
            rejectJoin = reject;
        }
    );

    pendingJoin = {
        roomId:
            validRoomId,
        promise,
        resolve: resolveJoin,
        reject: rejectJoin,
    };

    emitRoomJoin(
        validRoomId
    );

    await promise;
}

export function leaveRoom(
    roomId: string
) {
    const validRoomId =
        roomId.trim();

    if (
        desiredRoomId ===
        validRoomId
    ) {
        desiredRoomId = null;
    }

    if (
        joinedRoomId ===
        validRoomId
    ) {
        joinedRoomId = null;
    }

    if (!socket.connected) {
        return;
    }

    socket.emit(
        "leave_room",
        validRoomId
    );
}

export async function sendMessage(
    roomId: string,
    content: string,
    replyToMessageId: string | null = null
): Promise<boolean> {
    const validRoomId =
        roomId.trim();

    const validContent =
        content.trim();

    if (!validRoomId || !validContent) {
        return false;
    }

    /*
     * Normal chat path: when the user is already
     * connected and inside this room, emit immediately.
     */
    if (
        socket.connected &&
        joinedRoomId === validRoomId
    ) {
        console.log(
            "REALTIME: sending message",
            {
                roomId: validRoomId,
                content: validContent,
            }
        );

        socket.emit(
            "send_message",
            {
                roomId: validRoomId,
                content: validContent,
                replyToMessageId,
            }
        );

        return true;
    }

    /*
     * Recovery path: connect/join first when the socket
     * has just reconnected or the room is not joined yet.
     */
    try {
        await joinRoom(validRoomId);
    } catch (error) {
        console.error(
            "REALTIME: unable to join room before sending",
            error
        );

        return false;
    }

    console.log(
        "REALTIME: sending message",
        {
            roomId: validRoomId,
            content: validContent,
        }
    );

    socket.emit(
        "send_message",
        {
            roomId: validRoomId,
            content: validContent,
            replyToMessageId,
        }
    );

    return true;
}

export function startTyping(
    roomId: string
) {
    if (!socket.connected) {
        return;
    }

    socket.emit(
        "typing_start",
        roomId
    );
}

export function stopTyping(
    roomId: string
) {
    if (!socket.connected) {
        return;
    }

    socket.emit(
        "typing_stop",
        roomId
    );
}

export function markMessageRead(
    roomId: string,
    messageId: string
) {
    if (!socket.connected) {
        return;
    }

    socket.emit(
        "message_read",
        {
            roomId,
            messageId,
        }
    );
}

export function editMessage(
    roomId: string,
    messageId: string,
    content: string
) {
    if (!socket.connected) {
        return;
    }

    socket.emit(
        "edit_message",
        {
            roomId,
            messageId,
            content,
        }
    );
}

export function deleteMessage(
    roomId: string,
    messageId: string
) {
    if (!socket.connected) {
        return;
    }

    socket.emit(
        "delete_message",
        {
            roomId,
            messageId,
        }
    );
}

export function addReaction(
    roomId: string,
    messageId: string,
    reaction: string
) {
    if (!socket.connected) {
        return;
    }

    socket.emit(
        "add_reaction",
        {
            roomId,
            messageId,
            reaction,
        }
    );
}

export function removeReaction(
    roomId: string,
    messageId: string,
    reaction: string
) {
    if (!socket.connected) {
        return;
    }

    socket.emit(
        "remove_reaction",
        {
            roomId,
            messageId,
            reaction,
        }
    );
}
