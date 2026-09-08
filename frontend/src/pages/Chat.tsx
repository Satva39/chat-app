import {
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import ChatHeader from "../components/ChatHeader";
import MessageList from "../components/MessageList";
import MessageInput from "../components/MessageInput";
import type { ChatData, Message } from "../types/chat";
import { getCurrentUser } from "../services/auth";
import {
    getMessages,
    type MessageCursor,
} from "../services/messages";
import {
    deleteMessage,
    disconnectSocket,
    editMessage,
    joinRoom,
    leaveRoom,
    markMessageRead,
    sendMessage,
    socket,
    addReaction,
    removeReaction,
} from "../services/socket";

import UserSearch from "../components/UserSearch";
import GroupCreate from "../components/GroupCreate";
import NotificationPanel from "../components/NotificationPanel";
import AIAssistant from "../components/AIAssistant";

import {
    addRoomMember,
    createDirectRoom,
    createRoom,
    getRoomMembers,
    getRooms,
    type Room,
    type RoomMember,
} from "../services/rooms";

import {
    uploadAttachment,
} from "../services/attachments";

import {
    smartSearchChat,
    generateSmartReplies,
} from "../services/ai";

import type { SearchUser } from "../services/users";

import type {
    Notification,
} from "../services/notifications";

import {
    getNotifications,
    markAllNotificationsAsRead,
    markNotificationAsRead,
} from "../services/notifications";

function formatMessageTime(date: string) {
    return new Date(date).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });
}

