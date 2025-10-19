-- Migration 012: Fix local video paths (file://) in database
-- This migration adds metadata flags to videos that have local file paths
-- so the app knows they are still being uploaded

-- Update videos with file:// paths to have proper metadata
UPDATE videos
SET metadata = COALESCE(metadata, '{}'::jsonb) || '{"isLocalBackup": true, "needsReupload": true}'::jsonb
WHERE file_path LIKE 'file://%'
  AND (metadata IS NULL OR metadata->>'isLocalBackup' IS NULL);

-- Log how many videos were updated
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM videos
  WHERE file_path LIKE 'file://%';

  RAISE NOTICE '✅ Updated % videos with local file paths to include upload metadata', updated_count;
END $$;

-- Create an index on metadata for faster queries
CREATE INDEX IF NOT EXISTS idx_videos_metadata_local_backup
  ON videos ((metadata->>'isLocalBackup'))
  WHERE metadata->>'isLocalBackup' = 'true';

-- Add comment to the videos table
COMMENT ON COLUMN videos.metadata IS 'JSONB metadata including upload status (isLocalBackup, uploadFailed, etc.)';
