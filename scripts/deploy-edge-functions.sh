#!/bin/bash

# Script de déploiement des Edge Functions Supabase
# Ce script déploie la fonction de transcription sécurisée

echo "🚀 Déploiement des Edge Functions Supabase..."

# Vérifier que Supabase CLI est installé
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI n'est pas installé."
    echo "📥 Installation via npm:"
    echo "npm install -g supabase"
    exit 1
fi

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Fichier supabase/config.toml non trouvé."
    echo "📂 Assurez-vous d'être dans le répertoire racine du projet."
    exit 1
fi

echo "📁 Répertoire projet détecté: $(pwd)"

# Vérifier la connexion à Supabase
echo "🔗 Vérification de la connexion Supabase..."
supabase status

# Déployer les Edge Functions
echo "📤 Déploiement de l'Edge Function 'transcribe-video'..."
supabase functions deploy transcribe-video

if [ $? -eq 0 ]; then
    echo "✅ Edge Function déployée avec succès!"
    echo ""
    echo "🔧 Configuration requise:"
    echo "1. Ajouter la clé OpenAI dans les secrets Supabase:"
    echo "   supabase secrets set OPENAI_API_KEY=your_openai_api_key_here"
    echo ""
    echo "2. L'Edge Function est accessible à:"
    echo "   https://your-project.supabase.co/functions/v1/transcribe-video"
    echo ""
    echo "3. Tester l'Edge Function:"
    echo "   curl -X POST 'https://your-project.supabase.co/functions/v1/transcribe-video' \\"
    echo "        -H 'Authorization: Bearer YOUR_ANON_KEY' \\"
    echo "        -H 'Content-Type: application/json' \\"
    echo "        -d '{\"videoId\":\"test\",\"videoUrl\":\"https://example.com/video.mp4\"}'"
else
    echo "❌ Échec du déploiement de l'Edge Function"
    echo "🔍 Vérifiez les logs d'erreur ci-dessus"
    exit 1
fi

echo ""
echo "🎉 Déploiement terminé!"