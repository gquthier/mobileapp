-- Migration: Ajouter transcript_highlight à la table transcription_jobs
-- Pour stocker l'analyse des highlights générée par l'IA

-- Ajouter la colonne transcript_highlight
ALTER TABLE transcription_jobs
ADD COLUMN IF NOT EXISTS transcript_highlight JSONB;

-- Ajouter un index pour la performance sur les recherches de highlights
CREATE INDEX IF NOT EXISTS idx_transcription_jobs_highlight ON transcription_jobs USING GIN (transcript_highlight);

-- Ajouter un commentaire pour clarifier l'usage
COMMENT ON COLUMN transcription_jobs.transcript_highlight IS 'Analyse des highlights extraits de la transcription par IA (format JSON)';

-- Vérifier que la colonne a été ajoutée
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'transcription_jobs' AND column_name = 'transcript_highlight';