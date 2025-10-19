-- Migration: Enhanced Chapter System for Current Chapter Management
-- Add fields to support current chapter workflow

-- Add new fields to chapters table
ALTER TABLE chapters
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
ADD COLUMN IF NOT EXISTS ended_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS recap_video_id UUID REFERENCES videos(id) ON DELETE SET NULL;

-- Create unique partial index to ensure only one current chapter per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_chapters_one_current_per_user
ON chapters (user_id, is_current)
WHERE is_current = true;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_chapters_user_current ON chapters(user_id, is_current);

-- Function to get chapter statistics
CREATE OR REPLACE FUNCTION get_chapter_stats(chapter_uuid UUID)
RETURNS TABLE (video_count BIGINT, total_duration NUMERIC) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT,
    COALESCE(SUM(duration), 0)::NUMERIC
  FROM videos
  WHERE chapter_id = chapter_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has a current chapter
CREATE OR REPLACE FUNCTION user_has_current_chapter(uid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM chapters
    WHERE user_id = uid AND is_current = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current chapter for a user
CREATE OR REPLACE FUNCTION get_user_current_chapter(uid UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  video_count BIGINT,
  total_duration NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.title,
    c.description,
    c.started_at,
    COUNT(v.id)::BIGINT as video_count,
    COALESCE(SUM(v.duration), 0)::NUMERIC as total_duration
  FROM chapters c
  LEFT JOIN videos v ON v.chapter_id = c.id
  WHERE c.user_id = uid AND c.is_current = true
  GROUP BY c.id, c.title, c.description, c.started_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to ensure only one current chapter per user
CREATE OR REPLACE FUNCTION ensure_single_current_chapter()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_current = true THEN
    -- Set all other chapters for this user to not current
    UPDATE chapters
    SET is_current = false
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_current = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ensure_single_current_chapter ON chapters;
CREATE TRIGGER trigger_ensure_single_current_chapter
  BEFORE INSERT OR UPDATE ON chapters
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_current_chapter();

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_chapter_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_current_chapter(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_current_chapter(UUID) TO authenticated;
