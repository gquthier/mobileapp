#!/bin/bash

# =====================================================
# SCRIPT DE CORRECTION DES POLITIQUES RLS SUPABASE
# =====================================================

echo "🔧 Correction automatique des politiques RLS Supabase"
echo "======================================================"

# Vérifier que le CLI Supabase est installé
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI non trouvé. Installation..."
    brew install supabase/tap/supabase
fi

echo "✅ Supabase CLI version: $(supabase --version)"

# Définir les variables d'environnement depuis le .env
if [ -f .env ]; then
    echo "📄 Chargement des variables d'environnement..."
    export $(cat .env | xargs)
else
    echo "❌ Fichier .env non trouvé!"
    exit 1
fi

# URL du projet Supabase
PROJECT_URL="$EXPO_PUBLIC_SUPABASE_URL"
ANON_KEY="$EXPO_PUBLIC_SUPABASE_ANON_KEY"

echo "🔗 Projet Supabase: $PROJECT_URL"

# Exécuter le script de correction des politiques
echo "🛠️ Application du script de correction..."

# Utiliser curl pour exécuter le SQL via l'API Supabase
SQL_SCRIPT=$(cat fix-rls-policies.sql)

# Créer un fichier temporaire avec juste les commandes SQL essentielles
cat > temp-fix.sql << EOF
-- Correction rapide des politiques profiles
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles CASCADE;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles CASCADE;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles CASCADE;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_insert_policy" ON profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_select_policy" ON profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "profiles_update_policy" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Correction des politiques transcriptions
ALTER TABLE transcriptions DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert transcriptions for own videos" ON transcriptions CASCADE;
DROP POLICY IF EXISTS "Users can update transcriptions of own videos" ON transcriptions CASCADE;
DROP POLICY IF EXISTS "Users can view transcriptions of own videos" ON transcriptions CASCADE;
DROP POLICY IF EXISTS "Users can delete transcriptions of own videos" ON transcriptions CASCADE;

ALTER TABLE transcriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transcriptions_insert_policy" ON transcriptions
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM videos WHERE videos.id = transcriptions.video_id AND videos.user_id = auth.uid())
  );

CREATE POLICY "transcriptions_select_policy" ON transcriptions
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM videos WHERE videos.id = transcriptions.video_id AND videos.user_id = auth.uid())
  );
EOF

echo "📤 Exécution du script de correction..."

# Si on a un token Supabase, utiliser le CLI
if [ ! -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo "🔐 Utilisation du token d'accès Supabase..."
    supabase db reset --db-url "$PROJECT_URL" --linked
    supabase sql --db-url "$PROJECT_URL" --file temp-fix.sql
else
    echo "⚠️ Aucun token d'accès trouvé."
    echo "📋 Copiez et exécutez ce SQL dans votre dashboard Supabase:"
    echo "=================================================="
    cat temp-fix.sql
    echo "=================================================="
fi

# Nettoyer
rm temp-fix.sql

echo "✅ Script terminé!"
echo ""
echo "🧪 ÉTAPES SUIVANTES:"
echo "1. Exécutez le SQL ci-dessus dans votre dashboard Supabase"
echo "2. Testez la création de compte dans l'app"
echo "3. Vérifiez que la transcription fonctionne"
echo ""
echo "🆘 En cas de problème:"
echo "   - Vérifiez que toutes les politiques sont appliquées à 'authenticated'"
echo "   - Supprimez manuellement les anciennes politiques si nécessaire"