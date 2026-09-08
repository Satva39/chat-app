ALTER TABLE rooms
ADD COLUMN IF NOT EXISTS direct_key VARCHAR(100);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rooms_direct_key
ON rooms(direct_key)
WHERE room_type = 'direct';