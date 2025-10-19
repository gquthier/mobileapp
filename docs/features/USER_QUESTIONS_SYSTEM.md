# 🎯 Système de Questions Personnalisées IA

## Vue d'ensemble

Ce système génère automatiquement des questions personnalisées pour chaque utilisateur basées sur leurs transcriptions vidéo passées. Les questions sont générées par batch de 50 et renouvelées automatiquement.

## Architecture

### 1. Base de données (`user_questions`)

Table Supabase avec les colonnes :
- `id` - UUID unique
- `user_id` - Référence à l'utilisateur
- `question_text` - Texte de la question
- `batch_number` - Numéro du groupe (1, 2, 3...)
- `order_index` - Ordre dans le batch (0-49)
- `is_used` - Boolean indiquant si la question a été épuisée
- `created_at` - Date de création

### 2. Edge Function (`generate-user-questions`)

**Déployée ✅** : `https://supabase.com/dashboard/project/eenyzudwktcjpefpoapi/functions`

**Fonctionnement :**
1. Récupère les 5 dernières transcriptions de l'utilisateur
2. Récupère 3 transcriptions aléatoires parmi les plus anciennes
3. Envoie le tout à OpenAI avec le prompt : `pmpt_68dda6ed3cc88197a11c5a8e5e6e9a290c27f60155d435b1`
4. Parse la réponse JSON : `{ questions: [{ q: "..." }, ...] }`
5. Insère les 50 questions dans la base de données

### 3. Service Client (`userQuestionsService.ts`)

**Fonctions principales :**
- `getNextQuestion()` - Récupère la prochaine question disponible
- `markQuestionAsUsed(id)` - Marque une question comme épuisée
- `countUnusedQuestions()` - Compte les questions restantes
- `checkAndGenerateIfNeeded()` - Génère de nouvelles questions si ≤5 restantes
- `initializeQuestionsIfNeeded()` - Initialise le système pour un nouvel utilisateur

### 4. Intégration RecordScreen

**Comportement :**
1. Au montage de l'écran : initialisation du système de questions
2. Quand l'utilisateur ouvre les questions : charge la première question disponible
3. Quand l'utilisateur clique sur la flèche →  :
   - Marque la question actuelle comme épuisée
   - Charge la question suivante
   - Vérifie si ≤5 questions restent → déclenche génération en arrière-plan
4. Fallback automatique vers questions statiques si aucune question IA disponible

## 🚀 Déploiement

### Étape 1 : Appliquer la migration SQL

**⚠️ IMPORTANT** : La migration doit être appliquée manuellement via le SQL Editor de Supabase.

1. Aller sur : https://supabase.com/dashboard/project/eenyzudwktcjpefpoapi/editor
2. Ouvrir un nouveau Query
3. Copier le contenu de `supabase/migrations/006_user_questions.sql`
4. Exécuter la requête

**Ou via psql (si installé) :**
```bash
PGPASSWORD="Samuelgabriel92" psql \
  -h aws-0-eu-central-1.pooler.supabase.com \
  -p 6543 \
  -U postgres.eenyzudwktcjpefpoapi \
  -d postgres \
  -f supabase/migrations/006_user_questions.sql
```

### Étape 2 : Edge Function (✅ Déjà déployée)

```bash
npx supabase functions deploy generate-user-questions --project-ref eenyzudwktcjpefpoapi
```

## 🧪 Test du système

### Test 1 : Vérifier la table

```sql
SELECT * FROM user_questions LIMIT 10;
```

### Test 2 : Initialiser les questions pour un utilisateur

Dans l'app, simplement ouvrir le RecordScreen. Si l'utilisateur n'a pas de questions, le système génère automatiquement le premier batch.

### Test 3 : Marquer des questions comme utilisées

Dans le RecordScreen, cliquer plusieurs fois sur la flèche → pour épuiser des questions.

### Test 4 : Vérifier la génération automatique

Marquer 46 questions comme utilisées (laisser 4 restantes), puis marquer 2 de plus. Le système devrait automatiquement déclencher la génération du prochain batch.

```sql
-- Vérifier le nombre de questions non utilisées
SELECT count_unused_questions('USER_ID_HERE');

-- Vérifier les batches
SELECT batch_number, COUNT(*) as count, SUM(CASE WHEN is_used THEN 1 ELSE 0 END) as used_count
FROM user_questions
WHERE user_id = 'USER_ID_HERE'
GROUP BY batch_number
ORDER BY batch_number;
```

## 📊 Monitoring

### Logs à surveiller

**App (React Native) :**
- `🔄 Initializing questions system...`
- `📥 Loading next question...`
- `✓ Marking current question as used`
- `⚠️ Only X questions left - need to generate more`
- `🚀 Triggering question generation for user`

**Edge Function :**
- `📝 Starting question generation for user`
- `✅ Found X recent transcriptions`
- `✅ Found X random older transcriptions`
- `🧠 Generating questions with AI...`
- `✅ Generated 50 questions successfully`
- `✅ Questions successfully inserted into database`

## 🔧 Configuration

### Variables d'environnement (Supabase Edge Function)

- `OPENAI_API_KEY` - Clé API OpenAI (déjà configurée)
- `SUPABASE_URL` - URL du projet Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key

### OpenAI Prompt

**ID** : `pmpt_68dda6ed3cc88197a11c5a8e5e6e9a290c27f60155d435b1`
**Version** : `1`

**Format de réponse attendu :**
```json
{
  "questions": [
    {"q": "Comment tu te sens aujourd'hui ?"},
    {"q": "Qu'est-ce qui te motive le plus récemment ?"},
    ...
  ]
}
```

## 🐛 Troubleshooting

### Problème : Aucune question n'apparaît

**Solution :**
1. Vérifier que la migration est appliquée : `SELECT * FROM user_questions LIMIT 1;`
2. Vérifier les logs du service : `console.log` dans `initializeQuestions()`
3. Vérifier que l'Edge Function est déployée
4. Le système utilise automatiquement les questions statiques en fallback

### Problème : Les nouvelles questions ne se génèrent pas

**Solution :**
1. Vérifier le compteur : `SELECT count_unused_questions('USER_ID');`
2. Vérifier les logs de l'Edge Function dans Supabase Dashboard
3. Vérifier la clé OpenAI API
4. Vérifier que l'utilisateur a des transcriptions disponibles

### Problème : L'Edge Function échoue

**Solution :**
1. Vérifier les logs : Dashboard Supabase → Functions → generate-user-questions → Logs
2. Vérifier le format de réponse OpenAI (doit être JSON avec `questions` array)
3. Tester manuellement l'Edge Function via le Dashboard

## 📝 Notes de développement

- Les questions statiques sont gardées en fallback pour assurer une expérience fluide
- La génération se fait en arrière-plan (non-bloquante)
- Le seuil de 5 questions permet de garantir qu'on a toujours des questions disponibles
- Les questions sont triées par `batch_number` puis `order_index` pour maintenir l'ordre de génération
- RLS activé : chaque utilisateur voit uniquement ses propres questions

## 🎉 Fonctionnalités futures possibles

- [ ] Permettre à l'utilisateur de "favoriser" certaines questions
- [ ] Ajouter des catégories de questions (introspection, gratitude, projets, etc.)
- [ ] Personnaliser le nombre de questions par batch
- [ ] Statistiques sur les questions les plus utilisées
- [ ] Permettre à l'utilisateur de suggérer ses propres questions
