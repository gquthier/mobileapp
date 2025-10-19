-- Migration: Add AI-generated chapter story fields
-- This migration adds fields for AI-extracted keywords, title, summary, and detailed description

-- Add keywords column (JSON array of strings)
ALTER TABLE chapters
ADD COLUMN IF NOT EXISTS keywords JSONB DEFAULT '[]'::jsonb;

-- Add AI-generated chapter title (max 3 words, literary)
ALTER TABLE chapters
ADD COLUMN IF NOT EXISTS ai_title TEXT;

-- Add short summary (1 sentence, main challenge overcome)
ALTER TABLE chapters
ADD COLUMN IF NOT EXISTS ai_short_summary TEXT;

-- Add detailed description (autobiographical, first person, 10 sentences max)
ALTER TABLE chapters
ADD COLUMN IF NOT EXISTS ai_detailed_description TEXT;

-- Add timestamp to track when AI content was last generated
ALTER TABLE chapters
ADD COLUMN IF NOT EXISTS ai_extracted_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster keyword searches (GIN index for JSONB)
CREATE INDEX IF NOT EXISTS idx_chapters_keywords ON chapters USING GIN (keywords);

-- Add comments for documentation
COMMENT ON COLUMN chapters.keywords IS 'AI-extracted keywords (max 10) from video transcriptions in this chapter';
COMMENT ON COLUMN chapters.ai_title IS 'AI-generated literary chapter title (max 3 words) with growth/evolution theme';
COMMENT ON COLUMN chapters.ai_short_summary IS 'AI-generated one-sentence summary of main challenge overcome (first person)';
COMMENT ON COLUMN chapters.ai_detailed_description IS 'AI-generated detailed autobiographical description (first person, max 10 sentences)';
COMMENT ON COLUMN chapters.ai_extracted_at IS 'Timestamp when AI content was last generated';

-- Function to update chapter AI content
CREATE OR REPLACE FUNCTION update_chapter_ai_content(
  chapter_uuid UUID,
  new_keywords JSONB,
  new_title TEXT DEFAULT NULL,
  new_short_summary TEXT DEFAULT NULL,
  new_detailed_description TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE chapters
  SET keywords = new_keywords,
      ai_title = COALESCE(new_title, ai_title),
      ai_short_summary = COALESCE(new_short_summary, ai_short_summary),
      ai_detailed_description = COALESCE(new_detailed_description, ai_detailed_description),
      ai_extracted_at = TIMEZONE('utc'::text, NOW())
  WHERE id = chapter_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_chapter_ai_content(UUID, JSONB, TEXT, TEXT, TEXT) TO authenticated;
