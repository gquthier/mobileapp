-- ============================================================================
-- Migration 013: Upload Queue for Real-Time Monitoring
-- Description: Table pour tracker les uploads en temps réel et permettre le contrôle manuel
-- Date: 2025-10-13
-- ============================================================================

-- Create upload_queue table
CREATE TABLE IF NOT EXISTS upload_queue (
  -- Identifiants
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Informations vidéo
  video_title TEXT NOT NULL DEFAULT 'Sans titre',
  filename TEXT NOT NULL,
  file_size BIGINT, -- bytes
  file_path TEXT, -- URL Supabase Storage (une fois complété)

  -- Status de l'upload (3 statuts principaux)
  status TEXT NOT NULL DEFAULT 'uploading',
  CHECK (status IN ('uploading', 'retrying', 'failed', 'completed', 'stopped')),

  -- Progression
  progress INTEGER DEFAULT 0 NOT NULL,
  CHECK (progress >= 0 AND progress <= 100),

  -- Performance
  upload_speed NUMERIC, -- MB/s
  bytes_uploaded BIGINT DEFAULT 0,

  -- Retry management
  retry_count INTEGER DEFAULT 0 NOT NULL,
  max_retries INTEGER DEFAULT 3 NOT NULL,

  -- Error tracking
  error_message TEXT,
  last_error_at TIMESTAMP WITH TIME ZONE,

  -- Metadata additionnelle
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  stopped_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

  -- Indexes
  CONSTRAINT unique_upload_filename UNIQUE (user_id, filename, started_at)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_upload_queue_user_id ON upload_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_upload_queue_status ON upload_queue(status);
CREATE INDEX IF NOT EXISTS idx_upload_queue_started_at ON upload_queue(started_at DESC);

-- Index pour les uploads actifs (uploading ou retrying)
CREATE INDEX IF NOT EXISTS idx_upload_queue_active ON upload_queue(status, started_at)
  WHERE status IN ('uploading', 'retrying');

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Function pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_upload_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
DROP TRIGGER IF EXISTS update_upload_queue_updated_at ON upload_queue;
CREATE TRIGGER update_upload_queue_updated_at
  BEFORE UPDATE ON upload_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_upload_queue_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE upload_queue ENABLE ROW LEVEL SECURITY;

-- Users peuvent voir leurs propres uploads
CREATE POLICY "Users can view own uploads"
  ON upload_queue FOR SELECT
  USING (auth.uid() = user_id);

-- Users peuvent créer leurs propres uploads
CREATE POLICY "Users can insert own uploads"
  ON upload_queue FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users peuvent mettre à jour leurs propres uploads
CREATE POLICY "Users can update own uploads"
  ON upload_queue FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role peut tout voir et modifier (pour le dashboard admin)
CREATE POLICY "Service role can view all uploads"
  ON upload_queue FOR SELECT
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can update all uploads"
  ON upload_queue FOR UPDATE
  USING (auth.role() = 'service_role');

-- ============================================================================
-- FONCTIONS UTILITAIRES
-- ============================================================================

-- Fonction pour stopper un upload spécifique
CREATE OR REPLACE FUNCTION stop_upload(p_upload_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_affected INTEGER;
BEGIN
  UPDATE upload_queue
  SET
    status = 'stopped',
    stopped_at = NOW(),
    error_message = 'Manually stopped from admin dashboard'
  WHERE id = p_upload_id
    AND status IN ('uploading', 'retrying');

  GET DIAGNOSTICS v_affected = ROW_COUNT;

  RETURN v_affected > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour stopper tous les uploads en cours d'un user
CREATE OR REPLACE FUNCTION stop_user_uploads(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_affected INTEGER;
BEGIN
  UPDATE upload_queue
  SET
    status = 'stopped',
    stopped_at = NOW(),
    error_message = 'Manually stopped from admin dashboard'
  WHERE user_id = p_user_id
    AND status IN ('uploading', 'retrying');

  GET DIAGNOSTICS v_affected = ROW_COUNT;

  RETURN v_affected;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour stopper TOUS les uploads en cours (pour développement)
CREATE OR REPLACE FUNCTION stop_all_uploads()
RETURNS INTEGER AS $$
DECLARE
  v_affected INTEGER;
BEGIN
  UPDATE upload_queue
  SET
    status = 'stopped',
    stopped_at = NOW(),
    error_message = 'All uploads stopped from admin dashboard'
  WHERE status IN ('uploading', 'retrying');

  GET DIAGNOSTICS v_affected = ROW_COUNT;

  RETURN v_affected;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir les uploads actifs
CREATE OR REPLACE FUNCTION get_active_uploads()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  user_email TEXT,
  video_title TEXT,
  filename TEXT,
  status TEXT,
  progress INTEGER,
  retry_count INTEGER,
  started_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    uq.id,
    uq.user_id,
    p.email,
    uq.video_title,
    uq.filename,
    uq.status,
    uq.progress,
    uq.retry_count,
    uq.started_at
  FROM upload_queue uq
  JOIN profiles p ON uq.user_id = p.id
  WHERE uq.status IN ('uploading', 'retrying')
  ORDER BY uq.started_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- CLEANUP AUTOMATIQUE
-- ============================================================================

-- Fonction pour nettoyer les vieux uploads (> 7 jours)
CREATE OR REPLACE FUNCTION cleanup_old_uploads()
RETURNS INTEGER AS $$
DECLARE
  v_affected INTEGER;
BEGIN
  DELETE FROM upload_queue
  WHERE status IN ('completed', 'failed', 'stopped')
    AND (completed_at < NOW() - INTERVAL '7 days' OR stopped_at < NOW() - INTERVAL '7 days');

  GET DIAGNOSTICS v_affected = ROW_COUNT;

  RETURN v_affected;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTAIRES
-- ============================================================================

COMMENT ON TABLE upload_queue IS 'Real-time upload queue for monitoring and manual control';
COMMENT ON COLUMN upload_queue.status IS 'Upload status: uploading (in progress), retrying (retry attempt), failed (error), completed (success), stopped (manually stopped)';
COMMENT ON COLUMN upload_queue.retry_count IS 'Current retry attempt (0-3)';
COMMENT ON COLUMN upload_queue.progress IS 'Upload progress percentage (0-100)';
COMMENT ON COLUMN upload_queue.upload_speed IS 'Current upload speed in MB/s';

COMMENT ON FUNCTION stop_upload IS 'Stop a specific upload by ID';
COMMENT ON FUNCTION stop_user_uploads IS 'Stop all uploads for a specific user';
COMMENT ON FUNCTION stop_all_uploads IS 'Emergency function: stop ALL active uploads (for development)';

-- ============================================================================
-- VÉRIFICATION
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'upload_queue'
  ) THEN
    RAISE EXCEPTION 'Table upload_queue was not created successfully';
  END IF;

  RAISE NOTICE '✅ Migration 013 completed successfully - upload_queue table created';
END $$;
