#!/bin/bash

# =====================================================
# SCRIPT D'APPLICATION DE LA MISE À JOUR LANGUE
# =====================================================

echo "🚀 Application de la mise à jour pour la sélection de langue"
echo "=============================================================="

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

echo "📋 Script SQL à appliquer:"
echo "=========================="
cat add-language-profile.sql

echo ""
echo "📤 Exécution du script de mise à jour..."

# Si on a un token Supabase, utiliser le CLI
if [ ! -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo "🔐 Utilisation du token d'accès Supabase..."
    supabase sql --db-url "$EXPO_PUBLIC_SUPABASE_URL" --file add-language-profile.sql
else
    echo "⚠️ Aucun token d'accès trouvé."
    echo "📋 Copiez et exécutez ce SQL dans votre dashboard Supabase:"
    echo "=========================================================="
    cat add-language-profile.sql
    echo "=========================================================="
fi

echo "✅ Script terminé!"
echo ""
echo "🎯 FONCTIONNALITÉS AJOUTÉES:"
echo "• Correction de l'erreur OpenAI Whisper API 'invalid language auto'"
echo "• Validation des codes de langue ISO-639-1 dans TranscriptionService"
echo "• Champ 'preferred_language' ajouté au profil utilisateur"
echo "• Sélecteur de langue dans le formulaire d'inscription"
echo "• Utilisation de la langue préférée lors des transcriptions"
echo ""
echo "🧪 POUR TESTER:"
echo "1. Créez un nouveau compte utilisateur"
echo "2. Choisissez votre langue préférée (ou laissez 'Auto-detect')"
echo "3. Enregistrez une vidéo pour tester la transcription"
echo "4. Vérifiez que la langue choisie est utilisée pour la transcription"