-- Migration: Ajouter la contrainte de clé étrangère pour video_id dans transcription_jobs
-- Cette contrainte permet à Supabase de faire des jointures automatiques entre tables

-- Supprimer d'abord toutes les lignes où video_id pointe vers une vidéo qui n'existe pas
-- (au cas où il y aurait des orphelins)
DELETE FROM transcription_jobs
WHERE video_id IS NOT NULL
AND video_id NOT IN (SELECT id FROM videos);

-- Ajouter la contrainte de clé étrangère
ALTER TABLE transcription_jobs
ADD CONSTRAINT fk_transcription_jobs_video_id
FOREIGN KEY (video_id)
REFERENCES videos(id)
ON DELETE CASCADE;

-- Ajouter un commentaire pour documenter la relation
COMMENT ON CONSTRAINT fk_transcription_jobs_video_id ON transcription_jobs IS
'Clé étrangère reliant les jobs de transcription aux vidéos. ON DELETE CASCADE supprime automatiquement les jobs quand une vidéo est supprimée.';
