import { sql } from "../config/database.js";

export interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  reply_to_message_id: string | null;
  attachment?: MessageAttachment;
}

export interface MessagesPage {
  messages: ChatMessage[];
  hasMore: boolean;
  nextCursor: {
    createdAt: string;
    id: string;
  } | null;
}

export async function createMessage(
  roomId: string,
  senderId: string,
  content: string,
  replyToMessageId: string | null = null
): Promise<ChatMessage> {
  const result = await sql`
    INSERT INTO messages (
      room_id,
      sender_id,
      content,
      reply_to_message_id
    )
    VALUES (
      ${roomId},
      ${senderId},
      ${content},
      ${replyToMessageId}
    )
    RETURNING
      id,
      room_id,
      sender_id,
      content,
      created_at,
      edited_at,
      deleted_at,
      reply_to_message_id
  `;

  return result[0] as ChatMessage;
}

export async function isMessageInRoom(
  messageId: string,
  roomId: string
): Promise<boolean> {
  const result = await sql`
        SELECT 1
        FROM messages
        WHERE id = ${messageId}
          AND room_id = ${roomId}
        LIMIT 1
    `;

  return result.length > 0;
}

export async function getMessages(
  roomId: string,
  limit = 50
): Promise<ChatMessage[]> {
  const safeLimit =
    Math.min(
      Math.max(limit, 1),
      100
    );

  const result = await sql`
        SELECT
            m.id,
            m.room_id,
            m.sender_id,
            m.content,
            m.created_at,
            m.edited_at,
            m.deleted_at,
            m.reply_to_message_id,

            a.id AS attachment_id,
            a.message_id AS attachment_message_id,
            a.original_name AS attachment_original_name,
            a.storage_key AS attachment_storage_key,
            a.mime_type AS attachment_mime_type,
            a.size_bytes AS attachment_size_bytes,
            a.created_at AS attachment_created_at

        FROM messages m

        LEFT JOIN attachments a
            ON a.message_id = m.id

        WHERE m.room_id = ${roomId}

        ORDER BY
            m.created_at ASC,
            m.id ASC

        LIMIT ${safeLimit}
    `;

  return result.map((row) => {
    const message: ChatMessage = {
      id: String(row.id),
      room_id: String(row.room_id),
      sender_id: String(row.sender_id),
      content: String(
        row.content ?? ""
      ),
      created_at: String(
        row.created_at
      ),
      edited_at:
        row.edited_at == null
          ? null
          : String(
            row.edited_at
          ),
      deleted_at:
        row.deleted_at == null
          ? null
          : String(
            row.deleted_at
          ),
      reply_to_message_id:
        row.reply_to_message_id ==
          null
          ? null
          : String(
            row.reply_to_message_id
          ),
    };

    if (row.attachment_id) {
      message.attachment = {
        id: String(
          row.attachment_id
        ),
        message_id: String(
          row.attachment_message_id
        ),
        original_name: String(
          row.attachment_original_name
        ),
        storage_key: String(
          row.attachment_storage_key
        ),
        mime_type: String(
          row.attachment_mime_type
        ),
        size_bytes: Number(
          row.attachment_size_bytes
        ),
        created_at: String(
          row.attachment_created_at
        ),
      };
    }

    return message;
  });
}

