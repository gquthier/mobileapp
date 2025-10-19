-- =============================================================
-- AJOUT DU CHAMP LANGUE AU PROFIL UTILISATEUR
-- =============================================================

-- Vérifier si la colonne 'preferred_language' existe déjà
DO $$
BEGIN
  -- Ajouter la colonne preferred_language si elle n'existe pas
  IF NOT EXISTS (
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'profiles'
    AND column_name = 'preferred_language'
  ) THEN
    ALTER TABLE profiles
    ADD COLUMN preferred_language VARCHAR(5) DEFAULT 'auto';

    RAISE NOTICE '✅ Colonne preferred_language ajoutée à la table profiles';
  ELSE
    RAISE NOTICE 'ℹ️ Colonne preferred_language existe déjà dans la table profiles';
  END IF;
END $$;

-- Ajouter un commentaire sur la colonne pour documenter les valeurs acceptées
COMMENT ON COLUMN profiles.preferred_language IS 'Langue préférée pour la transcription (ISO-639-1: en, fr, es, etc. ou "auto" pour détection automatique)';

-- Ajouter une contrainte pour valider les codes de langue les plus courants
DO $$
BEGIN
  -- Supprimer l'ancienne contrainte si elle existe
  IF EXISTS (
    SELECT constraint_name
    FROM information_schema.table_constraints
    WHERE table_name = 'profiles'
    AND constraint_name = 'preferred_language_check'
  ) THEN
    ALTER TABLE profiles DROP CONSTRAINT preferred_language_check;
  END IF;

  -- Ajouter la nouvelle contrainte
  ALTER TABLE profiles
  ADD CONSTRAINT preferred_language_check
  CHECK (
    preferred_language IN (
      'auto', 'en', 'fr', 'es', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh',
      'ar', 'hi', 'nl', 'sv', 'no', 'da', 'fi', 'pl', 'tr', 'he', 'th', 'vi'
    )
    OR LENGTH(preferred_language) = 2
  );

  RAISE NOTICE '✅ Contrainte de validation ajoutée pour preferred_language';
END $$;

-- Mettre à jour les profils existants si nécessaire
UPDATE profiles
SET preferred_language = 'auto'
WHERE preferred_language IS NULL;

-- Afficher un résumé
SELECT
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN preferred_language = 'auto' THEN 1 END) as auto_detect,
  COUNT(CASE WHEN preferred_language != 'auto' THEN 1 END) as specific_language
FROM profiles;

RAISE NOTICE '🎉 Configuration de la langue préférée terminée !';
RAISE NOTICE 'Les utilisateurs peuvent maintenant choisir leur langue préférée pour la transcription.';