-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table if it doesn't exist (for future authentication)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,

  -- Basic Information
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  username TEXT UNIQUE,
  date_of_birth DATE,

  -- Profile Settings
  avatar_url TEXT,
  bio TEXT,
  timezone TEXT DEFAULT 'UTC',
  language TEXT DEFAULT 'en',

  -- Preferences
  notification_settings JSONB DEFAULT '{"push_enabled": true, "email_enabled": true, "reminders_enabled": true, "reminder_time": "18:00"}'::jsonb,
  privacy_settings JSONB DEFAULT '{"profile_public": false, "analytics_enabled": true}'::jsonb,
  backup_settings JSONB DEFAULT '{"cloud_backup_enabled": false, "auto_backup": false, "backup_frequency": "weekly"}'::jsonb,

  PRIMARY KEY (id)
);

-- Create chapters table
CREATE TABLE IF NOT EXISTS chapters (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  color TEXT DEFAULT '#000000'
);

-- Create themes table
CREATE TABLE IF NOT EXISTS themes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  title TEXT NOT NULL,
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE NOT NULL,
  color TEXT DEFAULT '#000000'
);

-- Create videos table
CREATE TABLE IF NOT EXISTS videos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  thumbnail_path TEXT,
  duration INTEGER DEFAULT 0,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  theme_id UUID REFERENCES themes(id) ON DELETE SET NULL,
  chapter_id UUID REFERENCES chapters(id) ON DELETE SET NULL
);

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

-- Create storage bucket for videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', true)
ON CONFLICT (id) DO NOTHING;

-- Set up Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcriptions ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles (users can only see and edit their own profile)
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create policies for chapters (users can only see and edit their own chapters)
CREATE POLICY "Users can view own chapters" ON chapters
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chapters" ON chapters
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chapters" ON chapters
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own chapters" ON chapters
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for themes
CREATE POLICY "Users can view themes of their chapters" ON themes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chapters
      WHERE chapters.id = themes.chapter_id
      AND chapters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert themes in their chapters" ON themes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM chapters
      WHERE chapters.id = themes.chapter_id
      AND chapters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update themes in their chapters" ON themes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM chapters
      WHERE chapters.id = themes.chapter_id
      AND chapters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete themes in their chapters" ON themes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM chapters
      WHERE chapters.id = themes.chapter_id
      AND chapters.user_id = auth.uid()
    )
  );

-- Create policies for videos (users can only see and edit their own videos)
CREATE POLICY "Users can view own videos" ON videos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own videos" ON videos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own videos" ON videos
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own videos" ON videos
  FOR DELETE USING (auth.uid() = user_id);

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

-- Create storage policies for videos bucket
CREATE POLICY "Users can upload videos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'videos' AND auth.role() = 'authenticated');

CREATE POLICY "Users can view videos" ON storage.objects
  FOR SELECT USING (bucket_id = 'videos');

CREATE POLICY "Users can update own videos" ON storage.objects
  FOR UPDATE USING (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own videos" ON storage.objects
  FOR DELETE USING (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create functions for automatic updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chapters_updated_at BEFORE UPDATE ON chapters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_themes_updated_at BEFORE UPDATE ON themes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON videos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transcriptions_updated_at BEFORE UPDATE ON transcriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transcriptions_video_id ON transcriptions(video_id);
CREATE INDEX IF NOT EXISTS idx_transcriptions_language ON transcriptions(language);
CREATE INDEX IF NOT EXISTS idx_transcriptions_text_search ON transcriptions USING GIN (to_tsvector('english', text));
CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at DESC);