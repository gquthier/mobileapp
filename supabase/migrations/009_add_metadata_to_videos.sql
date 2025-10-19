-- Add metadata column to videos table for local backup tracking
-- This allows videos to be saved locally when upload fails

ALTER TABLE videos
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Create index for faster queries on metadata
CREATE INDEX IF NOT EXISTS idx_videos_metadata ON videos USING GIN (metadata);

-- Add comment explaining the metadata column
COMMENT ON COLUMN videos.metadata IS 'Stores metadata about video upload status, local backup info, and other custom fields';
