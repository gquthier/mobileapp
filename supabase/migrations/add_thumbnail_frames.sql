-- Migration: Add thumbnail_frames column to videos table
-- This column stores an array of URLs for animated thumbnail frames

-- Add the thumbnail_frames column as a JSON array
ALTER TABLE videos
ADD COLUMN IF NOT EXISTS thumbnail_frames jsonb DEFAULT NULL;

-- Add a comment to document the column
COMMENT ON COLUMN videos.thumbnail_frames IS 'Array of thumbnail frame URLs for animated preview (6 frames extracted from video)';

-- Optional: Create an index if you want to search by frames existence
CREATE INDEX IF NOT EXISTS idx_videos_has_frames ON videos ((thumbnail_frames IS NOT NULL));

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'videos' AND column_name = 'thumbnail_frames';