export async function getMessagesPage(
  roomId: string,
  limit = 50,
  beforeCreatedAt?: string,
  beforeId?: string
): Promise<MessagesPage> {
  const safeLimit = Math.min(
    Math.max(limit, 1),
    100
  );

  const hasCursor =
    Boolean(beforeCreatedAt) &&
    Boolean(beforeId);

  const result = hasCursor
    ? await sql`
        SELECT
          m.id,
          m.room_id,
          m.sender_id,
          m.content,
          m.created_at,
          m.edited_at,
          m.deleted_at,
          m.reply_to_message_id,

          a.id AS attachment_id,
          a.message_id AS attachment_message_id,
          a.original_name AS attachment_original_name,
          a.storage_key AS attachment_storage_key,
          a.mime_type AS attachment_mime_type,
          a.size_bytes AS attachment_size_bytes,
          a.created_at AS attachment_created_at

        FROM messages m

        LEFT JOIN attachments a
          ON a.message_id = m.id

        WHERE m.room_id = ${roomId}
          AND (
            m.created_at < ${beforeCreatedAt!}
            OR (
              m.created_at = ${beforeCreatedAt!}
              AND m.id < ${beforeId!}
            )
          )

        ORDER BY
          m.created_at DESC,
          m.id DESC

        LIMIT ${safeLimit + 1}
      `
    : await sql`
        SELECT
          m.id,
          m.room_id,
          m.sender_id,
          m.content,
          m.created_at,
          m.edited_at,
          m.deleted_at,
          m.reply_to_message_id,

          a.id AS attachment_id,
          a.message_id AS attachment_message_id,
          a.original_name AS attachment_original_name,
          a.storage_key AS attachment_storage_key,
          a.mime_type AS attachment_mime_type,
          a.size_bytes AS attachment_size_bytes,
          a.created_at AS attachment_created_at

        FROM messages m

        LEFT JOIN attachments a
          ON a.message_id = m.id

        WHERE m.room_id = ${roomId}

        ORDER BY
          m.created_at DESC,
          m.id DESC

        LIMIT ${safeLimit + 1}
      `;

  const hasMore =
    result.length > safeLimit;

  const pageRows = hasMore
    ? result.slice(0, safeLimit)
    : result;

  pageRows.reverse();

  const messages = pageRows.map((row) => {
    const message: ChatMessage = {
      id: String(row.id),
      room_id: String(row.room_id),
      sender_id: String(row.sender_id),
      content: String(
        row.content ?? ""
      ),
      created_at: String(
        row.created_at
      ),
      edited_at:
        row.edited_at == null
          ? null
          : String(
            row.edited_at
          ),
      deleted_at:
        row.deleted_at == null
          ? null
          : String(
            row.deleted_at
          ),
      reply_to_message_id:
        row.reply_to_message_id == null
          ? null
          : String(
            row.reply_to_message_id
          ),
    };

    if (row.attachment_id) {
      message.attachment = {
        id: String(
          row.attachment_id
        ),
        message_id: String(
          row.attachment_message_id
        ),
        original_name: String(
          row.original_name
        ),
        storage_key: String(
          row.storage_key
        ),
        mime_type: String(
          row.mime_type
        ),
        size_bytes: Number(
          row.size_bytes
        ),
        created_at: String(
          row.attachment_created_at
        ),
      };
    }

    return message;
  });

  const oldestMessage =
    messages[0];

  return {
    messages,
    hasMore,
    nextCursor:
      oldestMessage && hasMore
        ? {
          createdAt:
            oldestMessage.created_at,
          id: oldestMessage.id,
        }
        : null,
  };
}

export async function getSearchCandidates(
  roomId: string,
  query: string,
  limit = 25
): Promise<ChatMessage[]> {
  const safeLimit = Math.min(
    Math.max(limit, 1),
    50
  );

  const trimmedQuery =
    query.trim();

  if (!trimmedQuery) {
    return getMessages(
      roomId,
      safeLimit
    );
  }

  const result = await sql`
    SELECT
      id,
      room_id,
      sender_id,
      content,
      created_at,
      edited_at,
      deleted_at,
      reply_to_message_id
    FROM messages
    WHERE room_id = ${roomId}
      AND deleted_at IS NULL
      AND content ILIKE ${"%" + trimmedQuery + "%"}
    ORDER BY created_at DESC, id DESC
    LIMIT ${safeLimit}
  `;

  if (result.length > 0) {
    return result as ChatMessage[];
  }

  return getMessages(
    roomId,
    safeLimit
  );
}

