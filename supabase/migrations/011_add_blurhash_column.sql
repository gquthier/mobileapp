-- =====================================================
-- Migration: Add Blurhash Support for Instant Thumbnails
-- Phase 4.1 - Image & Thumbnail Performance
-- Date: 2025-10-25
-- =====================================================

-- Add blurhash column to videos table
-- Stores blurhash string (compact representation of image)
-- Typical length: 20-40 chars, max 100 for safety
ALTER TABLE videos
ADD COLUMN IF NOT EXISTS thumbnail_blurhash VARCHAR(100);

-- Add index for potential future queries filtering by blurhash existence
CREATE INDEX IF NOT EXISTS idx_videos_has_blurhash
ON videos (thumbnail_blurhash)
WHERE thumbnail_blurhash IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN videos.thumbnail_blurhash IS
'Blurhash string for instant thumbnail placeholder. Generated during thumbnail creation. Max 100 chars. Null for legacy videos.';

-- =====================================================
-- Verification Query (run after migration)
-- =====================================================
-- SELECT
--   COUNT(*) as total_videos,
--   COUNT(thumbnail_blurhash) as videos_with_blurhash,
--   COUNT(*) - COUNT(thumbnail_blurhash) as legacy_videos
-- FROM videos;
