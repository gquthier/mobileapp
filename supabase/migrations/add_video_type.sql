-- Migration: Add video_type to videos table
-- Date: 2025-10-22
-- Description: Add video type support for categorizing videos (statement, reflection, daily)

-- ✅ Step 1: Create enum type for video types
CREATE TYPE video_type AS ENUM ('statement', 'reflection', 'daily', 'imported');

-- ✅ Step 2: Add video_type column to videos table
ALTER TABLE videos
ADD COLUMN IF NOT EXISTS video_type video_type DEFAULT 'reflection';

-- ✅ Step 3: Add is_north_star flag for the special statement video
ALTER TABLE videos
ADD COLUMN IF NOT EXISTS is_north_star BOOLEAN DEFAULT FALSE;

-- ✅ Step 4: Create index for faster queries on video_type
CREATE INDEX IF NOT EXISTS idx_videos_type ON videos(video_type);

-- ✅ Step 5: Create index for north star videos
CREATE INDEX IF NOT EXISTS idx_videos_north_star ON videos(is_north_star) WHERE is_north_star = TRUE;

-- ✅ Step 6: Add constraint to ensure only ONE north star per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_videos_one_north_star_per_user
ON videos(user_id)
WHERE is_north_star = TRUE;

-- ✅ Step 7: Update existing imported videos to have correct type
UPDATE videos
SET video_type = 'imported'
WHERE created_at < NOW() - INTERVAL '1 hour'; -- Assume older videos are imported

-- ✅ Step 8: Comment on columns
COMMENT ON COLUMN videos.video_type IS 'Type of video: statement (north star), reflection (regular), daily (daily log), imported (from camera roll)';
COMMENT ON COLUMN videos.is_north_star IS 'Flag indicating this is the user''s North Star statement video (only one per user)';