export async function markMessageAsRead(
  messageId: string,
  userId: string
): Promise<void> {
  await sql`
        INSERT INTO message_reads (
            message_id,
            user_id
        )
        VALUES (
            ${messageId},
            ${userId}
        )
        ON CONFLICT (
            message_id,
            user_id
        )
        DO UPDATE SET
            read_at = CURRENT_TIMESTAMP
    `;
}

export async function updateMessage(
  messageId: string,
  userId: string,
  content: string
) {
  const result = await sql`
        UPDATE messages
        SET
            content = ${content},
            edited_at = CURRENT_TIMESTAMP
        WHERE id = ${messageId}
          AND sender_id = ${userId}
          AND deleted_at IS NULL
        RETURNING
            id,
            room_id,
            sender_id,
            content,
            created_at,
            edited_at,
            deleted_at,
            reply_to_message_id
    `;

  if (result.length === 0) {
    throw new Error(
      "Message not found or cannot be edited"
    );
  }

  return result[0];
}

export async function deleteMessage(
  messageId: string,
  userId: string
) {
  const result = await sql`
        UPDATE messages
        SET
            content = '',
            deleted_at = CURRENT_TIMESTAMP
        WHERE id = ${messageId}
          AND sender_id = ${userId}
          AND deleted_at IS NULL
        RETURNING
            id,
            room_id,
            sender_id,
            content,
            created_at,
            edited_at,
            deleted_at,
            reply_to_message_id
    `;

  if (result.length === 0) {
    throw new Error(
      "Message not found or cannot be deleted"
    );
  }

  return result[0];
}

export interface MessageReaction {
  message_id: string;
  user_id: string;
  reaction: string;
  created_at: string;
}

export async function addMessageReaction(
  messageId: string,
  userId: string,
  reaction: string
): Promise<MessageReaction> {
  const result = await sql`
    INSERT INTO message_reactions (
      message_id,
      user_id,
      reaction
    )
    VALUES (
      ${messageId},
      ${userId},
      ${reaction}
    )
    ON CONFLICT (
      message_id,
      user_id,
      reaction
    )
    DO NOTHING
    RETURNING
      message_id,
      user_id,
      reaction,
      created_at
  `;

  if (result.length === 0) {
    const existing = await sql`
      SELECT
        message_id,
        user_id,
        reaction,
        created_at
      FROM message_reactions
      WHERE message_id = ${messageId}
        AND user_id = ${userId}
        AND reaction = ${reaction}
      LIMIT 1
    `;

    return existing[0] as MessageReaction;
  }

  return result[0] as MessageReaction;
}

export async function removeMessageReaction(
  messageId: string,
  userId: string,
  reaction: string
): Promise<void> {
  await sql`
    DELETE FROM message_reactions
    WHERE message_id = ${messageId}
      AND user_id = ${userId}
      AND reaction = ${reaction}
  `;
}

export async function getMessageReactions(
  messageId: string
): Promise<MessageReaction[]> {
  const result = await sql`
    SELECT
      message_id,
      user_id,
      reaction,
      created_at
    FROM message_reactions
    WHERE message_id = ${messageId}
    ORDER BY created_at ASC
  `;

  return result as MessageReaction[];
}

export async function getReactionsForMessages(
  messageIds: string[]
): Promise<MessageReaction[]> {
  if (messageIds.length === 0) {
    return [];
  }

  const result = await sql`
    SELECT
      message_id,
      user_id,
      reaction,
      created_at
    FROM message_reactions
    WHERE message_id = ANY(${messageIds})
    ORDER BY created_at ASC
  `;

  return result as MessageReaction[];
}

