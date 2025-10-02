-- Migration: Refactoring complet vers extraction audio + jobs asynchrones
-- Supprimer les anciennes tables de transcription
DROP TABLE IF EXISTS video_transcriptions CASCADE;

-- Nouvelle structure optimisée pour jobs de transcription
CREATE TABLE IF NOT EXISTS transcription_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,

  -- URLs
  video_url TEXT NOT NULL,
  audio_url TEXT,

  -- Metadata
  video_duration_seconds INTEGER,
  video_size_bytes BIGINT,
  audio_size_bytes BIGINT,

  -- Transcription
  transcription JSONB, -- Stocke le résultat complet de Whisper
  transcription_text TEXT, -- Texte pur pour recherche
  language TEXT,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'extracting_audio', 'transcribing', 'completed', 'failed')),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  audio_extracted_at TIMESTAMPTZ,
  transcription_started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_pending_jobs ON transcription_jobs(status, created_at) WHERE status IN ('pending', 'failed');
CREATE INDEX IF NOT EXISTS idx_user_jobs ON transcription_jobs(user_id, created_at DESC);

-- Table pour les chunks (si vidéo > 25MB après extraction)
CREATE TABLE IF NOT EXISTS transcription_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES transcription_jobs(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  audio_url TEXT NOT NULL,
  transcription TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, chunk_index)
);

-- RLS policies
ALTER TABLE transcription_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcription_chunks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own transcription jobs" ON transcription_jobs;
DROP POLICY IF EXISTS "Users can create own transcription jobs" ON transcription_jobs;
DROP POLICY IF EXISTS "Service role can manage all transcription jobs" ON transcription_jobs;
DROP POLICY IF EXISTS "Service role can manage all chunks" ON transcription_chunks;
DROP POLICY IF EXISTS "Users can view own chunks" ON transcription_chunks;

-- Utilisateurs peuvent voir leurs propres jobs
CREATE POLICY "Users can view own transcription jobs" ON transcription_jobs
  FOR SELECT USING (auth.uid() = user_id);

-- Utilisateurs peuvent créer leurs propres jobs
CREATE POLICY "Users can create own transcription jobs" ON transcription_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role peut tout faire (pour les Edge Functions)
CREATE POLICY "Service role can manage all transcription jobs" ON transcription_jobs
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all chunks" ON transcription_chunks
  FOR ALL USING (auth.role() = 'service_role');

-- Utilisateurs peuvent voir leurs chunks
CREATE POLICY "Users can view own chunks" ON transcription_chunks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM transcription_jobs
      WHERE transcription_jobs.id = transcription_chunks.job_id
      AND transcription_jobs.user_id = auth.uid()
    )
  );