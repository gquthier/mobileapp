# 🔧 Configuration du Dashboard Admin

## ⚠️ IMPORTANT: Configuration de la clé Supabase

Le dashboard admin a besoin de la **clé SERVICE_ROLE** de Supabase pour accéder à toutes les données, car la clé `anon` est limitée par les Row Level Security policies.

### 📝 Étapes pour récupérer la clé SERVICE_ROLE:

1. **Allez sur votre dashboard Supabase**
   ```
   https://supabase.com/dashboard/project/eenyzudwktcjpefpoapi
   ```

2. **Naviguez vers Settings → API**
   - Cliquez sur l'icône ⚙️ Settings (en bas à gauche)
   - Puis sur "API" dans le menu

3. **Copiez la clé `service_role`**
   - Dans la section "Project API keys"
   - Cherchez la clé qui commence par `eyJhbGci...`
   - Sous "service_role" (avec l'icône 🔒 SECRET)
   - **⚠️ ATTENTION**: Cette clé est SECRÈTE et donne accès complet à la base

4. **Créez un fichier `.env.local`** dans le dossier `admin-dashboard/`
   ```bash
   cd admin-dashboard
   cp .env.local.example .env.local
   ```

5. **Ajoutez votre clé dans `.env.local`**
   ```
   NEXT_PUBLIC_SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3M...
   ```

6. **Relancez le serveur**
   ```bash
   npm run dev
   ```

### ✅ Vérification

Une fois configuré correctement, le dashboard devrait afficher:
- ✅ Le nombre total d'utilisateurs
- ✅ Le nombre total de vidéos
- ✅ Les statistiques de transcription
- ✅ Les coûts API estimés
- ✅ Tous les bugs remontés

Si vous voyez "0" partout, c'est que la clé service_role n'est pas encore configurée.

### 🔒 Sécurité

- ⚠️ **Ne commitez JAMAIS le fichier `.env.local`** (il est dans `.gitignore`)
- ⚠️ **Ne partagez JAMAIS votre service_role key**
- ⚠️ Cette clé donne un accès COMPLET à votre base de données
- ✅ Utilisez-la uniquement pour le dashboard admin en local/privé
- ✅ Pour la production, hébergez sur un serveur privé avec authentification

### 🚀 Accès aux données

Avec la service_role key, le dashboard peut:
- 📊 Lire toutes les tables (users, videos, transcriptions, bugs, etc.)
- 📈 Calculer les statistiques en temps réel
- 🔍 Afficher les logs et bugs de tous les utilisateurs
- 💰 Estimer les coûts API (AssemblyAI, OpenAI)
- 📉 Générer des graphiques de croissance

### 🐛 Troubleshooting

**Problème**: Le dashboard affiche "0" partout
- ✅ Vérifiez que `.env.local` existe
- ✅ Vérifiez que la clé commence par `eyJhbGci...`
- ✅ Relancez le serveur après avoir créé `.env.local`

**Problème**: Erreur "Invalid API key"
- ✅ Vérifiez que vous avez copié la clé `service_role` et non `anon`
- ✅ Vérifiez qu'il n'y a pas d'espace avant/après la clé

**Problème**: Données partielles uniquement
- ✅ Vous utilisez probablement encore la clé `anon`
- ✅ Vérifiez le fichier `.env.local`
