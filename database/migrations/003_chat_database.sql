-- ============================================
-- Chat Application Database Expansion
-- Migration 003
-- ============================================


-- ============================================
-- ROOMS
-- ============================================

ALTER TABLE rooms
ADD COLUMN IF NOT EXISTS room_type VARCHAR(20) NOT NULL DEFAULT 'group';

ALTER TABLE rooms
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE
DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE rooms
ADD CONSTRAINT rooms_room_type_check
CHECK (room_type IN ('direct', 'group'));


-- ============================================
-- MESSAGES
-- ============================================

ALTER TABLE messages
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE messages
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE messages
ADD COLUMN IF NOT EXISTS reply_to_message_id UUID
REFERENCES messages(id) ON DELETE SET NULL;


-- ============================================
-- MESSAGE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_messages_room_created
ON messages(room_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_messages_sender_id
ON messages(sender_id);

CREATE INDEX IF NOT EXISTS idx_messages_reply_to
ON messages(reply_to_message_id);


-- ============================================
-- ROOM MEMBER INDEX
-- ============================================

CREATE INDEX IF NOT EXISTS idx_room_members_room_id
ON room_members(room_id);


-- ============================================
-- USER INDEX
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_username
ON users(username);


-- ============================================
-- MESSAGE REACTIONS
-- ============================================

CREATE TABLE IF NOT EXISTS message_reactions (
    message_id UUID NOT NULL
        REFERENCES messages(id) ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

    reaction VARCHAR(32) NOT NULL,

    created_at TIMESTAMP WITH TIME ZONE
        DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (message_id, user_id, reaction)
);

CREATE INDEX IF NOT EXISTS idx_message_reactions_user
ON message_reactions(user_id);


-- ============================================
-- MESSAGE READS
-- ============================================

CREATE TABLE IF NOT EXISTS message_reads (
    message_id UUID NOT NULL
        REFERENCES messages(id) ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

    read_at TIMESTAMP WITH TIME ZONE
        DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_message_reads_user
ON message_reads(user_id);

CREATE INDEX IF NOT EXISTS idx_message_reads_message
ON message_reads(message_id);


-- ============================================
-- ATTACHMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    message_id UUID NOT NULL
        REFERENCES messages(id) ON DELETE CASCADE,

    original_name VARCHAR(255) NOT NULL,

    storage_key TEXT NOT NULL,

    mime_type VARCHAR(150) NOT NULL,

    size_bytes BIGINT NOT NULL,

    created_at TIMESTAMP WITH TIME ZONE
        DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_attachments_message
ON attachments(message_id);


-- ============================================
-- NOTIFICATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    user_id UUID NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

    type VARCHAR(50) NOT NULL,

    title VARCHAR(200) NOT NULL,

    content TEXT,

    room_id UUID
        REFERENCES rooms(id) ON DELETE CASCADE,

    message_id UUID
        REFERENCES messages(id) ON DELETE CASCADE,

    is_read BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMP WITH TIME ZONE
        DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user
ON notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_unread
ON notifications(user_id, is_read, created_at DESC);