function Chat() {
    const [currentUserId, setCurrentUserId] =
        useState<string | null>(null);

    const [rooms, setRooms] =
        useState<Room[]>([]);

    const [selectedRoomId, setSelectedRoomId] =
        useState<string | null>(null);

    const [messages, setMessages] =
        useState<Message[]>([]);

    const [loadingRooms, setLoadingRooms] =
        useState(true);

    const [loadingMessages, setLoadingMessages] =
        useState(false);

    const [loadingOlderMessages, setLoadingOlderMessages] =
        useState(false);

    const [hasMoreMessages, setHasMoreMessages] =
        useState(false);

    const [olderMessagesCursor, setOlderMessagesCursor] =
        useState<MessageCursor | null>(null);

    const [readMessageIds, setReadMessageIds] =
        useState<string[]>([]);

    const [showUserSearch, setShowUserSearch] =
        useState(false);

    const [showNewChatMenu, setShowNewChatMenu] =
        useState(false);

    const [showGroupCreate, setShowGroupCreate] =
        useState(false);

    const [creatingGroup, setCreatingGroup] =
        useState(false);

    const [replyingTo, setReplyingTo] =
        useState<Message | null>(null);

    const [typingUsers, setTypingUsers] =
        useState<
            {
                userId: string;
                username: string;
            }[]
        >([]);

    const [onlineUserIds, setOnlineUserIds] =
        useState<string[]>([]);

    const [roomMembers, setRoomMembers] =
        useState<RoomMember[]>([]);

    const [notifications, setNotifications] =
        useState<Notification[]>([]);

    const [notificationUnreadCount, setNotificationUnreadCount] =
        useState(0);

    const [showNotifications, setShowNotifications] =
        useState(false);

    const [sidebarSearchQuery, setSidebarSearchQuery] =
        useState("");

    const [searchResults, setSearchResults] =
        useState<string[]>([]);

    const [smartSearchActive, setSmartSearchActive] =
        useState(false);

    const searchRequestIdRef =
        useRef(0);

    const initialScrollRoomIdRef =
        useRef<string | null>(null);

    const [smartReplies, setSmartReplies] =
        useState<string[]>([]);

    const selectedRoomIdRef =
        useRef<string | null>(null);

    const currentUserIdRef =
        useRef<string | null>(null);

    const [selectedSmartReply, setSelectedSmartReply] =
        useState("");

    const [smartRepliesPosition, setSmartRepliesPosition] =
        useState({ x: 0, y: 0 });

    const smartRepliesDragRef = useRef({
        dragging: false,
        moved: false,
        startX: 0,
        startY: 0,
    });

    const handleSmartRepliesPointerDown = (
        event: React.PointerEvent<HTMLButtonElement>
    ) => {
        smartRepliesDragRef.current = {
            dragging: true,
            moved: false,
            startX: event.clientX,
            startY: event.clientY,
        };

        event.currentTarget.setPointerCapture(event.pointerId);
    };

    const handleSmartRepliesPointerMove = (
        event: React.PointerEvent<HTMLButtonElement>
    ) => {
        const drag = smartRepliesDragRef.current;

        if (!drag.dragging) {
            return;
        }

        const dx = event.clientX - drag.startX;
        const dy = event.clientY - drag.startY;

        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
            drag.moved = true;
        }

        setSmartRepliesPosition((current) => ({
            x: current.x + dx,
            y: current.y + dy,
        }));

        drag.startX = event.clientX;
        drag.startY = event.clientY;
    };

    const handleSmartRepliesPointerUp = () => {
        smartRepliesDragRef.current.dragging = false;
    };

    useEffect(() => {
        selectedRoomIdRef.current =
            selectedRoomId;
    }, [selectedRoomId]);

    useEffect(() => {
        currentUserIdRef.current =
            currentUserId;
    }, [currentUserId]);

    const handleNotificationsClick = () => {
        setShowNotifications(
            (current) => !current
        );
    };

    const handleNotificationRead = async (
        notificationId: string
    ) => {
        try {
            await markNotificationAsRead(
                notificationId
            );

            setNotifications(
                (currentNotifications) =>
                    currentNotifications.map(
                        (notification) =>
                            notification.id ===
                                notificationId
                                ? {
                                    ...notification,
                                    is_read: true,
                                }
                                : notification
                    )
            );

            setNotificationUnreadCount(
                (currentCount) =>
                    Math.max(
                        currentCount - 1,
                        0
                    )
            );
        } catch (error) {
            console.error(
                "Failed to mark notification as read:",
                error
            );
        }
    };

    const handleMarkAllNotificationsAsRead =
        async () => {
            try {
                await markAllNotificationsAsRead();

                setNotifications(
                    (currentNotifications) =>
                        currentNotifications.map(
                            (notification) => ({
                                ...notification,
                                is_read: true,
                            })
                        )
                );

                setNotificationUnreadCount(0);
            } catch (error) {
                console.error(
                    "Failed to mark all notifications as read:",
                    error
                );
            }
        };

    const selectedRoom = useMemo(
        () =>
            rooms.find(
                (room) =>
                    room.id === selectedRoomId
            ) ?? null,
        [rooms, selectedRoomId]
    );

    const [messageReactions, setMessageReactions] =
        useState<Record<
            string,
            {
                userId: string;
                reaction: string;
            }[]
        >>({});


    const chats: ChatData[] = useMemo(
        () =>
            rooms.map((room) => {
                const latestMessage =
                    messages[messages.length - 1];

                return {
                    id: room.id,
                    name: room.name,
                    lastMessage:
                        room.id === selectedRoomId &&
                            latestMessage
                            ? latestMessage.content
                            : "No messages yet",
                    time:
                        room.id === selectedRoomId &&
                            latestMessage
                            ? formatMessageTime(
                                latestMessage.created_at
                            )
                            : "",
                    online: false,
                    unread: 0,
                };
            }),
        [rooms, messages, selectedRoomId]
    );

    useEffect(() => {
        let mounted = true;

        async function initialize() {
            try {
                const user =
                    await getCurrentUser();

                if (!mounted) {
                    return;
                }

                setCurrentUserId(user.id);

                const loadedRooms =
                    await getRooms();

                if (!mounted) {
                    return;
                }

                setRooms(loadedRooms);

                if (loadedRooms.length > 0) {
                    setSelectedRoomId(
                        loadedRooms[0].id
                    );
                }
            } catch (error) {
                console.error(
                    "Failed to initialize chat:",
                    error
                );
            } finally {
                if (mounted) {
                    setLoadingRooms(false);
                }
            }
        }

        initialize();

        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        const handleOnlineUsers = (data: {
            userIds: string[];
        }) => {
            setOnlineUserIds(data.userIds);
        };

        const handleUserOnline = (data: {
            userId: string;
        }) => {
            setOnlineUserIds((currentIds) => {
                if (currentIds.includes(data.userId)) {
                    return currentIds;
                }

                return [
                    ...currentIds,
                    data.userId,
                ];
            });
        };

        const handleUserOffline = (data: {
            userId: string;
        }) => {
            setOnlineUserIds((currentIds) =>
                currentIds.filter(
                    (id) => id !== data.userId
                )
            );
        };

        socket.on(
            "online_users",
            handleOnlineUsers
        );

        socket.on(
            "user_online",
            handleUserOnline
        );

        socket.on(
            "user_offline",
            handleUserOffline
        );

        return () => {
            socket.off(
                "online_users",
                handleOnlineUsers
            );

            socket.off(
                "user_online",
                handleUserOnline
            );

            socket.off(
                "user_offline",
                handleUserOffline
            );
        };
    }, []);

    useEffect(() => {
        if (
            !selectedRoomId ||
            !currentUserId
        ) {
            return;
        }

        const roomId = selectedRoomId;

        let mounted = true;

        async function loadRoom() {
            try {

                const members =
                    await getRoomMembers(roomId);

                if (!mounted) {
                    return;
                }

                void joinRoom(roomId).catch((error) => {
                    console.error(
                        "Failed to join realtime room:",
                        error
                    );
                });

                setLoadingMessages(true);

                setMessageReactions({});


                // const existingMessages =
                //     await getMessages(roomId);

                // if (!mounted) {
                //     return;
                // }

                setRoomMembers(members);


                if (!mounted) {
                    return;
                }

                const messagePage =
                    await getMessages(roomId, 50);

                if (!mounted) {
                    return;
                }

                setRoomMembers(members);

                const formattedMessages: Message[] =
                    messagePage.messages
                        .map((message) => ({
                            ...message,
                            sender:
                                message.sender_id ===
                                    currentUserId
                                    ? ("me" as const)
                                    : ("other" as const),
                            text: message.content,
                            time: formatMessageTime(
                                message.created_at
                            ),
                        }));

                setMessages(formattedMessages);

                setHasMoreMessages(
                    messagePage.hasMore
                );

                setOlderMessagesCursor(
                    messagePage.nextCursor
                );

                console.log(
                    "REALTIME: room ready",
                    roomId
                );
            } catch (error) {
                console.error(
                    "Failed to load room:",
                    error
                );
            } finally {
                if (mounted) {
                    setLoadingMessages(false);
                }
            }
        }

        loadRoom();

        return () => {
            mounted = false;

            leaveRoom(roomId);

            setRoomMembers([]);
            setTypingUsers([]);
        };
    }, [
        selectedRoomId,
        currentUserId,
    ]);

    const loadOlderMessages = async () => {
        if (
            !selectedRoomId ||
            !olderMessagesCursor ||
            !hasMoreMessages ||
            loadingOlderMessages
        ) {
            return;
        }

        const messageList =
            document.querySelector(
                ".chat-panel .message-list"
            ) as HTMLElement | null;

        if (!messageList) {
            return;
        }

        const previousScrollHeight =
            messageList.scrollHeight;

        const previousScrollTop =
            messageList.scrollTop;

        setLoadingOlderMessages(true);

        try {
            const messagePage =
                await getMessages(
                    selectedRoomId,
                    50,
                    olderMessagesCursor
                );

            const formattedMessages: Message[] =
                messagePage.messages.map(
                    (message) => ({
                        ...message,
                        sender:
                            message.sender_id ===
                                currentUserId
                                ? ("me" as const)
                                : ("other" as const),
                        text: message.content,
                        time: formatMessageTime(
                            message.created_at
                        ),
                    })
                );

            setMessages((currentMessages) => {
                const existingIds =
                    new Set(
                        currentMessages.map(
                            (message) => message.id
                        )
                    );

                const newMessages =
                    formattedMessages.filter(
                        (message) =>
                            !existingIds.has(
                                message.id
                            )
                    );

                return [
                    ...newMessages,
                    ...currentMessages,
                ];
            });

            setHasMoreMessages(
                messagePage.hasMore
            );

            setOlderMessagesCursor(
                messagePage.nextCursor
            );

            window.requestAnimationFrame(() => {
                const updatedMessageList =
                    document.querySelector(
                        ".chat-panel .message-list"
                    ) as HTMLElement | null;

                if (!updatedMessageList) {
                    return;
                }

                updatedMessageList.scrollTop =
                    previousScrollTop +
                    (
                        updatedMessageList.scrollHeight -
                        previousScrollHeight
                    );
            });
        } catch (error) {
            console.error(
                "Failed to load older messages:",
                error
            );
        } finally {
            setLoadingOlderMessages(false);
        }
    };

    useEffect(() => {
        if (
            !selectedRoomId ||
            !hasMoreMessages
        ) {
            return;
        }

        const messageList =
            document.querySelector(
                ".chat-panel .message-list"
            ) as HTMLElement | null;

        if (!messageList) {
            return;
        }

        const handleScroll = () => {
            if (
                messageList.scrollTop <= 120
            ) {
                void loadOlderMessages();
            }
        };

        messageList.addEventListener(
            "scroll",
            handleScroll
        );

        return () => {
            messageList.removeEventListener(
                "scroll",
                handleScroll
            );
        };
    }, [
        selectedRoomId,
        hasMoreMessages,
        olderMessagesCursor,
        loadingOlderMessages,
    ]);

    useEffect(() => {
        const handleNewMessage = (
            message: Message
        ) => {
            const activeRoomId =
                selectedRoomIdRef.current;

            const activeUserId =
                currentUserIdRef.current;

            console.log(
                "REALTIME: new_message",
                message
            );

            if (
                message.room_id !==
                activeRoomId
            ) {
                return;
            }

            const formattedMessage: Message = {
                ...message,
                sender:
                    message.sender_id ===
                        activeUserId
                        ? ("me" as const)
                        : ("other" as const),
                text: message.content,
                time: formatMessageTime(
                    message.created_at
                ),
            };

            setMessages(
                (currentMessages) => {
                    const existingIndex =
                        currentMessages.findIndex(
                            (existingMessage) =>
                                existingMessage.id ===
                                message.id
                        );

                    if (existingIndex === -1) {
                        return [
                            ...currentMessages,
                            formattedMessage,
                        ];
                    }

                    const updatedMessages = [
                        ...currentMessages,
                    ];

                    updatedMessages[existingIndex] = {
                        ...updatedMessages[existingIndex],
                        ...formattedMessage,
                        attachment:
                            formattedMessage.attachment ??
                            updatedMessages[existingIndex]
                                .attachment,
                    };

                    return updatedMessages;
                }
            );
        };

        socket.on(
            "new_message",
            handleNewMessage
        );

        return () => {
            socket.off(
                "new_message",
                handleNewMessage
            );
        };
    }, []);

    useEffect(() => {
        const handleMessageUpdated = (
            message: Message
        ) => {
            if (
                message.room_id !==
                selectedRoomId
            ) {
                return;
            }

            setMessages(
                (currentMessages) =>
                    currentMessages.map(
                        (currentMessage) =>
                            currentMessage.id ===
                                message.id
                                ? {
                                    ...currentMessage,
                                    ...message,
                                    text: message.content,
                                    time: formatMessageTime(
                                        message.created_at
                                    ),
                                }
                                : currentMessage
                    )
            );
        };

        const handleMessageDeleted = (
            message: Message
        ) => {
            if (
                message.room_id !==
                selectedRoomId
            ) {
                return;
            }

            setMessages(
                (currentMessages) =>
                    currentMessages.map(
                        (currentMessage) =>
                            currentMessage.id ===
                                message.id
                                ? {
                                    ...currentMessage,
                                    ...message,
                                }
                                : currentMessage
                    )
            );
        };

        socket.on(
            "message_updated",
            handleMessageUpdated
        );

        socket.on(
            "message_deleted",
            handleMessageDeleted
        );

        return () => {
            socket.off(
                "message_updated",
                handleMessageUpdated
            );

            socket.off(
                "message_deleted",
                handleMessageDeleted
            );
        };
    }, [selectedRoomId]);

    useEffect(() => {

        const handleMessageRead = (data: {
            messageId: string;
            userId: string;
        }) => {
            setReadMessageIds(
                (currentIds) => {
                    if (
                        currentIds.includes(
                            data.messageId
                        )
                    ) {
                        return currentIds;
                    }

                    return [
                        ...currentIds,
                        data.messageId,
                    ];
                }
            );
        };

        socket.on(
            "message_read",
            handleMessageRead
        );

        return () => {
            socket.off(
                "message_read",
                handleMessageRead
            );
        };
    }, []);

    useEffect(() => {
        const handleTyping = (data: {
            userId: string;
            username: string;
        }) => {
            if (
                data.userId ===
                currentUserId
            ) {
                return;
            }

            setTypingUsers(
                (currentUsers) => {
                    if (
                        currentUsers.some(
                            (user) =>
                                user.userId ===
                                data.userId
                        )
                    ) {
                        return currentUsers;
                    }

                    return [
                        ...currentUsers,
                        data,
                    ];
                }
            );
        };

        const handleStoppedTyping = (
            data: {
                userId: string;
                username: string;
            }
        ) => {
            setTypingUsers(
                (currentUsers) =>
                    currentUsers.filter(
                        (user) =>
                            user.userId !==
                            data.userId
                    )
            );
        };

        socket.on(
            "user_typing",
            handleTyping
        );

        socket.on(
            "user_stopped_typing",
            handleStoppedTyping
        );

        return () => {
            socket.off(
                "user_typing",
                handleTyping
            );

            socket.off(
                "user_stopped_typing",
                handleStoppedTyping
            );
        };
    }, [currentUserId]);

    useEffect(() => {
        return () => {
            disconnectSocket();
        };
    }, []);

    useEffect(() => {
        if (
            !selectedRoomId ||
            !currentUserId ||
            messages.length === 0
        ) {
            return;
        }

        const latestMessage =
            messages[messages.length - 1];

        if (
            latestMessage.sender_id ===
            currentUserId
        ) {
            return;
        }

        markMessageRead(
            selectedRoomId,
            latestMessage.id
        );
    }, [
        messages,
        selectedRoomId,
        currentUserId,
    ]);

    const handleReplyMessage = (
        message: Message
    ) => {
        setReplyingTo(message);
    };

    const handleSendMessage = async (
        content: string
    ) => {
        if (
            !currentUserId ||
            !selectedRoomId
        ) {
            return;
        }

        const trimmedContent =
            content.trim();

        if (!trimmedContent) {
            return;
        }

        sendMessage(
            selectedRoomId,
            trimmedContent,
            replyingTo?.id ?? null
        );

        setReplyingTo(null);
    };

    const handleGenerateSmartReplies = async (
        message: string
    ) => {
        const trimmedMessage =
            message.trim();

        if (!trimmedMessage) {
            setSmartReplies([]);
            return;
        }

        try {
            const result =
                await generateSmartReplies(
                    trimmedMessage
                );

            setSmartReplies(
                result.replies
            );

        } catch (error) {
            console.error(
                "Smart replies failed:",
                error
            );

            setSmartReplies([]);

        } finally {
        }
    };

    const handleEditMessage = (
        message: Message
    ) => {
        if (!selectedRoomId) {
            return;
        }

        const newContent =
            window.prompt(
                "Edit message",
                message.content
            );

        if (
            newContent === null ||
            !newContent.trim()
        ) {
            return;
        }

        editMessage(
            selectedRoomId,
            message.id,
            newContent.trim()
        );
    };

    const handleDeleteMessage = (
        message: Message
    ) => {
        if (!selectedRoomId) {
            return;
        }

        const confirmed =
            window.confirm(
                "Delete this message?"
            );

        if (!confirmed) {
            return;
        }

        deleteMessage(
            selectedRoomId,
            message.id
        );
    };

    const handleNewChat = () => {
        setShowNewChatMenu(true);
        setShowUserSearch(false);
        setShowGroupCreate(false);
    };

    const handleSelectUser = async (
        user: SearchUser
    ) => {
        try {
            const room =
                await createDirectRoom(
                    user.id
                );

            const displayRoom: Room = {
                ...room,
                name: user.username,
            };

            setRooms((currentRooms) => {
                const alreadyExists =
                    currentRooms.some(
                        (currentRoom) =>
                            currentRoom.id ===
                            room.id
                    );

                if (alreadyExists) {
                    return currentRooms;
                }

                return [
                    displayRoom,
                    ...currentRooms,
                ];
            });

            setSelectedRoomId(room.id);
            setShowNewChatMenu(false);
            setShowUserSearch(false);
        } catch (error) {
            alert(
                error instanceof Error
                    ? error.message
                    : "Failed to open chat"
            );
        }
    };

    useLayoutEffect(() => {
        if (
            !selectedRoomId ||
            loadingMessages ||
            messages.length === 0
        ) {
            return;
        }

        const messageList =
            document.querySelector(
                ".chat-panel .message-list"
            ) as HTMLElement | null;

        if (!messageList) {
            return;
        }

        const isInitialLoad =
            initialScrollRoomIdRef.current !==
            selectedRoomId;

        const scrollToBottom = () => {
            messageList.scrollTop =
                messageList.scrollHeight;
        };

        if (isInitialLoad) {
            initialScrollRoomIdRef.current =
                selectedRoomId;

            const lastMessage =
                messageList.querySelector(
                    ".message-row:last-child"
                ) as HTMLElement | null;

            lastMessage?.scrollIntoView({
                block: "end",
                behavior: "auto",
            });

            window.requestAnimationFrame(() => {
                scrollToBottom();

                window.requestAnimationFrame(() => {
                    scrollToBottom();
                });
            });

            return;
        }

        const distanceFromBottom =
            messageList.scrollHeight -
            messageList.scrollTop -
            messageList.clientHeight;

        if (distanceFromBottom <= 120) {
            scrollToBottom();
        }
    }, [
        messages.length,
        selectedRoomId,
        loadingMessages,
    ]);

    useEffect(() => {
        const handleOpenGroupCreate = () => {
            setShowNewChatMenu(false);
            setShowUserSearch(false);
            setShowGroupCreate(true);
        };

        window.addEventListener(
            "open-group-create",
            handleOpenGroupCreate
        );

        return () => {
            window.removeEventListener(
                "open-group-create",
                handleOpenGroupCreate
            );
        };
    }, []);

    const onlineRoomMembers =
        roomMembers.filter((member) =>
            onlineUserIds.includes(member.id)
        );

    const onlineRoomMemberCount =
        onlineRoomMembers.length;

    const handleCreateGroup = async (
        name: string,
        members: SearchUser[]
    ) => {
        try {
            setCreatingGroup(true);

            const room =
                await createRoom(name);

            for (const member of members) {
                await addRoomMember(
                    room.id,
                    member.id
                );
            }

            setRooms(
                (currentRooms) => [
                    room,
                    ...currentRooms.filter(
                        (currentRoom) =>
                            currentRoom.id !==
                            room.id
                    ),
                ]
            );

            setSelectedRoomId(room.id);

            setShowNewChatMenu(false);
            setShowUserSearch(false);
            setShowGroupCreate(false);
        } catch (error) {
            alert(
                error instanceof Error
                    ? error.message
                    : "Failed to create group"
            );
        } finally {
            setCreatingGroup(false);
        }
    };

    const handleReaction = (
        message: Message,
        reaction: string
    ) => {
        if (!selectedRoomId ||
            !currentUserId) {
            return;
        }

        const currentReactions =
            messageReactions[
            message.id
            ] ?? [];

        const existingReaction =
            currentReactions.find(
                (item) =>
                    item.userId ===
                    currentUserId &&
                    item.reaction ===
                    reaction
            );

        if (existingReaction) {
            removeReaction(
                selectedRoomId,
                message.id,
                reaction
            );

            return;
        }

        addReaction(
            selectedRoomId,
            message.id,
            reaction
        );
    };

    useEffect(() => {
        const handleReactionAdded = (
            data: {
                message_id: string;
                user_id: string;
                reaction: string;
            }
        ) => {
            setMessageReactions(
                (current) => ({
                    ...current,
                    [data.message_id]: [
                        ...(current[
                            data.message_id
                        ] ?? []
                        ).filter(
                            (item) =>
                                !(
                                    item.userId ===
                                    data.user_id &&
                                    item.reaction ===
                                    data.reaction
                                )
                        ),
                        {
                            userId:
                                data.user_id,
                            reaction:
                                data.reaction,
                        },
                    ],
                })
            );
        };

        const handleReactionRemoved = (
            data: {
                messageId: string;
                userId: string;
                reaction: string;
            }
        ) => {
            setMessageReactions(
                (current) => ({
                    ...current,
                    [data.messageId]: (
                        current[
                        data.messageId
                        ] ?? []
                    ).filter(
                        (item) =>
                            !(
                                item.userId ===
                                data.userId &&
                                item.reaction ===
                                data.reaction
                            )
                    ),
                })
            );
        };

        socket.on(
            "reaction_added",
            handleReactionAdded
        );

        socket.on(
            "reaction_removed",
            handleReactionRemoved
        );

        return () => {
            socket.off(
                "reaction_added",
                handleReactionAdded
            );

            socket.off(
                "reaction_removed",
                handleReactionRemoved
            );
        };
    }, []);

    useEffect(() => {
        let mounted = true;

        async function loadNotifications() {
            try {
                const result =
                    await getNotifications();

                if (!mounted) {
                    return;
                }

                setNotifications(
                    result.notifications
                );

                setNotificationUnreadCount(
                    result.unreadCount
                );
            } catch (error) {
                console.error(
                    "Failed to load notifications:",
                    error
                );
            }
        }

        loadNotifications();

        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        const handleNotification = (
            notification: Notification
        ) => {
            setNotifications(
                (currentNotifications) => [
                    notification,
                    ...currentNotifications,
                ]
            );

            if (!notification.is_read) {
                setNotificationUnreadCount(
                    (count) => count + 1
                );
            }
        };

        socket.on(
            "notification",
            handleNotification
        );

        return () => {
            socket.off(
                "notification",
                handleNotification
            );
        };
    }, []);

    const handleAttachmentUploaded = (
        result: Awaited<
            ReturnType<
                typeof uploadAttachment
            >
        >
    ) => {
        if (!selectedRoomId) {
            return;
        }

        const currentUser =
            currentUserIdRef.current;

        const newMessage: Message = {
            ...result.message,
            attachment:
                result.attachment,
            sender:
                result.message.sender_id ===
                    currentUser
                    ? "me"
                    : "other",
            text:
                result.message.content,
            time:
                formatMessageTime(
                    result.message.created_at
                ),
        };

        setMessages(
            (currentMessages) => {
                if (
                    currentMessages.some(
                        (message) =>
                            message.id ===
                            newMessage.id
                    )
                ) {
                    return currentMessages;
                }

                return [
                    ...currentMessages,
                    newMessage,
                ];
            }
        );

        socket.emit(
            "attachment_created",
            {
                roomId:
                    selectedRoomId,
                messageId:
                    result.message.id,
                attachmentId:
                    result.attachment.id,
            }
        );
    };

    const handleSmartSearch = async (
        query: string
    ) => {
        if (!selectedRoomId) {
            return;
        }

        const trimmedQuery =
            query.trim();

        if (!trimmedQuery) {
            searchRequestIdRef.current += 1;

            setSearchResults([]);
            setSmartSearchActive(false);

            return;
        }

        const normalizedQuery =
            trimmedQuery.toLowerCase();

        /*
         * 1. Instant local search.
         * This makes normal searches like "Hello"
         * work immediately without waiting for AI.
         */
        const exactMatches =
            messages.filter((message) =>
                message.content
                    .toLowerCase()
                    .includes(normalizedQuery)
            );

        if (exactMatches.length > 0) {
            setSearchResults(
                exactMatches.map(
                    (message) => message.id
                )
            );

            setSmartSearchActive(true);

            return;
        }

        /*
         * 2. No direct match.
         * Ask the AI for semantic/related results.
         */
        const requestId =
            ++searchRequestIdRef.current;

        setSearchResults([]);
        setSmartSearchActive(false);

        try {
            const result =
                await smartSearchChat(
                    selectedRoomId,
                    trimmedQuery
                );

            if (
                requestId !==
                searchRequestIdRef.current
            ) {
                return;
            }

            setSearchResults(
                result.message_ids
            );

            setSmartSearchActive(true);
        } catch (error) {
            if (
                requestId !==
                searchRequestIdRef.current
            ) {
                return;
            }

            console.error(
                "Smart search failed:",
                error
            );

            setSearchResults([]);
            setSmartSearchActive(true);
        } finally {
            if (
                requestId ===
                searchRequestIdRef.current
            ) {
            }
        }
    };

    const displayedMessages =
        smartSearchActive
            ? messages.filter((message) =>
                searchResults.includes(
                    message.id
                )
            )
            : messages;

    useEffect(() => {
        initialScrollRoomIdRef.current = null;
        setSearchResults([]);
        setSmartSearchActive(false);
        setHasMoreMessages(false);
        setOlderMessagesCursor(null);
        setLoadingOlderMessages(false);
    }, [selectedRoomId]);

    const handleSuggestRepliesForLatestMessage =
        async () => {
            const latestIncomingMessage =
                [...messages]
                    .reverse()
                    .find(
                        (message) =>
                            message.sender_id !==
                            currentUserId &&
                            !message.deleted_at &&
                            message.content.trim()
                    );

            if (!latestIncomingMessage) {
                return;
            }

            await handleGenerateSmartReplies(
                latestIncomingMessage.content
            );
        };

    if (loadingRooms) {
        return (
            <main className="auth-loading">
                Loading chats...
            </main>
        );
    }

    return (
        <div className="app-shell">
            <Header
                unreadCount={
                    notificationUnreadCount
                }
                onNotificationsClick={
                    handleNotificationsClick
                }
            />

            {showNotifications && (
                <div className="notification-panel-wrapper">
                    <NotificationPanel
                        notifications={
                            notifications
                        }
                        onRead={
                            handleNotificationRead
                        }
                        onReadAll={
                            handleMarkAllNotificationsAsRead
                        }
                        onClose={() =>
                            setShowNotifications(false)
                        }
                    />
                </div>
            )}

            <div className="app-body">

                {showGroupCreate && (
                    <div className="group-create-sidebar">
                        <GroupCreate
                            onCreate={
                                handleCreateGroup
                            }
                            onClose={() =>
                                setShowGroupCreate(false)
                            }
                            loading={creatingGroup}
                        />
                    </div>
                )}

                {showNewChatMenu ? (
                    <div className="new-chat-sidebar">
                        <div className="new-chat-panel">

                            <div className="new-chat-panel-header">
                                <h2>Start a chat</h2>

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowNewChatMenu(false)
                                    }
                                >
                                    Close
                                </button>
                            </div>

                            <button
                                type="button"
                                className="new-chat-option"
                                onClick={() => {
                                    setShowNewChatMenu(false);
                                    setShowUserSearch(true);
                                }}
                            >
                                <strong>New chat</strong>

                                <span>
                                    Search for a person and
                                    start a private chat.
                                </span>
                            </button>

                            <button
                                type="button"
                                className="new-chat-option"
                                onClick={() => {
                                    setShowNewChatMenu(false);
                                    setShowGroupCreate(true);
                                }}
                            >
                                <strong>New group</strong>

                                <span>
                                    Create a group and choose
                                    the people to add.
                                </span>
                            </button>

                        </div>
                    </div>
                ) : showUserSearch ? (
                    <div className="user-search-sidebar">
                        <UserSearch
                            onSelectUser={
                                handleSelectUser
                            }
                            onClose={() =>
                                setShowUserSearch(false)
                            }
                        />
                    </div>
                ) : (
                    !showGroupCreate && (
                        <Sidebar
                            chats={chats}
                            selectedChatId={
                                selectedRoomId ?? ""
                            }
                            onSelectChat={
                                setSelectedRoomId
                            }
                            onNewChat={
                                handleNewChat
                            }
                            searchQuery={
                                sidebarSearchQuery
                            }
                            onSearchChange={
                                setSidebarSearchQuery
                            }
                        />
                    )
                )}

                <section className="chat-panel">
                    {selectedRoom ? (
                        <>
                            <ChatHeader
                                name={selectedRoom.name}
                                status={
                                    selectedRoom.room_type === "group"
                                        ? `${onlineRoomMemberCount} ${onlineRoomMemberCount === 1
                                            ? "member"
                                            : "members"
                                        } online`
                                        : onlineRoomMembers.some(
                                            (member) =>
                                                member.id !== currentUserId
                                        )
                                            ? "Online"
                                            : "Offline"
                                }
                                onSearch={
                                    handleSmartSearch
                                }
                            />

                            {loadingMessages ? (
                                <main className="message-list">
                                    Loading messages...
                                </main>
                            ) : (
                                <>

                                    {smartSearchActive &&
                                        displayedMessages.length === 0 && (
                                            <div className="smart-search-empty">
                                                No matching messages found.
                                            </div>
                                        )}

                                    <MessageList
                                        messages={displayedMessages}
                                        currentUserId={currentUserId}
                                        readMessageIds={readMessageIds}
                                        onEditMessage={
                                            handleEditMessage
                                        }
                                        onDeleteMessage={
                                            handleDeleteMessage
                                        }
                                        onReplyMessage={
                                            handleReplyMessage
                                        }
                                        onReaction={
                                            handleReaction
                                        }
                                        messageReactions={
                                            messageReactions
                                        }
                                    />
                                    {typingUsers.length >
                                        0 && (
                                            <div className="typing-indicator">
                                                {typingUsers.length ===
                                                    1
                                                    ? `${typingUsers[0].username} is typing...`
                                                    : `${typingUsers.length} people are typing...`}
                                            </div>
                                        )}
                                </>
                            )}

                            {smartReplies.length > 0 && (
                                <div className="smart-replies">
                                    <div className="smart-replies-list">
                                        {smartReplies.map(
                                            (reply) => (
                                                <button
                                                    key={reply}
                                                    type="button"
                                                    onClick={() =>
                                                        setSelectedSmartReply(
                                                            reply
                                                        )
                                                    }
                                                >
                                                    {reply}
                                                </button>
                                            )
                                        )}

                                        <button
                                            type="button"
                                            className="smart-replies-close"
                                            onClick={() =>
                                                setSmartReplies([])
                                            }
                                            aria-label="Close smart replies"
                                        >
                                            ×
                                        </button>
                                    </div>
                                </div>
                            )}

                            <button
                                type="button"
                                className="smart-replies-trigger"
                                style={{
                                    transform: `translate(${smartRepliesPosition.x}px, ${smartRepliesPosition.y}px)`,
                                    touchAction: "none",
                                }}
                                onPointerDown={handleSmartRepliesPointerDown}
                                onPointerMove={handleSmartRepliesPointerMove}
                                onPointerUp={handleSmartRepliesPointerUp}
                                onPointerCancel={handleSmartRepliesPointerUp}
                                onClick={() => {
                                    if (smartRepliesDragRef.current.moved) {
                                        smartRepliesDragRef.current.moved = false;
                                        return;
                                    }

                                    handleSuggestRepliesForLatestMessage();
                                }}
                            >
                                ✦ Smart replies
                            </button>

                            <MessageInput
                                roomId={
                                    selectedRoomId ?? ""
                                }
                                onSend={
                                    handleSendMessage
                                }
                                replyingTo={
                                    replyingTo
                                        ? {
                                            id: replyingTo.id,
                                            content:
                                                replyingTo.deleted_at
                                                    ? "This message was deleted"
                                                    : replyingTo.content,
                                        }
                                        : null
                                }
                                onCancelReply={() =>
                                    setReplyingTo(null)
                                }

                                onAttachmentUploaded={
                                    handleAttachmentUploaded
                                }

                                suggestedMessage={
                                    selectedSmartReply
                                }
                            />
                        </>
                    ) : (
                        <main className="message-list">
                            <div>
                                No chats yet.
                            </div>
                        </main>
                    )}

                    <AIAssistant
                        roomId={selectedRoomId}
                    />
                </section>
            </div>
        </div>
    );
}

export default Chat;    