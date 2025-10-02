-- Migration: Ajouter video_id à la table transcription_jobs
-- Permet de lier les jobs de transcription aux vidéos dans la base de données

-- Ajouter la colonne video_id
ALTER TABLE transcription_jobs
ADD COLUMN video_id UUID;

-- Ajouter un index pour la performance
CREATE INDEX IF NOT EXISTS idx_transcription_jobs_video_id ON transcription_jobs(video_id);

-- Ajouter un commentaire pour clarifier l'usage
COMMENT ON COLUMN transcription_jobs.video_id IS 'ID de la vidéo associée dans la table videos (si applicable)';