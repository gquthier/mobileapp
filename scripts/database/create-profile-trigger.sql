-- =============================================================
-- SOLUTION : TRIGGER AUTOMATIQUE POUR CRÉATION DE PROFILS
-- =============================================================

-- 1. Créer la fonction qui gère les nouveaux utilisateurs
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insérer automatiquement un profil pour chaque nouvel utilisateur
  INSERT INTO public.profiles (
    id,
    email,
    first_name,
    last_name,
    timezone,
    language,
    notification_settings,
    privacy_settings,
    backup_settings,
    created_at,
    updated_at
  )
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'first_name', ''),
    COALESCE(new.raw_user_meta_data->>'last_name', ''),
    COALESCE(new.raw_user_meta_data->>'timezone', 'UTC'),
    COALESCE(new.raw_user_meta_data->>'language', 'en'),
    '{"push_enabled": true, "email_enabled": true, "reminders_enabled": true, "reminder_time": "18:00"}'::jsonb,
    '{"profile_public": false, "analytics_enabled": true}'::jsonb,
    '{"cloud_backup_enabled": false, "auto_backup": false, "backup_frequency": "weekly"}'::jsonb,
    NOW(),
    NOW()
  );
  RETURN new;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- 2. Supprimer l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 3. Créer le trigger qui se déclenche à chaque nouvel utilisateur
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Simplifier les politiques RLS (plus besoin de gérer l'insertion)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles CASCADE;
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles CASCADE;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles CASCADE;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Seulement SELECT et UPDATE (pas INSERT car géré par trigger)
CREATE POLICY "profiles_select_policy" ON profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "profiles_update_policy" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- 5. Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ TRIGGER CRÉÉ ! Les profils seront automatiquement créés lors du sign-up.';
  RAISE NOTICE '📝 Plus besoin de créer manuellement les profils dans AuthService !';
END $$;