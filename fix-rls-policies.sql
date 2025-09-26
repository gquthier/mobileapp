-- =============================================================
-- DIAGNOSTIC ET CORRECTION COMPLÈTE DES POLITIQUES RLS
-- =============================================================

-- 1. DIAGNOSTIC: Vérifier l'état actuel
DO $$
BEGIN
  RAISE NOTICE '🔍 DIAGNOSTIC DES POLITIQUES RLS';
  RAISE NOTICE '=====================================';
END $$;

-- Vérifier les politiques existantes pour profiles
SELECT
  policyname,
  cmd as command,
  roles,
  qual as condition,
  with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 2. SUPPRESSION COMPLÈTE ET RECRÉATION DES POLITIQUES PROFILES
DO $$
BEGIN
  RAISE NOTICE '🗑️ Suppression des anciennes politiques profiles...';

  -- Désactiver temporairement RLS
  ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

  -- Supprimer toutes les politiques existantes
  DROP POLICY IF EXISTS "Users can insert own profile" ON profiles CASCADE;
  DROP POLICY IF EXISTS "Users can update own profile" ON profiles CASCADE;
  DROP POLICY IF EXISTS "Users can view own profile" ON profiles CASCADE;
  DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles CASCADE;
  DROP POLICY IF EXISTS "Enable select for users based on user_id" ON profiles CASCADE;
  DROP POLICY IF EXISTS "Enable update for users based on user_id" ON profiles CASCADE;

  RAISE NOTICE '✅ Anciennes politiques supprimées';
END $$;

-- 3. RÉACTIVER RLS ET CRÉER LES BONNES POLITIQUES
DO $$
BEGIN
  RAISE NOTICE '🛡️ Création des nouvelles politiques profiles...';

  -- Réactiver RLS
  ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

  -- Créer la politique INSERT (la plus importante pour le sign up)
  CREATE POLICY "profiles_insert_policy" ON profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

  -- Créer la politique SELECT
  CREATE POLICY "profiles_select_policy" ON profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

  -- Créer la politique UPDATE
  CREATE POLICY "profiles_update_policy" ON profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

  -- Créer la politique DELETE
  CREATE POLICY "profiles_delete_policy" ON profiles
    FOR DELETE
    TO authenticated
    USING (auth.uid() = id);

  RAISE NOTICE '✅ Nouvelles politiques profiles créées';
END $$;

-- 4. CORRIGER LES POLITIQUES TRANSCRIPTIONS
DO $$
BEGIN
  RAISE NOTICE '🛡️ Correction des politiques transcriptions...';

  -- Désactiver temporairement RLS
  ALTER TABLE transcriptions DISABLE ROW LEVEL SECURITY;

  -- Supprimer les anciennes politiques
  DROP POLICY IF EXISTS "Users can insert transcriptions for own videos" ON transcriptions CASCADE;
  DROP POLICY IF EXISTS "Users can update transcriptions of own videos" ON transcriptions CASCADE;
  DROP POLICY IF EXISTS "Users can view transcriptions of own videos" ON transcriptions CASCADE;
  DROP POLICY IF EXISTS "Users can delete transcriptions of own videos" ON transcriptions CASCADE;

  -- Réactiver RLS
  ALTER TABLE transcriptions ENABLE ROW LEVEL SECURITY;

  -- Créer les bonnes politiques
  CREATE POLICY "transcriptions_select_policy" ON transcriptions
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM videos
        WHERE videos.id = transcriptions.video_id
        AND videos.user_id = auth.uid()
      )
    );

  CREATE POLICY "transcriptions_insert_policy" ON transcriptions
    FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM videos
        WHERE videos.id = transcriptions.video_id
        AND videos.user_id = auth.uid()
      )
    );

  CREATE POLICY "transcriptions_update_policy" ON transcriptions
    FOR UPDATE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM videos
        WHERE videos.id = transcriptions.video_id
        AND videos.user_id = auth.uid()
      )
    );

  CREATE POLICY "transcriptions_delete_policy" ON transcriptions
    FOR DELETE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM videos
        WHERE videos.id = transcriptions.video_id
        AND videos.user_id = auth.uid()
      )
    );

  RAISE NOTICE '✅ Politiques transcriptions corrigées';
END $$;

-- 5. VÉRIFICATION FINALE
DO $$
DECLARE
  profiles_count INTEGER;
  transcriptions_count INTEGER;
BEGIN
  RAISE NOTICE '✅ VÉRIFICATION FINALE';
  RAISE NOTICE '====================';

  -- Compter les politiques profiles
  SELECT COUNT(*) INTO profiles_count
  FROM pg_policies
  WHERE tablename = 'profiles';

  -- Compter les politiques transcriptions
  SELECT COUNT(*) INTO transcriptions_count
  FROM pg_policies
  WHERE tablename = 'transcriptions';

  RAISE NOTICE 'Politiques profiles: %', profiles_count;
  RAISE NOTICE 'Politiques transcriptions: %', transcriptions_count;

  IF profiles_count >= 4 AND transcriptions_count >= 4 THEN
    RAISE NOTICE '🎉 CORRECTION RÉUSSIE ! Toutes les politiques sont en place.';
  ELSE
    RAISE NOTICE '⚠️ Certaines politiques manquent encore.';
  END IF;
END $$;

-- 6. AFFICHER LES POLITIQUES FINALES
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('profiles', 'transcriptions')
ORDER BY tablename, policyname;

RAISE NOTICE '🎉 Script de correction terminé !';