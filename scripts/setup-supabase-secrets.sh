#!/bin/bash

# Script de configuration des secrets Supabase
# Ce script configure les clés API de manière sécurisée

echo "🔐 Configuration des secrets Supabase..."

# Vérifier que Supabase CLI est installé
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI n'est pas installé."
    echo "📥 Installation:"
    echo "npm install -g supabase"
    exit 1
fi

# Vérifier que nous sommes connectés à Supabase
echo "🔗 Vérification de la connexion Supabase..."
if ! supabase status &> /dev/null; then
    echo "❌ Pas connecté à Supabase."
    echo "🔗 Connectez-vous d'abord:"
    echo "supabase login"
    exit 1
fi

echo "✅ Connecté à Supabase"

# Fonction pour demander une clé API de manière sécurisée
ask_for_secret() {
    local secret_name=$1
    local description=$2

    echo ""
    echo "📝 Configuration de $secret_name"
    echo "   $description"
    echo -n "🔑 Entrez la clé (saisie masquée): "
    read -s secret_value
    echo ""

    if [ -z "$secret_value" ]; then
        echo "⚠️  Clé vide, ignoré."
        return 1
    fi

    # Définir le secret
    if supabase secrets set "${secret_name}=${secret_value}"; then
        echo "✅ $secret_name configuré avec succès"
        return 0
    else
        echo "❌ Échec de la configuration de $secret_name"
        return 1
    fi
}

# Configuration des secrets
echo ""
echo "🔧 Configuration des clés API pour les Edge Functions..."

# OpenAI API Key
ask_for_secret "OPENAI_API_KEY" "Clé API OpenAI pour la transcription Whisper"

# Optionnel : autres clés API
echo ""
echo "🤔 Autres clés API optionnelles:"

read -p "📱 Configurer une clé pour des services tiers? (y/N): " configure_others
if [[ $configure_others =~ ^[Yy]$ ]]; then
    ask_for_secret "ANTHROPIC_API_KEY" "Clé API Anthropic Claude (optionnel)"
    ask_for_secret "WEBHOOK_SECRET" "Secret pour les webhooks (optionnel)"
fi

# Vérifier les secrets configurés
echo ""
echo "📋 Secrets configurés:"
supabase secrets list

echo ""
echo "🎉 Configuration des secrets terminée!"
echo ""
echo "⚠️  IMPORTANT: Ces clés sont maintenant stockées de manière sécurisée"
echo "    dans Supabase et ne sont accessibles qu'aux Edge Functions."
echo ""
echo "🔄 Prochaines étapes:"
echo "1. Déployez les Edge Functions: ./scripts/deploy-edge-functions.sh"
echo "2. Testez la transcription dans votre app"
echo "3. Surveillez les logs: supabase functions serve --env-file .env.local"