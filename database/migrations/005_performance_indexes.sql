-- ============================================
-- Performance Indexes
-- Migration 005
-- ============================================

-- Fast lookup of all rooms belonging to a user.
CREATE INDEX IF NOT EXISTS idx_room_members_user_id
ON room_members(user_id);

-- Fast lookup of a user's memberships by both columns.
CREATE INDEX IF NOT EXISTS idx_room_members_user_room
ON room_members(user_id, room_id);