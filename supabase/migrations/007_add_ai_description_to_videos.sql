-- Migration: Add AI-generated description column to videos table
-- This column will store the AI-generated description (2 sentences max) from the highlights function

-- Add ai_description column to videos table
ALTER TABLE videos
ADD COLUMN IF NOT EXISTS ai_description TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN videos.ai_description IS 'AI-generated description (2 sentences max) created during highlight generation';