export interface MessageAttachment {
  id: string;
  message_id: string;
  original_name: string;
  storage_key: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

export async function createAttachment(
  messageId: string,
  originalName: string,
  storageKey: string,
  mimeType: string,
  sizeBytes: number
): Promise<MessageAttachment> {
  const result = await sql`
    INSERT INTO attachments (
      message_id,
      original_name,
      storage_key,
      mime_type,
      size_bytes
    )
    VALUES (
      ${messageId},
      ${originalName},
      ${storageKey},
      ${mimeType},
      ${sizeBytes}
    )
    RETURNING
      id,
      message_id,
      original_name,
      storage_key,
      mime_type,
      size_bytes,
      created_at
  `;

  return result[0] as MessageAttachment;
}

export async function getAttachmentMessage(
  messageId: string,
  attachmentId: string
): Promise<{
  message: ChatMessage;
  attachment: MessageAttachment;
} | null> {
  const result = await sql`
        SELECT
            m.id,
            m.room_id,
            m.sender_id,
            m.content,
            m.created_at,
            m.edited_at,
            m.deleted_at,
            m.reply_to_message_id,

            a.id AS attachment_id,
            a.message_id AS attachment_message_id,
            a.original_name,
            a.storage_key,
            a.mime_type,
            a.size_bytes,
            a.created_at AS attachment_created_at

        FROM messages m

        INNER JOIN attachments a
            ON a.message_id = m.id

        WHERE m.id = ${messageId}
          AND a.id = ${attachmentId}

        LIMIT 1
    `;

  if (result.length === 0) {
    return null;
  }

  const row =
    result[0] as Record<
      string,
      unknown
    >;

  const message: ChatMessage = {
    id: String(row.id),
    room_id: String(row.room_id),
    sender_id: String(row.sender_id),
    content: String(row.content ?? ""),
    created_at: String(
      row.created_at
    ),
    edited_at:
      row.edited_at == null
        ? null
        : String(row.edited_at),
    deleted_at:
      row.deleted_at == null
        ? null
        : String(row.deleted_at),
    reply_to_message_id:
      row.reply_to_message_id == null
        ? null
        : String(
          row.reply_to_message_id
        ),
  };

  const attachment: MessageAttachment = {
    id: String(
      row.attachment_id
    ),
    message_id: String(
      row.attachment_message_id
    ),
    original_name: String(
      row.original_name
    ),
    storage_key: String(
      row.storage_key
    ),
    mime_type: String(
      row.mime_type
    ),
    size_bytes: Number(
      row.size_bytes
    ),
    created_at: String(
      row.attachment_created_at
    ),
  };

  return {
    message,
    attachment,
  };
}

export interface DownloadableAttachment {
  id: string;
  message_id: string;
  room_id: string;
  original_name: string;
  storage_key: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

export async function getAttachmentForDownload(
  storageKey: string
): Promise<DownloadableAttachment | null> {
  const result = await sql`
        SELECT
            a.id,
            a.message_id,
            m.room_id,
            a.original_name,
            a.storage_key,
            a.mime_type,
            a.size_bytes,
            a.created_at
        FROM attachments a
        INNER JOIN messages m
            ON m.id = a.message_id
        WHERE a.storage_key = ${storageKey}
        LIMIT 1
    `;

  if (result.length === 0) {
    return null;
  }

  return result[0] as DownloadableAttachment;
}

export interface SearchableMessage extends ChatMessage {
  sender_username?: string;
}

export async function searchMessages(
  roomId: string,
  query: string,
  limit = 50
): Promise<SearchableMessage[]> {
  const safeLimit = Math.min(
    Math.max(limit, 1),
    100
  );

  const result = await sql`
    SELECT
      m.id,
      m.room_id,
      m.sender_id,
      m.content,
      m.created_at,
      m.edited_at,
      m.deleted_at,
      m.reply_to_message_id,
      u.username AS sender_username
    FROM messages m
    INNER JOIN users u
      ON u.id = m.sender_id
    WHERE m.room_id = ${roomId}
      AND m.deleted_at IS NULL
      AND m.content ILIKE ${"%" + query + "%"}
    ORDER BY m.created_at DESC, m.id DESC
    LIMIT ${safeLimit}
  `;

  return result as SearchableMessage[];
}