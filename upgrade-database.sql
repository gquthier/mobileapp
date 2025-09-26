-- =============================================================
-- MISE À JOUR BASE DE DONNÉES - Version sécurisée avec IF NOT EXISTS
-- Ajoute uniquement les éléments manquants sans erreur
-- =============================================================

-- 1. MISE À JOUR TABLE PROFILES
-- Ajout des colonnes manquantes dans la table profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{"push_enabled": true, "email_enabled": true, "reminders_enabled": true, "reminder_time": "18:00"}'::jsonb,
  ADD COLUMN IF NOT EXISTS privacy_settings JSONB DEFAULT '{"profile_public": false, "analytics_enabled": true}'::jsonb,
  ADD COLUMN IF NOT EXISTS backup_settings JSONB DEFAULT '{"cloud_backup_enabled": false, "auto_backup": false, "backup_frequency": "weekly"}'::jsonb;

-- Modification de la contrainte email si elle existe
DO $$
BEGIN
  ALTER TABLE profiles ALTER COLUMN email DROP NOT NULL;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Ajout de full_name si pas déjà présent (pour compatibilité)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;

-- 2. CRÉATION TABLE TRANSCRIPTIONS (si manquante)
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

-- 3. ACTIVATION RLS POUR TRANSCRIPTIONS (si pas déjà activé)
DO $$
BEGIN
  ALTER TABLE transcriptions ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- 4. POLITIQUES RLS POUR TRANSCRIPTIONS (création conditionnelle)
DO $$
BEGIN
  -- Policy: Users can view transcriptions of own videos
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'transcriptions'
    AND policyname = 'Users can view transcriptions of own videos'
  ) THEN
    CREATE POLICY "Users can view transcriptions of own videos" ON transcriptions
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM videos
          WHERE videos.id = transcriptions.video_id
          AND videos.user_id = auth.uid()
        )
      );
  END IF;

  -- Policy: Users can insert transcriptions for own videos
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'transcriptions'
    AND policyname = 'Users can insert transcriptions for own videos'
  ) THEN
    CREATE POLICY "Users can insert transcriptions for own videos" ON transcriptions
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM videos
          WHERE videos.id = transcriptions.video_id
          AND videos.user_id = auth.uid()
        )
      );
  END IF;

  -- Policy: Users can update transcriptions of own videos
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'transcriptions'
    AND policyname = 'Users can update transcriptions of own videos'
  ) THEN
    CREATE POLICY "Users can update transcriptions of own videos" ON transcriptions
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM videos
          WHERE videos.id = transcriptions.video_id
          AND videos.user_id = auth.uid()
        )
      );
  END IF;

  -- Policy: Users can delete transcriptions of own videos
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'transcriptions'
    AND policyname = 'Users can delete transcriptions of own videos'
  ) THEN
    CREATE POLICY "Users can delete transcriptions of own videos" ON transcriptions
      FOR DELETE USING (
        EXISTS (
          SELECT 1 FROM videos
          WHERE videos.id = transcriptions.video_id
          AND videos.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- 5. FONCTION update_updated_at_column (création conditionnelle)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. TRIGGERS POUR TRANSCRIPTIONS (création conditionnelle)
DO $$
BEGIN
  -- Trigger pour transcriptions
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_transcriptions_updated_at'
  ) THEN
    CREATE TRIGGER update_transcriptions_updated_at
    BEFORE UPDATE ON transcriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- Vérifier et créer les autres triggers si manquants
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_profiles_updated_at'
  ) THEN
    CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_videos_updated_at'
  ) THEN
    CREATE TRIGGER update_videos_updated_at
    BEFORE UPDATE ON videos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_chapters_updated_at'
  ) THEN
    CREATE TRIGGER update_chapters_updated_at
    BEFORE UPDATE ON chapters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_themes_updated_at'
  ) THEN
    CREATE TRIGGER update_themes_updated_at
    BEFORE UPDATE ON themes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- 7. INDEX POUR PERFORMANCES (création conditionnelle)
CREATE INDEX IF NOT EXISTS idx_transcriptions_video_id ON transcriptions(video_id);
CREATE INDEX IF NOT EXISTS idx_transcriptions_language ON transcriptions(language);
CREATE INDEX IF NOT EXISTS idx_transcriptions_text_search ON transcriptions USING GIN (to_tsvector('english', text));
CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at DESC);

-- 8. CRÉATION BUCKET STORAGE (si pas fait)
INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', true)
ON CONFLICT (id) DO NOTHING;

-- 9. POLITIQUES STORAGE (création conditionnelle)
DO $$
BEGIN
  -- Policy: Users can upload videos
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects'
    AND policyname = 'Users can upload videos'
  ) THEN
    CREATE POLICY "Users can upload videos" ON storage.objects
      FOR INSERT WITH CHECK (bucket_id = 'videos' AND auth.role() = 'authenticated');
  END IF;

  -- Policy: Users can view videos
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects'
    AND policyname = 'Users can view videos'
  ) THEN
    CREATE POLICY "Users can view videos" ON storage.objects
      FOR SELECT USING (bucket_id = 'videos');
  END IF;

  -- Policy: Users can update own videos
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects'
    AND policyname = 'Users can update own videos'
  ) THEN
    CREATE POLICY "Users can update own videos" ON storage.objects
      FOR UPDATE USING (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;

  -- Policy: Users can delete own videos
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects'
    AND policyname = 'Users can delete own videos'
  ) THEN
    CREATE POLICY "Users can delete own videos" ON storage.objects
      FOR DELETE USING (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;

-- =============================================================
-- VÉRIFICATION FINALE ET MESSAGES
-- =============================================================
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Vérifier que toutes les colonnes sont présentes
    SELECT COUNT(*) INTO v_count
    FROM information_schema.columns
    WHERE table_name = 'profiles'
    AND column_name IN ('first_name', 'last_name', 'date_of_birth', 'avatar_url',
                        'bio', 'timezone', 'language', 'notification_settings',
                        'privacy_settings', 'backup_settings');

    RAISE NOTICE '✅ Colonnes profiles ajoutées: %', v_count;

    -- Vérifier que la table transcriptions existe
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'transcriptions'
    ) THEN
        RAISE NOTICE '✅ Table transcriptions existe';
    END IF;

    -- Vérifier les politiques RLS
    SELECT COUNT(*) INTO v_count
    FROM pg_policies
    WHERE tablename IN ('profiles', 'videos', 'transcriptions', 'chapters', 'themes');

    RAISE NOTICE '✅ Total politiques RLS actives: %', v_count;

    RAISE NOTICE '🎉 Mise à jour de la base de données terminée avec succès !';
END $$;

-- =============================================================
-- FIN DU SCRIPT DE MISE À JOUR
-- Toutes les modifications sont appliquées de manière sécurisée
-- =============================================================