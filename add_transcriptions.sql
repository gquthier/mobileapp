-- Add transcriptions table and related components
-- Execute this in your Supabase SQL Editor

-- Create transcriptions table
CREATE TABLE IF NOT EXISTS transcriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL,
  segments JSONB DEFAULT '[]'::jsonb,
  language VARCHAR(10) DEFAULT 'en',
  duration FLOAT DEFAULT 0,
  confidence FLOAT DEFAULT 0,
  processing_status VARCHAR(20) DEFAULT 'completed',
  error_message TEXT,

  UNIQUE(video_id)
);

-- Enable RLS
ALTER TABLE transcriptions ENABLE ROW LEVEL SECURITY;

-- Create policies for transcriptions (users can only access transcriptions of their own videos)
CREATE POLICY "Users can view transcriptions of own videos" ON transcriptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM videos
      WHERE videos.id = transcriptions.video_id
      AND videos.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert transcriptions for own videos" ON transcriptions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM videos
      WHERE videos.id = transcriptions.video_id
      AND videos.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update transcriptions of own videos" ON transcriptions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM videos
      WHERE videos.id = transcriptions.video_id
      AND videos.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete transcriptions of own videos" ON transcriptions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM videos
      WHERE videos.id = transcriptions.video_id
      AND videos.user_id = auth.uid()
    )
  );

-- Create function for automatic updated_at timestamps (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for automatic updated_at
CREATE TRIGGER update_transcriptions_updated_at BEFORE UPDATE ON transcriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transcriptions_video_id ON transcriptions(video_id);
CREATE INDEX IF NOT EXISTS idx_transcriptions_language ON transcriptions(language);
CREATE INDEX IF NOT EXISTS idx_transcriptions_text_search ON transcriptions USING GIN (to_tsvector('english', text));

-- Verify table creation
SELECT
  'transcriptions' as table_name,
  COUNT(*) as record_count,
  'Table created successfully' as status
FROM transcriptions;

-- Show table structure
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'transcriptions'
ORDER BY ordinal_position;